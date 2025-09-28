// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import Voice from '@react-native-voice/voice';
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
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');

  // Função de cor para barras
  const getBarColor = (value: number, anomaly: boolean) => {
    if (anomaly) {
      return '#ef4444';
    }
    if (value <= 30) {
      return '#22c55e';
    }
    if (value >= 55) {
      return '#ef4444';
    }
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
  const fetchStatus = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      let newStatus: Record<string, NodeStatus> = {};
      const newUsingVercel: Record<string, boolean> = {};
      let useVercel = false;

      try {
        newStatus = await nodeManager.fetchAllStatus();
        const hasDisconnected = Object.values(newStatus).some(
          (s) => !s || s.error !== 'Conectado'
        );
        if (hasDisconnected) {
          useVercel = true;
        }
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

      // Atualiza histórico e integra sensor de som com comando de voz
      Object.entries(newStatus).forEach(([nodeName, s]) => {
        if (s?.sensor_db !== undefined) {
          setHistory((prev) => {
            const prevData = prev[nodeName] || [];
            const newData = [...prevData, s.sensor_db]
              .filter((v): v is number => v !== undefined)
              .slice(-30);

            // Inicia reconhecimento de voz se som > 70
            if (!isListening && s.sensor_db !== undefined && s.sensor_db > 70) {
              startListening();
            }

            return { ...prev, [nodeName]: newData };
          });
        }
      });

      setStatus(newStatus);
      setUsingVercel(newUsingVercel);
      if (showLoader) {
        setLoading(false);
      }
      if (refreshing) {
        setRefreshing(false);
      }
    },
    [refreshing, isListening]
  );

  // Função de envio de comando
  const sendCommand = useCallback(
    async (nodeName: string, action: string) => {
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
          fetchStatus();
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
          fetchStatus();
        } catch (err: any) {
          Alert.alert('❌ Erro', `Falha no Vercel: ${err.message}`);
        }
      }
    },
    [status, fetchStatus]
  );

  // --- VOICE COMMAND ---
  const onSpeechResultsHandler = useCallback((e: any) => {
    const text = e.value?.[0] || '';
    setVoiceCommand(text);
    if (text) {
      nodeManager.nodes.forEach(node => sendCommand(node.name, text));
    }
  }, [sendCommand]);

  const onSpeechErrorHandler = useCallback((e: any) => {
    console.warn('Erro de reconhecimento de voz', e);
    setIsListening(false);
  }, []);

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResultsHandler;
    Voice.onSpeechError = onSpeechErrorHandler;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onSpeechResultsHandler, onSpeechErrorHandler]);

  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start('pt-BR');
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // --- RENDER ---
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

        <Pressable
          style={styles.primaryButton}
          onPress={isListening ? stopListening : startListening}
        >
          <Text style={styles.primaryButtonText}>
            {isListening ? '🛑 Parar Voz' : '🎤 Comando de Voz'}
          </Text>
        </Pressable>
        <Text style={styles.statusText}>🗣️ Comando detectado: {voiceCommand}</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#facc15" style={{ marginTop: 20 }} />
        ) : (
          nodeManager.nodes.map((node) => {
            const s = status[node.name];
            const sensorHistory = history[node.name] || [];
            const maxValue = sensorHistory.length > 0 ? Math.max(...sensorHistory) : 0;

            if (s?.error === 'Tentando reconectar...') {
              return (
                <View key={node.name} style={styles.nodeCard}>
                  <Text style={styles.nodeName}>{node.name}</Text>
                  <Text style={styles.statusText}>🔄 Tentando reconectar...</Text>
                </View>
              );
            }

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
                  {usingVercel[node.name] && (
                    <Text style={{ marginLeft: 8, color: '#facc15', fontWeight: '600' }}>
                      📡 Fallback Vercel
                    </Text>
                  )}
                </View>

                {s?.error ? (
                  <Text style={styles.statusText}>❌ {s.error}</Text>
                ) : (
                  <>
                    <View style={styles.subCard}>
                      <Text style={styles.subTitle}>📊 Status</Text>
                      <Text style={styles.statusText}>🖥️ Aparelho: {s.device}</Text>
                      <Text style={styles.statusText}>🗄️ Servidor: {s.server_ip}</Text>
                      <Text style={styles.statusText}>✅ Estado: {s.status}</Text>
                      <Text style={styles.statusText}>🔊 Sensor de som: {s.sensor_db?.toFixed(1)}</Text>
                      <Text style={styles.statusText}>🧬 Mesh: {s.mesh ? 'Conectado' : 'Desconectado'}</Text>
                      <Text style={[styles.statusText, { color: s.anomaly?.detected ? '#f87171' : '#4ade80' }]}>
                        ⚠️ Anomalia: {s.anomaly?.detected ? 'Detectada' : 'Normal'}
                      </Text>
                      {s.anomaly?.message && <Text style={styles.statusText}>📝 {s.anomaly.message}</Text>}
                      {s.anomaly?.current_value !== undefined && <Text style={styles.statusText}>🔢 Valor Atual: {s.anomaly.current_value}</Text>}
                      {s.anomaly?.expected_range && <Text style={styles.statusText}>📊 Faixa Esperada: {s.anomaly.expected_range}</Text>}
                      {s.timestamp !== undefined && <Text style={styles.statusText}>📡 Ping Timestamp: {s.timestamp} ms</Text>}
                    </View>

                    <View style={styles.subCard}>
                      <Text style={styles.subTitle}>📈 Histórico do Sensor de Som</Text>
                      <View style={styles.chartContainer}>
                        {sensorHistory.length === 0 ? (
                          <Text style={styles.statusText}>Nenhum dado coletado ainda...</Text>
                        ) : (
                          sensorHistory.map((val, idx) => {
                            const isAnomalyBar = !!(s?.anomaly?.detected && val === s.anomaly?.current_value);
                            const barColor = isAnomalyBar ? '#000000' : getBarColor(val, false);
                            const height = (val / maxValue) * 100;
                            return <View key={idx} style={[styles.bar, { height: `${height}%`, backgroundColor: barColor }]} />;
                          })
                        )}
                      </View>
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