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
import { FirewallUtils, Rule } from '../../hive_security/hive_ip/hive_firewall.tsx';

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [, setRawJson] = useState<any | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]);
  const [blockedHistory, setBlockedHistory] = useState<string[]>([]);

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

  // Carrega Potential IPs
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

  // Verifica firewall, risco e bloqueios automáticos
  useEffect(() => {
    if (!accessCode || accessCode.trim() === '') return;

    const checkAndBlockHighRiskRoutes = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
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

        // Avalia rotas automáticas usando IP conectado + Potential IPs
        const connectedIP = data.data.ipConectado; 
        for (const potentialIP of potentialIPs) {
          if (blockedHistory.includes(potentialIP)) continue;

          const routeRisk = FirewallUtils.evaluateRouteRisk({
            destination: connectedIP,
            gateway: potentialIP
          });

          if (routeRisk.level !== 'Baixo') {
            // Deleta rota antiga
            await fetch(`${VERCEL_URL}/api/routes`, {
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

            setBlockedHistory(prev => [...prev, potentialIP]);
            await FirewallUtils.fetchAndSaveRoutes(setRules, setRawJson, setErrorMessage, setErrorModalVisible);
          }
        }

        // Caso tentativas bloqueadas >= regras aplicadas
        if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
          // Cria nova regra e encripta os dados
          const dest = `Encrypted-${Date.now()}`;
          const gateway = `192.0.2.${Math.floor(Math.random() * 255)}`;
          await FirewallUtils.saveRoute(dest, gateway, setRules, setErrorModalVisible, setErrorMessage);
        } else if (data.data.tentativasBloqueadas === data.data.regrasAplicadas) {
          // Cria nova rota normal
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
                    renderItem={(ip: any, idx) => <Text key={idx} style={styles.description}>{String(ip)}</Text>}
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

              <FirewallUtils.PaginatedList
                items={blockedHistory}
                itemsPerPage={5}
                renderItem={(ip, idx) => <Text key={idx} style={styles.description}>{ip}</Text>}
                title="Histórico de bloqueios"
              />

              <FirewallUtils.PaginatedList
                items={rules}
                itemsPerPage={rulesPerPage}
                renderItem={(r, idx) => <Text key={idx} style={styles.description}>{r.destination} ➝ {r.gateway}</Text>}
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
                await FirewallUtils.saveRoute(newDestination.trim(), newGateway.trim(), setRules, setErrorModalVisible, setErrorMessage);
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
                  const resp = await fetch(`${VERCEL_URL}/api/routes`, {
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