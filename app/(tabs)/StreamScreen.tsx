import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ESP32_IP = "192.168.4.1"; // IP do SoftAP do ESP32-CAM

export default function CameraScreen() {
  const [lastImage, setLastImage] = useState<string>(""); 
  const [refreshing, setRefreshing] = useState(false);

  // Buscar última imagem do SD
  const fetchLastImage = async () => {
    try {
      const url = `http://${ESP32_IP}/saved.jpg?_=${Date.now()}`;
      const res = await fetch(url, { method: "HEAD" }); // só testa se existe
      if (res.ok) {
        setLastImage(url);
      } else {
        setLastImage("");
      }
    } catch {
      setLastImage("");
    }
  };

  // Atualiza ao abrir a tela
  useEffect(() => {
    fetchLastImage();
  }, []);

  // Atualização com pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLastImage();
    setRefreshing(false);
  };

  // Interpreta resposta do ESP32
  const parseResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  // Iniciar gravação
  const iniciarGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await parseResponse(res);
      Alert.alert(
        res.ok ? "✅ Gravação iniciada" : "❌ Erro ao iniciar gravação",
        typeof data === "string" ? data : JSON.stringify(data)
      );
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Parar gravação
  const pararGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await parseResponse(res);
      Alert.alert(
        res.ok ? "🛑 Gravação parada" : "❌ Erro ao parar gravação",
        typeof data === "string" ? data : JSON.stringify(data)
      );
      fetchLastImage();
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Captura manual de foto
  const capturarFoto = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/capture`);
      const data = await parseResponse(res);
      Alert.alert(
        res.ok ? "📸 Foto capturada" : "❌ Erro ao capturar foto",
        typeof data === "string" ? data : JSON.stringify(data)
      );
      setTimeout(fetchLastImage, 1000); // espera salvar no SD
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>📷 HIVE STREAM</Text>

      {lastImage ? (
        <Image
          source={{ uri: lastImage }}
          style={styles.preview}
          resizeMode="contain"
          onError={() => setLastImage("")}
        />
      ) : (
        <Text style={styles.info}>Carregando última imagem do SD...</Text>
      )}

      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="▶️ Iniciar Gravação" onPress={iniciarGravacao} />
        </View>
        <View style={styles.button}>
          <Button title="⏹ Parar Gravação" onPress={pararGravacao} />
        </View>
      </View>

      <View style={[styles.buttons, { marginTop: 10 }]}>
        <View style={styles.button}>
          <Button title="📸 Capturar Foto" onPress={capturarFoto} />
        </View>
        <View style={styles.button}>
          <Button title="🔄 Atualizar" onPress={fetchLastImage} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  preview: {
    width: "90%",
    height: 300,
    borderRadius: 10,
    backgroundColor: "#000",
    marginBottom: 20,
  },
  info: {
    color: "#aaa",
    marginBottom: 20,
  },
  buttons: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});