import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// -------------------------
// 📡 Mapa de IPs dos dispositivos conectados
// -------------------------
const nodes = [
  { name: 'NODEMCU', ip: '192.168.4.1', secondary_ip: '192.168.15.138' }, // IP do SoftAP do NodeMCU
];

type NodeStatus = {
  device?: string;
  server_ip?: string;
  status?: string;
  sensor_db?: number;
  anomaly?: {
    detected: boolean;
    message: string;
    expected_range?: string;
    current_value?: number;
    timestamp_ms?: number;
  };
  mesh?: boolean;
  timestamp?: number;
  error?: string;
};

export default function ExploreScreen() {
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});

  // -------------------------
  // 🔹 Função para calcular cor do gráfico
  // -------------------------
  const getBarColor = (value: number, anomaly: boolean) => {
    if (anomaly) return '#ef4444'; // vermelho para anomalia

    if (value <= 30) return '#22c55e'; // verde
    if (value >= 55) return '#ef4444'; // vermelho

    // gradiente verde -> amarelo -> vermelho
    const ratio = (value - 30) / (55 - 30);
    if (ratio < 0.5) {
      const r = Math.round(34 + (250 - 34) * (ratio * 2));
      const g = Math.round(197 + (204 - 197) * (ratio * 2));
      const b = Math.round(94 + (21 - 94) * (ratio * 2));
      return `rgb(${r},${g},${b})`;
    } else {
      const r = Math.round(250 + (239 - 250) * ((ratio - 0.5) * 2));
      const g = Math.round(204 + (68 - 204) * ((ratio - 0.5) * 2));
      const b = Math.round(21 + (68 - 21) * ((ratio - 0.5) * 2));
      return `rgb(${r},${g},${b})`;
    }
  };

  // -------------------------
  // 🔄 Buscar status do NodeMCU
  // -------------------------
  const fetchStatus = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const newStatus: Record<string, NodeStatus> = {};

    for (let node of nodes) {
      try {
        const res = await axios.get(`http://${node.ip}/status`, { timeout: 3000 });
        newStatus[node.name] = res.data;

        // Atualiza histórico de sensor de som (sensor_db)
        if (res.data?.sensor_db !== undefined) {
          setHistory((prev) => {
            const prevData = prev[node.name] || [];
            const newData = [...prevData, res.data.sensor_db].slice(-30);
            return { ...prev, [node.name]: newData };
          });
        }
      } catch {
        newStatus[node.name] = { error: 'Offline ou inacessível' };
      }
    }

    setStatus(newStatus);
    if (showLoader) setLoading(false);
    if (refreshing) setRefreshing(false);
  }, [refreshing]);

  // -------------------------
  // ⚡ Enviar comando para NodeMCU
  // -------------------------
  const sendCommand = async (node: string, action: string) => {
    const ip = nodes.find(n => n.name === node)?.ip;
    if (!ip) return;

    try {
      const res = await axios.post(`http://${ip}/command`, { action }, { timeout: 3000 });
      let msg = `Comando "${action}" enviado com sucesso para ${node}.`;

      if (action === 'ping' && res.data?.timestamp !== undefined) {
        msg += ` Timestamp: ${res.data.timestamp} ms`;
      }

      Alert.alert('✅ Sucesso', msg);
      fetchStatus();
    } catch {
      Alert.alert('❌ Erro', `Falha ao enviar comando "${action}" para ${node}.`);
    }
  };

  // -------------------------
  // ⏱ Inicializa e atualiza automaticamente
  // -------------------------
  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // -------------------------
  // 🔹 Render
  // -------------------------
  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStatus();
            }}
            colors={['#facc15']}
            tintColor="#facc15"
          />
        }
      >
        <Text style={styles.title}>🧠 HIVE Explorer</Text>

        <Pressable style={styles.primaryButton} onPress={() => fetchStatus(true)}>
          <Text style={styles.primaryButtonText}>🔄 Recarregar Status</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 20 }} />
        ) : (
          nodes.map((node) => {
            const s = status[node.name];
            const sensorHistory = history[node.name] || [];
            const maxValue = Math.max(...sensorHistory, 1);

            return (
              <View key={node.name} style={styles.nodeCard}>
                <Text style={styles.nodeName}>{node.name}</Text>

                <View style={styles.statusIndicatorWrapper}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: s?.error ? '#ef4444' : '#22c55e' },
                    ]}
                  />
                  <Text style={styles.statusLabel}>
                    {s?.error ? 'Desconectado' : 'Conectado'}
                  </Text>
                </View>

                {s?.error ? (
                  <Text style={styles.statusText}>❌ {s.error}</Text>
                ) : (
                  <>
                    {/* STATUS */}
                    <View style={styles.subCard}>
                      <Text style={styles.subTitle}>📊 Status</Text>
                      <Text style={styles.statusText}>🖥️ Aparelho: {s.device}</Text>
                      <Text style={styles.statusText}>🗄️ Servidor: {s.server_ip}</Text>
                      <Text style={styles.statusText}>✅ Estado: {s.status}</Text>
                      <Text style={styles.statusText}>🔊 Sensor de som: {s.sensor_db?.toFixed(1)}</Text>
                      <Text style={styles.statusText}>🧬 Mesh: {s.mesh ? 'Conectado' : 'Desconectado'}</Text>
                      <Text
                        style={[
                          styles.statusText,
                          { color: s.anomaly?.detected ? '#f87171' : '#4ade80' },
                        ]}
                      >
                        ⚠️ Anomalia: {s.anomaly?.detected ? 'Detectada' : 'Normal'}
                      </Text>
                      {s.anomaly?.message && (
                        <Text style={styles.statusText}>📝 {s.anomaly.message}</Text>
                      )}
                      {s.anomaly?.current_value !== undefined && (
                        <Text style={styles.statusText}>🔢 Valor Atual: {s.anomaly.current_value}</Text>
                      )}
                      {s.anomaly?.expected_range && (
                        <Text style={styles.statusText}>📊 Faixa Esperada: {s.anomaly.expected_range}</Text>
                      )}
                      {s.timestamp !== undefined && (
                        <Text style={styles.statusText}>📡 Ping Timestamp: {s.timestamp} ms</Text>
                      )}
                    </View>

                    {/* HISTÓRICO SENSOR */}
                    <View style={styles.subCard}>
                      <Text style={styles.subTitle}>📈 Histórico do Sensor de Som</Text>
                      <View style={styles.chartContainer}>
                        {sensorHistory.length === 0 ? (
                          <Text style={styles.statusText}>Nenhum dado coletado ainda...</Text>
                        ) : (
                          sensorHistory.map((val, idx) => {
                            // Apenas a barra do valor que disparou a anomalia fica preta
                            const isAnomalyBar = !!(s?.anomaly?.detected && val === s.anomaly?.current_value);
                            const barColor = isAnomalyBar ? '#000000' : getBarColor(val, false);
                            const height = (val / maxValue) * 100;
                            return (
                              <View
                                key={idx}
                                style={[styles.bar, { height: `${height}%`, backgroundColor: barColor }]}
                              />
                            );
                          })
                        )}
                      </View>
                    </View>

                    {/* BOTÕES */}
                    <View style={styles.buttonRow}>
                      <Pressable style={styles.actionButton} onPress={() => sendCommand(node.name, 'on')}>
                        <Text style={styles.actionText}>⚡ Ativar</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => sendCommand(node.name, 'off')}>
                        <Text style={styles.actionText}>🛑 Desativar</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => sendCommand(node.name, 'ping')}>
                        <Text style={styles.actionText}>📡 Ping</Text>
                      </Pressable>
                    </View>

                    {/* COMANDO CUSTOM */}
                    <TextInput
                      style={styles.input}
                      placeholder="Digite um comando personalizado..."
                      placeholderTextColor="#94a3b8"
                      value={customCommands[node.name] || ''}
                      onChangeText={(text) =>
                        setCustomCommands({ ...customCommands, [node.name]: text })
                      }
                    />
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => sendCommand(node.name, customCommands[node.name] || '')}
                    >
                      <Text style={styles.primaryButtonText}>🚀 Enviar Comando</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// -------------------------
// 📐 Estilos
// -------------------------
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#facc15', marginBottom: 24, textAlign: 'center' },
  primaryButton: { backgroundColor: '#facc15', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginBottom: 20 },
  primaryButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  nodeCard: { width: 340, padding: 20, backgroundColor: '#1e293b', marginVertical: 12, borderRadius: 16, borderColor: '#334155', borderWidth: 1 },
  nodeName: { fontSize: 20, fontWeight: '600', color: '#e2e8f0', marginBottom: 8, textAlign: 'center' },
  statusIndicatorWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  statusLabel: { color: '#94a3b8', fontSize: 14 },
  subCard: { marginTop: 10, padding: 12, backgroundColor: '#0f172a', borderRadius: 12 },
  subTitle: { fontSize: 16, fontWeight: '600', color: '#facc15', marginBottom: 10, textAlign: 'center' },
  statusText: { fontSize: 15, marginBottom: 6, color: '#94a3b8', textAlign: 'center' },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, backgroundColor: '#1e293b', borderRadius: 8, padding: 4, overflow: 'hidden' },
  bar: { flex: 1, marginHorizontal: 1, borderRadius: 2 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  actionButton: { backgroundColor: '#334155', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  actionText: { color: '#f1f5f9', fontWeight: '600' },
  input: { backgroundColor: '#334155', color: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 14, width: '100%' },
});