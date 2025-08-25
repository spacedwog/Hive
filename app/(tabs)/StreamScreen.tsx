import React, { useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { CameraModule } = NativeModules; // nosso módulo nativo

const StreamScreen: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Dados do Soft-AP
  const apSSID = "HIVE STREAM";
  const apPassword = "hvstream";
  const esp32IP = "192.168.4.1"; // IP padrão do Soft-AP

  const openCameraESP32 = () => {
    Linking.openURL(`http://${esp32IP}`).catch((err) => {
      console.error("Erro ao abrir a câmera:", err);
      Alert.alert("Erro", "Não foi possível abrir o link da câmera.");
    });
  };

  const markConnected = () => {
    Alert.alert(
      "Confirmar conexão",
      `Certifique-se de que está conectado à rede Wi-Fi "${apSSID}"`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Conectado", onPress: () => setConnected(true) },
      ]
    );
  };

  const openNativeCamera = async () => {
    try {
      if (!CameraModule || !CameraModule.launchCamera) {
        Alert.alert(
          "Módulo indisponível",
          "CameraModule não encontrado. Verifique a instalação nativa."
        );
        return;
      }
      const result: { uri: string } = await CameraModule.launchCamera();
      if (result?.uri) {
        setPhotoUri(result.uri);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Erro ao abrir câmera",
        e?.message || "Não foi possível abrir a câmera."
      );
    }
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
        onPress={openCameraESP32}
        disabled={!connected}
      />

      <Text style={styles.note}>
        Conecte seu celular ou PC à rede Wi-Fi acima antes de abrir a câmera.
      </Text>

      <View style={{ marginTop: 12 }}>
        <Button
          title={connected ? "Conectado" : "Conectar à rede"}
          onPress={markConnected}
        />
      </View>

      <View style={{ marginTop: 24, width: "100%" }}>
        <Button
          title="Abrir câmera do dispositivo"
          onPress={openNativeCamera}
        />
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.smallNote}>
          {Platform.OS === "android"
            ? "No Android, a foto é salva em cache (FileProvider) e retornamos a URI."
            : "No iOS, a foto é salva em arquivo temporário e a URI é retornada."}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  infoBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  info: { fontSize: 16, marginBottom: 4 },
  note: { marginTop: 10, fontSize: 14, color: "gray", textAlign: "center" },
  smallNote: { marginTop: 8, fontSize: 12, color: "gray" },
  preview: {
    width: "100%",
    height: 280,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: "#ddd",
  },
});

export default StreamScreen;