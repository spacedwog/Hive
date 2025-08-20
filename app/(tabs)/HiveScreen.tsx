import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Button,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

// ==== Tipagens ====
type NodeStatus = {
  device?: string;
  server?: string;
  status?: string;
  ultrassonico_cm?: number;
  analog?: number;
  error?: string;
};

// ==== Componente Principal ====
export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [pingValues, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});

  // ==== Simulação de fetchStatus ====
  const fetchStatus = async () => {
    const servers = ["192.168.4.1"];
    const responses: NodeStatus[] = servers.map((server) => ({
      server,
      device: "Dispositivo " + server,
      status: Math.random() > 0.2 ? "ativo" : "offline",
      ultrassonico_cm: Math.floor(Math.random() * 50),
      analog: Math.floor(Math.random() * 1024),
    }));
    setStatus(responses);
  };

  // ==== Enviar comando (simulado) ====
  const sendCommand = async (server: string, command: string) => {
    console.log(`Comando enviado: ${command} -> ${server}`);
    if (command === "ping") {
      setPingValues((prev) => ({
        ...prev,
        [server]: Math.floor(Math.random() * 1024),
      }));
    }
    fetchStatus();
  };

  // ==== Histórico AsyncStorage ====
  const updateHistory = async (sensor: NodeStatus) => {
    if (!sensor.server || sensor.analog === undefined) return;
    const key = `sensor_${sensor.server}`;

    try {
      const previous = await AsyncStorage.getItem(key);
      const log = previous ? JSON.parse(previous) : [];
      log.push(sensor.analog);
      if (log.length > 20) log.shift(); // manter últimos 20 valores
      await AsyncStorage.setItem(key, JSON.stringify(log));
      setHistory((prev) => ({ ...prev, [sensor.server!]: log }));
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
    }
  };

  // ==== Efeito de atualização contínua + métodos nativos ====
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchStatus();

      status.forEach(async (sensor) => {
        // Vibração se distância < 10cm
        if (sensor.ultrassonico_cm !== undefined && sensor.ultrassonico_cm < 10) {
          Vibration.vibrate(500);
        }

        // Atualizar histórico
        await updateHistory(sensor);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // ==== Renderização ====
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FlatList
        data={status}
        keyExtractor={(item) => item.server || Math.random().toString()}
        renderItem={({ item: s }) => {
          const serverKey = s.server ?? "unknown";
          const isOffline = s.status === "offline";
          const isActive = s.status === "ativo";
          const cardColor = isOffline
            ? "#f8d7da"
            : isActive
            ? "#d4edda"
            : "#fff";

          // Dados para o gráfico
          const chartData = history[serverKey] || [];

          return (
            <View style={[styles.nodeCard, { backgroundColor: cardColor }]}>
              <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
              <Text style={styles.statusText}>
                📡 {s.server || "-"} - {s.status || "offline"}
              </Text>
              <Text style={styles.statusText}>
                📏 Distância: {s.ultrassonico_cm ?? "-"} cm
              </Text>
              {s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10 && (
                <Text style={[styles.statusText, { color: "red", fontWeight: "700" }]}>
                  ⚠️ Dispositivo muito próximo!
                </Text>
              )}
              {s.analog !== undefined && (
                <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>
              )}
              {pingValues[serverKey] !== undefined && (
                <Text style={styles.statusText}>
                  ⚡ Ping Sensor: {pingValues[serverKey]}
                </Text>
              )}

              {/* Gráfico do analog */}
              {chartData.length > 0 && (
                <LineChart
                  data={{
                    labels: chartData.map((_, idx) => (idx + 1).toString()),
                    datasets: [{ data: chartData }],
                  }}
                  width={Dimensions.get("window").width * 0.85}
                  height={180}
                  chartConfig={{
                    backgroundColor: "#f4f4f8",
                    backgroundGradientFrom: "#f4f4f8",
                    backgroundGradientTo: "#f4f4f8",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    labelColor: () => "#333",
                    style: { borderRadius: 12 },
                    propsForDots: { r: "3", strokeWidth: "1", stroke: "#007AFF" },
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 12 }}
                />
              )}

              <View style={styles.buttonRow}>
                <Button
                  title="Ativar"
                  disabled={isOffline || !s.server}
                  onPress={() => s.server && sendCommand(s.server, "activate")}
                />
                <Button
                  title="Desativar"
                  disabled={isOffline || !s.server}
                  onPress={() => s.server && sendCommand(s.server, "deactivate")}
                />
                <Button
                  title="Ping"
                  disabled={isOffline || !s.server}
                  onPress={() => s.server && sendCommand(s.server, "ping")}
                />
              </View>
            </View>
          );
        }}
      />
    </ScrollView>
  );
}

// ==== Estilos ====
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f4f4f8",
    alignItems: "center",
  },
  nodeCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    width: "90%",
    alignSelf: "center",
  },
  nodeText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  statusText: { fontSize: 14, marginTop: 4, textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
});