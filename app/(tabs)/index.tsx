// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../../hive_body/BottomNav.tsx';

type Rule = { destination: string; gateway: string };

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [rawJson, setRawJson] = useState<any | null>(null);
  const [firewallPage, setFirewallPage] = useState(1);
  const [routeSaved, setRouteSaved] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]);

  const ipsPerPage = 10;

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
        for (const ip of arr) if (!aggregated.includes(ip)) {
                                aggregated.push(ip);
                              }
      }
      if (aggregated.length === 0) {
        aggregated.push('142.250.190.14','172.217.169.78','140.82.121.4','104.16.133.229');
      }
      setPotentialIPs(aggregated);
    };
    if (accessCode && potentialIPs.length === 0) {
      loadPotentialIPs();
    }
  }, [accessCode, potentialIPs.length]);

  // -------------------------
  // Salvar rota no firewall do VERCEL
  // -------------------------
  const saveRoute = async (destination: string, gateway: string) => {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/firewall?action=route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, gateway }),
      });
      const data = await resp.json();
      if (!data.success) {
        console.warn("Falha ao salvar rota:", data.error);
      } else {
        console.log(`Rota ${destination} ➝ ${gateway} salva com sucesso.`);
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

      // Salva JSON cru completo
      setRawJson((prev: any) => ({ ...prev, routes: data }));

      if (data.success && Array.isArray(data.routes)) {
        const formatted: Rule[] = data.routes.map((r: any) => ({
          destination: r.destination || r.DestinationPrefix,
          gateway: r.gateway || r.NextHop,
        }));

        setRules(formatted);

        // Salva cada rota na API firewall se ainda não estiver salva
        for (const r of formatted) {
          await saveRoute(r.destination, r.gateway);
        }
      } else {
        setRules([]);
      }
    } catch (err: any) {
      setRawJson((prev: any) => ({ ...prev, routesError: err?.message || "Falha ao buscar rotas" }));
      setRules([]);
    }
  };

  // -------------------------
  // Dados do firewall e bloqueios automáticos
  // -------------------------
  useEffect(() => {
    if (!accessCode || accessCode.trim() === '') {
      return;
    }

    const fetchFirewallData = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await response.json();

        // Sempre salvar o JSON cru (mesmo que falhe)
        setRawJson((prev: any) => ({ ...prev, firewall: data }));

        if (!data.success) {
          setFirewallData(null);
          return;
        }

        setFirewallData(data.data);

        // Bloquear IP automaticamente
        if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
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

        // Salvar rota automaticamente quando tentativas = regras
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

  const paginatedIPs = firewallData?.blocked?.slice((firewallPage - 1) * ipsPerPage, firewallPage * ipsPerPage) ?? [];
  const totalPages = firewallData?.blocked ? Math.ceil(firewallData.blocked.length / ipsPerPage) : 1;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {firewallData ? (
            <>
              <Text style={styles.description}>
                Status:{" "}
                <Text style={{ color: firewallData.status === 'Ativo' ? '#50fa7b' : '#f87171', fontWeight: 'bold' }}>
                  {firewallData.status}
                </Text>
              </Text>
              <Text style={styles.description}>
                Última atualização:{" "}
                <Text style={{ color: '#fff' }}>
                  {firewallData.ultimaAtualizacao ? new Date(firewallData.ultimaAtualizacao).toLocaleString('pt-BR') : '-'}
                </Text>
              </Text>
              <Text style={styles.description}>
                Tentativas bloqueadas:{" "}
                <Text style={{ color: '#f87171', fontWeight: 'bold' }}>
                  {firewallData.tentativasBloqueadas ?? '-'}
                </Text>
              </Text>
              <Text style={styles.description}>
                Regras aplicadas:{" "}
                <Text style={{ color: '#50fa7b' }}>
                  {firewallData.regrasAplicadas ?? '-'}
                </Text>
              </Text>

              {/* IPs bloqueados + Potential IPs lado a lado */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.description,{color:'#facc15',fontWeight:'bold'}]}>IPs Bloqueados</Text>
                  {paginatedIPs.map((ip: string, idx: number) => (
                    <Text key={idx} style={styles.description}>{ip}</Text>
                  ))}
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.description,{color:'#38bdf8',fontWeight:'bold'}]}>Potential IPs</Text>
                  {potentialIPs.map((ip, idx) => (
                    <Text key={idx} style={styles.description}>{ip}</Text>
                  ))}
                </View>
              </View>

              {totalPages>1 && (
                <View style={{flexDirection:'row',justifyContent:'center',marginTop:8}}>
                  <TouchableOpacity disabled={firewallPage<=1} onPress={()=>setFirewallPage(prev=>prev-1)} style={{marginHorizontal:8}}>
                    <Text style={{color: firewallPage>1 ? '#50fa7b':'#888'}}>◀</Text>
                  </TouchableOpacity>
                  <Text style={{color:'#fff'}}>{firewallPage} / {totalPages}</Text>
                  <TouchableOpacity disabled={firewallPage>=totalPages} onPress={()=>setFirewallPage(prev=>prev+1)} style={{marginHorizontal:8}}>
                    <Text style={{color: firewallPage<totalPages ? '#50fa7b':'#888'}}>▶</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Exibe rotas e regras criadas */}
              <View style={{marginTop:16}}>
                <Text style={[styles.description,{color:'#34d399',fontWeight:'bold'}]}>Regras e Rotas Criadas</Text>
                {rules.length > 0 ? (
                  rules.map((r, idx) => (
                    <Text key={idx} style={styles.description}>
                      {r.destination} ➝ {r.gateway}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.description}>Nenhuma rota aplicada ainda.</Text>
                )}
              </View>

              {/* Exibe JSON cru */}
              <View style={{marginTop:16}}>
                <Text style={[styles.description,{color:'#facc15',fontWeight:'bold'}]}>JSON Obtido</Text>
                <Text style={[styles.description,{fontSize:12,color:'#94a3b8'}]}>
                  {rawJson ? JSON.stringify(rawJson, null, 2) : 'Nenhum dado recebido ainda.'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.description}>Carregando dados do firewall...</Text>
          )}
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
  loginBtn:{ backgroundColor:'#50fa7b',borderRadius:8,paddingVertical:8,paddingHorizontal:24,marginTop:12 },
});