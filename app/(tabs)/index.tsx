// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
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
import { FirewallUtils, Rule } from '../../hive_security/hive_ip/hive_firewall.tsx';

interface BlockedEntry {
  ip: string;
  reason?: string;
  timestamp: string;
}

const STORAGE_KEY = 'blockedHistory';
const SECRET_KEY = '6z2h1j3k9F!'; // troque por uma chave forte

// --- Hook de armazenamento seguro ---
function useSecureStorage() {
  const { getItem, setItem, removeItem } = useAsyncStorage(STORAGE_KEY);

  const saveSecureData = async (data: any) => {
    const json = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(json, SECRET_KEY).toString();
    await setItem(encrypted);
  };

  const loadSecureData = async () => {
    const encrypted = await getItem();
    if (!encrypted) return null;
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(json);
  };

  const clearSecureData = async () => {
    await removeItem();
  };

  return { saveSecureData, loadSecureData, clearSecureData };
}

// --- Componente Principal ---
export default function TelaPrinc() {
  const { saveSecureData, loadSecureData } = useSecureStorage();

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

  // --- Modal ---
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

  // --- Histórico de bloqueios ---
  const loadBlockedHistory = async () => {
    try {
      const data = await loadSecureData();
      if (data) setBlockedHistory(data);
    } catch (err: any) {
      console.error('Erro ao carregar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao carregar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  };

  const saveBlockedHistory = async (data: BlockedEntry[]) => {
    try {
      await saveSecureData(data);
    } catch (err: any) {
      console.error('Erro ao salvar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao salvar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  };

  // --- Busca histórico da API ---
  const fetchBlockedHistoryFromAPI = async () => {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/firewall?action=blocked`);
      const text = await resp.text();
      let data;
      try { 
        data = JSON.parse(text); 
      } catch {
        console.error('Resposta inválida da API (blocked):', text);
        setErrorMessage('Erro: resposta da API inválida ao carregar bloqueios');
        setErrorModalVisible(true);
        return;
      }

      if (!data.success || !data.data || !Array.isArray(data.data.blocked)) {
        console.warn('Nenhum bloqueio encontrado na API ou formato inválido', data);
        setBlockedHistory([]);
        return;
      }

      const entries: BlockedEntry[] = data.data.blocked.map((ip: string) => ({
        ip,
        reason: 'Automático',
        timestamp: new Date().toISOString(),
      }));

      setBlockedHistory(entries);
      saveBlockedHistory(entries);
    } catch (err: any) {
      console.error('Erro ao buscar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao carregar histórico de bloqueios da API');
      setErrorModalVisible(true);
    }
  };

  // --- Potential IPs ---
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

  // --- Verificação de firewall ---
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

        // Bloqueio automático
        for (const potentialIP of potentialIPs) {
          if (blockedHistory.find(b => b.ip === potentialIP)) continue;

          const routeRisk = FirewallUtils.evaluateRouteRisk({
            destination: connectedIP,
            gateway: potentialIP
          });

          if (routeRisk.level !== 'Baixo') {
            await fetch(`${VERCEL_URL}/api/firewall?action=routes`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination: connectedIP })
            });

            await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ip: potentialIP })
            });

            setBlockedHistory(prev => {
              const updated = [
                ...prev,
                {
                  ip: potentialIP,
                  reason: routeRisk.level !== 'Baixo' ? routeRisk.level : 'Automático',
                  timestamp: new Date().toISOString(),
                }
              ];
              saveBlockedHistory(updated);
              return updated;
            });

            await FirewallUtils.fetchAndSaveRoutes(setRules, setRawJson, setErrorMessage, setErrorModalVisible);
          }
        }

        // Criação de novas rotas se necessário
        if (data.data.tentativasBloqueadas >= data.data.regrasAplicadas) {
          const dest = "192.168.15.188/status";
          const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '8.8.8.8';
          await FirewallUtils.saveRoute(dest, gateway, setRules, setErrorModalVisible, setErrorMessage);
        }

        // Atualiza histórico do servidor
        await fetchBlockedHistoryFromAPI();

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
  }, [accessCode, potentialIPs]); 

  // --- Load inicial ---
  useEffect(() => {
    loadBlockedHistory();
    fetchBlockedHistoryFromAPI();
  }, []);

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
                Nível de risco: <Text style={{ color: risk.color, fontWeight: 'bold' }}>{risk.level} (Ratio: {risk.ratio.toFixed(2)})</Text>
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

              {/* Histórico detalhado */}
              <FirewallUtils.PaginatedList
                items={blockedHistory.length ? blockedHistory : []}
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
                      Bloqueado em: {new Date(entry.timestamp).toLocaleString()}
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

      {/* Modal de rota */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={hideModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Nova Rota</Text>
            <TextInput placeholder="Destino" value={newDestination} onChangeText={setNewDestination} style={styles.input} placeholderTextColor="#94a3b8" />
            <TextInput placeholder="Gateway" value={newGateway} onChangeText={setNewGateway} style={styles.input} placeholderTextColor="#94a3b8" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#50fa7b' }]} onPress={async () => {
                if (!newDestination.trim() || !newGateway.trim()) {
                  setErrorMessage("Destino e Gateway são obrigatórios!");
                  setErrorModalVisible(true);
                  return;
                }
                await FirewallUtils.saveRoute(newDestination.trim(), newGateway.trim(), setRules, setErrorModalVisible, setErrorMessage);
                hideModal();
              }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#fbbf24' }]} onPress={async () => {
                if (!newDestination.trim()) {
                  setErrorMessage("Informe o destino para deletar!");
                  setErrorModalVisible(true);
                  return;
                }
                try {
                  const resp = await fetch(`${VERCEL_URL}/api/firewall?action=routes`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ destination: newDestination.trim() }),
                  });
                  const text = await resp.text();
                  let data;
                  try { data = JSON.parse(text); } 
                  catch { 
                    console.error('Resposta inválida da API ao deletar:', text);
                    setErrorMessage('Erro: resposta da API inválida ao deletar rota');
                    setErrorModalVisible(true);
                    return;
                  }
                  if (!data.success) {
                    setErrorMessage(data.error || "Falha ao deletar a rota");
                    setErrorModalVisible(true);
                  } else {
                    setRules(prev => prev.filter(r => r.destination !== newDestination.trim()));
                    hideModal();
                  }
                } catch (err: any) {
                  setErrorMessage(err.message || "Falha ao deletar a rota");
                  setErrorModalVisible(true);
                }
              }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Deletar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f87171' }]} onPress={hideModal}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {/* Modal de erro */}
      <Modal
        transparent={true}
        visible={errorModalVisible}
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#0f172a' }]}>
            <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Erro</Text>
            <Text style={{ color: '#fff', marginBottom: 16 }}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#f87171' }]}>
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
  card:{ borderRadius:16,padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:4,backgroundColor:'#1e293b',width:'100%' },
  description:{ color:'#fff', fontSize:14, marginBottom:4 },
  loginContainer:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#0f172a',padding:24 },
  loginBtn:{ backgroundColor:'#50fa7b', padding:12, borderRadius:8, marginTop:12 },
  modalOverlay:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.5)' },
  modalContent:{ backgroundColor:'#1e293b', borderRadius:12, padding:20, width:'90%' },
  modalBtn:{ padding:12, borderRadius:8, flex:1, alignItems:'center', marginHorizontal:4 },
  input:{ borderWidth:1, borderColor:'#94a3b8', borderRadius:8, padding:8, marginBottom:8, color:'#fff' }
});