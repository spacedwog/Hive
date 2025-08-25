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

export default function App() {
  const [ledState, setLedState] = useState<"on" | "off">("off");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLedState();
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
      const newState = ledState === "on" ? "L" : "H";
      await fetch(`${ESP32_IP}/${newState}`);
      fetchLedState();
    } catch (error) {
      console.error("Erro ao alternar LED:", error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLedState().finally(() => setRefreshing(false));
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
        LED:{" "}
        <Text style={{ color: ledState === "on" ? "green" : "red" }}>
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
    justifyContent: "center", // centraliza verticalmente
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
    marginVertical: 10,
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