import React, { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";
import { WebView } from "react-native-webview";

const SOFTAP_IP = "http://192.168.4.1"; // ESP32 Soft-AP
const STA_IP = "http://192.168.15.188"; // ESP32 conectado à rede WiFi (STA)

type StatusResponse = {
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  ip: string;
};

export default function App() {
  const [status, setStatus] = useState<StatusResponse>({
    led_builtin: "off",
    led_opposite: "on",
    ip: SOFTAP_IP,
  });

  const [mode, setMode] = useState<"Soft-AP" | "STA">("Soft-AP");

  // ======= CONFIG DA CÂMERA NATIVA =======
  const [permission, setPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === "back");

  useEffect(() => {
    (async () => {
      const camPerm = await Camera.requestCameraPermission();
      const micPerm = await Camera.requestMicrophonePermission();
      setPermission(camPerm === "granted" && micPerm === "granted");
    })();
  }, []);

  // ======= FUNÇÕES DO ESP32 =======
  const toggleLed = async () => {
    try {
      const newState = status.led_builtin === "on" ? "L" : "H";
      await fetch(`${status.ip}/${newState}`);
      setStatus({
        ...status,
        led_builtin: status.led_builtin === "on" ? "off" : "on",
        led_opposite: status.led_opposite === "on" ? "off" : "on",
      });
    } catch (error) {
      console.error("Erro ao acessar ESP32:", error);
    }
  };

  const switchMode = () => {
    const newMode = mode === "Soft-AP" ? "STA" : "Soft-AP";
    const newIP = newMode === "Soft-AP" ? SOFTAP_IP : STA_IP;
    setMode(newMode);
    setStatus((prev) => ({ ...prev, ip: newIP }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM - ESP32 ({mode})</Text>

      <Text style={styles.text}>
        ESP32:{" "}
        <Text style={{ color: status.led_builtin === "on" ? "green" : "red" }}>
          {status.led_builtin.toUpperCase()}
        </Text>
      </Text>

      <Text style={styles.text}>
        LED pino 32:{" "}
        <Text style={{ color: status.led_opposite === "on" ? "green" : "red" }}>
          {status.led_opposite.toUpperCase()}
        </Text>
      </Text>

      <Text style={styles.text}>IP do ESP32: {status.ip}</Text>

      <Button
        title={status.led_builtin === "on" ? "Desligar ESP32" : "Ligar ESP32"}
        onPress={toggleLed}
      />
      <View style={{ marginVertical: 10 }} />
      <Button
        title={`Mudar para ${mode === "Soft-AP" ? "STA" : "Soft-AP"}`}
        onPress={switchMode}
        color="#facc15"
      />

      {/* STREAM DO ESP32 */}
      <Text style={[styles.text, { marginTop: 20 }]}>📷 Câmera ESP32:</Text>
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: `${status.ip}/stream` }}
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          onHttpError={({ nativeEvent }) =>
            console.log("HTTP Error:", nativeEvent)
          }
        />
      </View>

      {/* CÂMERA NATIVA DO DISPOSITIVO */}
      <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera Nativa:</Text>
      <View style={styles.nativeCamera}>
        {device && permission ? (
          <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
        ) : (
          <Text style={{ color: "red" }}>Permissão ou câmera indisponível</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#fff",
    marginVertical: 5,
    textAlign: "center",
  },
  videoContainer: {
    width: "100%",
    height: 300,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 15,
  },
  video: {
    flex: 1,
  },
  nativeCamera: {
    width: "100%",
    height: 300,
    borderWidth: 2,
    borderColor: "#0f0",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 15,
    backgroundColor: "black",
  },
});