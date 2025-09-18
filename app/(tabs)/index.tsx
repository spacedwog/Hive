import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { authorize } from 'react-native-app-auth';
import { WebView } from 'react-native-webview';

import BottomNav from '../../BottomNav'; // Certifique-se de que o caminho está correto
import { VespaService } from '../../hive_brain/hive_one/VespaService';
import LoginScreen from '../../LoginScreen';

// Instâncias dos objetos orientados a objetos
const VESPA_URL = 'https://hive-chi-woad.vercel.app';
const vespaService = new VespaService(VESPA_URL);

const githubConfig = {
  clientId: 'SEU_CLIENT_ID',
  clientSecret: 'SEU_CLIENT_SECRET',
  redirectUrl: 'com.seuapp://oauthredirect',
  scopes: ['read:user', 'repo'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
  },
};

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubRepo, setGithubRepo] = useState<any | null>(null);

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

  // Busca dados do repositório do GitHub após login
  useEffect(() => {
    if (!githubToken) {
      return;
    }
    const fetchRepo = async () => {
      const response = await fetch(
        'https://api.github.com/repos/SEU_USUARIO/SEU_REPOSITORIO',
        {
          headers: { Authorization: `token ${githubToken}` },
        }
      );
      const repoData = await response.json();
      setGithubRepo(repoData);
    };
    fetchRepo();
  }, [githubToken]);

  if (!accessCode || accessCode.trim() === "") {
    return <LoginScreen onLogin={setAccessCode} />;
  }

  if (!githubToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Conectar com GitHub</Text>
        <Text style={styles.description}>Para acessar o projeto, conecte sua conta do GitHub.</Text>
        <Text
          style={styles.pageBtnText}
          onPress={async () => {
            try {
              const result = await authorize(githubConfig);
              setGithubToken(result.accessToken);
            } catch (error) {
              alert('Erro ao conectar com GitHub: ' + error);
            }
          }}
        >
          Login com GitHub
        </Text>
      </View>
    );
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
            {/* Exibe dados do GitHub se disponíveis */}
            {githubRepo && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.title}>Projeto do GitHub</Text>
                <Text style={styles.description}>Nome: {githubRepo.name}</Text>
                <Text style={styles.description}>Descrição: {githubRepo.description}</Text>
                <Text style={styles.description}>Estrelas: {githubRepo.stargazers_count}</Text>
                <Text style={styles.description}>Forks: {githubRepo.forks_count}</Text>
                <Text style={styles.description}>URL: {githubRepo.html_url}</Text>
              </View>
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