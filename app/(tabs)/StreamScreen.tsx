import React from "react";
import {
  Alert,
  Button,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { CameraModule } = NativeModules;

const CameraScreen: React.FC = () => {
  const openNativeCamera = () => {
    if (Platform.OS === "android") {
      CameraModule.openCamera(
        () => Alert.alert("Sucesso", "Câmera aberta."),
        (err: string) => Alert.alert("Erro", err)
      );
    } else if (Platform.OS === "ios") {
      CameraModule.openCamera(
        () => Alert.alert("Sucesso", "Câmera aberta."),
        (err: string) => Alert.alert("Erro", err)
      );
    } else {
      Alert.alert("Aviso", "Plataforma não suportada.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Câmera Nativa</Text>
      <Text style={styles.note}>
        Este botão abrirá o aplicativo de câmera padrão do sistema.
      </Text>

      <View style={styles.buttonWrapper}>
        <Button title="Abrir Câmera" onPress={openNativeCamera} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
    marginBottom: 15,
  },
  buttonWrapper: {
    marginTop: 15,
    width: "60%",
  },
});

export default CameraScreen;