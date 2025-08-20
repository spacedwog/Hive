import axios from "axios";
import * as base64 from "base-64";
import React, { useEffect, useState } from "react";
import { Button, FlatList, StyleSheet, Text, Vibration, View } from "react-native";

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

  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + base64.encode(`${authUsername}:${authPassword}`);

  // ==== Buscar status dos servidores ====
  const fetchStatus = async () => {
    try {
      const servers = ["192.168.4.1"]; // Adicione mais IPs se necessário
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

      // Verificação de proximidade
      responses.forEach((s) => {
        if (s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10) {
          Vibration.vibrate(500); // vibra por 0.5s
        }
      });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  };

  // ==== Enviar comandos ====
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

  // ==== Efeito de atualização contínua ====
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // atualiza a cada 1s
    return () => clearInterval(interval);
  }, []);

  // ==== Renderização ====
  return (
    <FlatList
      data={status}
      keyExtractor={(item) => item.server || Math.random().toString()}
      contentContainerStyle={styles.container}
      renderItem={({ item: s }) => {
        const serverKey = s.server ?? "unknown";
        const isOffline = s.status === "offline";
        const isActive = s.status === "ativo";
        const isNear = s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10;

        const cardColor = isNear
          ? "#fff3cd" // amarelo de alerta
          : isOffline
          ? "#f8d7da"
          : isActive
          ? "#d4edda"
          : "#fff";

        return (
          <View style={[styles.nodeCard, { backgroundColor: cardColor }]}>
            <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
            <Text style={styles.statusText}>
              📡 {s.server || "-"} - {s.status || "offline"}
            </Text>
            <Text style={styles.statusText}>
              📏 Distância: {s.ultrassonico_cm ?? "-"} cm
            </Text>

            {isNear && (
              <Text style={styles.warningText}>⚠️ Dispositivo próximo!</Text>
            )}

            {s.analog !== undefined && (
              <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>
            )}
            {pingValues[serverKey] !== undefined && (
              <Text style={styles.statusText}>
                ⚡ Ping Sensor: {pingValues[serverKey]}
              </Text>
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
          </View>
        );
      }}
    />
  );
}

// ==== Estilos ====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f4f8",
    justifyContent: "center",
    alignItems: "center",
  },
  nodeCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    width: "90%",
    alignSelf: "center",
  },
  nodeText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  warningText: {
    fontSize: 16,
    marginTop: 6,
    fontWeight: "bold",
    color: "#856404",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
});