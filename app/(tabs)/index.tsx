// eslint-disable-next-line import/no-unresolved
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, VERCEL_URL } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import BottomNav from '../../hive_body/BottomNav';
import LoginScreen from '../../hive_body/LoginScreen';
import { GitHubIssueService } from '../../hive_brain/hive_one/GitHubIssueService';
import { VespaService } from '../../hive_brain/hive_one/VespaService';

const vespaService = new VespaService(VERCEL_URL);

export default function TelaPrinc() {
  const [vercelData, setVercelData] = useState<any | null>(null);
  const [vercelHTML, setVercelHTML] = useState<string | null>(null);
  const [webviewKey, setWebviewKey] = useState<number>(0);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);

  const [abrirModalVisible, setAbrirModalVisible] = useState(false);
  const [fecharModalVisible, setFecharModalVisible] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');
  const [newIssueLabels, setNewIssueLabels] = useState('');
  const [issuesAbertas, setIssuesAbertas] = useState<any[]>([]);
  const [selectedIssueToClose, setSelectedIssueToClose] = useState<number | null>(null);

  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [firewallPage, setFirewallPage] = useState(1);
  const ipsPerPage = 10;

  const previousAttemptsRef = useRef<number>(0);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const gitHubService = new GitHubIssueService(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);

  const handleAbrirIssue = () => setAbrirModalVisible(true);
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
      const todasIssues = await gitHubService.listarIssues();
      const abertas = todasIssues.filter((issue: any) => issue.state === "open");
      setIssuesAbertas(abertas);
    }
  };

  // -------------------------
  // Dados do Vespa
  // -------------------------
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

  // -------------------------
  // Dados do Firewall em tempo real
  // -------------------------
  useEffect(() => {
    if (!accessCode || accessCode.trim() === "") {
      return;
    }

    const fetchFirewallData = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await response.json();
        if (data.success) {
          setFirewallData(data.data);

          // animação se houver novas tentativas
          if (previousAttemptsRef.current < data.data.tentativasBloqueadas) {
            Animated.sequence([
              Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start();
          }
          previousAttemptsRef.current = data.data.tentativasBloqueadas;
        } else {
          setFirewallData(null);
        }
      } catch (err) {
        setFirewallData(null);
        console.error("Erro ao buscar dados do firewall:", err);
      }
    };
    fetchFirewallData();
    const interval = setInterval(fetchFirewallData, 5000);
    return () => clearInterval(interval);
  }, [accessCode, flashAnim]);

  if (!accessCode || accessCode.trim() === "") return <LoginScreen onLogin={setAccessCode} />;

  const paginatedIPs = firewallData?.blocked
    ? firewallData.blocked.slice((firewallPage - 1) * ipsPerPage, firewallPage * ipsPerPage)
    : [];
  const totalPages = firewallData?.blocked ? Math.ceil(firewallData.blocked.length / ipsPerPage) : 1;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} onScroll={() => setWebviewKey(prev => prev + 1)} scrollEventThrottle={400}>
        <Text style={styles.title}>📊 Data Science Dashboard</Text>

        {/* ------------------------- */}
        {/* Card Vespa */}
        {/* ------------------------- */}
        <View style={[styles.card, { backgroundColor: '#1f2937' }]}>
          <View>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <Text style={[styles.pageBtn, { marginRight: 8 }]} onPress={handleAbrirIssue}>Abrir Issue</Text>
              <Text style={styles.pageBtn} onPress={handleFecharIssue}>Fechar Issue</Text>
            </View>

            {abrirModalVisible && (
              <Modal visible={abrirModalVisible} animationType="slide" transparent onRequestClose={() => setAbrirModalVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Abrir nova Issue</Text>
                    <TextInput style={styles.input} value={newIssueTitle} onChangeText={setNewIssueTitle} placeholder="Título" placeholderTextColor="#888" />
                    <TextInput style={[styles.input, { height: 80 }]} value={newIssueBody} onChangeText={setNewIssueBody} placeholder="Descrição" placeholderTextColor="#888" multiline />
                    <TextInput style={styles.input} value={newIssueLabels} onChangeText={setNewIssueLabels} placeholder="Labels (separados por vírgula)" placeholderTextColor="#888" />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmAbrirIssue} disabled={!newIssueTitle}><Text style={styles.saveBtnText}>Criar</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setAbrirModalVisible(false)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            {fecharModalVisible && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Selecione a Issue para fechar:</Text>
                  <ScrollView style={{ maxHeight: 250 }}>
                    {issuesAbertas.length === 0 ? <Text style={{ color: '#fff' }}>Nenhuma issue aberta.</Text> :
                      issuesAbertas.map(issue => (
                        <TouchableOpacity key={issue.number} style={[styles.issueItem, selectedIssueToClose === issue.number && { backgroundColor: '#facc15' }]} onPress={() => setSelectedIssueToClose(issue.number)}>
                          <Text style={[styles.issueText, selectedIssueToClose === issue.number && { color: '#0f172a' }]}>#{issue.number} - {issue.title}</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <TouchableOpacity style={[styles.saveBtn, { opacity: selectedIssueToClose ? 1 : 0.5 }]} onPress={handleConfirmFecharIssue} disabled={!selectedIssueToClose}><Text style={styles.saveBtnText}>Fechar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setFecharModalVisible(false); setSelectedIssueToClose(null); }}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {issueNumber && <Text style={{ color: '#50fa7b', marginBottom: 8 }}>Issue aberta: #{issueNumber}</Text>}

            {vercelData ? (
              <View>
                {Object.entries(vercelData).filter(([key]) => key !== 'data' && key !== 'timestamp').map(([key, value]) => (
                  <Text key={key} style={styles.description}>
                    <Text style={{ fontWeight: 'bold', color: '#facc15' }}>{key}: </Text>
                    {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                  </Text>
                ))}

                {vercelData.data && (
                  <View style={{ marginTop: 12 }}>
                    {[
                      { key: "ip", label: "Servidor" },
                      { key: "sensor", label: "Sensor" },
                      { key: "temperature", label: "Temperatura" },
                      { key: "humidity", label: "Umidade" },
                      { key: "presenca", label: "Presença" },
                      { key: "distancia", label: "Distância" },
                      { key: "timestamp", label: "Horário" }
                    ].map(({ key, label }) => (
                      vercelData.data[key] !== undefined && (
                        <Text key={key} style={[styles.description, { color: '#facc15', fontWeight: 'bold' }]}>
                          {label}: <Text style={styles.description}>{JSON.stringify(vercelData.data[key], null, 2)}</Text>
                        </Text>
                      )
                    ))}
                  </View>
                )}
              </View>
            ) : vercelHTML ? (
              <View style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
                <WebView key={webviewKey} source={{ html: vercelHTML }} style={{ flex: 1 }} originWhitelist={['*']} />
              </View>
            ) : (
              <Text style={styles.description}>Carregando dados do Vespa...</Text>
            )}
          </View>
        </View>

        {/* ------------------------- */}
        {/* Card Firewall */}
        {/* ------------------------- */}
        <Animated.View style={[styles.card, { backgroundColor: flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['#22223b', '#f87171'] }) }]}>
          <Text style={styles.cardTitle}>🔥 Firewall</Text>
          {firewallData ? (
            <>
              <Text style={styles.description}>Status: <Text style={{ color: firewallData.status === "Ativo" ? "#50fa7b" : "#f87171", fontWeight: "bold" }}>{firewallData.status}</Text></Text>
              <Text style={styles.description}>Última atualização: <Text style={{ color: "#fff" }}>{firewallData.ultimaAtualizacao ? new Date(firewallData.ultimaAtualizacao).toLocaleString("pt-BR") : "-"}</Text></Text>
              <Text style={styles.description}>Tentativas bloqueadas: <Text style={{ color: "#f87171", fontWeight: "bold" }}>{firewallData.tentativasBloqueadas ?? "-"}</Text></Text>
              <Text style={styles.description}>Regras aplicadas: <Text style={{ color: "#50fa7b" }}>{firewallData.regrasAplicadas ?? "-"}</Text></Text>

              {paginatedIPs.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.description, { color: "#facc15", fontWeight: "bold" }]}>IPs bloqueados:</Text>
                  {paginatedIPs.map((ip: string, idx: number) => (<Text key={idx} style={styles.description}>{ip}</Text>))}

                  {totalPages > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                      <TouchableOpacity disabled={firewallPage <= 1} onPress={() => setFirewallPage(prev => prev - 1)} style={{ marginHorizontal: 8 }}>
                        <Text style={{ color: firewallPage > 1 ? '#50fa7b' : '#888' }}>◀</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#fff' }}>{firewallPage} / {totalPages}</Text>
                      <TouchableOpacity disabled={firewallPage >= totalPages} onPress={() => setFirewallPage(prev => prev + 1)} style={{ marginHorizontal: 8 }}>
                        <Text style={{ color: firewallPage < totalPages ? '#50fa7b' : '#888' }}>▶</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : <Text style={styles.description}>Carregando dados do firewall...</Text>}
        </Animated.View>
      </ScrollView>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0f172a', alignItems: 'center' },
  title: { fontSize: 28, color: '#facc15', fontWeight: 'bold', marginBottom: 20 },
  card: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, width: '100%', marginBottom: 20 },
  cardTitle: { fontSize: 20, color: '#facc15', fontWeight: 'bold', marginBottom: 10 },
  description: { fontSize: 16, color: '#e2e8f0', lineHeight: 24 },
  pageBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#50fa7b', borderRadius: 8 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 12 },
  saveBtn: { backgroundColor: '#50fa7b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#f87171', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1f2937', borderRadius: 12, padding: 24, width: '80%' },
  modalTitle: { color: '#facc15', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  issueItem: { padding: 10, backgroundColor: '#222', borderRadius: 8, marginBottom: 8 },
  issueText: { color: '#fff', fontWeight: 'bold' },
});