import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  Vibration,
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
  const [pingValues, setPingValues] = useState<{ [key: string]: number }>({});
  const [history, setHistory] = useState<{ [key: string]: any[] }>({});

  const authUsername = "spacedwog";
  const authPassword = "Kimera12@";
  const authHeader = "Basic " + btoa(`${authUsername}:${authPassword}`);

  // ==== Mock fetchStatus (simula sensores) ====
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

  // ==== Enviar comando (mock) ====
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
    if (!sensor.ultrassonico_cm || !sensor.server) return;

    const key = `sensor_${sensor.server}`;
    try {
      const previous = await AsyncStorage.getItem(key);
      const log = previous ? JSON.parse(previous) : [];
      const entry = { time: Date.now(), distance: sensor.ultrassonico_cm };
      log.push(entry);
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
        // 1️⃣ Alerta e vibração se distância < 10cm
        if (sensor.ultrassonico_cm !== undefined && sensor.ultrassonico_cm < 10) {
          Vibration.vibrate(500);
          Alert.alert(
            "Atenção!",
            `${sensor.device || "Dispositivo"} muito próximo!`
          );
        }

        // 2️⃣ Atualizar histórico
        await updateHistory(sensor);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

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
        const cardColor = isOffline
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
            {s.analog !== undefined && (
              <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>
            )}
            {pingValues[serverKey] !== undefined && (
              <Text style={styles.statusText}>
                ⚡ Ping Sensor: {pingValues[serverKey]}
              </Text>
            )}

            {/* Histórico do sensor */}
            {history[serverKey] && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: "600" }}>📜 Histórico:</Text>
                {history[serverKey]
                  .slice(-5)
                  .reverse()
                  .map((entry, idx) => (
                    <Text key={idx} style={styles.statusText}>
                      {new Date(entry.time).toLocaleTimeString()} - {entry.distance} cm
                    </Text>
                  ))}
              </View>
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
  nodeText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  statusText: { fontSize: 14, marginTop: 4, textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
});