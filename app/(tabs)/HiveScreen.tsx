import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const nodes = [
  { name: 'ESP32_VESPA', ip: '192.168.15.166' }, // ✅ Substitua com IP real do ESP32
];

type NodeStatus = {
  status?: string;
  sensor?: number;
  anomaly?: boolean;
  mesh?: boolean;
  error?: string;
};

export default function HiveScreen() {
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    setLoading(true);
    const newStatus: Record<string, NodeStatus> = {};
    for (let node of nodes) {
      try {
        const res = await axios.get(`http://${node.ip}/status`);
        newStatus[node.name] = res.data;
      } catch (err) {
        newStatus[node.name] = { error: 'Offline ou inacessível' };
      }
    }
    setStatus(newStatus);
    setLoading(false);
  };

  const sendCommand = async (node: string, command: string) => {
    const ip = nodes.find(n => n.name === node)?.ip;
    if (!ip) return;
    try {
      await axios.post(`http://${ip}/command`, { command });
      fetchStatus();
    } catch (err) {
      console.warn(`Erro ao enviar comando para ${node}:`, err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🧠 HIVE Central Interface</Text>

        <View style={styles.reloadButton}>
          <Button title="🔄 Recarregar Status" onPress={fetchStatus} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 20 }} />
        ) : (
          nodes.map((node) => {
            const s = status[node.name];
            return (
              <View key={node.name} style={styles.nodeCard}>
                <Text style={styles.nodeName}>{node.name}</Text>

                {s?.error ? (
                  <Text style={styles.statusText}>❌ {s.error}</Text>
                ) : (
                  <>
                    <Text style={styles.statusText}>
                      ✅ Estado: {s.status?.toUpperCase()}
                    </Text>
                    <Text style={styles.statusText}>
                      📟 Sensor: {s.sensor}
                    </Text>
                    <Text style={styles.statusText}>
                      🧬 Mesh: {s.mesh ? 'Conectado' : 'Desconectado'}
                    </Text>
                    <Text style={[styles.statusText, { color: s.anomaly ? '#f87171' : '#4ade80' }]}>
                      ⚠️ Anomalia: {s.anomaly ? 'Detectada' : 'Normal'}
                    </Text>
                    <View style={styles.buttonRow}>
                      <Button title="⚡ Ativar" onPress={() => sendCommand(node.name, 'activate')} />
                      <Button title="🛑 Desativar" onPress={() => sendCommand(node.name, 'deactivate')} />
                      <Button title="📡 Ping" onPress={() => sendCommand(node.name, 'ping')} />
                    </View>
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

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#facc15',
    marginBottom: 24,
    textAlign: 'center',
  },
  reloadButton: {
    marginBottom: 20,
    width: 200,
  },
  nodeCard: {
    width: 300,
    padding: 20,
    backgroundColor: '#1e293b',
    marginVertical: 12,
    borderRadius: 16,
    borderColor: '#334155',
    borderWidth: 1,
    alignItems: 'center',
  },
  nodeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 6,
    color: '#94a3b8',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});