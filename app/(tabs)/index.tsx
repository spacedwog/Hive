import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

import { VercelService } from '../../hive_brain/hive_one/VercelService';
import { SensorData } from '../../hive_brain/hive_one/types';

// Instâncias dos objetos orientados a objetos
const VERCEL_URL = 'https://hive-chi-woad.vercel.app';
const vercelService = new VercelService(VERCEL_URL);

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  useWindowDimensions();
  const [node] = useState<SensorData | null>(null);const [alert] = useState<string | null>(null);
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [vercelXML, setVercelXML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'json' | 'html' | 'xml'>('json');

  const alertAnim = useMemo(() => new Animated.Value(0), []);

  // Buscar dados da API sensor do Vercel apenas
  useEffect(() => {
    const fetchVercelData = async () => {
      const { data, html } = await vercelService.fetchSensorInfo();
      setVercelData(data);
      setVercelHTML(html);

      // Buscar XML da API do Vercel
      try {
        const xml = await vercelService.fetchSensorInfoXML?.();
        if (xml) {
          setVercelXML(xml);
        }
      } catch (e) {
        setVercelXML(null);
        console.error('Erro ao buscar XML:', e);
      }
    };
    fetchVercelData();
    const interval = setInterval(fetchVercelData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Render

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      onScroll={() => setWebviewKey(prev => prev + 1)}
      scrollEventThrottle={400}
    >
      <Text style={styles.title}>📊 Data Science Dashboard</Text>
      <View style={[styles.card, { backgroundColor: '#1f2937' }]}>
        {/* Apenas Card 0 */}
        <View>
          {/* Botões para alternar entre JSON, HTML e XML */}
          <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
            <Text style={[styles.pageBtn, { backgroundColor: displayMode === 'json' ? '#facc15' : '#50fa7b' }]} onPress={() => setDisplayMode('json')}>JSON</Text>
            <Text style={[styles.pageBtn, { backgroundColor: displayMode === 'html' ? '#facc15' : '#50fa7b' }]} onPress={() => setDisplayMode('html')}>HTML</Text>
            <Text style={[styles.pageBtn, { backgroundColor: displayMode === 'xml' ? '#facc15' : '#50fa7b' }]} onPress={() => setDisplayMode('xml')}>XML</Text>
          </View>
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
          ) : displayMode === 'json' && vercelData ? (
            <Text style={styles.description}>{JSON.stringify(vercelData, null, 2)}</Text>
          ) : displayMode === 'html' && vercelHTML ? (
            <View style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
              <WebView
                key={webviewKey}
                source={{ html: vercelHTML }}
                style={{ flex: 1 }}
                originWhitelist={['*']}
              />
            </View>
          ) : displayMode === 'xml' && vercelXML ? (
            <ScrollView style={{ maxHeight: 400, backgroundColor: '#222', borderRadius: 8, padding: 8 }}>
              <Text style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{vercelXML}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.description}>Conecte-se ao NodeMCU ou aguarde dados da Vercel...</Text>
          )}
        </View>
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