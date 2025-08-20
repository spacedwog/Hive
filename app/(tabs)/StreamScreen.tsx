import React, { useEffect, useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";

const ESP32_IP = "192.168.4.1"; // IP padrão do Soft-AP

export default function CameraScreen() {
  const [frameUrl, setFrameUrl] = useState<string>("");

  // Atualiza frame a cada 1 segundo (pulling simples)
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameUrl(`http://${ESP32_IP}/capture?_=${Date.now()}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Função auxiliar para interpretar resposta
  const parseResponse = async (res: Response) => {
    const text = await res.text(); // lê o corpo uma vez
    try {
      return JSON.parse(text); // tenta converter para JSON
    } catch {
      return text; // se falhar, retorna texto puro
    }
  };

  const iniciarGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await parseResponse(res);
      if (res.ok) {
        Alert.alert("✅ Gravação iniciada", typeof data === "string" ? data : JSON.stringify(data));
      } else {
        Alert.alert("❌ Erro ao iniciar gravação", typeof data === "string" ? data : JSON.stringify(data));
      }
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  const pararGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await parseResponse(res);
      if (res.ok) {
        Alert.alert("🛑 Gravação parada", typeof data === "string" ? data : JSON.stringify(data));
      } else {
        Alert.alert("❌ Erro ao parar gravação", typeof data === "string" ? data : JSON.stringify(data));
      }
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 HIVE STREAM</Text>

      {frameUrl ? (
        <Image
          source={{ uri: frameUrl }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.info}>Conectando à câmera...</Text>
      )}

      <View style={styles.buttons}>
        <Button title="▶️ Iniciar Gravação" onPress={iniciarGravacao} />
        <Button title="⏹ Parar Gravação" onPress={pararGravacao} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center",  
    alignItems: "center",      
    backgroundColor: "#111",
    padding: 20
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  preview: { width: "90%", height: 300, borderRadius: 10, backgroundColor: "#000" },
  info: { color: "#aaa", marginBottom: 20 },
  buttons: { marginTop: 20, width: "90%", gap: 10, alignItems: "center" }
});