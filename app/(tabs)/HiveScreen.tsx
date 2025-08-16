import axios from "axios";
import * as base64 from "base-64";
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ==== Tipagens ====
type NodeStatus = {
  device?: string;
  server?: string;
  status?: string;
  ultrassonico_cm?: number;
  anomaly?: boolean;
  mesh?: boolean;
  error?: string;
};

type SearchResult = {
  title: string;
  link: string;
};

// ==== Componente Principal ====
export default function HiveScreen() {
  const [status, setStatus] = useState<NodeStatus[]>([]);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // ====== Atualizar status dos nós ======
  const fetchStatus = async () => {
    try {
      const servers = ["192.168.15.45"]; // lista de IPs dos nós
      const responses: NodeStatus[] = [];

      for (const server of servers) {
        try {
          const res = await axios.get(`http://${server}/status`, {
            timeout: 3000,
          });
          responses.push({ ...res.data, server });
        } catch (err) {
          responses.push({ server, status: "offline", error: String(err) });
        }
      }

      setStatus(responses);
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // atualizar a cada 10s
    return () => clearInterval(interval);
  }, []);

  // ====== Enviar comando para nó ======
  const sendCommand = async (server: string, command: string) => {
    try {
      await axios.post(`http://${server}/command`, { command });
      fetchStatus(); // atualiza estado depois do comando
    } catch (err) {
      console.error("Erro ao enviar comando:", err);
    }
  };

  // ====== Pesquisa Google ======
  const searchGoogle = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const apiKey = "SUA_API_KEY"; // 🔑 insira sua Google API Key
      const cx = "SEU_CX_ID";       // 🔍 insira seu Search Engine ID
      const encodedQuery = base64.encode(query);

      const res = await axios.get(
        `https://www.googleapis.com/customsearch/v1?q=${encodedQuery}&key=${apiKey}&cx=${cx}`
      );

      const results: SearchResult[] =
        res.data.items?.map((item: any) => ({
          title: item.title,
          link: item.link,
        })) || [];

      setResults(results);
    } catch (err) {
      console.error("Erro na busca Google:", err);
    }
    setLoading(false);
  };

  // ====== Renderização ======
  return (
    <View style={styles.container}>
      <Text style={styles.header}>🐝 Hive Explorer</Text>

      {/* ---- Lista de nós ---- */}
      <FlatList
        data={status}
        keyExtractor={(item) => item.server || Math.random().toString()}
        renderItem={({ item: s }) => (
          <View style={styles.nodeCard}>
            <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
            <Text style={styles.statusText}>
              📡 {s.server} - {s.status}
            </Text>
            <Text style={styles.statusText}>
              📏 Distância: {s.ultrassonico_cm ?? "-"} cm
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Ativar"
                onPress={() => s.server && sendCommand(s.server, "activate")}
              />
              <Button
                title="Desativar"
                onPress={() => s.server && sendCommand(s.server, "deactivate")}
              />
              <Button
                title="Ping"
                onPress={() => s.server && sendCommand(s.server, "ping")}
              />
            </View>
          </View>
        )}
      />

      {/* ---- Campo de busca Google ---- */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Pesquisar no Google..."
          value={query}
          onChangeText={setQuery}
        />
        <Button title="Buscar" onPress={searchGoogle} disabled={loading} />
      </View>

      {/* ---- Resultados da busca ---- */}
      <FlatList
        data={results}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
            <Text style={styles.resultLink}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ==== Estilos ====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f4f8",
    alignItems: "center", // centraliza horizontalmente
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  nodeCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    width: "90%", // largura controlada
    alignSelf: "center",
  },
  nodeText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  statusText: { fontSize: 14, marginTop: 4, textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    width: "90%",
    alignSelf: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  resultLink: {
    color: "blue",
    marginBottom: 8,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});