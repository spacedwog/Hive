import React, { useState } from "react";
import { Button, Linking, StyleSheet, Text, View } from "react-native";

const StreamScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);

  // Configuração do Soft-AP
  const apSSID = "ESP32-CAMERA";
  const apPassword = "12345678";
  const esp32IP = "192.168.4.1"; // IP padrão do Soft-AP

  const openCamera = () => {
    Linking.openURL(`http://${esp32IP}`).catch((err) =>
      console.error("Erro ao abrir a câmera:", err)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Camera - Soft-AP Mode</Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>SSID: {apSSID}</Text>
        <Text style={styles.info}>Password: {apPassword}</Text>
        <Text style={styles.info}>IP: {esp32IP}</Text>
      </View>

      <Button
        title="Abrir Câmera"
        onPress={openCamera}
        disabled={!connected}
      />

      <Text style={styles.note}>
        Conecte seu celular ou PC à rede WiFi acima antes de abrir a câmera.
      </Text>

      <Button
        title={connected ? "Conectado" : "Conectar à rede"}
        onPress={() => setConnected(true)}
      />
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