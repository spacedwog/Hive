// --- Importações ---
import { VERCEL_URL } from '@env';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import 'react-native-get-random-values'; // 🔹 Necessário para CryptoJS no RN
import BottomNav from '../../hive_body/BottomNav.tsx';
import { FirewallUtils, Rule } from '../../hive_security/hive_ip/hive_firewall.tsx';

interface BlockedEntry {
  ip: string;
  reason?: string;
  timestamp: string;
}

// --- Configuração de armazenamento seguro ---
const STORAGE_KEY = 'blockedHistory';
const SECRET_KEY = '6z2h1j3k9F!'; // troque por uma chave forte

// --- Hook de AsyncStorage ---
const useSecureStorage = () => {
  const { getItem, setItem, removeItem } = useAsyncStorage(STORAGE_KEY);

  const saveSecureData = async (data: any) => {
    try {
      const json = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(json, SECRET_KEY).toString();
      await setItem(encrypted);
    } catch (err) {
      console.error('Erro ao salvar dados seguros:', err);
      throw err;
    }
  };

  const loadSecureData = async () => {
    try {
      const encrypted = await getItem();
      if (!encrypted) return null;
      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      const json = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(json);
    } catch (err) {
      console.error('Erro ao carregar dados seguros:', err);
      throw err;
    }
  };

  const clearSecureData = async () => {
    try {
      await removeItem();
    } catch (err) {
      console.error('Erro ao limpar dados seguros:', err);
    }
  };

  return { saveSecureData, loadSecureData, clearSecureData };
};

// --- Componente Principal ---
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

  const { saveSecureData, loadSecureData, clearSecureData } = useSecureStorage();

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
  const loadBlockedHistoryHook = async () => {
    try {
      const data = await loadSecureData();
      if (data) setBlockedHistory(data);
    } catch (err: any) {
      console.error('Erro ao carregar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao carregar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  };

  const saveBlockedHistoryHook = async (data: BlockedEntry[]) => {
    try {
      await saveSecureData(data);
    } catch (err: any) {
      console.error('Erro ao salvar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao salvar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  };

  // --- Fetch blockedHistory API ---
  const fetchBlockedHistoryFromAPI = async () => {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/firewall?action=blocked`);
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch {
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
      saveBlockedHistoryHook(entries);
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
              saveBlockedHistoryHook(updated);
              return updated;
            });

            await FirewallUtils.fetchAndSaveRoutes(setRules, setRawJson, setErrorMessage, setErrorModalVisible);
          }
        }

        // Novas rotas se necessário
        if (data.data.tentativasBloqueadas >= data.data.regrasAplicadas) {
          const dest = "192.168.15.188/status";
          const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '8.8.8.8';
          await FirewallUtils.saveRoute(dest, gateway, setRules, setErrorModalVisible, setErrorMessage);
        }

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
    loadBlockedHistoryHook();
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
              {/* ✅ Restante do JSX idêntico ao seu, incluindo modais e listas */}
            </>
          ) : <Text style={styles.description}>Carregando dados do firewall...</Text>}
        </View>
      </ScrollView>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding:24, backgroundColor:'#0f172a', alignItems:'center' },
  card:{ borderRadius:16,padding:20,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:12,width:'100%',marginBottom:20 },
  description:{ fontSize:16,color:'#e2e8f0',lineHeight:24 },
  loginContainer:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#0f172a' },
  loginBtn:{ backgroundColor:'#50fa7b',borderRadius:8,paddingVertical:8,paddingHorizontal:24, marginTop:12 },
  modalOverlay:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)' },
  modalContent:{ backgroundColor:'#0f172a', padding:24, borderRadius:16, width:'80%' },
  input:{ borderWidth:1, borderColor:'#94a3b8', borderRadius:8, padding:8, color:'#fff', marginTop:8 },
  modalBtn:{ flex:1, padding:12, borderRadius:8, alignItems:'center', marginHorizontal:4 },
});