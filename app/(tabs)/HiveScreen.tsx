import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { WebView } from "react-native-webview";

const authHeader = "spacedwog Kimera12@"; // ajuste conforme necessário
const MAX_POINTS = 20;

// Lista de servidores candidatos (AP + STA)
const serverCandidates = [
  "192.168.4.1",   // AP (modo Access Point)
  "esp32.local",   // STA (via mDNS)
  "192.168.15.166", // STA fixo (exemplo)
  "192.168.1.50",  // outro IP comum
];

const HiveScreen = () => {
  const [status, setStatus] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  // Buscar status dos servidores
  const fetchStatus = async () => {
    try {
      const responses = await Promise.all(
        serverCandidates.map(async (server) => {
          try {
            const res = await axios.get(`http://${server}/status`, {
              timeout: 2500,
              headers: { Authorization: authHeader },
            });
            return { ...res.data, server };
          } catch (err) {
            return { server, status: "offline", error: String(err) };
          }
        })
      );

      const valid = responses.filter((s) => s.status !== "offline");

      setStatus(valid.length > 0 ? valid : responses);

      // Vibração caso objeto próximo (ultrassônico < 10cm)
      valid.forEach((s) => {
        if (s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10) {
          Vibration.vibrate(500);
        }
      });

      // Atualizar histórico
      setHistory((prev) => {
        const next = { ...prev };
        responses.forEach((s) => {
          const key = s.server ?? "unknown";
          if (typeof s.analog === "number") {
            const prevArr = next[key] ?? [];
            const newArr = [...prevArr, s.analog];
            if (newArr.length > MAX_POINTS)
              newArr.splice(0, newArr.length - MAX_POINTS);
            next[key] = newArr;
          } else if (!next[key]) {
            next[key] = [];
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // atualiza a cada 5s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>🐝 Hive Status</Text>

      {status.length === 0 ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        status.map((s, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.server}>{s.server}</Text>
            <Text>Status: {s.status ?? "??"}</Text>
            {s.ultrassonico_cm !== undefined && (
              <Text>Ultrassônico: {s.ultrassonico_cm} cm</Text>
            )}
            {s.analog !== undefined && (
              <Text>Sensor Analógico: {s.analog}</Text>
            )}

            {history[s.server] && history[s.server].length > 0 && (
              <LineChart
                data={{
                  labels: history[s.server].map((_, i) => i.toString()),
                  datasets: [{ data: history[s.server] }],
                }}
                width={300}
                height={150}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                }}
                bezier
                style={styles.chart}
              />
            )}
          </View>
        ))
      )}

      <View style={styles.webviewContainer}>
        <Text style={styles.subtitle}>🌐 Web Interface</Text>
        <WebView
          source={{ uri: `http://${status[0]?.server ?? "192.168.4.1"}` }}
          style={{ height: 300, width: "100%" }}
        />
      </View>
    </ScrollView>
  );
};

export default HiveScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f4f4f4",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    marginVertical: 8,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  server: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  chart: {
    marginTop: 8,
    borderRadius: 8,
  },
  webviewContainer: {
    marginTop: 20,
    height: 320,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
  },
});