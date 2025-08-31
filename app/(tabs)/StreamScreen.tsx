import React, { useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const ESP32_IP = "http://192.168.4.1"; // IP do ESP32 no SoftAP

type StatusResponse = {
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  ip: string;
};

export default function App() {
  const [status, setStatus] = useState<StatusResponse>({
    led_builtin: "off",
    led_opposite: "on",
    ip: ESP32_IP,
  });

  const toggleLed = async () => {
    try {
      const newState = status.led_builtin === "on" ? "L" : "H";
      await fetch(`${ESP32_IP}/${newState}`);
      // Atualiza localmente para feedback imediato
      setStatus({
        ...status,
        led_builtin: status.led_builtin === "on" ? "off" : "on",
        led_opposite: status.led_opposite === "on" ? "off" : "on",
      });
    } catch (error) {
      console.error("Erro ao acessar ESP32:", error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM - ESP32</Text>

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

      <Text style={styles.text}>📷 Câmera ao vivo:</Text>
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: `${ESP32_IP}/stream` }}
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          onHttpError={({ nativeEvent }) => console.log("HTTP Error:", nativeEvent)}
          onLoadProgress={({ nativeEvent }) => {
            // Extrai o status do header X-ESP32-Status
            const header = nativeEvent.title; // WebView não dá acesso direto aos headers
            // Caso queira realmente ler status em tempo real, seria necessário um websocket ou fetch separado
          }}
        />
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
});