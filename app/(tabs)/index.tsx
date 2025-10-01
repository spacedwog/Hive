// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { JSX, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../../hive_body/BottomNav.tsx';

type Rule = { destination: string; gateway: string };

type PaginatedListProps<T> = {
  items: T[];
  itemsPerPage: number;
  renderItem: (item: T, index: number) => JSX.Element;
  title?: string;
};

function PaginatedList<T>({ items, itemsPerPage, renderItem, title }: PaginatedListProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <View style={{ marginTop: 16 }}>
      {title && <Text style={[styles.description, { fontWeight: 'bold', color: '#34d399', marginBottom: 4 }]}>{title}</Text>}
      {paginatedItems.length > 0 ? (
        paginatedItems.map(renderItem)
      ) : (
        <Text style={styles.description}>Nenhum item encontrado.</Text>
      )}
      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(prev => prev - 1)} style={{ marginHorizontal: 8 }}>
            <Text style={{ color: page > 1 ? '#50fa7b' : '#888' }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff' }}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(prev => prev + 1)} style={{ marginHorizontal: 8 }}>
            <Text style={{ color: page < totalPages ? '#50fa7b' : '#888' }}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

type JsonRenderProps = { obj: any; level?: number };

function JsonRenderer({ obj, level = 0 }: JsonRenderProps) {
  const margin = level * 12;

  const typeColor = (value: any) => {
    if (value === null) return '#f87171';
    if (typeof value === 'string') return '#34d399';
    if (typeof value === 'number') return '#facc15';
    if (typeof value === 'boolean') return '#38bdf8';
    return '#94a3b8';
  };

  if (obj === null || obj === undefined)
    return <Text style={{ marginLeft: margin, color: typeColor(null) }}>null</Text>;

  if (typeof obj !== 'object')
    return <Text style={{ marginLeft: margin, color: typeColor(obj) }}>{obj.toString()}</Text>;

  if (Array.isArray(obj)) {
    return (
      <View style={{ marginLeft: margin }}>
        {obj.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
            <Text style={{ color: '#38bdf8', marginRight: 4 }}>[{idx}] :</Text>
            <JsonRenderer obj={item} level={level + 1} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ marginLeft: margin }}>
      {Object.entries(obj).map(([key, value], idx) => (
        <View key={idx} style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
          <Text style={{ color: '#facc15', marginRight: 4 }}>{key} :</Text>
          {typeof value === 'object' ? <JsonRenderer obj={value} level={level + 1} /> :
            <Text style={{ color: typeColor(value) }}>{value?.toString()}</Text>}
        </View>
      ))}
    </View>
  );
}

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [rawJson, setRawJson] = useState<any | null>(null);
  const [routeSaved, setRouteSaved] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newDestination, setNewDestination] = useState('');
  const [newGateway, setNewGateway] = useState('');

  const ipsPerPage = 10;
  const rulesPerPage = 5;

  // -------------------------
  // Resolve domínio via Google DNS
  // -------------------------
  const resolveDomainA = async (domain: string): Promise<string[]> => {
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const j = await resp.json();
      const ips: string[] = [];
      if (j && Array.isArray(j.Answer)) {
        for (const ans of j.Answer) {
          if (ans && typeof ans.data === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(ans.data.trim())) {
            ips.push(ans.data.trim());
          }
        }
      }
      return ips;
    } catch {
      return [];
    }
  };

  // -------------------------
  // Pré-carrega IPs potenciais
  // -------------------------
  useEffect(() => {
    const loadPotentialIPs = async () => {
      const domains = [
        'google.com','youtube.com','github.com',
        'microsoft.com','cloudflare.com','twitter.com',
        'instagram.com','amazon.com'
      ];
      const results = await Promise.all(domains.map(resolveDomainA));
      const aggregated: string[] = [];
      for (const arr of results) {
        for (const ip of arr) if (!aggregated.includes(ip)) aggregated.push(ip);
      }
      if (aggregated.length === 0) {
        aggregated.push('142.250.190.14','172.217.169.78','140.82.121.4','104.16.133.229');
      }
      setPotentialIPs(aggregated);
    };
    if (accessCode && potentialIPs.length === 0) loadPotentialIPs();
  }, [accessCode, potentialIPs.length]);

  // -------------------------
  // Salvar rota no firewall do VERCEL
  // -------------------------
  const saveRoute = async (destination: string, gateway: string) => {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, gateway }),
      });
      const data = await resp.json();
      if (!data.success) {
        console.warn("Falha ao salvar rota:", data.error);
      } else {
        setRules(prev => [...prev, { destination, gateway }]);
      }
    } catch (err: any) {
      console.error("Erro ao salvar rota:", err.message);
    }
  };

  // -------------------------
  // Buscar e salvar rotas automaticamente
  // -------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchAndSaveRoutes = async () => {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/routes`);
      const data = await resp.json();
      setRawJson((prev: any) => ({ ...prev, routes: data }));

      if (data.success && Array.isArray(data.routes)) {
        const formatted: Rule[] = data.routes.map((r: any) => ({
          destination: r.destination || r.DestinationPrefix,
          gateway: r.gateway || r.NextHop,
        }));
        setRules(formatted);
        for (const r of formatted) {
          await saveRoute(r.destination, r.gateway);
        }
      } else setRules([]);
    } catch (err: any) {
      setRawJson((prev: any) => ({ ...prev, routesError: err?.message || "Falha ao buscar rotas" }));
      setRules([]);
    }
  };

  // -------------------------
  // Avaliação de risco interna
  // -------------------------
  const calculateRiskLevel = (firewall: any) => {
    if (!firewall) return { level: 'Desconhecido', color: '#888', tentativas: 0, regras: 0 };

    const tentativas = firewall.tentativasBloqueadas || 0;
    const regras = firewall.regrasAplicadas || 0;

    let nivel = 'Baixo';
    let cor = '#50fa7b';
    const diff = tentativas - regras;

    if (diff <= 50) { nivel = 'Baixo'; cor = '#50fa7b'; }
    else if (diff <= 100) { nivel = 'Médio'; cor = '#facc15'; }
    else if (diff <= 500) { nivel = 'Alto'; cor = '#f97316'; }
    else { nivel = 'Crítico'; cor = '#f87171'; }

    return { level: nivel, color: cor, tentativas, regras };
  };

  // -------------------------
  // Dados do firewall e bloqueios automáticos com rotina de risco
  // -------------------------
  useEffect(() => {
    if (!accessCode || accessCode.trim() === '') return;

    const fetchFirewallData = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await response.json();
        setRawJson((prev: any) => ({ ...prev, firewall: data }));

        if (!data.success) {
          setFirewallData(null);
          return;
        }

        setFirewallData(data.data);

        const risk = calculateRiskLevel(data.data);

        // Bloqueio automático incremental dependendo do nível de risco
        if (risk.level === 'Alto' || risk.level === 'Crítico') {
          const ipParaBloquear =
            data.data.ip ||
            (potentialIPs.length
              ? potentialIPs[Math.floor(Math.random() * potentialIPs.length)]
              : `192.168.1.${Math.floor(Math.random() * 254 + 1)}`);

          await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ ip: ipParaBloquear })
          });

          await fetchAndSaveRoutes();
        }

        if (data.data.tentativasBloqueadas === data.data.regrasAplicadas && !routeSaved) {
          await fetchAndSaveRoutes();
          setRouteSaved(true);
        }

      } catch (err: any) {
        setRawJson((prev: any) => ({ ...prev, firewallError: err?.message || 'Falha no fetch firewall' }));
        setFirewallData(null);
      }
    };

    fetchFirewallData();
    const interval = setInterval(fetchFirewallData, 5000);
    return () => clearInterval(interval);
  }, [accessCode, routeSaved, potentialIPs, fetchAndSaveRoutes]);

  if (!accessCode || accessCode.trim() === '')
    return (
      <View style={styles.loginContainer}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Efetue o login no HIVE PROJECT:</Text>
        <TouchableOpacity onPress={() => setAccessCode('ACESSO_LIBERADO')} style={styles.loginBtn}>
          <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Login</Text>
        </TouchableOpacity>
      </View>
    );

  const risk = calculateRiskLevel(firewallData);

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
                Nível de risco: <Text style={{ color: risk.color, fontWeight: 'bold' }}>{risk.level}</Text>
              </Text>
              <Text style={styles.description}>
                Tentativas bloqueadas: <Text style={{ color: '#f87171', fontWeight: 'bold' }}>{risk.tentativas}</Text>
              </Text>
              <Text style={styles.description}>
                Regras aplicadas: <Text style={{ color: '#50fa7b', fontWeight: 'bold' }}>{risk.regras}</Text>
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <PaginatedList
                    items={firewallData.blocked as string[] ?? []}
                    itemsPerPage={ipsPerPage}
                    renderItem={(ip, idx) => <Text key={idx} style={styles.description}>{String(ip)}</Text>}
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
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Adicionar Rota</Text>
              </TouchableOpacity>

              <PaginatedList
                items={rules}
                itemsPerPage={rulesPerPage}
                renderItem={(r, idx) => <Text key={idx} style={styles.description}>{r.destination} ➝ {r.gateway}</Text>}
                title="Regras e Rotas Criadas"
              />

              <View style={{ marginTop: 16, padding: 12, backgroundColor: '#1e293b', borderRadius: 12, maxHeight: 400 }}>
                <Text style={[styles.description,{color:'#facc15',fontWeight:'bold',marginBottom:4}]}>JSON Obtido</Text>
                <ScrollView>
                  {rawJson ? <JsonRenderer obj={rawJson} /> : <Text style={styles.description}>Nenhum dado recebido ainda.</Text>}
                </ScrollView>
              </View>
            </>
          ) : <Text style={styles.description}>Carregando dados do firewall...</Text>}
        </View>
      </ScrollView>
      <BottomNav />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#50fa7b' }]} onPress={() => {
                if (!newDestination || !newGateway) return;
                saveRoute(newDestination, newGateway);
                setNewDestination('');
                setNewGateway('');
                setModalVisible(false);
              }}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f87171' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
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