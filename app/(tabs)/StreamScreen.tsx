import React, { useEffect, useRef, useState } from "react";
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
import EventSource from "react-native-event-source"; // SSE para React Native

const ESP32_IP = "192.168.4.1"; // IP do SoftAP do ESP32-CAM
const STREAM_URL = `http://${ESP32_IP}/stream`; // MJPEG stream
const WS_URL = `ws://${ESP32_IP}:81`; // WebSocket da Vespa
const SSE_URL = `http://${ESP32_IP}/vespa/stream`; // SSE do ESP32

export default function CameraScreen() {
  const [lastImage, setLastImage] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [vespaData, setVespaData] = useState<any>({});
  const [streaming, setStreaming] = useState(false);
  const [streamData, setStreamData] = useState<any>({});

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Buscar última imagem do SD
  const fetchLastImage = async () => {
    try {
      const url = `http://${ESP32_IP}/saved.jpg?_=${Date.now()}`;
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        setLastImage(url);
      } else {
        setLastImage("");
      }
    } catch {
      setLastImage("");
    }
  };

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLastImage();
    setRefreshing(false);
  };

  // Iniciar gravação
  const iniciarGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await res.text();
      setStreaming(true);
      Alert.alert(res.ok ? "✅ Gravação iniciada" : "❌ Erro ao iniciar gravação", data);
    } catch (err: any) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Parar gravação
  const pararGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await res.text();
      setStreaming(false);
      Alert.alert(res.ok ? "🛑 Gravação parada" : "❌ Erro ao parar gravação", data);
      fetchLastImage();
    } catch (err: any) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Captura manual de foto
  const capturarFoto = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/capture`);
      const data = await res.text();
      Alert.alert(res.ok ? "📸 Foto capturada" : "❌ Erro ao capturar foto", data);
      setTimeout(fetchLastImage, 1000);
    } catch (err: any) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  // Inicializa WebSocket para dados da Vespa
  useEffect(() => {
    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log("WebSocket conectado ao ESP32-CAM");
    };

    wsRef.current.onmessage = (event: { data: string }) => {
      try {
        const data = JSON.parse(event.data);
        setVespaData(data);
      } catch (err: any) {
        console.warn("Erro ao parsear dados WS:", err);
      }
    };

    wsRef.current.onerror = (err: any) => {
      console.warn("WebSocket erro:", err);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket desconectado");
      // Tenta reconectar em 5s
      setTimeout(() => {
        wsRef.current = new WebSocket(WS_URL);
      }, 5000);
    };

    fetchLastImage();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Inicializa SSE para dados do streaming
  useEffect(() => {
    sseRef.current = new EventSource(SSE_URL);

    sseRef.current.addEventListener("message", (event: any) => {
      try {
        setStreamData(JSON.parse(event.data));
      } catch (err: any) {
        console.warn("Erro ao parsear SSE:", err);
      }
    });

    sseRef.current.addEventListener("error", (err: any) => {
      console.warn("SSE erro:", err);
      sseRef.current?.close();
      setTimeout(() => {
        sseRef.current = new EventSource(SSE_URL);
      }, 5000);
    });

    return () => {
      sseRef.current?.close();
    };
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>📷 HIVE STREAM</Text>

      {/* Streaming ou última imagem */}
      {streaming ? (
        <Image
          source={{ uri: STREAM_URL }}
          style={styles.preview}
          resizeMode="contain"
          onError={() => setStreaming(false)}
        />
      ) : lastImage ? (
        <Image
          source={{ uri: lastImage }}
          style={styles.preview}
          resizeMode="contain"
          onError={() => setLastImage("")}
        />
      ) : (
        <Text style={styles.info}>Carregando última imagem do SD...</Text>
      )}

      {/* Card de dados da Vespa */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Dados da Vespa</Text>
        {vespaData.device ? (
          <>
            <Text style={styles.cardText}>Status: {vespaData.status}</Text>
            <Text style={styles.cardText}>Ultrassônico: {vespaData.ultrassonico_cm} cm</Text>
            <Text style={styles.cardText}>Sensor Analógico: {vespaData.analog}</Text>
            <Text style={styles.cardText}>IP do Server: {vespaData.server}</Text>
          </>
        ) : (
          <Text style={styles.cardText}>Carregando dados...</Text>
        )}
      </View>

      {/* Card de dados do streaming */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📡 Dados do Streaming</Text>
        {streamData.frame ? (
          <>
            <Text style={styles.cardText}>Frame: {streamData.frame}</Text>
            <Text style={styles.cardText}>FPS: {streamData.fps}</Text>
            <Text style={styles.cardText}>Timestamp: {streamData.timestamp}</Text>
          </>
        ) : (
          <Text style={styles.cardText}>Carregando dados do streaming...</Text>
        )}
      </View>

      {/* Controles de gravação */}
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="▶️ Iniciar Gravação" onPress={iniciarGravacao} />
        </View>
        <View style={styles.button}>
          <Button title="⏹ Parar Gravação" onPress={pararGravacao} />
        </View>
      </View>

      {/* Controles de foto e atualização */}
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