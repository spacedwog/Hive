// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
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
import { WebView } from 'react-native-webview';
import { Node } from '../../hive_brain/hive_finder/Node';
import { NodeManager } from '../../hive_brain/hive_finder/NodeManager';
import { NodeStatus } from '../../hive_brain/hive_finder/NodeStatus';

// Lista inicial de nodes locais
const nodeList = [new Node('NODEMCU', '192.168.4.1', '192.168.15.138')];
const nodeManager = new NodeManager(nodeList);

// URL do backend no Vercel (fallback)
const VERCEL_API = VERCEL_URL + '/api/node';

export default function ExploreScreen() {
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [usingVercel, setUsingVercel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customCommands, setCustomCommands] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [voiceCommand, setVoiceCommand] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Função de cor para barras
  const getBarColor = (value: number, anomaly: boolean) => {
    if (anomaly) return '#ef4444';
    if (value <= 30) return '#22c55e';
    if (value >= 55) return '#ef4444';
    const ratio = (value - 30) / 25;
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

  // Fetch status dos nodes
  const fetchStatus = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    let newStatus: Record<string, NodeStatus> = {};
    const newUsingVercel: Record<string, boolean> = {};
    let useVercel = false;

    try {
      newStatus = await nodeManager.fetchAllStatus();
      const hasDisconnected = Object.values(newStatus).some((s) => !s || s.error !== 'Conectado');
      if (hasDisconnected) useVercel = true;
    } catch (err) {
      console.warn('❌ Falha no WiFi local. Tentando Vercel...', err);
      useVercel = true;
    }

    if (useVercel) {
      try {
        const response = await fetch(`${VERCEL_API}/status`);
        console.log('✅ Resposta do Vercel recebida. ', response.status);
        newStatus = await response.json();
        Object.keys(newStatus).forEach((name) => {
          newUsingVercel[name] = true;
        });
      } catch (err2) {
        console.error('❌ Falha total: Vercel também não respondeu.', err2);
      }
    }

    // Atualiza histórico e dispara reconhecimento de voz se som > 70
    Object.entries(newStatus).forEach(([nodeName, s]) => {
      if (s?.sensor_db !== undefined) {
        setHistory((prev) => {
          const prevData = prev[nodeName] || [];
          const newData = [...prevData, s.sensor_db]
            .filter((v): v is number => typeof v === 'number')
            .slice(-30);

          if (s.sensor_db !== undefined && s.sensor_db > 70 && !voiceEnabled) {
            setVoiceEnabled(true); // ativa WebView de voz
          }

          return { ...prev, [nodeName]: newData };
        });
      }
    });

    setStatus(newStatus);
    setUsingVercel(newUsingVercel);
    if (showLoader) setLoading(false);
    if (refreshing) setRefreshing(false);
  }, [refreshing, voiceEnabled]);

  // Envia comando para node
  const sendCommand = useCallback(async (nodeName: string, action: string) => {
    const node = nodeManager.getNodeByName(nodeName);
    let success = false;

    if (node && status[nodeName]?.error === 'Conectado') {
      try {
        const res = await node.sendCommand(action);
        let msg = `Comando "${action}" enviado com sucesso para ${nodeName}.`;
        if (action === 'ping' && res?.timestamp !== undefined) {
          msg += ` Timestamp: ${res.timestamp} ms`;
        }
        Alert.alert('✅ Sucesso', msg);
        success = true;
      } catch (e: any) {
        console.warn(`❌ Erro local para ${nodeName}, tentando Vercel...`, e.message);
      }
    }

    if (!success) {
      try {
        const res = await fetch(`${VERCEL_API}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node: nodeName, action }),
        });
        const json = await res.json();
        Alert.alert('✅ Sucesso via Vercel', JSON.stringify(json));
      } catch (err: any) {
        Alert.alert('❌ Erro', `Falha no Vercel: ${err.message}`);
      }
    }
  }, [status]);

  // HTML Web Speech API
  const voiceHTML = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim();
          window.ReactNativeWebView.postMessage(transcript);
        };
        recognition.onerror = (event) => { console.error('Erro de voz', event); };
        recognition.start();
      </script>
    </body>
    </html>
  `;

  const handleVoiceMessage = useCallback((event: any) => {
    const command = event.nativeEvent.data;
    setVoiceCommand(command);
    nodeManager.nodes.forEach((node) => sendCommand(node.name, command));
  }, [sendCommand]);

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStatus(); }}
            colors={['#facc15']}
            tintColor="#facc15"
          />
        }
      >
        <Text style={styles.title}>🧠 HIVE Explorer</Text>
        <Text style={styles.statusText}>🗣️ Comando detectado: {voiceCommand}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 20 }} />
        ) : (
          nodeManager.nodes.map((node) => {
            const s = status[node.name];
            const sensorHistory = history[node.name] || [];
            const maxValue = sensorHistory.length > 0 ? Math.max(...sensorHistory) : 0;

            return (
              <View key={node.name} style={styles.nodeCard}>
                <Text style={styles.nodeName}>{node.name}</Text>
                <Text style={styles.statusText}>🔊 Sensor de som: {s?.sensor_db?.toFixed(1)}</Text>
                <Text style={styles.statusText}>🧬 Mesh: {s?.mesh ? 'Conectado' : 'Desconectado'}</Text>
                <View style={styles.chartContainer}>
                  {sensorHistory.map((val, idx) => (
                    <View
                      key={idx}
                      style={[styles.bar, { height: `${(val / maxValue) * 100}%`, backgroundColor: getBarColor(val, false) }]}
                    />
                  ))}
                </View>
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
                <TextInput
                  style={styles.input}
                  placeholder="Digite um comando personalizado..."
                  placeholderTextColor="#94a3b8"
                  value={customCommands[node.name] || ''}
                  onChangeText={(text) => setCustomCommands({ ...customCommands, [node.name]: text })}
                />
                <Pressable style={styles.primaryButton} onPress={() => sendCommand(node.name, customCommands[node.name] || '')}>
                  <Text style={styles.primaryButtonText}>🚀 Enviar Comando</Text>
                </Pressable>
              </View>
            );
          })
        )}

        {/* WebView invisível apenas quando voz ativada */}
        {voiceEnabled && (
          <WebView
            source={{ html: voiceHTML }}
            onMessage={handleVoiceMessage}
            style={{ height: 0, width: 0 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#facc15', marginBottom: 24, textAlign: 'center' },
  primaryButton: { backgroundColor: '#facc15', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginBottom: 20 },
  primaryButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  nodeCard: { width: 340, padding: 20, backgroundColor: '#1e293b', marginVertical: 12, borderRadius: 16 },
  nodeName: { fontSize: 20, fontWeight: '600', color: '#e2e8f0', marginBottom: 8, textAlign: 'center' },
  statusText: { fontSize: 15, marginBottom: 6, color: '#94a3b8', textAlign: 'center' },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, backgroundColor: '#1e293b', borderRadius: 8, padding: 4, overflow: 'hidden', marginVertical: 8 },
  bar: { flex: 1, marginHorizontal: 1, borderRadius: 2 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  actionButton: { backgroundColor: '#334155', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  actionText: { color: '#f1f5f9', fontWeight: '600', textAlign: 'center' },
  input: { backgroundColor: '#334155', color: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 14, width: '100%' },
});