import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const ESP32_IP = "http://192.168.4.1"; // IP do ESP32-CAM

export default function App() {
  const [ledState, setLedState] = useState<"on" | "off">("off");
  const [loading, setLoading] = useState(false);

  // 🔄 Atualiza estado inicial + auto-refresh
  useEffect(() => {
    fetchLedState();
    const interval = setInterval(fetchLedState, 5000); // auto-refresh a cada 5s
    return () => clearInterval(interval);
  }, []);

  const fetchLedState = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${ESP32_IP}/state`);
      const data = await response.json();
      setLedState(data.led === "on" ? "on" : "off");
    } catch (error) {
      console.error("Erro ao buscar estado do LED:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLed = async () => {
    try {
      setLoading(true);
      const newState = ledState === "on" ? "L" : "H"; // endpoint do ESP
      await fetch(`${ESP32_IP}/${newState}`);
      fetchLedState();
    } catch (error) {
      console.error("Erro ao alternar LED:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM - ESP32-CAM</Text>

      {/* Estado do LED */}
      <Text style={styles.text}>
        LED:{" "}
        <Text style={{ color: ledState === "on" ? "lime" : "red" }}>
          {ledState.toUpperCase()}
        </Text>
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <Button
          title={ledState === "on" ? "Desligar LED" : "Ligar LED"}
          onPress={toggleLed}
        />
      )}

      {/* Vídeo da câmera */}
      <Text style={styles.text}>📷 Câmera ao vivo:</Text>
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: `${ESP32_IP}/stream?time=${Date.now()}` }} // força refresh
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center", // Centraliza vertical e horizontal
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  text: {
    fontSize: 18,
    color: "#fff",
    marginVertical: 12,
    textAlign: "center",
  },
  videoContainer: {
    width: "90%",
    height: 280,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  video: {
    flex: 1,
  },
});