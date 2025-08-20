import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const ESP32_IP = "http://192.168.4.1";

export default function CameraStream() {
  const [streaming, setStreaming] = useState(false);

  const startStream = async () => {
    await fetch(`${ESP32_IP}/start`);
    setStreaming(true);
  };

  const stopStream = async () => {
    await fetch(`${ESP32_IP}/stop`);
    setStreaming(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 Live Stream ESP32-CAM</Text>

      {streaming ? (
        <WebView
          source={{ html: `<img src="${ESP32_IP}/stream" style="width:100%;height:100%;"/>` }}
          style={styles.preview}
        />
      ) : (
        <Text style={styles.info}>Stream parado</Text>
      )}

      <View style={styles.buttons}>
        <Button title="▶️ Iniciar" onPress={startStream} />
        <Button title="⏹ Parar" onPress={stopStream} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, color: "#fff", marginBottom: 10 },
  preview: { width: "90%", height: 300, backgroundColor: "#000" },
  info: { color: "#aaa", marginBottom: 20 },
  buttons: { flexDirection: "row", marginTop: 20, gap: 10 }
});