// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from "@env";
import { Camera, CameraView } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Esp32Service, { Esp32Status } from "../../hive_brain/hive_stream/Esp32Service.ts";

export default function StreamScreen() {
  const [esp32Service] = useState(() => new Esp32Service());
  const [status, setStatus] = useState<Esp32Status>({ ...esp32Service.status });
  const [mode, setMode] = useState<"Soft-AP" | "STA">(esp32Service.mode);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [vercelModalVisible, setVercelModalVisible] = useState(false);
  const [vercelStatus, setVercelStatus] = useState<any>(null);

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  // Função para exibir erros
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
      setStatus({ ...esp32Service.status });
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
        {status.ip ?? "" ? "✅ Conectado ao ESP32" : "❌ Desconectado"}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        {/* Status ESP32 */}
        <Text style={[styles.text, { marginTop: 20 }]}>💡 Status ESP32:</Text>
        <View style={[styles.dataBox, { alignSelf: "center" }]}>
          <Text style={styles.overlayText}>
            LED Built-in:{" "}
            <Text style={{ color: status.led_builtin === "on" ? "lightgreen" : "red" }}>
              {(status.led_builtin ?? "off").toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>
            LED Opposite:{" "}
            <Text style={{ color: status.led_opposite === "on" ? "lightgreen" : "red" }}>
              {(status.led_opposite ?? "off").toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>IP: {status.ip ?? "N/A"}</Text>
          <Text style={styles.overlayText}>
            🔊 Sensor de Som: {(status.sensor_db ?? 0).toFixed(1)} dB
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title={status.led_builtin === "on" ? "Desligar ESP32" : "Ligar ESP32"}
              onPress={toggleLed}
            />
            <Button
              title={`Modo: ${mode === "Soft-AP" ? "STA" : "Soft-AP"}`}
              onPress={switchMode}
              color="#facc15"
            />
          </View>
          <Button
            title="📄 Exibir JSON"
            onPress={() => setStatusModalVisible(true)}
            color="#0af"
          />
          <Button
            title="🌐 Ver JSON do Vercel"
            onPress={fetchStatusFromVercel}
            color="#ff9900"
          />
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

      {/* Modal de erros */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚠️ Erro capturado</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={styles.modalText}>{errorMessage}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setErrorModalVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de status JSON ESP32 */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📄 Status ESP32 JSON</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>{JSON.stringify(status, null, 2)}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setStatusModalVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de status JSON Vercel */}
      <Modal
        visible={vercelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVercelModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🌐 Status Vercel JSON</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>{JSON.stringify(vercelStatus, null, 2)}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setVercelModalVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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