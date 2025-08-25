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

// Importa o módulo nativo exposto pelo código Swift/Java
const { CameraModule } = NativeModules;

const CameraScreen: React.FC = () => {
  const openNativeCamera = async () => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      if (!CameraModule || !CameraModule.openCamera) {
        Alert.alert(
          "Erro",
          "CameraModule não está disponível. Verifique a integração nativa."
        );
        return;
      }

      try {
        await CameraModule.openCamera();
        Alert.alert("Sucesso", "Câmera aberta com sucesso.");
      } catch (err: any) {
        Alert.alert("Erro", `Falha ao abrir câmera: ${JSON.stringify(err)}`);
      }
    } else {
      Alert.alert("Aviso", "Plataforma não suportada.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Câmera Nativa</Text>
      <Text style={styles.note}>
        Este botão abrirá a câmera nativa do dispositivo.
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