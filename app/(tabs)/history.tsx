import base64 from 'base-64';
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const username = 'spacedwog';
const password = 'Kimera12@';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any>({});
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
      .then((data) => setHistory(data))
      .catch((err) => console.error("Erro ao buscar histórico:", err))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Histórico de Comandos</Text>

      {Object.keys(history).length === 0 ? (
        <Text style={styles.emptyText}>Nenhum comando encontrado.</Text>
      ) : (
        Object.keys(history).map((pilhaKey) => (
          <View key={pilhaKey} style={styles.pilhaBox}>
            <Text style={styles.pilhaTitle}>{pilhaKey}</Text>

            <FlatList
              data={history[pilhaKey]}
              keyExtractor={(_, index) => index.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={fetchHistory}
                />
              }
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Text style={styles.item}>
                  {item.cmd} - {item.status}
                </Text>
              )}
            />
          </View>
        ))
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
  pilhaBox: {
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
  },
  pilhaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
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