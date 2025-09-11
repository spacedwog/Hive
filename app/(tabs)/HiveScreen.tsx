// eslint-disable-next-line import/no-unresolved
import { AUTH_PASSWORD, AUTH_USERNAME, GITHUB_TOKEN } from '@env';
import Slider from "@react-native-community/slider";
import axios from "axios";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { WebView } from 'react-native-webview';

// ==================================
// Classe para gerenciamento de e-mail
// ==================================
type GithubUser = {
  login: string;
  id: number;
  email?: string | null;
  html_url: string;
  avatar_url: string;
};

class GithubEmailManager {
  private usersWithEmail: GithubUser[] = [];

  public setUsers(users: GithubUser[]) {
    this.usersWithEmail = users.filter(u => u.email);
  }

  public getUsers(): GithubUser[] {
    return this.usersWithEmail;
  }

  public sendEmail(userLogin: string, subject: string, body: string) {
    const user = this.usersWithEmail.find(u => u.login === userLogin);
    if (!user || !user.email) {
      console.warn(`Usuário ${userLogin} não possui e-mail disponível.`);
      return;
    }

    const url = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) console.warn("Não foi possível abrir o app de e-mail.");
        else return Linking.openURL(url);
      })
      .catch(err => console.error("Erro ao abrir o app de e-mail:", err));
  }
}

// ==================================
// Tipos para servidores e sensores
// ==================================
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
  clients?: any[];
};

const MAX_POINTS = 60;
const FALLBACK_LAT = -23.5505;
const FALLBACK_LON = -46.6333;

// ==================================
// Componente de gráfico de barras
// ==================================
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

// ==================================
// HiveScreen
// ==================================
export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [zoom, setZoom] = useState(0.05);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [githubUsers, setGithubUsers] = useState<GithubUser[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0); // 0: Mapa, 1: Status, 2: GitHub, 3: Vercel

  // ---------------------------
  // 🔹 Estados para Vercel API
  // ---------------------------
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const VERCEL_URL = "https://hive-h7qa88acl-spacedwogs-projects.vercel.app";

  const { width: winWidth } = useWindowDimensions();
  const githubManager = useMemo(() => new GithubEmailManager(), []);

  // =========================
  // Autenticação GitHub
  // =========================
  const githubAuthHeader = useMemo(() => ({ headers: { Authorization: `token ${GITHUB_TOKEN}` } }), []);

  // =========================
  // Buscar usuários GitHub + detalhes (e-mail)
  // =========================
  const fetchGithubUsersPage = React.useCallback(async () => {
    try {
      const url = "https://api.github.com/users?per_page=100";
      const res = await axios.get(url, githubAuthHeader);
      const users = res.data;

      const detailedUsers = await Promise.all(
        users.map(async (user: any) => {
          try {
            const detailRes = await axios.get(`https://api.github.com/users/${user.login}`, githubAuthHeader);
            return detailRes.data;
          } catch {
            return user;
          }
        })
      );

      setGithubUsers(detailedUsers);
      githubManager.setUsers(detailedUsers);
    } catch (err) {
      console.error("Erro ao buscar usuários do GitHub:", err);
    }
  }, [githubAuthHeader, githubManager]);

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
  const authHeader = "Basic " + btoa(`${AUTH_USERNAME}:${AUTH_PASSWORD}`);

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

            let clients: any[] = [];
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

  // =========================
  // 🔹 Fetch Vercel API
  // =========================
  const fetchVercelData = React.useCallback(async () => {
    try {
      const res = await axios.get(`${VERCEL_URL}?info=project`);
      const data = res.data;

      if (typeof data === "object") {
        setVercelData(data);
        setVercelHTML(null);
      } else {
        setVercelHTML(String(data));
        setVercelData(null);
      }
    } catch (err) {
      console.error("Erro ao buscar API Vercel:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchGithubUsersPage();
    fetchVercelData();

    const interval = setInterval(() => {
      fetchStatus();
      fetchVercelData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchGithubUsersPage, fetchStatus, fetchVercelData]);

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);
  const onlineStatus = status.filter((s) => s.status !== "offline");
  const selectedUser = githubUsers[selectedUserIndex] ?? null;

  // ==================================
  // Renderização condicional por página
  // ==================================
  return (
    <View style={styles.container}>
      {/* MAPA */}
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

      {/* SLIDER ZOOM MAPA */}
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

      {/* PAGINAÇÃO SOBRE O MAPA */}
      <View style={styles.pagePagination}>
        <Button title="Mapa" onPress={() => setCurrentPage(0)} />
        <Button title="Status Vespa" onPress={() => setCurrentPage(1)} />
        <Button title="GitHub" onPress={() => setCurrentPage(2)} />
        <Button title="Vercel" onPress={() => setCurrentPage(3)} />
      </View>

      {/* CONTEÚDO POR PÁGINA */}
      {currentPage !== 0 && (
        <ScrollView style={styles.overlayScroll} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.unisonCard}>
            {/* Página Status Vespa */}
            {currentPage === 1 &&
              onlineStatus.map((s, idx) => {
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

            {/* Página GitHub */}
            {currentPage === 2 && selectedUser && (
              <View style={styles.githubUserBox}>
                <Image source={{ uri: selectedUser.avatar_url }} style={styles.githubAvatar} />
                <Text style={styles.githubText}>🆔 ID: {selectedUser.id}</Text>
                <Text style={styles.githubText}>👤 Nome: {selectedUser.login}</Text>
                <Text style={styles.githubText}>🔗 URL: {selectedUser.html_url}</Text>
                <Text style={styles.githubText}>📧 Email: {selectedUser.email ?? "Não disponível"}</Text>

                <Button
                  title="✉️ Enviar E-mail"
                  onPress={() => githubManager.sendEmail(selectedUser.login, "Projeto - HIVE", "Seja bem-vindo ao projeto - HIVE!")}
                  disabled={!selectedUser.email}
                />

                {/* SLIDER HORIZONTAL */}
                <Slider
                  style={styles.sliderHorizontal}
                  minimumValue={0}
                  maximumValue={githubUsers.length > 0 ? githubUsers.length - 1 : 0}
                  step={1}
                  value={selectedUserIndex}
                  onValueChange={(val) => setSelectedUserIndex(Math.round(val))}
                />
              </View>
            )}

            {currentPage === 2 && !selectedUser && <Text style={styles.githubText}>Carregando usuários...</Text>}

            {/* Página Vercel */}
            {currentPage === 3 && (
              <View style={{ width: "100%", alignItems: "center", marginTop: 12 }}>
                {vercelData ? (
                  <Text style={{ color: "#fff", fontFamily: "monospace" }}>
                    {JSON.stringify(vercelData, null, 2)}
                  </Text>
                ) : vercelHTML ? (
                  <WebView
                    originWhitelist={["*"]}
                    source={{ html: vercelHTML }}
                    style={{ width: "95%", height: 400, borderRadius: 12 }}
                  />
                ) : (
                  <Text style={{ color: "#facc15", marginTop: 12 }}>Carregando dados Vercel...</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ==================================
// ESTILOS
// ==================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  sliderBox: { padding: 8, backgroundColor: "#eee" },
  overlayScroll: { position: "absolute", top: 150, left: 0, right: 0 },

  unisonCard: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
  },
  nodeBox: { backgroundColor: "#444", borderRadius: 12, padding: 12, marginBottom: 12 },
  nodeText: { fontSize: 18, color: "#fff" },
  statusText: { color: "#ccc", marginTop: 2 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 },
  chartCard: { backgroundColor: "#222", borderRadius: 8, padding: 8, marginTop: 8 },
  chartTitle: { color: "#ff0", marginBottom: 4 },

  chartBox: { backgroundColor: "#000", borderRadius: 4, padding: 4 },
  chartAxis: { height: 1, backgroundColor: "#555", marginBottom: 4 },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-start" },
  chartBar: { backgroundColor: "#0f0", borderRadius: 2 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  chartLabelText: { color: "#fff", fontSize: 10 },

  pagePagination: { position: "absolute", bottom: 16, left: 16, right: 16, flexDirection: "row", justifyContent: "space-around" },

  githubUserBox: { alignItems: "center", marginTop: 12 },
  githubAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  githubText: { color: "#fff", marginBottom: 4 },
  sliderHorizontal: { width: "90%", marginTop: 12 },
});