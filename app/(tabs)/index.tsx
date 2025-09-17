import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

import { VespaService } from '../../hive_brain/hive_one/VespaService';
import { SensorData } from '../../hive_brain/hive_one/types';

// Instâncias dos objetos orientados a objetos
const VESPA_URL = 'https://hive-chi-woad.vercel.app'; // Altere para a URL correta da sua API Vespa
const vespaService = new VespaService(VESPA_URL);

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  useWindowDimensions();
  const [node, setNode] = useState<SensorData | null>(null);
  const [vespaData, setVespaData] = useState<any | null>(null);
  const [vespaHTML, setVespaHTML] = useState<string | null>(null);
  const [vespaXML, setVespaXML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'json' | 'html' | 'xml'>('json');
  /// Buscar dados da API sensor do Vespa apenas
  useEffect(() => {
    const fetchVespaData = async () => {
      const { data, html } = await vespaService.fetchSensorInfo();
      setVespaData(data);
      setVespaHTML(html);

      // Atualiza node para exibir os mesmos dados que HiveScreen.tsx
      setNode(data);

      // Buscar XML da API do Vespa
      try {
        const xml = await vespaService.fetchSensorInfoXML?.();
        if (xml) {
          setVespaXML(xml);
        }
      } catch (e) {
        setVespaXML(null);
        console.error('Erro ao buscar XML:', e);
      }
    };
    fetchVespaData();
    const interval = setInterval(fetchVespaData, 2000);
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
              <Text style={styles.description}>📡 IP: {node.server_ip ?? '--'}</Text>r
              <Text style={styles.description}>🌡️ Temperatura: {node.temperatura ?? '--'}</Text>
              <Text style={styles.description}>💧 Umidade: {node.umidade ?? '--'}</Text>
              <Text style={styles.description}>🚪 Presença: {node.presenca ?? '--'}</Text>
              <Text style={styles.description}>📏 Distância: {node.distancia ?? '--'}</Text>
            </>
          ) : displayMode === 'json' && vespaData ? (
            <Text style={styles.description}>{JSON.stringify(vespaData, null, 2)}</Text>
          ) : displayMode === 'html' && vespaHTML ? (
            <View style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
              <WebView
                key={webviewKey}
                source={{ html: vespaHTML }}
                style={{ flex: 1 }}
                originWhitelist={['*']}
              />
            </View>
          ) : displayMode === 'xml' && vespaXML ? (
            <ScrollView style={{ maxHeight: 400, backgroundColor: '#222', borderRadius: 8, padding: 8 }}>
              <Text style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{vespaXML}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.description}>Conecte-se ao ESP32(VESPA) ou aguarde dados da Vespa...</Text>
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