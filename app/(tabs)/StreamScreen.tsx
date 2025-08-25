import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { WebView } from "react-native-webview";

const ESP32_IP = "http://192.168.4.1"; // IP do ESP32-CAM no SoftAP

type StatusResponse = {
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  camera: string;
  ip: string;
};

export default function App() {
  const [status, setStatus] = useState<StatusResponse>({
    led_builtin: "off",
    led_opposite: "on",
    camera: "Erro",
    ip: ESP32_IP
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${ESP32_IP}/status`);
      const data: StatusResponse = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Erro ao buscar status do ESP32:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLed = async () => {
    try {
      setLoading(true);
      const newState = status.led_builtin === "on" ? "L" : "H";
      await fetch(`${ESP32_IP}/${newState}`);
      fetchStatus();
    } catch (error) {
      console.error("Erro ao acessar ESP32:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatus().finally(() => setRefreshing(false));
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>📡 HIVE STREAM - ESP32-CAM</Text>

      <Text style={styles.text}>
        LED pino 2:{" "}
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

      <Text style={styles.text}>
        Câmera:{" "}
        <Text style={{ color: status.camera === "OK" ? "green" : "red" }}>
          {status.camera}
        </Text>
      </Text>

      <Text style={styles.text}>IP do ESP32: {status.ip}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <Button
          title={status.led_builtin === "on" ? "Desligar ESP32" : "Ligar ESP32"}
          onPress={toggleLed}
        />
      )}

      <Text style={styles.text}>📷 Câmera ao vivo:</Text>
      <View style={styles.videoContainer}>
        <WebView
          source={{ uri: `${ESP32_IP}/stream` }}
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
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