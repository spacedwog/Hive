// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import BottomNav from '../../hive_body/BottomNav.tsx';
import {
  addBlockedEntry,
  addRule,
  deleteRule,
  getBlockedHistory,
  getRules,
  initDB
} from '../../hive_security/hive_database/database.ts';
import { FirewallUtils, Rule } from '../../hive_security/hive_ip/hive_firewall.tsx';

interface BlockedEntry {
  ip: string;
  reason?: string;
  timestamp: string;
}

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [, setRawJson] = useState<any | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]);
  const [blockedHistory, setBlockedHistory] = useState<BlockedEntry[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newDestination, setNewDestination] = useState('');
  const [newGateway, setNewGateway] = useState('');

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const ipsPerPage = 10;
  const rulesPerPage = 5;
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showModal = () => {
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  };

  const hideModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
      setNewDestination('');
      setNewGateway('');
    });
  };

  // --- Inicializa DB e carrega dados ---
  useEffect(() => {
    initDB();
    (async () => {
      const history = await getBlockedHistory();
      setBlockedHistory(history);
      const rulesDb = await getRules();
      setRules(rulesDb);
    })();
  }, []);

  const formatBlockedTime = (isoString: string) => {
    const blockedDate = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - blockedDate.getTime();

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let elapsed = '';
    if (diffDays > 0) elapsed += `${diffDays}d `;
    if (diffHours % 24 > 0) elapsed += `${diffHours % 24}h `;
    if (diffMinutes % 60 > 0) elapsed += `${diffMinutes % 60}m `;
    if (diffSeconds % 60 > 0 && diffDays === 0 && diffHours === 0) elapsed += `${diffSeconds % 60}s `;

    return `${blockedDate.toLocaleDateString()} (há ${elapsed.trim()})`;
  };

  // --- Carrega Potential IPs ---
  useEffect(() => {
    const loadPotentialIPs = async () => {
      const domains = [
        'google.com','youtube.com','github.com',
        'microsoft.com','cloudflare.com','twitter.com',
        'instagram.com','amazon.com'
      ];
      try {
        const results = await Promise.all(domains.map(FirewallUtils.resolveDomainA));
        const aggregated: string[] = [];
        for (const arr of results) {
          const ipArr = arr as string[];
          for (const ip of ipArr) if (!aggregated.includes(ip)) aggregated.push(ip);
        }
        if (aggregated.length === 0) {
          aggregated.push('142.250.190.14','172.217.169.78','140.82.121.4','104.16.133.229');
        }
        setPotentialIPs(aggregated);
      } catch (err: any) {
        setErrorMessage(err.message || 'Falha ao carregar IPs potenciais');
        setErrorModalVisible(true);
      }
    };
    if (accessCode && potentialIPs.length === 0) loadPotentialIPs();
  }, [accessCode, potentialIPs.length]);

  // --- Verifica firewall, risco e bloqueios automáticos ---
  useEffect(() => {
    if (!accessCode || accessCode.trim() === '') return;

    const checkAndBlockHighRiskRoutes = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch {
          console.error('Resposta inválida da API:', text);
          setErrorMessage('Erro: resposta da API inválida');
          setErrorModalVisible(true);
          setFirewallData(null);
          return;
        }

        setRawJson((prev: any) => ({ ...prev, firewall: data }));

        if (!data.success) {
          setFirewallData(null);
          return;
        }

        setFirewallData(data.data);
        const risk = FirewallUtils.calculateRiskLevel(data.data);
        const connectedIP = data.data.ipConectado;

        // Bloqueio automático de IPs de alto risco
        for (const potentialIP of potentialIPs) {
          if (blockedHistory.find(b => b.ip === potentialIP)) continue;

          const routeRisk = FirewallUtils.evaluateRouteRisk({
            destination: connectedIP,
            gateway: potentialIP
          });

          if (routeRisk.level !== 'Baixo') {
            // Deleta rota antiga
            await fetch(`${VERCEL_URL}/api/firewall?action=routes`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: connectedIP })
            });

            // Bloqueia IP
            await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ip: potentialIP })
            });

            // Adiciona ao histórico no banco
            const entry: BlockedEntry = {
              ip: potentialIP,
              reason: routeRisk.level !== 'Baixo' ? routeRisk.level : 'Automático',
              timestamp: new Date().toISOString(),
            };
            await addBlockedEntry(entry.ip, entry.reason!, entry.timestamp);
            const history = await getBlockedHistory();
            setBlockedHistory(history);

            await FirewallUtils.fetchAndSaveRoutes(setRules, setRawJson, setErrorMessage, setErrorModalVisible);
          }
        }

        // Criação de novas rotas caso necessário
        if (data.data.tentativasBloqueadas >= data.data.regrasAplicadas) {
          const dest = "192.168.15.166/status";
          const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '8.8.8.8';
          await addRule(dest, gateway);
          const rulesDb = await getRules();
          setRules(rulesDb);
        }

      } catch (err: any) {
        console.error('Erro fetch firewall:', err);
        setRawJson((prev: any) => ({ ...prev, firewallError: err?.message || 'Falha no fetch firewall' }));
        setFirewallData(null);
        setErrorMessage(err?.message || 'Falha ao processar rotas');
        setErrorModalVisible(true);
      }
    };

    checkAndBlockHighRiskRoutes();
    const interval = setInterval(checkAndBlockHighRiskRoutes, 5000);
    return () => clearInterval(interval);
  }, [accessCode, potentialIPs, blockedHistory]);

  if (!accessCode || accessCode.trim() === '')
    return (
      <View style={styles.loginContainer}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Acesse o HIVE Project</Text>
        <TouchableOpacity onPress={() => setAccessCode('ACESSO_LIBERADO')} style={styles.loginBtn}>
          <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Login</Text>
        </TouchableOpacity>
      </View>
    );

  const risk = FirewallUtils.calculateRiskLevel(firewallData);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {firewallData ? (
            <>
              <Text style={styles.description}>
                Status: <Text style={{ color: firewallData.status === 'Ativo' ? '#50fa7b' : '#f87171', fontWeight: 'bold' }}>{firewallData.status}</Text>
              </Text>
              <Text style={styles.description}>
                Nível de risco: <Text style={{ color: risk.color, fontWeight: 'bold' }}>
                  {risk.level} (Ratio: {risk.ratio.toFixed(2)})
                </Text>
              </Text>
              <Text style={styles.description}>
                Tentativas bloqueadas: <Text style={{ color: '#f87171', fontWeight: 'bold' }}>{risk.tentativas}</Text>
              </Text>
              <Text style={styles.description}>
                Regras aplicadas: <Text style={{ color: '#50fa7b', fontWeight: 'bold' }}>{risk.regras}</Text>
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FirewallUtils.PaginatedList
                    items={firewallData.blocked as string[] ?? []}
                    itemsPerPage={ipsPerPage}
                    renderItem={(ip: string, idx: number) => <Text key={idx} style={styles.description}>{ip}</Text>}
                    title="IPs Bloqueados"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.description,{color:'#38bdf8',fontWeight:'bold'}]}>Potential IPs</Text>
                  {potentialIPs.map((ip, idx) => (<Text key={idx} style={styles.description}>{ip}</Text>))}
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: '#38bdf8', padding: 12, borderRadius: 8, marginTop: 12 }}
                onPress={showModal}
              >
                <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Adicionar Rota</Text>
              </TouchableOpacity>

              {/* Histórico de bloqueios detalhado */}
              <FirewallUtils.PaginatedList
                items={blockedHistory}
                itemsPerPage={5}
                renderItem={(entry: BlockedEntry, idx: number) => (
                  <View key={idx} style={{ marginBottom: 6 }}>
                    <Text style={styles.description}>
                      IP: <Text style={{ fontWeight: 'bold' }}>{entry.ip}</Text>
                    </Text>
                    <Text style={[styles.description, { color: '#f87171' }]}>
                      Motivo: {entry.reason}
                    </Text>
                    <Text style={[styles.description, { color: '#94a3b8' }]}>
                      Bloqueado: {formatBlockedTime(entry.timestamp)}
                    </Text>
                  </View>
                )}
                title="Histórico de bloqueios"
              />

              <FirewallUtils.PaginatedList
                items={rules}
                itemsPerPage={rulesPerPage}
                renderItem={(r: Rule, idx: number) => <Text key={idx} style={styles.description}>{r.destination} ➝ {r.gateway}</Text>}
                title="Regras e Rotas Criadas"
              />
            </>
          ) : <Text style={styles.description}>Carregando dados do firewall...</Text>}
        </View>
      </ScrollView>
      <BottomNav />

      {/* Modal para adicionar rota */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={hideModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Nova Rota</Text>

            <TextInput
              placeholder="Destino"
              value={newDestination}
              onChangeText={setNewDestination}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              placeholder="Gateway"
              value={newGateway}
              onChangeText={setNewGateway}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              {/* Salvar */}
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#50fa7b' }]} onPress={async () => {
                if (!newDestination.trim() || !newGateway.trim()) {
                  setErrorMessage("Destino e Gateway são obrigatórios!");
                  setErrorModalVisible(true);
                  return;
                }
                await addRule(newDestination.trim(), newGateway.trim());
                const rulesDb = await getRules();
                setRules(rulesDb);
                hideModal();
              }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Salvar</Text>
              </TouchableOpacity>

              {/* Deletar */}
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#fbbf24' }]} onPress={async () => {
                if (!newDestination.trim()) {
                  setErrorMessage("Informe o destino para deletar!");
                  setErrorModalVisible(true);
                  return;
                }
                try {
                  await deleteRule(newDestination.trim());
                  const rulesDb = await getRules();
                  setRules(rulesDb);
                  hideModal();
                } catch (err: any) {
                  setErrorMessage(err.message || "Falha ao deletar a rota");
                  setErrorModalVisible(true);
                }
              }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Deletar</Text>
              </TouchableOpacity>

              {/* Cancelar */}
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f87171' }]} onPress={hideModal}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {/* Modal de erro global */}
      <Modal
        transparent={true}
        visible={errorModalVisible}
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#0f172a' }]}>
            <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
              Erro
            </Text>
            <Text style={{ color: '#fff', marginBottom: 16 }}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setErrorModalVisible(false)}
              style={[styles.modalBtn, { backgroundColor: '#f87171' }]}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding:24, backgroundColor:'#0f172a', alignItems:'center' },
  card:{ borderRadius:16,padding:20,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:12,width:'100%',marginBottom:20 },
  description:{ fontSize:16,color:'#e2e8f0',lineHeight:24 },
  loginContainer:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#0f172a' },
  loginBtn:{ backgroundColor:'#50fa7b',borderRadius:8,paddingVertical:8,paddingHorizontal:24,marginTop:12 },
  modalOverlay:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)' },
  modalContent:{ backgroundColor:'#0f172a', padding:24, borderRadius:16, width:'80%' },
  input:{ borderWidth:1, borderColor:'#94a3b8', borderRadius:8, padding:8, color:'#fff', marginTop:8 },
  modalBtn:{ flex:1, padding:12, borderRadius:8, alignItems:'center', marginHorizontal:4 },
});