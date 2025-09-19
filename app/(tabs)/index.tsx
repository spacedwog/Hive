import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

// eslint-disable-next-line import/no-unresolved
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, VERCEL_URL } from '@env'; // Certifique-se de que o .env está configurado corretamente
import BottomNav from '../../hive_body/BottomNav'; // Certifique-se de que o caminho está correto
import LoginScreen from '../../hive_body/LoginScreen';
import { GitHubIssueService } from '../../hive_brain/hive_one/GitHubIssueService';
import { VespaService } from '../../hive_brain/hive_one/VespaService';

// Exemplo de serviço para o firewall da Vercel
class VercelFirewallService {
  constructor(private baseUrl: string, private token: string) {}

  async getFirewallRules() {
    const res = await fetch(`${this.baseUrl}/v1/firewall/rules`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error('Erro ao buscar regras do firewall');
    }
    return res.json();
  }
}

const vespaService = new VespaService(VERCEL_URL);
const vercelFirewallService = new VercelFirewallService(VERCEL_URL, GITHUB_TOKEN); // Use o token correto

// -------------------------
// 📊 TelaPrincipal
// -------------------------
export default function TelaPrinc() {
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);

  // Novos estados para modal de fechar issue
  const [fecharModalVisible, setFecharModalVisible] = useState(false);
  const [issuesAbertas, setIssuesAbertas] = useState<any[]>([]);
  const [selectedIssueToClose, setSelectedIssueToClose] = useState<number | null>(null);

  // Estados para modal de abrir issue
  const [abrirModalVisible, setAbrirModalVisible] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');
  const [newIssueLabels, setNewIssueLabels] = useState('');

  // Configure com seu token, owner e repo usando variáveis do .env
  const gitHubService = new GitHubIssueService(
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO
  );

  // Estados para o firewall
  const [firewallModalVisible, setFirewallModalVisible] = useState(false);
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [firewallLoading, setFirewallLoading] = useState(false);

  const handleOpenFirewall = async () => {
    setFirewallLoading(true);
    setFirewallModalVisible(true);
    try {
      const data = await vercelFirewallService.getFirewallRules();
      setFirewallRules(data.rules || []);
    } catch (e) {
      setFirewallRules([]);
      console.error('Erro ao carregar regras do firewall:', e);
    }
    setFirewallLoading(false);
  };

  const handleAbrirIssue = () => {
    setAbrirModalVisible(true);
  };

  const handleConfirmAbrirIssue = async () => {
    const labels = newIssueLabels.split(',').map(l => l.trim()).filter(l => l.length > 0);
    const numero = await gitHubService.abrirIssue(newIssueTitle, newIssueBody, labels);
    setIssueNumber(numero);
    setAbrirModalVisible(false);
    setNewIssueTitle('');
    setNewIssueBody('');
    setNewIssueLabels('');
  };

  const handleFecharIssue = async () => {
    // Busca issues abertas e abre o modal
    const todasIssues = await gitHubService.listarIssues();
    const abertas = todasIssues.filter((issue: any) => issue.state === "open");
    setIssuesAbertas(abertas);
    setFecharModalVisible(true);
  };

  const handleConfirmFecharIssue = async () => {
    if (selectedIssueToClose) {
      await gitHubService.fecharIssue(selectedIssueToClose);
      setFecharModalVisible(false);
      setSelectedIssueToClose(null);
      setIssueNumber(null);
      // Opcional: atualizar lista de issues abertas
      const todasIssues = await gitHubService.listarIssues();
      const abertas = todasIssues.filter((issue: any) => issue.state === "open");
      setIssuesAbertas(abertas);
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
            {/* Botões para abrir/fechar issue e firewall */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <Text
                style={[styles.pageBtn, { marginRight: 8 }]}
                onPress={handleAbrirIssue}
              >
                Abrir Issue
              </Text>
              <Text
                style={[styles.pageBtn, { marginRight: 8 }]}
                onPress={handleFecharIssue}
              >
                Fechar Issue
              </Text>
              <Text
                style={styles.pageBtn}
                onPress={handleOpenFirewall}
              >
                Firewall Vercel
              </Text>
            </View>
            {/* Modal para abrir issue */}
            <Modal
              visible={abrirModalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setAbrirModalVisible(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 12,
                  padding: 24,
                  width: '80%',
                }}>
                  <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                    Abrir nova Issue
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newIssueTitle}
                    onChangeText={setNewIssueTitle}
                    placeholder="Título"
                    placeholderTextColor="#888"
                  />
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    value={newIssueBody}
                    onChangeText={setNewIssueBody}
                    placeholder="Descrição"
                    placeholderTextColor="#888"
                    multiline
                  />
                  <TextInput
                    style={styles.input}
                    value={newIssueLabels}
                    onChangeText={setNewIssueLabels}
                    placeholder="Labels (separados por vírgula)"
                    placeholderTextColor="#888"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleConfirmAbrirIssue}
                      disabled={!newIssueTitle}
                    >
                      <Text style={styles.saveBtnText}>Criar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setAbrirModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
            {/* Modal para visualizar regras do firewall */}
            <Modal
              visible={firewallModalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setFirewallModalVisible(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 12,
                  padding: 24,
                  width: '80%',
                  maxHeight: '70%',
                }}>
                  <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                    Regras do Firewall Vercel
                  </Text>
                  {firewallLoading ? (
                    <Text style={{ color: '#fff' }}>Carregando...</Text>
                  ) : firewallRules.length === 0 ? (
                    <Text style={{ color: '#fff' }}>Nenhuma regra encontrada.</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 250 }}>
                      {firewallRules.map((rule, idx) => (
                        <View key={idx} style={{ marginBottom: 8, backgroundColor: '#222', borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: '#facc15', fontWeight: 'bold' }}>ID: <Text style={{ color: '#fff' }}>{rule.id}</Text></Text>
                          <Text style={{ color: '#facc15', fontWeight: 'bold' }}>Tipo: <Text style={{ color: '#fff' }}>{rule.type}</Text></Text>
                          <Text style={{ color: '#facc15', fontWeight: 'bold' }}>Valor: <Text style={{ color: '#fff' }}>{rule.value}</Text></Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={{ backgroundColor: '#f87171', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, marginTop: 16 }}
                    onPress={() => setFirewallModalVisible(false)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Modal para selecionar issue a ser fechada */}
            {fecharModalVisible && (
              <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
              }}>
                <View style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 12,
                  padding: 24,
                  width: '80%',
                  maxHeight: '70%',
                }}>
                  <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
                    Selecione a Issue para fechar:
                  </Text>
                  <ScrollView style={{ maxHeight: 250 }}>
                    {issuesAbertas.length === 0 ? (
                      <Text style={{ color: '#fff' }}>Nenhuma issue aberta.</Text>
                    ) : (
                      issuesAbertas.map(issue => (
                        <TouchableOpacity
                          key={issue.number}
                          style={{
                            padding: 10,
                            backgroundColor: selectedIssueToClose === issue.number ? '#facc15' : '#222',
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                          onPress={() => setSelectedIssueToClose(issue.number)}
                        >
                          <Text style={{
                            color: selectedIssueToClose === issue.number ? '#0f172a' : '#fff',
                            fontWeight: 'bold'
                          }}>
                            #{issue.number} - {issue.title}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#50fa7b',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 24,
                        opacity: selectedIssueToClose ? 1 : 0.5
                      }}
                      onPress={handleConfirmFecharIssue}
                      disabled={!selectedIssueToClose}
                    >
                      <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Fechar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#f87171',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 24
                      }}
                      onPress={() => {
                        setFecharModalVisible(false);
                        setSelectedIssueToClose(null);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
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
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 12 },
  saveBtn: { backgroundColor: '#50fa7b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#f87171', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' },
});