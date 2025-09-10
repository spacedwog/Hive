import { Camera, CameraView } from "expo-camera";
import React, { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

// IPs do ESP32
const SOFTAP_IP = "http://192.168.4.1"; // ESP32 Soft-AP
const STA_IP = "http://192.168.15.188"; // ESP32 na rede Wi-Fi

// Endpoint JSON Vercel
const VERCEL_URL = "https://hive-qm9vhar10-spacedwogs-projects.vercel.app/api/status";

type StatusResponse = {
  led_builtin: "on" | "off";
  led_opposite: "on" | "off";
  ip: string;
};

export default function StreamScreen() {
  const [status, setStatus] = useState<StatusResponse>({
    led_builtin: "off",
    led_opposite: "on",
    ip: SOFTAP_IP,
  });
  const [vercelData, setVercelData] = useState<any>(null);
  const [mode, setMode] = useState<"Soft-AP" | "STA">("Soft-AP");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [, setFrameUrl] = useState(`${status.ip}/stream?${Date.now()}`);

  // Solicita permissão para câmera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Atualiza o frame do MJPEG do ESP32 a cada 200ms
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameUrl(`${status.ip}/stream?${Date.now()}`);
    }, 200);
    return () => clearInterval(interval);
  }, [status.ip]);

  // Busca dados do endpoint JSON do Vercel
  useEffect(() => {
    const fetchVercel = async () => {
      try {
        const response = await fetch(VERCEL_URL);
        const data = await response.json(); // JSON garantido
        setVercelData(data);
      } catch (err) {
        console.error("Erro ao acessar Vercel:", err);
      }
    };
    fetchVercel();
  }, []);

  // Alterna LED do ESP32
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

  // Alterna entre Soft-AP e STA
  const switchMode = () => {
    const newMode = mode === "Soft-AP" ? "STA" : "Soft-AP";
    const newIP = newMode === "Soft-AP" ? SOFTAP_IP : STA_IP;
    setMode(newMode);
    setStatus((prev) => ({ ...prev, ip: newIP }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 HIVE STREAM</Text>

      {/* Dados do Vercel */}
      <Text style={[styles.text, { marginTop: 20 }]}>🌐 Dados do Vercel (JSON):</Text>
      <View style={styles.dataBox}>
        {vercelData ? (
          <Text style={{ color: "#0f0" }}>{JSON.stringify(vercelData, null, 2)}</Text>
        ) : (
          <Text style={{ color: "#f00" }}>Carregando...</Text>
        )}
      </View>

      {/* Dados do ESP32 */}
      <Text style={[styles.text, { marginTop: 20 }]}>💡 Status ESP32:</Text>
      <View style={styles.dataBox}>
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

      {/* Câmera nativa */}
      <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera Nativa:</Text>
      <View style={styles.nativeCamera}>
        {hasPermission ? (
          <>
            <CameraView style={StyleSheet.absoluteFill} facing={type} />
            <Button
              title="🔄 Trocar câmera"
              onPress={() => setType(type === "back" ? "front" : "back")}
              color="#0af"
            />
          </>
        ) : (
          <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
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
    justifyContent: "flex-start",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 15, textAlign: "center" },
  text: { fontSize: 16, color: "#fff", marginVertical: 5, textAlign: "center" },
  dataBox: {
    width: "100%",
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 15,
  },
  nativeCamera: { width: "100%", height: 350, borderWidth: 2, borderColor: "#0f0", borderRadius: 10, overflow: "hidden", marginTop: 10, backgroundColor: "black" },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
});