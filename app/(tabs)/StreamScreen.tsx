// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from "@env";
import { Camera, CameraView } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import ErrorModal from "../../hive_body/hive_modal/ErrorModal.tsx";
import StatusModal from "../../hive_body/hive_modal/StatusModal.tsx";
import VercelModal from "../../hive_body/hive_modal/VercelModal.tsx";

import Esp32Service, { ErrorLog, Esp32Status } from "../../hive_brain/hive_stream/Esp32Service.ts";

export default function StreamScreen() {
  const [esp32Service] = useState(() => new Esp32Service());
  const [status, setStatus] = useState<Esp32Status>({ ...esp32Service.status });
  const [mode, setMode] = useState<"Soft-AP" | "STA">(esp32Service.mode);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [vercelModalVisible, setVercelModalVisible] = useState(false);
  const [vercelStatus, setVercelStatus] = useState<any>(null);

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  // Configura callbacks para capturar erros do ESP32Service
  useEffect(() => {
    esp32Service.onError((error: ErrorLog) => {
      setErrorLogs(esp32Service.getErrorHistory());
    });
  }, [esp32Service]);

  // Função para exibir erros (mantida para compatibilidade)
  const showError = (err: any) => {
    let msg = "";
    if (typeof err === "string") {
      msg = err;
    } else if (err instanceof Error) {
      msg = err.message;
    } else {
      try { msg = JSON.stringify(err, null, 2); } catch { msg = String(err); }
    }
    setErrorMessage(msg);
    setErrorModalVisible(true);
  };

  // Função para mostrar o modal de erros com histórico
  const showErrorHistory = () => {
    setErrorLogs(esp32Service.getErrorHistory());
    setErrorModalVisible(true);
  };

  // Função para limpar histórico de erros
  const clearErrorHistory = () => {
    esp32Service.clearErrorHistory();
    setErrorLogs([]);
  };

  // Solicita permissão para câmera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Toggle LED
  const toggleLed = async () => {
    try {
      await esp32Service.toggleLed();
      const newStatus = await esp32Service.fetchStatus();
      setStatus({ ...newStatus });
    } catch (error) {
      showError(error);
    }
  };

  // Troca modo Soft-AP <-> STA
  const switchMode = async () => {
    try {
      esp32Service.switchMode();
      setMode(esp32Service.mode);
      setStatus({ ...esp32Service.status });
    } catch (error) {
      showError(error);
    }
  };

  // GET status do Vercel (somente para modal)
  const fetchStatusFromVercel = async () => {
    try {
      const response = await fetch(`${VERCEL_URL}/api/status?info=server`);
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Resposta não é JSON: " + text);
      }
      setVercelStatus(result);
      setVercelModalVisible(true);
      console.log("🌐 Status Vercel:", result);
    } catch (err) {
      showError(err);
    }
  };

  // POST dados/foto para Vercel
  const sendDataToVercel = useCallback(
    async (photoBase64?: string) => {
      try {
        const payload = { status, image: photoBase64 || null };
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error("Resposta não é JSON: " + text);
        }
        if (result.success) {
          console.log("✅ Dados enviados!", result.logData);
        } else {
          showError(result);
        }
      } catch (err) {
        showError(err);
      }
    },
    [status, VERCEL_API_URL]
  );

  // Captura e envia foto
  const captureAndUploadPhoto = async () => {
    if (!cameraRef.current) {
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
        exif: false,
        skipProcessing: true,
      });
      setCapturedPhoto(photo.uri);
      console.log("📸 Foto capturada:", photo.uri);
      await sendDataToVercel(photo.base64);
    } catch (err) {
      showError(err);
    }
  };

  // Atualiza status local a cada 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newStatus = await esp32Service.fetchStatus();
        setStatus({ ...newStatus });
      } catch (err) {
        showError(err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [esp32Service]);

  return (
    <View style={styles.container}>
      <Text style={styles.connectionText}>
        {status.ip_sta ? `✅ Conectado ao ESP32-CAM (${mode === "STA" ? status.ip_sta : status.ip_ap})` : "❌ Desconectado"}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        {/* Status ESP32-CAM */}
        <Text style={[styles.text, { marginTop: 20 }]}>📷 Status ESP32-CAM:</Text>
        <View style={[styles.dataBox, { alignSelf: "center" }]}>
          <Text style={styles.overlayText}>
            LED Built-in:{" "}
            <Text style={{ color: status.led_builtin === "on" ? "lightgreen" : "red" }}>
              {status.led_builtin.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>
            LED Opposite:{" "}
            <Text style={{ color: status.led_opposite === "on" ? "lightgreen" : "red" }}>
              {status.led_opposite.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>
            IP AP: {status.ip_ap}
          </Text>
                    <Text style={styles.overlayText}>
            IP STA: {status.ip_sta}
          </Text>
          <Text style={styles.overlayText}>
            🔊 Nível de Som: {status.sound_level}
          </Text>
          <Text style={styles.overlayText}>
            ⏲️ Auto-off: {status.auto_off_ms}ms
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title={status.led_builtin === "on" ? "Desligar LED" : "Ligar LED"}
              onPress={toggleLed}
            />
            <Button
              title={`Modo: ${mode === "Soft-AP" ? "STA" : "Soft-AP"}`}
              onPress={switchMode}
              color="#facc15"
            />
          </View>
          <Button
            title="🛜 ESP32-CAM(Data)"
            onPress={() => setStatusModalVisible(true)}
            color="#0af"
          />
          <Button
            title="❤️‍🔥 API(Infra-estrutura)"
            onPress={fetchStatusFromVercel}
            color="#ff9900"
          />
          <View style={{ marginTop: 10 }}>
            <Button
              title={`📝 Ver Erros (${errorLogs.length})`}
              onPress={showErrorHistory}
              color={errorLogs.length > 0 ? "#ff6666" : "#666"}
            />
          </View>
        </View>

        {/* Câmera iOS */}
        <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera iOS:</Text>
        <View style={styles.nativeCamera}>
          {hasPermission ? (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={type} />
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 5 }}>
                <Button
                  title="🔄 Trocar câmera"
                  onPress={() => setType(type === "back" ? "front" : "back")}
                  color="#0af"
                />
              </View>
              <Button
                title="📸 Tirar Foto"
                onPress={captureAndUploadPhoto}
                color="#4caf50"
              />
              {capturedPhoto && (
                <Image source={{ uri: capturedPhoto }} style={{ width: "100%", height: 240, marginTop: 10 }} />
              )}
            </>
          ) : (
            <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
          )}
        </View>
      </ScrollView>

      <ErrorModal
        visible={errorModalVisible}
        errorMessage={errorMessage}
        errorLogs={errorLogs}
        errorStats={esp32Service.getErrorStats()}
        onClose={() => setErrorModalVisible(false)}
        onClearHistory={clearErrorHistory}
      />
      <StatusModal
        visible={statusModalVisible}
        status={status}
        onClose={() => setStatusModalVisible(false)}
      />
      <VercelModal
        visible={vercelModalVisible}
        vercelStatus={vercelStatus}
        onClose={() => setVercelModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 42, backgroundColor: "#121212", alignItems: "center", justifyContent: "flex-start"},
  connectionText: { fontSize: 16, fontWeight: "bold", color: "#0af", marginBottom: 10, textAlign: "center" },
  text: { fontSize: 16, color: "#fff", marginVertical: 5, textAlign: "center" },
  dataBox: { width: "90%", maxWidth: 400, padding: 10, backgroundColor: "#222", borderRadius: 8, marginBottom: 15 },
  nativeCamera: { width: 320, height: 350, borderWidth: 2, borderColor: "#0f0", borderRadius: 10, overflow: "hidden", marginTop: 10, backgroundColor: "black", padding: 5 },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  modalBackground: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalBox: { width: "85%", backgroundColor: "#1e1e1e", borderRadius: 10, padding: 20, shadowColor: "#000", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0af", marginBottom: 10 },
  modalText: { color: "#fff", fontSize: 14 },
  modalButton: { marginTop: 15, backgroundColor: "#0af", padding: 10, borderRadius: 8, alignItems: "center" },
});
