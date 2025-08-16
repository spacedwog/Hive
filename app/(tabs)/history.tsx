import base64 from 'base-64';
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text
} from "react-native";

const username = 'spacedwog';
const password = 'Kimera12@';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(() => {
    setRefreshing(true);

    const headers = new Headers();
    headers.append('Authorization', 'Basic ' + base64.encode(`${username}:${password}`));

    fetch("http://192.168.4.1/history", { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Erro na autenticação ou na requisição');
        return res.json();
      })
      .then((data) => {
        // Converte objeto de pilhas em array de seções
        const sections = Object.keys(data).map((pilhaKey) => ({
          title: pilhaKey,
          data: data[pilhaKey],
        }));
        setHistory(sections);
      })
      .catch((err) => console.error("Erro ao buscar histórico:", err))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Histórico de Comandos</Text>

      {history.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum comando encontrado.</Text>
      ) : (
        <SectionList
          sections={history}
          keyExtractor={(_, index) => index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchHistory} />
          }
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Text style={styles.pilhaTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              {item.cmd} - {item.status}
            </Text>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  pilhaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
    textAlign: "center",
  },
  item: {
    fontSize: 16,
    marginVertical: 4,
    textAlign: "center",
  },
  listContent: {
    alignItems: "center",
    paddingBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#888",
    marginTop: 40,
    textAlign: "center",
  },
});