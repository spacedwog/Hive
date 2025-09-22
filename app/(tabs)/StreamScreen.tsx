import { Camera, CameraView } from "expo-camera";
import React, { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import Esp32Service, { Esp32Status } from "../../hive_brain/hive_stream/Esp32Service";
import VercelService from "../../hive_brain/hive_stream/VercelService";

export default function StreamScreen() {
  const [esp32Service] = useState(() => new Esp32Service());
  const [vercelService] = useState(() => new VercelService());
  const [status, setStatus] = useState<Esp32Status>({ ...esp32Service.status });
  const [mode, setMode] = useState<"Soft-AP" | "STA">(esp32Service.mode);
  const [vercelData, setVercelData] = useState<any>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [, setFrameUrl] = useState(`${status.ip}/stream?${Date.now()}`);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameUrl(`${status.ip}/stream?${Date.now()}`);
    }, 2000);
    return () => clearInterval(interval);
  }, [status.ip]);

  useEffect(() => {
    const fetchVercelData = async () => {
      const { data, html } = await vercelService.fetchData();
      setVercelData(data);
      setVercelHTML(html);
    };
    fetchVercelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLed = async () => {
    try {
      await esp32Service.toggleLed();
      setStatus({ ...esp32Service.status });
    } catch (error) {
      console.error("Erro ao acessar ESP32:", error);
    }
  };

  const switchMode = () => {
    esp32Service.switchMode();
    setMode(esp32Service.mode);
    setStatus({ ...esp32Service.status });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM 📡</Text>

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
              <CameraView style={StyleSheet.absoluteFill} facing={type} />
              <Button
                title="🔄 Trocar câmera"
                onPress={() => setType(type === "back" ? "front" : "back")}
                color="#0af"
              />
              <ScrollView style={styles.vercelOverlay}>
                {vercelHTML ? (
                  <Text style={styles.vercelText}>HTML carregado do Vercel</Text>
                ) : vercelData ? (
                  <Text style={styles.vercelText}>
                    {JSON.stringify(vercelData, null, 1)}
                  </Text>
                ) : (
                  <Text style={[styles.vercelText, { color: "red" }]}>
                    Carregando dados Vercel...
                  </Text>
                )}
              </ScrollView>
            </>
          ) : (
            <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
          )}
        </View>
      </ScrollView>
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
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 15, textAlign: "center" },
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
  vercelOverlay: {
    position: "absolute",
    bottom: 5,
    left: 5,
    right: 5,
    maxHeight: 260,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 5,
    borderRadius: 5,
  },
  vercelText: {
    color: "#0f0",
    fontSize: 12,
  },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
});