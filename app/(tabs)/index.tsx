import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { SensorHistory } from '../../hive_brain/hive_one/SensorHistory';
import { VercelService } from '../../hive_brain/hive_one/VercelService';
import { SensorData } from '../../hive_brain/hive_one/types';

// Instâncias dos objetos orientados a objetos
const sensorHistory = new SensorHistory();
const VERCEL_URL = 'https://hive-chi-woad.vercel.app';
const vercelService = new VercelService(VERCEL_URL);

// -------------------------
// 🔹 Componente SparkBar
// -------------------------
interface SparkBarProps {
  data: number[];
  width: number;
  height?: number;
  highlightThreshold?: number;
  onBarPress?: (index: number, value: number) => void;
}

const SparkBar: React.FC<SparkBarProps> = ({
  data,
  width,
  height = 120,
  highlightThreshold = 80,
  onBarPress,
}) => {
  const n = Math.max(data.length, 1);
  const barGap = 2;
  let barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));
  let totalBarsAndGaps = n * barWidth + (n - 1) * barGap;
  if (totalBarsAndGaps > width) {
    barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));
    if (n * barWidth + (n - 1) * barGap > width && barGap > 0) {
      const maxBarGap = Math.floor((width - n * barWidth) / (n - 1));
      const adjustedBarGap = Math.max(0, maxBarGap);
      barWidth = Math.max(2, Math.floor((width - (n - 1) * adjustedBarGap) / n));
    }
  }

  return (
    <Pressable onPress={() => onBarPress && onBarPress(-1, 0)} style={{ width, height }}>
      <View style={[styles.chartBox, { width, height }]}>
        <View style={styles.chartAxis} />
        <View style={styles.chartBarsRow}>
          {data.map((v, i) => {
            const clamped = Math.max(0, Math.min(100, v ?? 0));
            const h = Math.max(2, Math.round((clamped / 100) * (height - 16)));
            const isAnomaly = clamped >= highlightThreshold;

            return (
              <Pressable
                key={`${i}-${v}`}
                onPress={() => onBarPress && onBarPress(i, clamped)}
                style={{ marginRight: i === n - 1 ? 0 : barGap }}
              >
                <View
                  style={[
                    styles.chartBar,
                    { width: barWidth, height: h, backgroundColor: isAnomaly ? '#ff5555' : '#50fa7b' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabelText}>0%</Text>
          <Text style={styles.chartLabelText}>100%</Text>
        </View>
      </View>
    </Pressable>
  );
};

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  const { width: winWidth } = useWindowDimensions();
  const [node] = useState<SensorData | null>(null);
  const [page, setPage] = useState<number>(0);
  const [alert] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ index: number; value: number } | null>(null);
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  // eslint-disable-next-line no-empty-pattern
  const [] = useState<number>(0); // Para forçar re-render do histórico

  useEffect(() => {
    setTooltip(null);
  }, [page]);

  const alertAnim = useMemo(() => new Animated.Value(0), []);
  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);

  // Buscar dados da API sensor do Vercel apenas
  useEffect(() => {
    const fetchVercelData = async () => {
      const { data, html } = await vercelService.fetchSensorInfo();
      setVercelData(data);
      setVercelHTML(html);
    };
    fetchVercelData();
    const interval = setInterval(fetchVercelData, 2000);
    return () => clearInterval(interval);
  }, []);

  const PAGE_COUNT = 4;
  const nextPage = () => setPage(prev => (prev + 1) % PAGE_COUNT);
  const prevPage = () => setPage(prev => (prev - 1 + PAGE_COUNT) % PAGE_COUNT);

  // Render
  const history = sensorHistory.getAll();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      onScroll={() => setWebviewKey(prev => prev + 1)}
      scrollEventThrottle={400}
    >
      <Text style={styles.title}>📊 Data Science Dashboard</Text>
      <View style={[styles.card, { backgroundColor: '#1f2937' }]}>
        {/* Página 0: NodeMCU ou fallback Vercel */}
        {page === 0 && (
          <View>
            {node ? (
              <>
                <Text style={styles.description}>🖥 Dispositivo: {node.device ?? '--'}</Text>
                <Text style={styles.description}>📡 IP AP: {node.server_ip ?? '--'}</Text>
                <Text style={styles.description}>🌐 IP STA: {node.sta_ip ?? '--'}</Text>
                <Text style={styles.description}>🔊 Som (raw): {node.sensor_raw ?? '--'}</Text>
                <Text style={styles.description}>
                  📈 Som (dB): {node.sensor_db?.toFixed(1) ?? '--'}
                </Text>
                <Text style={styles.description}>
                  ⚠️ Anomalia: {node.anomaly?.detected ? node.anomaly.message : 'Normal'}
                </Text>
                {node.anomaly?.detected && (
                  <Text style={styles.description}>
                    Valor Atual: {node.anomaly.current_value?.toFixed(1) ?? '--'}
                  </Text>
                )}
                {alert && (
                  <Animated.Text style={{ color: '#ff5555', fontWeight: 'bold', marginTop: 8, fontSize: 16, opacity: alertAnim }}>
                    {alert}
                  </Animated.Text>
                )}
                <Text style={styles.description}>🔌 Status: {node.status ?? '--'}</Text>
              </>
            ) : vercelData ? (
              <Text style={styles.description}>{JSON.stringify(vercelData, null, 2)}</Text>
            ) : vercelHTML ? (
              <View style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
                <WebView
                  key={webviewKey}
                  source={{ html: vercelHTML }}
                  style={{ flex: 1 }}
                  originWhitelist={['*']}
                />
              </View>
            ) : (
              <Text style={styles.description}>Conecte-se ao NodeMCU ou aguarde dados da Vercel...</Text>
            )}
          </View>
        )}

        {/* Página 1: Histórico NodeMCU */}
        {page === 1 && node?.sta_ip && history[node.sta_ip]?.length > 0 && (
          <View>
            <Text style={{ color: '#fff', marginBottom: 8 }}>📊 Histórico do Sensor ({node.sta_ip})</Text>
            <SparkBar
              data={history[node.sta_ip] ?? []}
              width={graphWidth}
              highlightThreshold={80}
              onBarPress={(index, value) => setTooltip(index === -1 ? null : { index, value })}
            />
            {tooltip && (
              <View style={styles.tooltipCard}>
                <Text style={styles.tooltipCardText}>
                  Ponto {tooltip.index + 1}: {tooltip.value.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Página 2: Histórico Geral */}
        {page === 2 && Object.keys(history).length > 0 && (
          <View>
            <Text style={{ color: '#f1faee', fontWeight: '600', marginBottom: 8, fontSize: 16 }}>📦 Histórico Geral</Text>
            {Object.entries(history).map(([serverIp, values]) => (
              <View key={serverIp} style={{ marginBottom: 12 }}>
                <Text style={{ color: '#a8dadc', fontSize: 14, marginBottom: 4 }}>
                  🌐 {serverIp} — Últimos {values.length} pontos
                </Text>
                <SparkBar data={values ?? []} width={graphWidth} height={80} highlightThreshold={80} />
              </View>
            ))}
          </View>
        )}

        {/* Página 3: Vercel */}
        {page === 3 && (
          <View style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
            {vercelData ? (
              <Text style={{ color: '#fff', padding: 12 }}>{JSON.stringify(vercelData, null, 2)}</Text>
            ) : vercelHTML ? (
              <WebView
                key={webviewKey}
                source={{ html: vercelHTML }}
                style={{ flex: 1 }}
                originWhitelist={['*']}
              />
            ) : (
              <Text style={{ color: '#facc15', textAlign: 'center', marginTop: 16 }}>Carregando dados da Vercel...</Text>
            )}
          </View>
        )}

        {/* Navegação */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <TouchableOpacity onPress={prevPage} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>⬅ Anterior</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextPage} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>Próximo ➡</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#a8dadc', textAlign: 'center', marginTop: 8 }}>Página {page + 1} de 4</Text>
      </View>
    </ScrollView>
  );
}

// -------------------------
// 📐 Estilos
// -------------------------
const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0f172a', alignItems: 'center' },
  title: { fontSize: 28, color: '#facc15', fontWeight: 'bold', marginBottom: 20 },
  card: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, width: '100%' },
  description: { fontSize: 16, color: '#e2e8f0', lineHeight: 24 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#50fa7b', borderRadius: 8 },
  pageBtnText: { color: '#0f172a', fontWeight: '600' },
  chartBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', alignSelf: 'center', paddingTop: 8, paddingHorizontal: 8 },
  chartAxis: { position: 'absolute', bottom: 8, left: 8, right: 8, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  chartBarsRow: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', paddingBottom: 8 },
  chartBar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  chartLabels: { position: 'absolute', top: 4, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  chartLabelText: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  tooltipCard: { marginTop: 12, backgroundColor: '#222', padding: 8, borderRadius: 8, alignItems: 'center' },
  tooltipCardText: { color: '#fff', fontWeight: '600' },
});