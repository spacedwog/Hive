import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import WifiManager, { WifiEntry } from "react-native-wifi-reborn";

export default function WiFiConnectScreen() {
  const [wifiList, setWifiList] = useState<WifiEntry[]>([]);
  const [selectedSSID, setSelectedSSID] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [connectedSSID, setConnectedSSID] = useState<string | null>(null);

  // ====== Buscar redes WiFi ======
  const loadWifiList = async () => {
    try {
      const results = await WifiManager.loadWifiList();
      setWifiList(results);
    } catch (err) {
      Alert.alert("Erro ao buscar redes WiFi", String(err));
    }
  };

  // ====== Conectar à rede ======
  const connectToWifi = async () => {
    if (!selectedSSID) {
      Alert.alert("Escolha uma rede WiFi");
      return;
    }
    try {
      await WifiManager.connectToProtectedSSID(selectedSSID, password, false);
      Alert.alert("✅ Conectado a", selectedSSID);
      checkSSID();
    } catch (err) {
      Alert.alert("❌ Falha ao conectar", String(err));
    }
  };

  // ====== Verificar SSID atual ======
  const checkSSID = async () => {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      setConnectedSSID(ssid);
    } catch {
      setConnectedSSID(null);
    }
  };

  useEffect(() => {
    loadWifiList();
    checkSSID();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 WiFi Connect</Text>
      <Text style={styles.subtitle}>
        Rede atual: {connectedSSID ?? "Nenhuma"}
      </Text>

      {/* Lista de redes WiFi */}
      <FlatList
        data={wifiList}
        keyExtractor={(item) => item.BSSID}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.networkItem,
              selectedSSID === item.SSID && styles.selectedItem,
            ]}
            onPress={() => setSelectedSSID(item.SSID)}
          >
            <Text style={styles.networkText}>
              {item.SSID || "Sem Nome"} ({item.level} dBm)
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma rede encontrada</Text>
        }
      />

      {/* Campo senha e botão conectar */}
      {selectedSSID && (
        <View style={styles.form}>
          <Text style={styles.selectedLabel}>
            Conectar em: {selectedSSID}
          </Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Senha da rede"
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Conectar" onPress={connectToWifi} />
        </View>
      )}

      {/* Botão para atualizar lista */}
      <View style={{ marginTop: 16 }}>
        <Button title="🔄 Atualizar redes" onPress={loadWifiList} />
      </View>
    </View>
  );
}

// ====== Estilos ======
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f8",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#555",
  },
  networkItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
    elevation: 2,
  },
  selectedItem: {
    borderColor: "#4caf50",
    borderWidth: 2,
  },
  networkText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
  },
  form: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
});