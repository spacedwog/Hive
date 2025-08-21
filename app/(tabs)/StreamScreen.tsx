import React, { useState } from "react";
import { Alert, Button, Linking, StyleSheet, Text, View } from "react-native";

const StreamScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);

  // Dados do Soft-AP
  const apSSID = "HIVE STREAM";
  const apPassword = "hvstream";
  const esp32IP = "192.168.4.1"; // IP padrão do Soft-AP

  const openCamera = () => {
    Linking.openURL(`http://${esp32IP}`).catch((err) => {
      console.error("Erro ao abrir a câmera:", err);
      Alert.alert("Erro", "Não foi possível abrir o link da câmera.");
    });
  };

  const markConnected = () => {
    // Como não há biblioteca, pedimos para o usuário confirmar manualmente
    Alert.alert(
      "Confirmar conexão",
      `Certifique-se de que está conectado à rede Wi-Fi "${apSSID}"`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Conectado",
          onPress: () => setConnected(true),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Camera - Soft-AP Mode</Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>SSID: {apSSID}</Text>
        <Text style={styles.info}>Senha: {apPassword}</Text>
        <Text style={styles.info}>IP: {esp32IP}</Text>
      </View>

      <Button
        title="Acessar ESP32(CAM)"
        onPress={openCamera}
        disabled={!connected}
      />

      <Text style={styles.note}>
        Conecte seu celular ou PC à rede Wi-Fi acima antes de abrir a câmera.
      </Text>

      <View style={{ marginTop: 15 }}>
        <Button
          title={connected ? "Conectado" : "Conectar à rede"}
          onPress={markConnected}
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