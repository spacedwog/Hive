import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

export default function HistoryScreen() {
  const [history, setHistory] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(() => {
    setRefreshing(true);
    fetch("http://192.168.15.166/history") // IP do ESP32
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Comandos</Text>

      {Object.keys(history).map((pilhaKey) => (
        <View key={pilhaKey} style={styles.pilhaBox}>
          <Text style={styles.pilhaTitle}>{pilhaKey}</Text>

          <FlatList
            data={history[pilhaKey]}
            keyExtractor={(_, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchHistory} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Text style={styles.item}>
                {item.cmd} - {item.status}
              </Text>
            )}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#fff", 
    alignItems: "center" // Centraliza horizontalmente
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 20,
    textAlign: "center" // Centraliza texto
  },
  pilhaBox: { 
    marginBottom: 20, 
    alignItems: "center", // Centraliza conteúdo da pilha
    width: "100%"
  },
  pilhaTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 8
  },
  item: { 
    fontSize: 16, 
    marginVertical: 4, 
    textAlign: "center" // Centraliza o texto de cada item
  },
  listContent: {
    alignItems: "center", // Centraliza os itens na lista
  }
});