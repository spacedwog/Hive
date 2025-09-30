// eslint-disable-next-line import/no-unresolved
import { AUTH_PASSWORD, AUTH_USERNAME, GITHUB_TOKEN, VERCEL_URL } from '@env';
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

import { FALLBACK_LAT, FALLBACK_LON, MAX_POINTS, NodeStatus } from "../../hive_brain/hive_prime/EspManager";
import { GithubEmailManager, GithubOrg, GithubUser } from "../../hive_brain/hive_prime/GithubManager";

import { SparkBar } from "../../hive_body/SparkBar";
import { GeoCoder } from "../../hive_brain/hive_prime/GeoCoder";

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

  const [currentPage, setCurrentPage] = useState(0);
  const [githubPage, setGithubPage] = useState<"user" | "org">("user");

  const { width: winWidth } = useWindowDimensions();
  const githubManager = useMemo(() => new GithubEmailManager(), []);
  const geoCoder = useMemo(() => new GeoCoder(), []);
  const githubAuthHeader = useMemo(() => ({ headers: { Authorization: `token ${GITHUB_TOKEN}` } }), []);
  const authHeader = "Basic " + btoa(`${AUTH_USERNAME}:${AUTH_PASSWORD}`);

  // =========================
  // Buscar usuários GitHub + geolocalização
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
            const userData = detailRes.data;
            let coords = { latitude: FALLBACK_LAT, longitude: FALLBACK_LON };

            if (userData.location && userData.location !== "Não informado") {
              coords = await geoCoder.geocode(userData.location);
            }

            return { ...userData, latitude: coords.latitude, longitude: coords.longitude };
          } catch {
            return { ...user, latitude: FALLBACK_LAT, longitude: FALLBACK_LON };
          }
        })
      );

      setGithubUsers(detailedUsers);
      githubManager.setUsers(detailedUsers);
    } catch (err) {
      console.error("Erro ao buscar usuários do GitHub:", err);
    }
  }, [githubAuthHeader, githubManager, geoCoder]);

  // =========================
  // Buscar organizações GitHub + geolocalização
  // =========================
  const fetchGithubOrgs = React.useCallback(async () => {
    try {
      const res = await axios.get("https://api.github.com/organizations?per_page=50", githubAuthHeader);
      const orgs = res.data;

      const detailedOrgs = await Promise.all(
        orgs.map(async (org: any) => {
          try {
            const orgRes = await axios.get(`https://api.github.com/orgs/${org.login}`, githubAuthHeader);
            const orgData = orgRes.data;
            let coords = { latitude: FALLBACK_LAT, longitude: FALLBACK_LON };

            if (orgData.location && orgData.location !== "Não informado") {
              coords = await geoCoder.geocode(orgData.location);
            }

            return { ...orgData, latitude: coords.latitude, longitude: coords.longitude };
          } catch {
            return { ...org, latitude: FALLBACK_LAT, longitude: FALLBACK_LON };
          }
        })
      );

      setGithubOrgs(detailedOrgs);
    } catch (err) {
      console.error("Erro ao buscar organizações do GitHub:", err);
    }
  }, [githubAuthHeader, geoCoder]);

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
  const fetchStatus = React.useCallback(async () => {
    try {
      const servers = ["192.168.4.1", "192.168.15.166"];
      const responses = await Promise.all(
        servers.map(async (server) => {
          try {
            const res = await axios.get(`http://${server}/status`, { timeout: 3000, headers: { Authorization: authHeader } });
            const latitude = res.data.location?.latitude ?? FALLBACK_LAT;
            const longitude = res.data.location?.longitude ?? FALLBACK_LON;
            let clients: any[] = [];

            try {
              const clientsRes = await axios.get(`http://${server}/clients`, { timeout: 8000, headers: { Authorization: authHeader } });
              clients = clientsRes.data?.clients ?? [];
            } catch {}

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
          } catch (err) {
            return { server, status: "offline" as const, error: String(err), latitude: FALLBACK_LAT, longitude: FALLBACK_LON, clients: [], anomaly: { detected: false, message: "", current_value: 0 } } as NodeStatus;
          }
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

  // =========================
  // Inicialização
  // =========================
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
  const selectedOrg = githubOrgs[selectedOrgIndex] ?? null;

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

        {githubUsers.map((u, idx) => u.latitude && u.longitude && (
          <Marker key={`gh-${idx}`} coordinate={{ latitude: u.latitude, longitude: u.longitude }} pinColor="blue">
            <Callout>
              <Text>{u.login}</Text>
              <Text>{u.location ?? "Não informado"}</Text>
            </Callout>
          </Marker>
        ))}

        {githubOrgs.map((o, idx) => o.latitude && o.longitude && (
          <Marker key={`org-${idx}`} coordinate={{ latitude: o.latitude, longitude: o.longitude }} pinColor="purple">
            <Callout>
              <Text>{o.login}</Text>
              <Text>{o.location ?? "Não informado"}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.sliderBox}>
        <Text style={{ textAlign: "center" }}>🔎 Zoom</Text>
        <Slider style={{ width: "90%", alignSelf: "center" }} minimumValue={0.01} maximumValue={100} step={0.005} value={zoom} onValueChange={setZoom} />
      </View>

      <View style={styles.pagePagination}>
        <Button title="Mapa" onPress={() => setCurrentPage(0)} />
        <Button title="Status Vespa" onPress={() => setCurrentPage(1)} />
        <Button title="GitHub" onPress={() => setCurrentPage(2)} />
      </View>

      {currentPage !== 0 && (
        <ScrollView style={styles.overlayScroll} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.unisonCard}>
            {/* Página Status Vespa */}
            {currentPage === 1 && onlineStatus.map((s, idx) => {
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
                    {new SparkBar(hist, graphWidth).render()}
                  </View>
                </View>
              );
            })}

            {/* Página GitHub */}
            {currentPage === 2 && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 8 }}>
                  <Button title="Usuários" onPress={() => setGithubPage("user")} />
                  <Button title="Empresas" onPress={() => setGithubPage("org")} />
                </View>

                <Text style={styles.unisonTitle}>{githubPage === "user" ? "👤 Usuário GitHub" : "🏢 Empresa GitHub"}</Text>

                {githubPage === "user" && selectedUser && (
                  <View style={styles.githubUserBox}>
                    <Image source={{ uri: selectedUser.avatar_url }} style={styles.githubAvatar} />
                    <Text style={styles.githubText}>🆔 ID: {selectedUser.id}</Text>
                    <Text style={styles.githubText}>👤 Nome: {selectedUser.login}</Text>
                    <Text style={styles.githubText}>📍 Localização: {selectedUser.location ?? "Não informado"}</Text>
                    <Text style={styles.githubText}>📧 Email: {selectedUser.email ?? "Privado"}</Text>
                    <Button title="Abrir Perfil GitHub" onPress={() => Linking.openURL(selectedUser.html_url)} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                      <Button title="←" onPress={() => setSelectedUserIndex((i) => Math.max(0, i - 1))} />
                      <Button title="→" onPress={() => setSelectedUserIndex((i) => Math.min(githubUsers.length - 1, i + 1))} />
                    </View>
                  </View>
                )}

                {githubPage === "org" && selectedOrg && (
                  <View style={styles.githubUserBox}>
                    <Image source={{ uri: selectedOrg.avatar_url }} style={styles.githubAvatar} />
                    <Text style={styles.githubText}>🆔 ID: {selectedOrg.id}</Text>
                    <Text style={styles.githubText}>🏢 Nome: {selectedOrg.login}</Text>
                    <Text style={styles.githubText}>📍 Localização: {selectedOrg.location ?? "Não informado"}</Text>
                    <Button title="Abrir Perfil GitHub" onPress={() => Linking.openURL(selectedOrg.html_url)} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                      <Button title="←" onPress={() => setSelectedOrgIndex((i) => Math.max(0, i - 1))} />
                      <Button title="→" onPress={() => setSelectedOrgIndex((i) => Math.min(githubOrgs.length - 1, i + 1))} />
                    </View>
                  </View>
                )}
              </>
            )}
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
  sliderBox: { position: "absolute", bottom: 150, width: "100%" },
  pagePagination: { flexDirection: "row", justifyContent: "space-around", position: "absolute", bottom: 100, width: "100%" },
  overlayScroll: { position: "absolute", top: 100, width: "100%", height: "100%" },
  unisonCard: { backgroundColor: "#fff", margin: 12, borderRadius: 8, padding: 12 },
  unisonTitle: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  nodeBox: { marginVertical: 6, padding: 6, borderWidth: 1, borderRadius: 6, borderColor: "#ccc" },
  nodeText: { fontWeight: "bold", fontSize: 14 },
  statusText: { fontSize: 12 },
  buttonRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 4 },
  chartCard: { marginTop: 6, padding: 4, borderWidth: 1, borderColor: "#ddd", borderRadius: 6 },
  chartTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  githubUserBox: { marginVertical: 6, padding: 6, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, alignItems: "center" },
  githubAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 4 },
  githubText: { fontSize: 12 },
});