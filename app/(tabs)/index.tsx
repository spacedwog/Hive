// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomNav from '../../hive_body/BottomNav.tsx';

type Rule = { destination: string; gateway: string };

export default function TelaPrinc() {
  const [accessCode] = useState<string | null>('ACESSO_LIBERADO');
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]);

  const ipsPerPage = 10;

  // -------------------------
  // Resolver domínios populares para IPs
  // -------------------------
  const resolveDomainA = async (domain: string): Promise<string[]> => {
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const j = await resp.json();
      const ips: string[] = [];
      if (j && Array.isArray(j.Answer)) {
        for (const ans of j.Answer) {
          if (ans?.data && /^\d{1,3}(\.\d{1,3}){3}$/.test(ans.data.trim())) {
            ips.push(ans.data.trim());
          }
        }
      }
      return ips;
    } catch { return []; }
  };

  // -------------------------
  // Carregar Potential IPs
  // -------------------------
  useEffect(() => {
    const loadPotentialIPs = async () => {
      const domains = ['google.com','youtube.com','github.com','microsoft.com','cloudflare.com'];
      const results = await Promise.all(domains.map(resolveDomainA));
      const aggregated: string[] = [];
      for (const arr of results) for (const ip of arr) if (!aggregated.includes(ip)) {
                                                         aggregated.push(ip);
                                                       }
      if (!aggregated.length) {
        aggregated.push('142.250.190.14','172.217.169.78','140.82.121.4');
      }
      setPotentialIPs(aggregated);
    };
    if (potentialIPs.length === 0) {
      loadPotentialIPs();
    }
  }, [potentialIPs.length]);

  // -------------------------
  // Dados do firewall e bloqueio automático
  // -------------------------
  useEffect(() => {
    if (!accessCode) {
      return;
    }

    const fetchFirewallData = async () => {
      try {
        const resp = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await resp.json();
        if (!data.success) { setFirewallData(null); return; }
        setFirewallData(data.data);

        if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
          const ip = data.data.ip || (potentialIPs[Math.floor(Math.random()*potentialIPs.length)] ?? `192.168.1.${Math.floor(Math.random()*254+1)}`);
          await fetch(`${VERCEL_URL}/api/firewall?action=block`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ip }) });

          const destination = `10.0.${Math.floor(Math.random()*255)}.0/24`;
          const gatewayResp = await fetch(`${VERCEL_URL}/api/firewall?action=getGateway`);
          const gateway = (await gatewayResp.json()).gateway || '192.168.1.1';

          await fetch(`${VERCEL_URL}/api/firewall?action=route`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ destination, gateway }) });
          setRules(prev => [...prev, { destination, gateway }]);
        }

      } catch { setFirewallData(null); }
    };

    fetchFirewallData();
    const interval = setInterval(fetchFirewallData, 5000);
    return () => clearInterval(interval);
  }, [accessCode, potentialIPs]);

  const paginatedIPs = firewallData?.blocked?.slice(0, ipsPerPage) ?? [];

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.description}>Status: <Text style={{ color: firewallData?.status==='Ativo'?'#50fa7b':'#f87171', fontWeight:'bold' }}>{firewallData?.status ?? '-'}</Text></Text>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:12 }}>
            <View style={{ flex:1, marginRight:8 }}>
              <Text style={[styles.description,{color:'#facc15',fontWeight:'bold'}]}>IPs Bloqueados</Text>
              {paginatedIPs.map((ip: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, idx: React.Key | null | undefined) => <Text key={idx} style={styles.description}>{ip}</Text>)}
            </View>
            <View style={{ flex:1, marginLeft:8 }}>
              <Text style={[styles.description,{color:'#38bdf8',fontWeight:'bold'}]}>Potential IPs</Text>
              {potentialIPs.map((ip, idx) => <Text key={idx} style={styles.description}>{ip}</Text>)}
            </View>
          </View>
          <View style={{ marginTop:12 }}>
            <Text style={[styles.description,{color:'#50fa7b',fontWeight:'bold'}]}>Regras Aplicadas</Text>
            {rules.map((r, idx) => <Text key={idx} style={styles.description}>{r.destination} → {r.gateway}</Text>)}
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  container:{ padding:24, backgroundColor:'#0f172a', alignItems:'center' },
  card:{ borderRadius:16,padding:20,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:12,width:'100%',marginBottom:20 },
  description:{ fontSize:16,color:'#e2e8f0',lineHeight:24 },
});