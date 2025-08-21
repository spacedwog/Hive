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
  const [espData, setEspData] = useState<{ sensor: number; battery: number }>({
    sensor: 0,
    battery: 0,
  });

  // Buscar última imagem do SD
  const fetchLastImage = async () => {
    try {
      const url = `http://${ESP32_IP}/saved.jpg?_=${Date.now()}`;
      const res = await fetch(url, { method: "HEAD" }); // só testa se existe
      if (res.ok) {
        setLastImage(url);
        fetchESPData(); // atualiza dados do ESP32
      } else {
        setLastImage("");
      }
    } catch {
      setLastImage("");
    }
  };

  // Atualização com pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLastImage();
    setRefreshing(false);
  };

  // Buscar dados do ESP32
  const fetchESPData = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/capture`);
      const text = await res.text();

      // Extrai os dados do HTML (sensor e bateria)
      const sensorMatch = text.match(/<b>Sensor:<\/b>\s*(\d+)/);
      const batteryMatch = text.match(/<b>Tensão da bateria:<\/b>\s*([\d.]+)/);

      setEspData({
        sensor: sensorMatch ? parseInt(sensorMatch[1], 10) : 0,
        battery: batteryMatch ? parseFloat(batteryMatch[1]) : 0,
      });
    } catch (err) {
      console.warn("Erro ao buscar dados do ESP32:", err);
      setEspData({ sensor: 0, battery: 0 });
    }
  };

  // Iniciar gravação
  const iniciarGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await res.text();
      Alert.alert(res.ok ? "✅ Gravação iniciada" : "❌ Erro ao iniciar gravação", data);
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Parar gravação
  const pararGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await res.text();
      Alert.alert(res.ok ? "🛑 Gravação parada" : "❌ Erro ao parar gravação", data);
      fetchLastImage();
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Captura manual de foto
  const capturarFoto = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/capture`);
      const data = await res.text();
      Alert.alert(res.ok ? "📸 Foto capturada" : "❌ Erro ao capturar foto", data);
      setTimeout(fetchLastImage, 1000); // espera salvar no SD
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  useEffect(() => {
    fetchLastImage();
  }, []);

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

      {/* Card de dados do ESP32 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Dados do ESP32 (Vespa)</Text>
        <Text style={styles.cardText}>Sensor: {espData.sensor}</Text>
        <Text style={styles.cardText}>
          Tensão da bateria: {espData.battery.toFixed(2)} V
        </Text>
      </View>

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
  card: {
    width: "90%",
    backgroundColor: "#222",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 5,
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