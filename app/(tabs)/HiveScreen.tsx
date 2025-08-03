// HiveScreen.tsx (React Native - com expansões)
import axios from 'axios';
import { GLView } from 'expo-gl';
import * as Speech from 'expo-speech';
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
  { name: 'ESP32', ip: '192.168.15.166' },
];

export default function HiveScreen() {
  const [status, setStatus] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    setLoading(true);
    const newStatus: Record<string, any> = {};
    for (let node of nodes) {
      try {
        const response = await axios.get(`http://${node.ip}/status`);

        // Análise de padrões simples
        const sensorValue = response.data.sensor;
        const anomaly = sensorValue > 800 || sensorValue < 100;

        newStatus[node.name] = {
          ...response.data,
          anomaly: anomaly ? 'Anômalo' : 'Normal',
        };
      } catch (err) {
        newStatus[node.name] = { error: 'Offline ou inacessível' };
      }
    }
    setStatus(newStatus);
    setLoading(false);
  };

  const sendCommand = async (node: string, command: string) => {
    const ip = nodes.find(n => n.name === node)?.ip;
    if (ip) {
      try {
        await axios.post(`http://${ip}/command`, { command });
        fetchStatus();
      } catch (error) {
        console.warn(`Erro ao enviar comando para ${node}:`, error);
      }
    }
  };

  const speakStatus = () => {
    const message = Object.entries(status)
      .map(([node, data]) => `${node}: ${data?.status || 'desconhecido'}, sensor: ${data?.sensor || 'N/A'}`)
      .join('. ');
    Speech.speak(`Estado atual dos dispositivos: ${message}`);
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

        <View style={styles.reloadButton}>
          <Button title="🎤 Ler Estado em Voz Alta" onPress={speakStatus} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 20 }} />
        ) : (
          nodes.map((node) => (
            <View key={node.name} style={styles.nodeCard}>
              <Text style={styles.nodeName}>{node.name}</Text>
              <Text style={styles.statusText}>
                {status[node.name]?.error
                  ? `❌ ${status[node.name].error}`
                  : `✅ ${status[node.name].status} | Sensor: ${status[node.name].sensor} | Padrão: ${status[node.name].anomaly}`}
              </Text>
              <Button title="⚡ Ativar Nó" onPress={() => sendCommand(node.name, 'activate')} />
            </View>
          ))
        )}

        <View style={styles.glContainer}>
          <Text style={{ color: '#facc15', marginBottom: 10 }}>GLView (AR Placeholder)</Text>
          <GLView
            style={{ width: 300, height: 200 }}
            onContextCreate={(gl) => {
              // AR ou renderização 3D futura
              gl.clearColor(0.1, 0.1, 0.3, 1);
              gl.clear(gl.COLOR_BUFFER_BIT);
              gl.endFrameEXP();
            }}
          />
        </View>
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
    width: 240,
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
    marginBottom: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  glContainer: {
    marginTop: 24,
    marginBottom: 60,
    alignItems: 'center',
  },
});