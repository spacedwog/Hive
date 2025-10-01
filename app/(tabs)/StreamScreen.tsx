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
import Esp32Service, { Esp32Status } from "../../hive_brain/hive_stream/Esp32Service";

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

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  // Exibe erro em modal
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

  // GET status do Vercel
  const fetchStatusFromVercel = useCallback(async () => {
    try {
      const response = await fetch(`${VERCEL_API_URL}/status`, { method: "GET" });
      const result = await response.json();
      setStatus(result);
      console.log("📄 Status obtido do Vercel:", result);
    } catch (err) {
      showError(err);
    }
  }, [VERCEL_API_URL]);

  // POST dados para Vercel
  const sendDataToVercel = useCallback(
    async (photoBase64?: string) => {
      try {
        const payload = { status, image: photoBase64 || null };
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
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

  // Atualiza status local e do Vercel a cada 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newStatus = await esp32Service.fetchStatus();
        setStatus({ ...newStatus });
        await fetchStatusFromVercel();
      } catch (err) {
        showError(err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [esp32Service, fetchStatusFromVercel]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 HIVE SNAPSHOT 📡</Text>
      <Text style={styles.connectionText}>
        {status.ip ? "✅ Conectado ao ESP32" : "❌ Desconectado"}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        {/* Status ESP32 */}
        <Text style={[styles.text, { marginTop: 20 }]}>💡 Status ESP32:</Text>
        <View style={[styles.dataBox, { alignSelf: "center" }]}>
          <Text style={styles.overlayText}>
            LED Built-in: <Text style={{ color: status.led_builtin === "on" ? "lightgreen" : "red" }}>{status.led_builtin.toUpperCase()}</Text>
          </Text>
          <Text style={styles.overlayText}>
            LED Opposite: <Text style={{ color: status.led_opposite === "on" ? "lightgreen" : "red" }}>{status.led_opposite.toUpperCase()}</Text>
          </Text>
          <Text style={styles.overlayText}>IP: {status.ip}</Text>
          <Text style={styles.overlayText}>🔊 Sensor de Som: {status.sensor_db.toFixed(1)} dB</Text>
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
            <Button
              title="📄 Exibir JSON"
              onPress={() => setStatusModalVisible(true)}
              color="#0af"
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
                <Button title="🔄 Trocar câmera" onPress={() => setType(type === "back" ? "front" : "back")} color="#0af" />
                <Button title="📸 Capturar & Enviar" onPress={captureAndUploadPhoto} color="#4caf50" />
              </View>
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

      {/* Modal de status JSON */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📄 Status JSON</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>{JSON.stringify(status, null, 2)}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setStatusModalVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#121212", alignItems: "center", justifyContent: "flex-start" },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 15, textAlign: "center" },
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