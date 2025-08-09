import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface AnomalyData {
  device: string;
  server_ip: string;
  sensor: number;
  mesh: boolean;
  status: string;
  anomaly: {
    detected: boolean;
    message: string;
    expected_range?: string;
    current_value?: number;
    timestamp_ms?: number;
  };
}

export default function AnomalyScreen() {
  const [statusData, setStatusData] = useState<AnomalyData | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("http://192.168.4.1/status");
        const data: AnomalyData = await res.json();
        setStatusData(data);
      } catch (error) {
        console.error("Erro ao buscar status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!statusData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📡 Status do NodeMCU</Text>
      <Text>Dispositivo: {statusData.device}</Text>
      <Text>IP: {statusData.server_ip}</Text>
      <Text>Status: {statusData.status}</Text>
      <Text>Valor do sensor: {statusData.sensor}</Text>
      <Text>Mesh conectado: {statusData.mesh ? "Sim" : "Não"}</Text>

      <View style={styles.anomalyBox}>
        <Text style={styles.anomalyTitle}>🔍 Anomalia</Text>
        <Text>Detectada: {statusData.anomaly.detected ? "Sim" : "Não"}</Text>
        <Text>Mensagem: {statusData.anomaly.message}</Text>
        {statusData.anomaly.detected && (
          <>
            <Text>Faixa esperada: {statusData.anomaly.expected_range}</Text>
            <Text>Valor atual: {statusData.anomaly.current_value}</Text>
            <Text>Timestamp (ms): {statusData.anomaly.timestamp_ms}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#111" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#4CAF50" },
  anomalyBox: { marginTop: 20, padding: 15, backgroundColor: "#222", borderRadius: 8 },
  anomalyTitle: { fontSize: 18, fontWeight: "bold", color: "#f44336", marginBottom: 5 },
  loading: { color: "#fff", textAlign: "center", marginTop: 20 }
});