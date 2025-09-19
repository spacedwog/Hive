import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function VercelFirewallView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api.vercel.com/v6/audit-log', {
        headers: {
          Authorization: `Bearer ${'NF6RQEC7xyNMFnzv0cTwpmFE'}`,
        },
      });
      const json = await res.json();
      setLogs(json.auditLogs || []);
    } catch (err) {
      console.error('Erro ao buscar audit logs da Vercel:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={{ color: '#fff', marginTop: 8 }}>Carregando logs de segurança...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>🛡️ Firewall / Audit Logs</Text>
      {logs.length === 0 ? (
        <Text style={{ color: '#e2e8f0' }}>Nenhum log encontrado.</Text>
      ) : (
        logs.slice(0, 30).map(log => (
          <View key={log.id} style={styles.card}>
            <Text style={styles.cardTitle}>{log.action}</Text>
            <Text style={styles.cardText}>Usuário: {log.user?.email || 'Desconhecido'}</Text>
            <Text style={styles.cardText}>IP: {log.clientIp || 'N/D'}</Text>
            <Text style={styles.cardText}>
              Data: {new Date(log.createdAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  title: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  cardText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});