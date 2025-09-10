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
const FALLBACK_LAT = -23.5505;
const FALLBACK_LON = -46.6333;

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
  const [, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [zoom, setZoom] = useState(0.05);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [githubUsers, setGithubUsers] = useState<any[]>([]);
  const [userDisplayCount, setUserDisplayCount] = useState(10);

  const { width: winWidth } = useWindowDimensions();

  // =========================
  // Autenticação GitHub
  // =========================
  const GITHUB_TOKEN = "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"; // Coloque seu token
  const githubAuthHeader = React.useMemo(() => ({
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  }), [GITHUB_TOKEN]);

  // =========================
  // Buscar usuários GitHub + detalhes (e-mail)
  // =========================
  const fetchGithubUsersDetails = React.useCallback(async () => {
    try {
      const res = await axios.get("https://api.github.com/users?per_page=20", githubAuthHeader);
      const users = res.data;

      // Para cada usuário, buscar detalhes completos
      const detailedUsers = await Promise.all(
        users.map(async (user: any) => {
          try {
            const detailRes = await axios.get(`https://api.github.com/users/${user.login}`, githubAuthHeader);
            return detailRes.data; // inclui email se público
          } catch {
            return user;
          }
        })
      );

      setGithubUsers(detailedUsers);
    } catch (err) {
      console.error("Erro ao buscar usuários do GitHub:", err);
    }
  }, [githubAuthHeader]);

  // =========================
  // Localização
  // =========================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
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
  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + btoa(`${authUsername}:${authPassword}`);

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

            const latitude = res.data.location?.latitude ?? FALLBACK_LAT;
            const longitude = res.data.location?.longitude ?? FALLBACK_LON;

            let clients: ClientInfo[] = [];
            try {
              const clientsRes = await axios.get(`http://${server}/clients`, {
                timeout: 8000,
                headers: { Authorization: authHeader },
              });
              clients = clientsRes.data?.clients ?? [];
            } catch {}

            return { ...res.data, server, latitude, longitude, clients };
          } catch (err) {
            return {
              server,
              status: "offline",
              error: String(err),
              latitude: FALLBACK_LAT,
              longitude: FALLBACK_LON,
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
      const res = await axios.post(
        `http://${server}/command`,
        { command, ...payload },
        { headers: { Authorization: authHeader }, timeout: 5000 }
      );

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
    fetchGithubUsersDetails(); // 🔹 Busca usuários GitHub com detalhes
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchGithubUsersDetails, fetchStatus]);

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);
  const onlineStatus = status.filter((s) => s.status !== "offline");

  return (
    <View style={styles.container}>
      {/* MAPA FULLSCREEN */}
      <MapView
        style={styles.map}
        region={{
          latitude: userLocation?.latitude ?? FALLBACK_LAT,
          longitude: userLocation?.longitude ?? FALLBACK_LON,
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
                {s.ultrassonico_m !== undefined && <Text>📏 Distância: {s.ultrassonico_m.toFixed(2)} m</Text>}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* SLIDER ZOOM */}
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

      {/* CARDS DE STATUS */}
      <ScrollView style={styles.overlayScroll} contentContainerStyle={{ paddingBottom: 120 }}>
        {onlineStatus.map((s, idx) => {
          const serverKey = s.server ?? "unknown";
          const isNear = s.ultrassonico_m !== undefined && s.ultrassonico_m < 0.1;
          const hist = history[serverKey] ?? [];

          return (
            <View key={idx} style={styles.nodeCard}>
              <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
              <Text style={styles.statusText}>📡 {s.server ?? "-"} - {s.status ?? "-"}</Text>
              {s.analog_percent !== undefined && <Text style={styles.statusText}>⚡ Sensor: {s.analog_percent.toFixed(1)}%</Text>}
              {typeof s.temperatura_C === "number" && <Text style={styles.statusText}>🌡️ Temperatura: {s.temperatura_C.toFixed(1)} °C</Text>}
              {typeof s.umidade_pct === "number" && <Text style={styles.statusText}>💧 Umidade: {s.umidade_pct.toFixed(1)} %</Text>}
              {s.presenca !== undefined && <Text style={styles.statusText}>🚶 Presença: {s.presenca ? "Sim" : "Não"}</Text>}
              {s.ultrassonico_m !== undefined && <Text style={styles.statusText}>📏 Distância: {s.ultrassonico_m.toFixed(2)} m</Text>}
              {isNear && <Text style={styles.warningText}>⚠️ Dispositivo próximo!</Text>}

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
                  <Text style={styles.chartFooterText}>Atual: {s.analog_percent?.toFixed(1) ?? "-"}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Lista de Usuários GitHub com slider */}
        <View style={{ padding: 12, marginTop: 12 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 6 }}>
            👥 Usuários GitHub ({userDisplayCount})
          </Text>

          {/* Slider para controlar quantidade de usuários exibidos */}
          <Slider
            style={{ width: "90%", alignSelf: "center", marginBottom: 8 }}
            minimumValue={1}
            maximumValue={githubUsers.length}
            step={1}
            value={userDisplayCount}
            onValueChange={setUserDisplayCount}
          />

          {githubUsers.slice(0, userDisplayCount).map((user) => (
            <View key={user.id} style={{ marginVertical: 4, padding: 8, backgroundColor: "#ddd", borderRadius: 6 }}>
              <Text>ID: {user.id}</Text>
              <Text>Nome: {user.login}</Text>
              <Text>URL: {user.html_url}</Text>
              <Text>Email: {user.email ?? "Não disponível"}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  sliderBox: { padding: 8, backgroundColor: "#eee" },
  overlayScroll: { position: "absolute", top: 20, left: 0, right: 0 },
  nodeCard: {
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
    elevation: 4,
  },
  nodeText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  statusText: { fontSize: 14, marginTop: 4, textAlign: "center" },
  warningText: { fontSize: 16, marginTop: 6, fontWeight: "bold", color: "#856404", textAlign: "center" },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
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
});