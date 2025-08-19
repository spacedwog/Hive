import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

// ==== Tipagem ====
type StreamData = {
  ultrassonico_cm?: number;
  analog?: number;
};

// ==== Componente Principal ====
export default function StreamScreen() {
  const [data, setData] = useState<StreamData[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("http://192.168.4.1/stream");

    eventSource.onmessage = (event) => {
      try {
        const parsed: StreamData = JSON.parse(event.data);
        setData((prev) => [...prev.slice(-19), parsed]); // mantém últimas 20 leituras
      } catch (err) {
        console.error("Erro ao parsear stream:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Erro na conexão SSE:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 Stream de Dados em Tempo Real</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.text}>📏 Distância: {item.ultrassonico_cm ?? "-"} cm</Text>
          <Text style={styles.text}>⚡ Sensor: {item.analog ?? "-"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ==== Estilos ====
const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#f4f4f8",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    width: "90%",
    elevation: 3,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
});