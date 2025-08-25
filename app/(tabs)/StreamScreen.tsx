import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

export default function StreamScreen() {
  const [loading, setLoading] = useState(true);
  const [ledStatus, setLedStatus] = useState<string>("desconhecido");

  // Defina o IP do ESP32-CAM (SoftAP ou conectado no seu Wi-Fi)
  const esp32BaseUrl = "http://192.168.4.1"; // ajuste conforme o seu serial log
  const streamUrl = `${esp32BaseUrl}/stream`;

  // Buscar estado do LED periodicamente
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${esp32BaseUrl}/state`);
        const json = await res.json();
        setLedStatus(json.led);
      } catch (err) {
        console.log("Erro ao buscar estado:", err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  // Controle do LED
  const toggleLed = async () => {
    try {
      const action = ledStatus === "on" ? "L" : "H";
      await fetch(`${esp32BaseUrl}/${action}`);
      setLedStatus(action === "H" ? "on" : "off");
    } catch (err) {
      console.log("Erro ao alternar LED:", err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM</Text>

      <View style={styles.videoContainer}>
        {loading && <ActivityIndicator size="large" color="#16a34a" />}
        <WebView
          source={{ uri: streamUrl }}
          style={styles.video}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      <Text style={styles.status}>
        💡 LED: {ledStatus === "on" ? "Ligado" : ledStatus === "off" ? "Desligado" : "..." }
      </Text>

      <TouchableOpacity style={styles.button} onPress={toggleLed}>
        <Text style={styles.buttonText}>
          {ledStatus === "on" ? "Desligar ESP32" : "Ligar ESP32"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#16a34a", marginBottom: 12 },
  videoContainer: { width: "100%", height: 300, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
  video: { flex: 1 },
  status: { fontSize: 18, color: "#fff", marginVertical: 10 },
  button: { backgroundColor: "#16a34a", padding: 12, borderRadius: 8, marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});