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
  const [frameUrl, setFrameUrl] = useState(`${status.ip}/stream?${Date.now()}`);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  // Solicita permissão para câmera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Atualiza a URL do stream do ESP32 a cada 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameUrl(`${status.ip}/stream?${Date.now()}`);
    }, 2000);
    return () => clearInterval(interval);
  }, [status.ip]);

  // Alterna o LED
  const toggleLed = async () => {
    try {
      await esp32Service.toggleLed();
      setStatus({ ...esp32Service.status });
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao acessar ESP32.");
      setModalVisible(true);
    }
  };

  // Alterna entre Soft-AP e STA
  const switchMode = async () => {
    try {
      esp32Service.switchMode();
      setMode(esp32Service.mode);
      setStatus({ ...esp32Service.status });
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao alternar modo de conexão.");
      setModalVisible(true);
    }
  };

  // Atualiza status do ESP32 a cada 2s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newStatus = await esp32Service.fetchStatus();
        setStatus({ ...newStatus });
      } catch (err: any) {
        setErrorMessage(err?.message || "Erro ao atualizar status do ESP32.");
        setModalVisible(true);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [esp32Service]);

  // Envia status + foto para a API Vercel
  const sendDataToVercel = useCallback(
    async (photoBase64?: string) => {
      try {
        const payload = {
          status,
          image: photoBase64 || null,
        };

        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (result.success) {
          console.log("✅ Dados enviados para Vercel com sucesso!", result.logData);
        } else {
          throw new Error("Falha ao enviar dados para Vercel.");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Erro ao enviar dados para Vercel.");
        setModalVisible(true);
      }
    },
    [status, VERCEL_API_URL]
  );

  // Captura uma foto e envia para Vercel
  const captureAndUploadPhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
          exif: false,
          skipProcessing: true,
        });
        setCapturedPhoto(photo.uri);
        console.log("📸 Foto capturada:", photo.uri);

        // Envia status + foto para Vercel
        await sendDataToVercel(photo.base64);
      } catch (err: any) {
        setErrorMessage(err?.message || "Erro ao capturar/enviar foto.");
        setModalVisible(true);
      }
    }
  };

  // Envio periódico do status ESP32 (sem foto)
  useEffect(() => {
    const interval = setInterval(async () => {
      await sendDataToVercel();
    }, 5000); // a cada 5s
    return () => clearInterval(interval);
  }, [sendDataToVercel, status]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM 📡</Text>

      {/* Campo de status da conexão */}
      <Text style={styles.connectionText}>
        {status.ip ? "✅ Conectado ao ESP32" : "❌ Desconectado"}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        <Text style={[styles.text, { marginTop: 20 }]}>💡 Status ESP32:</Text>
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
          <Text style={styles.overlayText}>IP: {status.ip}</Text>
          <Text style={styles.overlayText}>
            🔊 Sensor de Som (pino 34): {status.sensor_db.toFixed(1)} dB
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
        </View>

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
                <Button
                  title="📸 Capturar & Enviar"
                  onPress={captureAndUploadPhoto}
                  color="#4caf50"
                />
              </View>

              {capturedPhoto && (
                <Image
                  source={{ uri: capturedPhoto }}
                  style={{ width: "100%", height: 240, marginTop: 10 }}
                />
              )}

              <Image
                source={{ uri: frameUrl }}
                style={{ width: "100%", height: 240, marginTop: 10 }}
              />
            </>
          ) : (
            <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal de Erros */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Erro</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
  connectionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0af",
    marginBottom: 10,
    textAlign: "center",
  },
  text: { fontSize: 16, color: "#fff", marginVertical: 5, textAlign: "center" },
  dataBox: {
    width: "90%",
    maxWidth: 400,
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 15,
  },
  nativeCamera: {
    width: 320,
    height: 350,
    borderWidth: 2,
    borderColor: "#0f0",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: "black",
    padding: 5,
  },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f33",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#0af",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});