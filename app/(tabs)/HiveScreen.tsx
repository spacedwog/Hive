import Slider from "@react-native-community/slider";
import axios from "axios";
import * as base64 from "base-64";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

type NodeStatus = {
  device?: string;
  server?: string;
  status?: "ativo" | "parado" | "offline";
  ultrassonico_m?: number;
  analog_percent?: number;
  presenca?: boolean;
  temperatura_C?: number | null;
  umidade_pct?: number | null;
  timestamp?: string;
  error?: string;
  latitude?: number;
  longitude?: number;
  clients?: ClientInfo[];
};

type ClientInfo = {
  mac: string;
  ip: string;
  rssi?: number;
  latitude?: number;
  longitude?: number;
};

const MAX_POINTS = 60;

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
          const clamped = Math.max(0, Math.min(100, v));
          const h = Math.max(2, Math.round((clamped / 100) * (height - 16)));
          return (
            <View
              key={`${i}-${v}`}
              style={[
                styles.chartBar,
                { width: barWidth, height: h, marginRight: i === n - 1 ? 0 : barGap },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabelText}>0%</Text>
        <Text style={styles.chartLabelText}>100%</Text>
      </View>
    </View>
  );
};

export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [pingValues, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [zoom, setZoom] = useState(0.05);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + base64.encode(`${authUsername}:${authPassword}`);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permissão de localização negada");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    })();
  }, []);

  const fetchStatus = React.useCallback(async () => {
    try {
      const servers = ["192.168.4.1", "192.168.15.166"];
      const responses = await Promise.all(
        servers.map(async (server) => {
          try {
            const res = await axios.get(`http://${server}/status`, {
              timeout: 3000,
              headers: { Authorization: authHeader },
            });

            const latitude = res.data.location?.latitude ?? -23.5505;
            const longitude = res.data.location?.longitude ?? -46.6333;

            let clients: ClientInfo[] = [];
            try {
              const clientsRes = await axios.get(`http://${server}/clients`, {
                timeout: 3000,
                headers: { Authorization: authHeader },
              });
              clients = clientsRes.data?.clients ?? [];
            } catch (err) {
              console.warn(`Não foi possível buscar clientes de ${server}`);
              console.error(`Ocorreu um erro ao buscar clientes de ${server}:`, err);
            }

            return { ...res.data, server, latitude, longitude, clients };
          } catch (err) {
            return {
              server,
              status: "offline",
              error: String(err),
              latitude: -23.55,
              longitude: -46.63,
              clients: [],
            };
          }
        })
      );

      setStatus(responses);

      responses.forEach((s) => {
        if (s.ultrassonico_m !== undefined && s.ultrassonico_m < 0.1) Vibration.vibrate(500);
      });

      setHistory((prev) => {
        const next = { ...prev };
        responses.forEach((s) => {
          const key = s.server ?? "unknown";
          const prevArr = next[key] ?? [];
          if (typeof s.analog_percent === "number") {
            const newArr = [...prevArr, s.analog_percent];
            if (newArr.length > MAX_POINTS) newArr.splice(0, newArr.length - MAX_POINTS);
            next[key] = newArr;
          } else if (!next[key]) next[key] = [];
        });
        return next;
      });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  }, [authHeader]);

  const sendCommand = async (server: string, command: string, payload?: any) => {
    try {
      const res = await axios.post(`http://${server}/command`, { command, ...payload }, {
        headers: { Authorization: authHeader },
      });

      if (command === "ping" && res.data.analog_percent !== undefined) {
        setPingValues((prev) => ({ ...prev, [server]: res.data.analog_percent }));
      }

      fetchStatus();
    } catch (err) {
      console.error("Erro ao enviar comando:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);
  const onlineStatus = status.filter((s) => s.status !== "offline");

  return (
    <View style={[styles.container, { minHeight: winHeight }]}>
      <View style={{ flex: 1 }}>
        <FlatList
          data={onlineStatus}
          keyExtractor={(item) => item.server || Math.random().toString()}
          contentContainerStyle={styles.flatListContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item: s }) => {
            const serverKey = s.server ?? "unknown";
            const isNear = s.ultrassonico_m !== undefined && s.ultrassonico_m < 0.1;
            const hist = history[serverKey] ?? [];

            return (
              <View style={styles.nodeCard}>
                <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
                <Text style={styles.statusText}>📡 {s.server ?? "-"} - {s.status ?? "-"}</Text>
                <Text style={styles.statusText}>📏 Distância: {s.ultrassonico_m?.toFixed(2) ?? "-"} m</Text>
                {isNear && <Text style={styles.warningText}>⚠️ Dispositivo próximo!</Text>}
                {s.analog_percent !== undefined && <Text style={styles.statusText}>⚡ Sensor: {s.analog_percent.toFixed(1)} %</Text>}
                {s.presenca !== undefined && <Text style={styles.statusText}>🚶 Presença: {s.presenca ? "Detectada" : "Ausente"}</Text>}
                {typeof s.temperatura_C === "number" && <Text style={styles.statusText}>🌡️ Temperatura: {s.temperatura_C.toFixed(1)} °C</Text>}
                {typeof s.umidade_pct === "number" && <Text style={styles.statusText}>💧 Umidade: {s.umidade_pct.toFixed(1)} %</Text>}
                {s.timestamp && <Text style={styles.statusText}>⏱️ {s.timestamp}</Text>}
                {pingValues[serverKey] !== undefined && <Text style={styles.statusText}>⚡ Ping Sensor: {pingValues[serverKey].toFixed(1)} %</Text>}

                {(s.clients ?? []).length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: "600", textAlign: "center" }}>👥 Clientes conectados:</Text>
                    {(s.clients ?? []).map((c, i) => (
                      <Text key={i} style={styles.statusText}>🔗 {c.mac} ({c.ip}) {c.rssi ? `RSSI: ${c.rssi} dBm` : ""}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <Button title="Ativar" disabled={!s.server || isNear} onPress={() => s.server && sendCommand(s.server, "activate")} />
                  <Button title="Desativar" disabled={!s.server || isNear} onPress={() => s.server && sendCommand(s.server, "deactivate")} />
                  <Button title="Ping" disabled={!s.server || isNear} onPress={() => s.server && sendCommand(s.server, "ping")} />
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>📈 Histórico do Sensor ({serverKey}) — últimos {MAX_POINTS}s</Text>
                  <SparkBar data={hist} width={graphWidth} />
                  <View style={styles.chartFooter}>
                    <Text style={styles.chartFooterText}>Pontos: {hist.length}/{MAX_POINTS}</Text>
                    <Text style={styles.chartFooterText}>Atual: {s.analog_percent?.toFixed(1) ?? "-"}%</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      <View style={{ flex: 1, width: "100%" }}>
        <MapView
          style={{ flex: 1 }}
          region={{
            latitude: userLocation?.latitude ?? -23.5505,
            longitude: userLocation?.longitude ?? -46.6333,
            latitudeDelta: zoom,
            longitudeDelta: zoom,
          }}
          showsUserLocation
        >
          {onlineStatus.map((s, idx) => (
            <Marker
              key={`srv-${idx}`}
              coordinate={{ latitude: s.latitude!, longitude: s.longitude! }}
              pinColor={s.status === "ativo" ? "green" : s.status === "parado" ? "orange" : "red"}
            >
              <Callout>
                <View style={{ padding: 4 }}>
                  <Text>🖥️ {s.device || "Dispositivo"}</Text>
                  <Text>📡 {s.server}</Text>
                  {typeof s.temperatura_C === "number" && <Text>🌡️ {s.temperatura_C.toFixed(1)} °C</Text>}
                  {typeof s.umidade_pct === "number" && <Text>💧 {s.umidade_pct.toFixed(1)} %</Text>}
                  {s.presenca !== undefined && <Text>🚶 Presença: {s.presenca ? "Sim" : "Não"}</Text>}
                  <Text>📍 {s.latitude?.toFixed(6)}, {s.longitude?.toFixed(6)}</Text>
                </View>
              </Callout>
            </Marker>
          ))}

          {onlineStatus.flatMap((s) =>
            (s.clients ?? []).map((c, idx) => (
              <Marker
                key={`clt-${s.server}-${idx}`}
                coordinate={{
                  latitude: c.latitude ?? s.latitude!,
                  longitude: c.longitude ?? s.longitude!,
                }}
                pinColor="purple"
              >
                <Callout>
                  <View style={{ padding: 4 }}>
                    <Text>📱 Cliente</Text>
                    <Text>🔗 {c.mac}</Text>
                    <Text>🌐 {c.ip}</Text>
                    {c.rssi !== undefined && <Text>📶 RSSI: {c.rssi} dBm</Text>}
                  </View>
                </Callout>
              </Marker>
            ))
          )}

          {userLocation && (
            <Marker
              coordinate={userLocation}
              pinColor="blue"
              title="Minha posição"
              description="Localização atual"
            />
          )}
        </MapView>

        <View style={styles.sliderBox}>
          <Text style={{ textAlign: "center" }}>🔎 Zoom</Text>
          <Slider
            style={{ width: "90%", alignSelf: "center" }}
            minimumValue={0.01}
            maximumValue={0.2}
            step={0.005}
            value={zoom}
            onValueChange={setZoom}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flatListContent: { flexGrow: 1 },
  nodeCard: { padding: 12, borderRadius: 12, marginBottom: 12, elevation: 3, width: "90%", alignSelf: "center", backgroundColor: "#f5f5f5" },
  chartCard: { width: "100%", borderRadius: 12, padding: 12, marginTop: 12, backgroundColor: "#222" },
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
  sliderBox: { padding: 8, backgroundColor: "#eee" },
});