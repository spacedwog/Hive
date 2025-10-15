// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { JSX, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export type Rule = { destination: string; gateway: string };

export type PaginatedListProps<T> = {
  items: T[];
  itemsPerPage: number;
  renderItem: (item: T, index: number) => JSX.Element;
  title?: string;
};

export type JsonRenderProps = { obj: any; level?: number };

export class FirewallUtils {

  // -------- Paginated List Component --------
  static PaginatedList = function<T>({ items, itemsPerPage, renderItem, title }: PaginatedListProps<T>) {
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
  };

  // -------- JSON Renderer Component --------
  static JsonRenderer = function({ obj, level = 0 }: JsonRenderProps) {
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
              <FirewallUtils.JsonRenderer obj={item} level={level + 1} />
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
            {typeof value === 'object' ? <FirewallUtils.JsonRenderer obj={value} level={level + 1} /> :
              <Text style={{ color: typeColor(value) }}>{value?.toString()}</Text>}
          </View>
        ))}
      </View>
    );
  };

  // -------- Resolve Domain to A Records --------
  static async resolveDomainA(domain: string): Promise<string[]> {
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
  }

  // -------- Calculate Firewall Risk --------
  static calculateRiskLevel(firewall: any) {
    if (!firewall) return { level: 'Desconhecido', color: '#888', tentativas: 0, regras: 0, ratio: 0 };
    const tentativas = firewall.tentativasBloqueadas || 0;
    const regras = firewall.regrasAplicadas || 0;
    const ratio = regras > 0 ? tentativas / regras : tentativas;

    let nivel = 'Baixo';
    let cor = '#50fa7b';

    if (ratio <= 1) { nivel = 'Baixo'; cor = '#50fa7b'; }
    else if (ratio <= 2) { nivel = 'Médio'; cor = '#facc15'; }
    else if (ratio <= 3) { nivel = 'Moderado'; cor = '#fbbf24'; }
    else if (ratio <= 5) { nivel = 'Alto'; cor = '#f97316'; }
    else if (ratio <= 7) { nivel = 'Muito Alto'; cor = '#f87171'; }
    else if (ratio <= 10) { nivel = 'Crítico'; cor = '#ef4444'; }
    else if (ratio <= 15) { nivel = 'Perigo'; cor = '#b91c1c'; }
    else if (ratio <= 20) { nivel = 'Extremo'; cor = '#7f1d1d'; }
    else { nivel = 'Catastrófico'; cor = '#000000'; }

    return { level: nivel, color: cor, tentativas, regras, ratio };
  }

  // -------- Evaluate Route Risk --------
  static evaluateRouteRisk({ destination, gateway }: { destination: string; gateway: string }) {
    const blockedRanges = ['192.168.', '10.', '172.16.'];
    let level = 'Baixo';
    for (const prefix of blockedRanges) {
      if (gateway.startsWith(prefix)) {
        level = 'Alto';
        break;
      }
    }
    return { level, ratio: 1 };
  }

  // -------- Save Route --------
  static async saveRoute(destination: string, gateway: string, setRules: any, setErrorModalVisible: any, setErrorMessage: any) {
    try {
      const resp = await fetch(`${VERCEL_URL}/api/firewall?action=routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, gateway }),
      });
      const data = await resp.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Falha ao salvar rota');
        setErrorModalVisible(true);
      } else {
        setRules((prev: Rule[]) => [...prev, { destination, gateway }]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar rota');
      setErrorModalVisible(true);
    }
  }

  // -------- Fetch and Save Routes --------
  static async fetchAndSaveRoutes(setRules: any, setRawJson: any, setErrorMessage: any, setErrorModalVisible: any) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout de 8s
      
      const resp = await fetch(`${VERCEL_URL}/api/firewall?action=routes`, { 
        method: "GET",
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      
      const data = await resp.json();
      setRawJson((prev: any) => ({ ...prev, routes: data }));

      if (data.success && Array.isArray(data.routes)) {
        const formatted: Rule[] = data.routes.map((r: any) => ({
          destination: r.destination || r.DestinationPrefix || 'unknown',
          gateway: r.gateway || r.NextHop || '0.0.0.0',
        }));
        setRules(formatted);
        
        // Não salva rotas automaticamente para evitar loop
        // for (const r of formatted) {
        //   await FirewallUtils.saveRoute(r.destination, r.gateway, setRules, setErrorModalVisible, setErrorMessage);
        // }
      } else {
        setRules([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar rotas:', err);
      if (err.name !== 'AbortError') {
        setRawJson((prev: any) => ({ ...prev, routesError: err?.message || "Falha ao buscar rotas" }));
        // Não mostra modal de erro para evitar spam de notificações
        console.warn('Falha ao buscar rotas:', err?.message);
      }
      setRules([]);
    }
  }

  // -------- Generate Encrypted Rule --------
  static generateEncryptedRule(destination: string, potentialIPs: string[]): Rule {
    const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '0.0.0.0';
    const encryptedDestination = Buffer.from(destination).toString('base64');
    const encryptedGateway = Buffer.from(gateway).toString('base64');
    return { destination: encryptedDestination, gateway: encryptedGateway };
  }

  // -------- Generate Normal Route --------
  static generateRoute(destination: string, potentialIPs: string[]): Rule {
    const gateway = potentialIPs[Math.floor(Math.random() * potentialIPs.length)] || '0.0.0.0';
    return { destination, gateway };
  }

}

// -------- Shared Styles --------
const styles = StyleSheet.create({
  description:{ fontSize:16,color:'#e2e8f0',lineHeight:24 },
});