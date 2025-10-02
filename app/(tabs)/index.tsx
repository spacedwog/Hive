import { VERCEL_URL } from '@env';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { FirewallUtils, Rule } from '../../hive_security/hive_ip/hive_firewall.tsx';

interface BlockedEntry {
  ip: string;
  reason?: string;
  timestamp: string;
}

// Inicializa armazenamento nativo MMKV
const storage = new MMKV({
  id: 'hiveStorage'
});

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

  // --- Persistência com MMKVStorage ---
  useEffect(() => {
    try {
      const json = storage.getString('blockedHistory');
      if (json) setBlockedHistory(JSON.parse(json));
    } catch (err: any) {
      console.error('Erro ao carregar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao carregar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  }, []);

  useEffect(() => {
    try {
      storage.set('blockedHistory', JSON.stringify(blockedHistory));
    } catch (err: any) {
      console.error('Erro ao salvar blockedHistory:', err);
      setErrorMessage(err?.message || 'Falha ao salvar histórico de bloqueios');
      setErrorModalVisible(true);
    }
  }, [blockedHistory]);

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

  // --- Verifica firewall e bloqueios ---
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

            // Adiciona ao histórico
            setBlockedHistory(prev => [
              ...prev,
              {
                ip: potentialIP,
                reason: routeRisk.level !== 'Baixo' ? routeRisk.level : 'Automático',
                timestamp: new Date().toISOString(),
              }
            ]);

            await FirewallUtils.fetchAndSaveRoutes(setRules, setRawJson, setErrorMessage, setErrorModalVisible);
          }
        }

        if (data.data.tentativasBloqueadas >= data.data.regrasAplicadas) {
          const dest = `Route-${Date.now()}`;
          const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '8.8.8.8';
          await FirewallUtils.saveRoute(dest, gateway, setRules, setErrorModalVisible, setErrorMessage);
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
      {/* ... resto do componente continua igual ... */}
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