// eslint-disable-next-line import/no-unresolved
import { AUTH_PASSWORD, AUTH_USERNAME, VERCEL_URL } from '@env';
import Slider from "@react-native-community/slider";
import axios from "axios";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

import { SparkBar } from '../../hive_body/hive_bar/SparkBar.tsx';

import { FALLBACK_LAT, FALLBACK_LON, MAX_POINTS, NodeStatus } from "../../hive_brain/hive_prime/EspManager.ts";

// ==================================
// HiveScreen
// ==================================
export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [zoom, setZoom] = useState(0.05);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const { width: winWidth } = useWindowDimensions();

  // =========================
  // Localização do usuário
  // =========================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      } catch (err) {
        console.error("Erro ao obter localização:", err);
      }
    })();
  }, []);

  // =========================
  // Status servidores
  // =========================
  const authHeader = "Basic " + btoa(`${AUTH_USERNAME}:${AUTH_PASSWORD}`);

  const fetchStatus = React.useCallback(async () => {
    try {
      const servers = ["192.168.4.1", "192.168.0.109"];
      const responses = await Promise.all(
        servers.map(async (server) => {
          let res;
          try {
            res = await axios.get(`http://${server}/status`, {
              timeout: 3000,
              headers: { Authorization: authHeader },
            });
          } catch (err) {
            // Fallback para VERCEL
            try {
              res = await axios.get(`${VERCEL_URL}/api/status?server=${server}`, {
                timeout: 5000,
                headers: { Authorization: authHeader },
              });
            } catch (err2) {
              return { server, status: "offline" as const, error: String(err2), latitude: FALLBACK_LAT, longitude: FALLBACK_LON, clients: [], anomaly: { detected: false, message: "", current_value: 0 } } as NodeStatus;
            }
          }

          const latitude = res.data.location?.latitude ?? FALLBACK_LAT;
          const longitude = res.data.location?.longitude ?? FALLBACK_LON;
          let clients: any[] = [];

          try {
            const clientsRes = await axios.get(`http://${server}/clients`, {
              timeout: 8000,
              headers: { Authorization: authHeader },
            });
            clients = clientsRes.data?.clients ?? [];
          } catch {
            // Fallback para VERCEL
            try {
              const clientsRes = await axios.get(`${VERCEL_URL}/api/clients?server=${server}`, {
                timeout: 8000,
                headers: { Authorization: authHeader },
              });
              clients = clientsRes.data?.clients ?? [];
            } catch {}
          }

          const node: NodeStatus = { ...res.data, server, latitude, longitude, clients };

          if (node.ultrassonico_m !== undefined && node.ultrassonico_m < 0.1) {
            node.anomaly = { detected: true, message: "Distância ultrassônica muito baixa!", current_value: node.ultrassonico_m };
            Vibration.vibrate(500);
            try {
              await axios.post(`${VERCEL_URL}/api/anomalia`, { server: node.server, device: node.device, message: node.anomaly.message, current_value: node.anomaly.current_value, timestamp: new Date().toISOString() });
            } catch {}
          } else {
            node.anomaly = { detected: false, message: "", current_value: node.ultrassonico_m ?? 0 };
          }

          return node;
        })
      );

      setStatus(responses);

      setHistory((prev) => {
        const next = { ...prev };
        responses.forEach((s) => {
          const key = s.server ?? "unknown";
          const prevArr = next[key] ?? [];
          if (typeof s.analog_percent === "number") {
            const newArr = [...prevArr, s.analog_percent];
            if (newArr.length > MAX_POINTS) {
              newArr.splice(0, newArr.length - MAX_POINTS);
            }
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
  }, [authHeader]);

  const sendCommand = async (server: string, command: string, payload?: any) => {
    try {
      const res = await axios.post(`http://${server}/command`, { command, ...payload }, { headers: { Authorization: authHeader }, timeout: 5000 });
      if (command === "ping" && res.data.analog_percent !== undefined) {
        setPingValues((prev) => ({ ...prev, [server]: res.data.analog_percent }));
      }
      fetchStatus();
    } catch (err) {
      console.error(`Erro ao enviar comando ${command} → ${server}:`, err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);
  const onlineStatus = status.filter((s) => s.status !== "offline");

  // =========================
  // Renderização
  // =========================
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{ latitude: userLocation?.latitude ?? FALLBACK_LAT, longitude: userLocation?.longitude ?? FALLBACK_LON, latitudeDelta: zoom, longitudeDelta: zoom }}
        showsUserLocation
      >
        {onlineStatus.map((s, idx) => (
          <Marker key={`srv-${idx}`} coordinate={{ latitude: s.latitude!, longitude: s.longitude! }} pinColor={s.status === "ativo" ? "green" : s.status === "parado" ? "orange" : "red"}>
            <Callout>
              <View style={{ padding: 4 }}>
                <Text>🖥️ {s.device || "Dispositivo"}</Text>
                <Text>📡 {s.server}</Text>
                {typeof s.temperatura_C === "number" && <Text>🌡️ {s.temperatura_C.toFixed(1)} °C</Text>}
                {typeof s.umidade_pct === "number" && <Text>💧 {s.umidade_pct.toFixed(1)} %</Text>}
                {s.presenca !== undefined && <Text>🚶 Presença: {s.presenca ? "Sim" : "Não"}</Text>}
                {s.ultrassonico_m !== undefined && <Text>📏 Distância: {s.ultrassonico_m.toFixed(2)} m</Text>}
                {s.anomaly?.detected && <Text style={{ color: "red", fontWeight: "bold" }}>⚠️ Anomalia: {s.anomaly.message} (valor atual: {s.anomaly.current_value.toFixed(2)})</Text>}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.sliderBox}>
        <Text style={{ textAlign: "center" }}>🔎 Zoom</Text>
        <Slider
          style={{ width: "90%", alignSelf: "center" }}
          minimumValue={0.01}
          maximumValue={100}
          step={0.005}
          value={zoom}
          onValueChange={setZoom}
        />
      </View>

      <View style={styles.pagePagination}>
        <Button title="Mapa" onPress={() => setCurrentPage(0)} />
        <Button title="Status Vespa" onPress={() => setCurrentPage(1)} />
      </View>

      {currentPage === 1 && (
        <ScrollView style={styles.overlayScroll} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.unisonCard}>
            {onlineStatus.map((s, idx) => {
              const serverKey = s.server ?? "unknown";
              const hist = history[serverKey] ?? [];
              return (
                <View key={idx} style={styles.nodeBox}>
                  <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
                  <Text style={styles.statusText}>📡 {s.server ?? "-"} - {s.status ?? "-"}</Text>
                  {s.analog_percent !== undefined && <Text style={styles.statusText}>⚡ Sensor: {s.analog_percent.toFixed(1)}%</Text>}
                  {typeof s.temperatura_C === "number" && <Text style={styles.statusText}>🌡️ Temperatura: {s.temperatura_C.toFixed(1)} °C</Text>}
                  {typeof s.umidade_pct === "number" && <Text style={styles.statusText}>💧 Umidade: {s.umidade_pct.toFixed(1)} %</Text>}
                  {s.presenca !== undefined && <Text style={styles.statusText}>🚶 Presença: {s.presenca ? "Sim" : "Não"}</Text>}
                  {s.ultrassonico_m !== undefined && <Text style={styles.statusText}>📏 Distância: {s.ultrassonico_m.toFixed(2)} m</Text>}
                  {s.anomaly?.detected && <Text style={[styles.statusText, { color: "red", fontWeight: "bold" }]}>⚠️ Anomalia: {s.anomaly.message} (valor atual: {s.anomaly.current_value.toFixed(2)})</Text>}

                  <View style={styles.buttonRow}>
                    <Button title="Ativar" disabled={!s.server} onPress={() => s.server && sendCommand(s.server, "activate")} />
                    <Button title="Desativar" disabled={!s.server} onPress={() => s.server && sendCommand(s.server, "deactivate")} />
                    <Button title="Ping" disabled={!s.server} onPress={() => s.server && sendCommand(s.server, "ping")} />
                  </View>

                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>📈 Histórico do Sensor ({serverKey}) — últimos {MAX_POINTS}s</Text>
                    <SparkBar data={hist} width={graphWidth} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ==================================
// Styles
// ==================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  sliderBox: { position: "absolute", bottom: 125, width: "100%" },
  pagePagination: { position: "absolute", bottom: 100, flexDirection: "row", justifyContent: "space-around", width: "100%" },
  overlayScroll: { position: "absolute", top: 0, width: "100%", maxHeight: "80%" },
  unisonCard: { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 12, top: 100, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4 },
  nodeBox: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 8 },
  nodeText: { fontSize: 16, fontWeight: "bold" },
  statusText: { fontSize: 14 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 6 },
  chartCard: { marginTop: 4 },
  chartBox: { position: "relative", justifyContent: "flex-end", backgroundColor: "#eee", borderRadius: 6, padding: 4 },
  chartAxis: { position: "absolute", left: 0, bottom: 0, height: "100%", width: 1, backgroundColor: "#888" },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end" },
  chartBar: { backgroundColor: "#3b82f6", borderRadius: 2 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between" },
  chartLabelText: { fontSize: 10 },
  chartTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
});