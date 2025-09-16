// eslint-disable-next-line import/no-unresolved
import { AUTH_PASSWORD, AUTH_USERNAME, GITHUB_TOKEN } from "@env";
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

// ==================================
// Tipos para GitHub Users
// ==================================
type GithubUser = {
  login: string;
  id: number;
  email?: string | null;
  html_url: string;
  avatar_url: string;
};

// ==================================
// Tipos para GitHub Orgs (empresas)
// ==================================
type GithubOrg = {
  login: string;
  id: number;
  avatar_url: string;
  description?: string | null;
  html_url: string;
};

// ==================================
// Classe para gerenciamento de e-mail
// ==================================
class GithubEmailManager {
  private usersWithEmail: GithubUser[] = [];

  public setUsers(users: GithubUser[]) {
    this.usersWithEmail = users.filter((u) => u.email);
  }

  public getUsers(): GithubUser[] {
    return this.usersWithEmail;
  }

  public sendEmail(userLogin: string, subject: string, body: string) {
    const user = this.usersWithEmail.find((u) => u.login === userLogin);
    if (!user || !user.email) {
      console.warn(`Usuário ${userLogin} não possui e-mail disponível.`);
      return;
    }

    const url = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) console.warn("Não foi possível abrir o app de e-mail.");
        else return Linking.openURL(url);
      })
      .catch((err) => console.error("Erro ao abrir o app de e-mail:", err));
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
  const [githubOrgs, setGithubOrgs] = useState<GithubOrg[]>([]);
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0); // 0: Mapa, 1: Status, 2: GitHub

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
  // Buscar organizações GitHub
  // =========================
  const fetchGithubOrgs = React.useCallback(async () => {
    try {
      const res = await axios.get("https://api.github.com/organizations?per_page=50", githubAuthHeader);
      const orgs = res.data;

      const detailedOrgs = await Promise.all(
        orgs.map(async (org: any) => {
          try {
            const orgRes = await axios.get(`https://api.github.com/orgs/${org.login}`, githubAuthHeader);
            return orgRes.data;
          } catch {
            return org;
          }
        })
      );

      setGithubOrgs(detailedOrgs);
    } catch (err) {
      console.error("Erro ao buscar organizações do GitHub:", err);
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
  const authHeader = "Basic " + Buffer.from(`${AUTH_USERNAME}:${AUTH_PASSWORD}`).toString("base64");

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

  useEffect(() => {
    fetchStatus();
    fetchGithubUsersPage();
    fetchGithubOrgs();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchGithubUsersPage, fetchGithubOrgs, fetchStatus]);

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
      </View>

      {/* CONTEÚDO POR PÁGINA */}
      {currentPage !== 0 && (
        <ScrollView style={styles.overlayScroll} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.unisonCard}>
            {currentPage === 1 && (
              <>
                {onlineStatus.map((s, idx) => {
                  const serverKey = s.server ?? "unknown";
                  const hist = history[serverKey] ?? [];
                  return (
                    <View key={idx} style={styles.nodeBox}>
                      <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
                      <Text style={styles.statusText}>
                        📡 {s.server ?? "-"} - {s.status ?? "-"}
                      </Text>
                      {s.analog_percent !== undefined && (
                        <Text style={styles.statusText}>⚡ Sensor: {s.analog_percent.toFixed(1)}%</Text>
                      )}
                      {typeof s.temperatura_C === "number" && (
                        <Text style={styles.statusText}>
                          🌡️ Temperatura: {s.temperatura_C.toFixed(1)} °C
                        </Text>
                      )}
                      {typeof s.umidade_pct === "number" && (
                        <Text style={styles.statusText}>💧 Umidade: {s.umidade_pct.toFixed(1)} %</Text>
                      )}
                      {s.presenca !== undefined && (
                        <Text style={styles.statusText}>🚶 Presença: {s.presenca ? "Sim" : "Não"}</Text>
                      )}
                      {s.ultrassonico_m !== undefined && (
                        <Text style={styles.statusText}>
                          📏 Distância: {s.ultrassonico_m.toFixed(2)} m
                        </Text>
                      )}

                      <View style={styles.buttonRow}>
                        <Button
                          title="Ativar"
                          disabled={!s.server}
                          onPress={() => s.server && sendCommand(s.server, "activate")}
                        />
                        <Button
                          title="Desativar"
                          disabled={!s.server}
                          onPress={() => s.server && sendCommand(s.server, "deactivate")}
                        />
                        <Button
                          title="Ping"
                          disabled={!s.server}
                          onPress={() => s.server && sendCommand(s.server, "ping")}
                        />
                      </View>

                      <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>
                          📈 Histórico do Sensor ({serverKey}) — últimos {MAX_POINTS}s
                        </Text>
                        <SparkBar data={hist} width={graphWidth} />
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {currentPage === 2 && selectedUser && (
              <View style={styles.githubUserBox}>
                <Text style={styles.unisonTitle}>👤 Usuários do GitHub</Text>
                <Image source={{ uri: selectedUser.avatar_url }} style={styles.githubAvatar} />
                <Text style={styles.githubText}>🆔 ID: {selectedUser.id}</Text>
                <Text style={styles.githubText}>👤 Nome: {selectedUser.login}</Text>
                <Text style={styles.githubText}>🔗 URL: {selectedUser.html_url}</Text>
                <Text style={styles.githubText}>📧 Email: {selectedUser.email ?? "Não disponível"}</Text>

                <Button
                  title="✉️ Enviar E-mail"
                  onPress={() =>
                    githubManager.sendEmail(
                      selectedUser.login,
                      "Projeto - HIVE",
                      "Seja bem-vindo ao projeto - HIVE!"
                    )
                  }
                  disabled={!selectedUser.email}
                />

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

            {currentPage === 2 && githubOrgs.length > 0 && (
              <View style={styles.githubOrgBox}>
                <Text style={styles.unisonTitle}>🏢 Empresas (Organizações)</Text>
                <Image source={{ uri: githubOrgs[selectedOrgIndex].avatar_url }} style={styles.githubAvatar} />
                <Text style={styles.githubText}>🆔 ID: {githubOrgs[selectedOrgIndex].id}</Text>
                <Text style={styles.githubText}>🏢 Nome: {githubOrgs[selectedOrgIndex].login}</Text>
                <Text style={styles.githubText}>🔗 URL: {githubOrgs[selectedOrgIndex].html_url}</Text>
                <Text style={styles.githubText}>
                  📄 Descrição: {githubOrgs[selectedOrgIndex].description ?? "Não informada"}
                </Text>

                <Button
                  title="🌐 Abrir no navegador"
                  onPress={() => Linking.openURL(githubOrgs[selectedOrgIndex].html_url)}
                />

                <Slider
                  style={styles.sliderHorizontal}
                  minimumValue={0}
                  maximumValue={githubOrgs.length - 1}
                  step={1}
                  value={selectedOrgIndex}
                  onValueChange={(val) => setSelectedOrgIndex(Math.round(val))}
                />
              </View>
            )}

            {currentPage === 2 && !selectedUser && (
              <Text style={styles.statusText}>Carregando usuários...</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ==================================
// Estilos
// ==================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  map: { flex: 1 },
  sliderBox: { padding: 10, backgroundColor: "#111" },
  pagePagination: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#111",
    paddingVertical: 4,
  },
  overlayScroll: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#000a",
    maxHeight: "55%",
  },
  unisonCard: {
    padding: 12,
    backgroundColor: "#111",
  },
  unisonTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  nodeBox: { marginBottom: 16, backgroundColor: "#222", borderRadius: 8, padding: 10 },
  nodeText: { color: "#fff", fontWeight: "bold", marginBottom: 4 },
  statusText: { color: "#ccc" },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 6 },
  chartCard: { backgroundColor: "#333", borderRadius: 8, padding: 8, marginTop: 8 },
  chartTitle: { color: "#fff", marginBottom: 4 },
  chartBox: {
    backgroundColor: "#222",
    borderRadius: 4,
    padding: 4,
    justifyContent: "flex-end",
  },
  chartAxis: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: "#888" },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end", bottom: 2 },
  chartBar: { backgroundColor: "#0f0", borderRadius: 2 },
  chartLabels: {
    position: "absolute",
    top: 0,
    left: 2,
    right: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLabelText: { color: "#aaa", fontSize: 10 },
  githubUserBox: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  githubOrgBox: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  githubAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  githubText: { color: "#fff", marginVertical: 2 },
  sliderHorizontal: { width: "90%", marginTop: 8 },
});