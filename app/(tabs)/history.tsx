import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function HistoryScreen() {
  const [history, setHistory] = useState<any>({});

  useEffect(() => {
    fetch("http://192.168.15.166/history") // IP do ESP32
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Comandos</Text>
      {Object.keys(history).map((pilhaKey) => (
        <View key={pilhaKey} style={styles.pilhaBox}>
          <Text style={styles.pilhaTitle}>{pilhaKey}</Text>
          <FlatList
            data={history[pilhaKey]}
            keyExtractor={(_, index) => index.toString()}
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
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  pilhaBox: { marginBottom: 20 },
  pilhaTitle: { fontSize: 18, fontWeight: "bold" },
  item: { fontSize: 16, marginVertical: 4 },
});