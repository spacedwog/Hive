import axios from "axios";
import * as base64 from "base-64";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions
} from "react-native";

type NodeStatus = {
  device?: string;
  server?: string;
  status?: string;
  ultrassonico_cm?: number;
  analog?: number;
  error?: string;
};

const MAX_ANALOG = 2400;
const MAX_POINTS = 60; // histórico por servidor (60s)

// ==== Componente de gráfico nativo ====
const SparkBar: React.FC<{ data: number[]; width: number; height?: number }> = ({
  data,
  width,
  height = 120,
}) => {
  const n = Math.max(data.length, 1);
  const barGap = 2;
  const barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));

  return (
    <View style={[styles.chartBox, { width, height }]}>
      <View style={styles.chartAxis} />
      <View style={styles.chartBarsRow}>
        {data.map((v, i) => {
          const clamped = Math.max(0, Math.min(MAX_ANALOG, v));
          const h = Math.max(2, Math.round((clamped / MAX_ANALOG) * (height - 16)));
          return (
            <View
              key={`${i}-${v}`}
              style={[styles.chartBar, { width: barWidth, height: h, marginRight: i === n - 1 ? 0 : barGap }]}
            />
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabelText}>0</Text>
        <Text style={styles.chartLabelText}>{MAX_ANALOG}</Text>
      </View>
    </View>
  );
};

export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [pingValues, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [refreshing, setRefreshing] = useState(false);

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + base64.encode(`${authUsername}:${authPassword}`);

  // ==== Buscar status dos servidores ====
  const fetchStatus = async () => {
    try {
      const servers = ["192.168.4.1"];
      const responses = await Promise.all(
        servers.map(async (server) => {
          try {
            const res = await axios.get(`http://${server}/status`, {
              timeout: 3000,
              headers: { Authorization: authHeader },
            });
            return { ...res.data, server };
          } catch (err) {
            return { server, status: "offline", error: String(err) };
          }
        })
      );

      setStatus(responses);

      responses.forEach((s) => {
        if (s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10) {
          Vibration.vibrate(500);
        }
      });

      // Atualiza histórico
      setHistory((prev) => {
        const next = { ...prev };
        responses.forEach((s) => {
          const key = s.server ?? "unknown";
          if (typeof s.analog === "number") {
            const prevArr = next[key] ?? [];
            const newArr = [...prevArr, s.analog];
            if (newArr.length > MAX_POINTS) newArr.splice(0, newArr.length - MAX_POINTS);
            next[key] = newArr;
          } else if (!next[key]) next[key] = [];
        });
        return next;
      });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  };

  // ==== Enviar comando para servidor ====
  const sendCommand = async (server: string, command: string) => {
    try {
      const res = await axios.post(
        `http://${server}/command`,
        { command },
        { headers: { Authorization: authHeader } }
      );

      if (command === "ping" && res.data.analog !== undefined) {
        setPingValues((prev) => ({ ...prev, [server]: res.data.analog }));
      }

      fetchStatus();
    } catch (err) {
      console.error("Erro ao enviar comando:", err);
    }
  };

  // ==== Atualização contínua ====
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==== Pull-to-refresh ====
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const getAnalogColor = (analog?: number) => {
    if (analog === undefined) return "#ffffff";
    const norm = Math.min(Math.max(analog, 0), MAX_ANALOG) / MAX_ANALOG;
    if (norm < 0.5) {
      const r = 255;
      const g = Math.round(510 * norm);
      return `rgb(${r},${g},0)`;
    } else {
      const r = Math.round(510 * (1 - norm));
      const g = 255;
      return `rgb(${r},${g},0)`;
    }
  };

  const firstAnalog = status.find((s) => s.analog !== undefined)?.analog;
  const containerColorTuple: [string, string] = [getAnalogColor(firstAnalog), "#000000"];
  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);

  return (
    <LinearGradient colors={containerColorTuple} style={[styles.container, { minHeight: winHeight }]}>
      <FlatList
        data={status}
        keyExtractor={(item) => item.server || Math.random().toString()}
        contentContainerStyle={styles.flatListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: s }) => {
          const serverKey = s.server ?? "unknown";
          const isOffline = s.status === "offline";
          const isActive = s.status === "ativo";
          const isNear = s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10;

          const cardGradient: [string, string] = isNear
            ? ["#fff3cd", "#ffeeba"]
            : isOffline
            ? ["#f8d7da", "#f5c6cb"]
            : s.analog !== undefined
            ? [getAnalogColor(s.analog), "#000000"]
            : isActive
            ? ["#d4edda", "#c3e6cb"]
            : ["#ffffff", "#f8f9fa"];

          const hist = history[serverKey] ?? [];

          return (
            <>
              <LinearGradient colors={cardGradient} style={styles.nodeCard}>
                <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
                <Text style={styles.statusText}>📡 {s.server || "-"} - {s.status || "offline"}</Text>
                <Text style={styles.statusText}>📏 Distância: {s.ultrassonico_cm ?? "-"} cm</Text>

                {isNear && <Text style={styles.warningText}>⚠️ Dispositivo próximo!</Text>}
                {s.analog !== undefined && <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>}
                {pingValues[serverKey] !== undefined && (
                  <Text style={styles.statusText}>⚡ Ping Sensor: {pingValues[serverKey]}</Text>
                )}

                <View style={styles.buttonRow}>
                  <Button
                    title="Ativar"
                    disabled={isOffline || !s.server || isNear}
                    onPress={() => s.server && sendCommand(s.server, "activate")}
                  />
                  <Button
                    title="Desativar"
                    disabled={isOffline || !s.server || isNear}
                    onPress={() => s.server && sendCommand(s.server, "deactivate")}
                  />
                  <Button
                    title="Ping"
                    disabled={isOffline || !s.server || isNear}
                    onPress={() => s.server && sendCommand(s.server, "ping")}
                  />
                </View>
              </LinearGradient>

              <LinearGradient colors={["#1f1f1f", "#0f0f0f"]} style={styles.chartCard}>
                <Text style={styles.chartTitle}>
                  📈 Histórico do Analog ({serverKey}) — últimos {MAX_POINTS}s
                </Text>
                <SparkBar data={hist} width={graphWidth} />
                <View style={styles.chartFooter}>
                  <Text style={styles.chartFooterText}>Pontos: {hist.length}/{MAX_POINTS}</Text>
                  <Text style={styles.chartFooterText}>
                    Atual: {typeof s.analog === "number" ? s.analog : "-"}
                  </Text>
                </View>
              </LinearGradient>
            </>
          );
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center", alignItems: "center" },
  flatListContent: { flexGrow: 1, justifyContent: "center" },
  nodeCard: { padding: 12, borderRadius: 12, marginBottom: 12, elevation: 3, width: "90%", alignSelf: "center" },
  chartCard: { width: "90%", alignSelf: "center", borderRadius: 12, padding: 12, marginBottom: 24, elevation: 3 },
  chartTitle: { fontSize: 14, fontWeight: "600", color: "#eaeaea", textAlign: "center", marginBottom: 8 },
  chartBox: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", alignSelf: "center", paddingTop: 8, paddingHorizontal: 8 },
  chartAxis: { position: "absolute", bottom: 8, left: 8, right: 8, height: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end", height: "100%", paddingBottom: 8 },
  chartBar: { backgroundColor: "#50fa7b", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabels: { position: "absolute", top: 4, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" },
  chartLabelText: { fontSize: 10, color: "rgba(255,255,255,0.6)" },
  chartFooter: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  chartFooterText: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  nodeText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  statusText: { fontSize: 14, marginTop: 4, textAlign: "center" },
  warningText: { fontSize: 16, marginTop: 6, fontWeight: "bold", color: "#856404", textAlign: "center" },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
});