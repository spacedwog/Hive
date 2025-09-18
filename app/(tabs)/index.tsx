import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, VERCEL_URL } from '@env'; // Certifique-se de que o .env está configurado corretamente
import BottomNav from '../../hive_body/BottomNav'; // Certifique-se de que o caminho está correto
import LoginScreen from '../../hive_body/LoginScreen';
import { GitHubIssueService } from '../../hive_brain/hive_one/GitHubIssueService';
import { VespaService } from '../../hive_brain/hive_one/VespaService';

// Instâncias dos objetos orientados a objetos
const vespaService = new VespaService(VERCEL_URL);

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);

  // Configure com seu token, owner e repo usando variáveis do .env
  const gitHubService = new GitHubIssueService(
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO
  );

  const handleAbrirIssue = async () => {
    const numero = await gitHubService.abrirIssue("Título via app", "Corpo da issue criada pelo app React Native");
    setIssueNumber(numero);
  };

  const handleFecharIssue = async () => {
    if (issueNumber) {
      await gitHubService.fecharIssue(issueNumber);
      setIssueNumber(null);
    }
  };
  useEffect(() => {
    if (!accessCode || accessCode.trim() === "") {
      return;
    }
    const fetchVespaData = async () => {
      const { data, html } = await vespaService.fetchSensorInfo();
      setVercelData(data);
      setVercelHTML(html);
    };
    fetchVespaData();
    const interval = setInterval(fetchVespaData, 2000);
    return () => clearInterval(interval);
  }, [accessCode]);

  if (!accessCode || accessCode.trim() === "") {
    return <LoginScreen onLogin={setAccessCode} />;
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        onScroll={() => setWebviewKey(prev => prev + 1)}
        scrollEventThrottle={400}
      >
        <Text style={styles.title}>📊 Data Science Dashboard</Text>
        <View style={[styles.card, { backgroundColor: '#1f2937' }]}>
          <View>
            {/* Botões para abrir/fechar issue */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <Text
                style={[styles.pageBtn, { marginRight: 8 }]}
                onPress={handleAbrirIssue}
              >
                Abrir Issue
              </Text>
              <Text
                style={styles.pageBtn}
                onPress={handleFecharIssue}
              >
                Fechar Issue
              </Text>
            </View>
            {issueNumber && (
              <Text style={{ color: '#50fa7b', marginBottom: 8 }}>
                Issue aberta: #{issueNumber}
              </Text>
            )}
            {vercelData ? (
              <View>
                {/* Exibe as chaves principais exceto 'data' e 'timestamp' */}
                {Object.entries(vercelData)
                  .filter(([key]) => key !== 'data' && key !== 'timestamp')
                  .map(([key, value]) => (
                    <Text key={key} style={styles.description}>
                      <Text style={{ fontWeight: 'bold', color: '#facc15' }}>{key}: </Text>
                      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                    </Text>
                  ))}
                {/* Exibe o campo 'data' completo */}
                {vercelData.data && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Servidor IP:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["ip"], null, 2)}
                      </Text>
                    </Text>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Sensor:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["sensor"], null, 2)}
                      </Text>
                    </Text>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Temperatura:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["temperature"], null, 2)}
                      </Text>
                    </Text>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Umidade:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["humidity"], null, 2)}
                      </Text>
                    </Text>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Presença:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["presenca"], null, 2)}
                      </Text>
                    </Text>
                    <Text style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>Distância:
                      <Text style={styles.description}>
                        {JSON.stringify(vercelData.data["distancia"], null, 2)}
                      </Text>
                    </Text>
                  </View>
                )}
                {/* Exibe o timestamp por último */}
                {'timestamp' in vercelData && (
                  <Text style={[styles.description, { marginTop: 12 }]}>
                    <Text style={{ fontWeight: 'bold', color: '#facc15' }}>timestamp: </Text>
                    {String(vercelData.timestamp)}
                  </Text>
                )}
              </View>
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
              <Text style={styles.description}>Carregando dados do Vespa...</Text>
            )}
          </View>
        </View>
      </ScrollView>
      {/* Exibe o BottomNav apenas após login */}
      <BottomNav />
    </>
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