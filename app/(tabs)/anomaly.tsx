import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("http://192.168.4.1/status");
      const data: AnomalyData = await res.json();
      setStatusData(data);
    } catch (error) {
      console.error("Erro ao buscar status:", error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [fetchStatus]);

  if (!statusData) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, styles.loading]}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={[styles.text, styles.title]}>📡 Status do NodeMCU</Text>
      <Text style={styles.text}>Dispositivo: {statusData.device}</Text>
      <Text style={styles.text}>IP: {statusData.server_ip}</Text>
      <Text style={styles.text}>Status: {statusData.status}</Text>
      <Text style={styles.text}>Valor do sensor: {statusData.sensor}</Text>
      <Text style={styles.text}>Mesh conectado: {statusData.mesh ? "Sim" : "Não"}</Text>

      <View style={styles.anomalyBox}>
        <Text style={[styles.text, styles.anomalyTitle]}>🔍 Anomalia</Text>
        <Text style={styles.text}>Detectada: {statusData.anomaly.detected ? "Sim" : "Não"}</Text>
        <Text style={styles.text}>Mensagem: {statusData.anomaly.message}</Text>
        {statusData.anomaly.detected && (
          <>
            <Text style={styles.text}>Faixa esperada: {statusData.anomaly.expected_range}</Text>
            <Text style={styles.text}>Valor atual: {statusData.anomaly.current_value}</Text>
            <Text style={styles.text}>Timestamp (ms): {statusData.anomaly.timestamp_ms}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  text: { color: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#4CAF50" },
  anomalyBox: { marginTop: 20, padding: 15, backgroundColor: "#222", borderRadius: 8 },
  anomalyTitle: { fontSize: 18, fontWeight: "bold", color: "#f44336", marginBottom: 5 },
  loading: { textAlign: "center", marginTop: 20 },
});