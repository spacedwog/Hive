import axios from "axios";
import * as base64 from "base-64";
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + base64.encode(`${authUsername}:${authPassword}`);

  const fetchStatus = async () => {
    try {
      const servers = ["192.168.4.1"];
      const responses: NodeStatus[] = [];

      for (const server of servers) {
        try {
          const res = await axios.get(`http://${server}/status`, {
            timeout: 3000,
            headers: { Authorization: authHeader },
          });
          responses.push({ ...res.data, server });
        } catch (err) {
          responses.push({ server, status: "offline", error: String(err) });
        }
      }

      setStatus(responses);
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // atualiza a cada 1s
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (server: string, command: string) => {
    try {
      const res = await axios.post(
        `http://${server}/command`,
        { command },
        { headers: { Authorization: authHeader } }
      );

      if (command === "ping" && res.data.analog !== undefined) {
        alert(`Valor analógico: ${res.data.analog}`);
      }

      fetchStatus();
    } catch (err) {
      console.error("Erro ao enviar comando:", err);
    }
  };

  // ==== Renderização ====
  return (
    <FlatList
      data={status}
      keyExtractor={(item) => item.server || Math.random().toString()}
      renderItem={({ item: s }) => (
        <View style={styles.nodeCard}>
          <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
          <Text style={styles.statusText}>
            📡 {s.server} - {s.status}
          </Text>
          <Text style={styles.statusText}>
            📏 Distância: {s.ultrassonico_cm ?? "-"} cm
          </Text>
          {s.analog !== undefined && (
            <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>
          )}
          <View style={styles.buttonRow}>
            <Button
              title="Ativar"
              onPress={() => s.server && sendCommand(s.server, "activate")}
            />
            <Button
              title="Desativar"
              onPress={() => s.server && sendCommand(s.server, "deactivate")}
            />
            <Button
              title="Ping"
              onPress={() => s.server && sendCommand(s.server, "ping")}
            />
          </View>
        </View>
      )}
      contentContainerStyle={styles.container}
    />
  );
}

// ==== Estilos ====
const styles = StyleSheet.create({
  container: {
    flex: 1, // ocupa toda a altura da tela
    padding: 16,
    backgroundColor: "#f4f4f8",
    justifyContent: "center", // centraliza verticalmente
    alignItems: "center",     // centraliza horizontalmente
  },
  nodeCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
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