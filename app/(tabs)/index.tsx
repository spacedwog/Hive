import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface SensorData {
  device: string;
  server_ip: string;
  sta_ip: string;
  sensor_raw: number;
  sensor_db: number;
  status: string;
  anomaly: {
    detected: boolean;
    message: string;
    current_value: number;
  };
}

const MAX_POINTS = 60;
const STORAGE_KEY = "@HiveStatusHistory";

// SparkBar component
const SparkBar: React.FC<{ data: number[]; width: number; height?: number }> = ({ data, width, height = 120 }) => {
  const n = Math.max(data.length, 1);
  const barGap = 2;
  const barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));

  return (
    <View style={[styles.chartBox, { width, height }]}>
      <View style={styles.chartAxis} />
      <View style={styles.chartBarsRow}>
        {data.map((v, i) => {
          const clamped = Math.max(0, Math.min(100, v));
          const h = Math.max(2, Math.round((clamped / 100) * (height - 16)));
          return (
            <View
              key={`${i}-${v}`}
              style={[styles.chartBar, { width: barWidth, height: h, marginRight: i === n - 1 ? 0 : barGap }]}
            />
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabelText}>0%</Text>
        <Text style={styles.chartLabelText}>100%</Text>
      </View>
    </View>
  );
};

export default function HiveHomeScreen() {
  const { width: winWidth } = useWindowDimensions();
  const [node, setNode] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});

  const opacityTitle = useSharedValue(0);
  const translateYTitle = useSharedValue(-20);
  const scaleCard = useSharedValue(0.9);
  const rotateHex = useSharedValue(-10);

  const STA_IP = '192.168.15.138';
  const SOFTAP_IP = '192.168.4.1';

  // Carrega histórico do AsyncStorage
  const loadHistory = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setHistory(JSON.parse(json));
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

  // Função para enviar comando
  const sendCommand = async (cmd: 'on' | 'off') => {
    if (!node) return;
    const ip = node.sta_ip !== 'desconectado' ? node.sta_ip : node.server_ip;
    try {
      await fetch(`http://${ip}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: cmd }),
      });
    } catch (error) {
      console.log(`Erro enviando comando para ${ip}:`, error);
    }
  };

  useEffect(() => {
    opacityTitle.value = withTiming(1, { duration: 800 });
    translateYTitle.value = withTiming(0, { duration: 800 });
    scaleCard.value = withDelay(400, withTiming(1, { duration: 800 }));
    rotateHex.value = withDelay(800, withTiming(0, { duration: 1000 }));

    loadHistory();

    const fetchData = async () => {
      try {
        let response = await fetch(`http://${STA_IP}/status`);
        if (!response.ok) throw new Error('STA offline');
        const data: SensorData = await response.json();
        setNode(data);
      } catch {
        try {
          let response = await fetch(`http://${SOFTAP_IP}/status`);
          if (!response.ok) throw new Error('Soft-AP offline');
          const data: SensorData = await response.json();
          setNode(data);
        } catch (error) {
          console.log('Erro ao obter dados do nó:', error);
          setNode(null);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Estilos animados
  const titleStyle = useAnimatedStyle(() => ({
    opacity: opacityTitle.value,
    transform: [{ translateY: translateYTitle.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCard.value }],
  }));

  const hexStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateHex.value}deg` }],
  }));

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={[styles.header, titleStyle]}>
        <Text style={styles.title}>🧠 H.I.V.E. Project</Text>
        <Text style={styles.subtitle}>Hyper-Intelligent Virtual Entity</Text>
      </Animated.View>

      {/* Card do Nó Ativo */}
      {node ? (
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.description}>🖥 Dispositivo: {node.device}</Text>
          <Text style={styles.description}>📡 IP AP: {node.server_ip}</Text>
          <Text style={styles.description}>🌐 IP STA: {node.sta_ip}</Text>
          <Text style={styles.description}>🔊 Som (raw): {node.sensor_raw}</Text>
          <Text style={styles.description}>📈 Som (dB): {node.sensor_db.toFixed(1)}</Text>
          <Text style={styles.description}>
            ⚠️ Anomalia: {node.anomaly.detected ? node.anomaly.message : 'Normal'}
          </Text>
          <Text style={styles.description}>🔌 Status: {node.status}</Text>

          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4CAF50' }]} onPress={() => sendCommand('on')}>
              <Text style={styles.btnText}>Ativar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#f44336', marginLeft: 10 }]} onPress={() => sendCommand('off')}>
              <Text style={styles.btnText}>Desativar</Text>
            </TouchableOpacity>
          </View>

          {/* Histórico do nó */}
          {history[node.sta_ip] && history[node.sta_ip].length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: '#fff', marginBottom: 8 }}>📊 Histórico do Sensor ({node.sta_ip})</Text>
              <SparkBar data={history[node.sta_ip]} width={graphWidth} height={120} />
            </View>
          )}
        </Animated.View>
      ) : (
        <Text style={{ color: '#facc15', marginTop: 20 }}>
          Conecte-se ao nó via WiFi (STA ou Soft-AP)...
        </Text>
      )}

      {/* Card do Histórico Geral do AsyncStorage */}
      {Object.keys(history).length > 0 && (
        <View style={[styles.card, { backgroundColor: '#162447', marginTop: 20 }]}>
          <Text style={{ color: '#f1faee', fontWeight: '600', marginBottom: 8, fontSize: 16 }}>
            📦 Histórico Geral do AsyncStorage
          </Text>
          {Object.entries(history).map(([serverIp, values]) => (
            <View key={serverIp} style={{ marginBottom: 12 }}>
              <Text style={{ color: '#a8dadc', fontSize: 14, marginBottom: 4 }}>
                🌐 {serverIp} — Últimos {values.length} pontos
              </Text>
              <SparkBar data={values} width={graphWidth} height={80} />
            </View>
          ))}
        </View>
      )}

      <Animated.View style={[styles.hexagonWrapper, hexStyle]}>
        <View style={styles.hexagon}>
          <View style={styles.hexagonInner} />
        </View>
        <Text style={styles.hexagonLabel}>{node ? 'Nó Ativo' : 'Nenhum nó'}</Text>
      </Animated.View>
    </ScrollView>
  );
}

const HEX_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#facc15',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginVertical: 12,
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  hexagonWrapper: {
    marginTop: 20,
    alignItems: 'center',
  },
  hexagon: {
    width: HEX_SIZE,
    height: HEX_SIZE * 0.866,
    backgroundColor: '#facc15',
    marginVertical: HEX_SIZE * 0.133,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '30deg' }],
  },
  hexagonInner: {
    width: HEX_SIZE,
    height: HEX_SIZE * 0.866,
    backgroundColor: '#facc15',
    transform: [{ rotate: '-30deg' }],
  },
  hexagonLabel: {
    marginTop: 10,
    fontSize: 16,
    color: '#facc15',
    fontWeight: '600',
  },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  chartBox: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", alignSelf: "center", paddingTop: 8, paddingHorizontal: 8 },
  chartAxis: { position: "absolute", bottom: 8, left: 8, right: 8, height: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end", height: "100%", paddingBottom: 8 },
  chartBar: { backgroundColor: "#50fa7b", borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabels: { position: "absolute", top: 4, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" },
  chartLabelText: { fontSize: 10, color: "rgba(255,255,255,0.6)" },
});