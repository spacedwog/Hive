import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NetworkInfo } from "react-native-network-info";

const StreamScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);

  const apSSID = "HIVE STREAM";
  const apPassword = "hvstream";
  const esp32IP = "192.168.4.1"; // IP padrão do Soft-AP

  const openCamera = () => {
    Linking.openURL(`http://${esp32IP}`).catch((err) => {
      console.error("Erro ao abrir a câmera:", err);
      Alert.alert("Erro", "Não foi possível abrir o link da câmera.");
    });
  };

  const checkConnection = () => {
    setChecking(true);
    NetworkInfo.getSSID()
      .then((ssid) => {
        if (ssid === apSSID) {
          setConnected(true);
        } else {
          setConnected(false);
          Alert.alert(
            "Rede incorreta",
            `Conecte-se à rede Wi-Fi "${apSSID}" antes de continuar.`
          );
        }
      })
      .catch((err) => {
        console.error("Erro ao obter SSID:", err);
        Alert.alert("Erro", "Não foi possível verificar a rede.");
        setConnected(false);
      })
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    checkConnection(); // verifica automaticamente ao abrir a tela
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Camera - Soft-AP Mode</Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>SSID: {apSSID}</Text>
        <Text style={styles.info}>Senha: {apPassword}</Text>
        <Text style={styles.info}>IP: {esp32IP}</Text>
      </View>

      <Button
        title="Abrir Câmera"
        onPress={openCamera}
        disabled={!connected}
      />

      <Text style={styles.note}>
        Conecte seu celular ou PC à rede Wi-Fi acima antes de abrir a câmera.
      </Text>

      <View style={{ marginTop: 15 }}>
        <Button
          title={
            checking
              ? "Verificando..."
              : connected
              ? "Conectado"
              : "Conectar à rede"
          }
          onPress={checkConnection}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
  },
  note: {
    marginTop: 15,
    fontSize: 14,
    color: "gray",
    textAlign: "center",
  },
});

export default StreamScreen;