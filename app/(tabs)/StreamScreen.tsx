import React, { useEffect, useState } from "react";
import { Alert, Button, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

const ESP32_IP = "192.168.4.1"; // IP do Soft-AP

export default function CameraScreen() {
  const [streaming, setStreaming] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const parseResponse = async (res: Response) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  };

  const iniciarStreaming = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await parseResponse(res);
      if (res.ok) {
        setStreaming(true);
        setStreamUrl(`http://${ESP32_IP}/stream`);
      }
      Alert.alert(res.ok ? "✅ Streaming iniciado" : "❌ Erro", typeof data === "string" ? data : JSON.stringify(data));
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  const pararStreaming = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await parseResponse(res);
      if (res.ok) {
        setStreaming(false);
        setStreamUrl(null);
        carregarImagemSD();
      }
      Alert.alert(res.ok ? "🛑 Streaming parado" : "❌ Erro", typeof data === "string" ? data : JSON.stringify(data));
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  const capturarFoto = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/capture`);
      if (res.ok) {
        Alert.alert("📸 Foto capturada com sucesso!");
        carregarImagemSD();
      } else {
        Alert.alert("❌ Erro ao capturar foto");
      }
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  const carregarImagemSD = () => {
    setSavedImageUrl(`http://${ESP32_IP}/saved.jpg?_=${Date.now()}`);
  };

  // Atualiza imagem SD ao abrir a tela
  useEffect(() => {
    carregarImagemSD();
  }, []);

  // Função para pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    carregarImagemSD();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>📷 HIVE STREAM - ESP32-CAM</Text>

      {/* Streaming MJPEG */}
      {streamUrl && streaming ? (
        <Image
          source={{ uri: streamUrl }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.info}>{streaming ? "Carregando streaming..." : "Streaming parado"}</Text>
      )}

      <View style={styles.buttons}>
        <Button title="▶️ Iniciar Streaming" onPress={iniciarStreaming} disabled={streaming} />
        <Button title="⏹ Parar Streaming" onPress={pararStreaming} disabled={!streaming} />
      </View>

      <View style={styles.separator} />

      <Button title="📸 Capturar Foto" onPress={capturarFoto} />

      <Text style={[styles.subtitle, { marginTop: 20 }]}>Última foto salva no SD:</Text>
      {savedImageUrl ? (
        <Image
          source={{ uri: savedImageUrl }}
          style={styles.preview}
          resizeMode="contain"
          onError={() => setSavedImageUrl(null)}
        />
      ) : (
        <Text style={styles.info}>Nenhuma imagem carregada</Text>
      )}
      <Button title="🔄 Atualizar Imagem SD" onPress={carregarImagemSD} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#111"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600"
  },
  preview: {
    width: "90%",
    height: 300,
    borderRadius: 10,
    backgroundColor: "#000",
    marginVertical: 10
  },
  info: {
    color: "#aaa",
    marginVertical: 10,
    textAlign: "center"
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    width: "100%"
  },
  separator: {
    height: 1,
    backgroundColor: "#555",
    marginVertical: 15,
    width: "100%"
  }
});