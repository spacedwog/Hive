import React, { useEffect, useState } from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";

const ESP32_IP = "192.168.4.1"; // IP padrão do Soft-AP do ESP32

export default function CameraScreen() {
  const [savedImageUrl, setSavedImageUrl] = useState<string>("");

  // Ao abrir a tela, tenta carregar a última imagem salva
  useEffect(() => {
    setSavedImageUrl(`http://${ESP32_IP}/saved.jpg?_=${Date.now()}`);
  }, []);

  // Função auxiliar para interpretar resposta
  const parseResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const iniciarGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/start`);
      const data = await parseResponse(res);
      Alert.alert(
        res.ok ? "✅ Gravação iniciada" : "❌ Erro ao iniciar gravação",
        typeof data === "string" ? data : JSON.stringify(data)
      );
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  const pararGravacao = async () => {
    try {
      const res = await fetch(`http://${ESP32_IP}/stop`);
      const data = await parseResponse(res);
      Alert.alert(
        res.ok ? "🛑 Gravação parada" : "❌ Erro ao parar gravação",
        typeof data === "string" ? data : JSON.stringify(data)
      );
      // Após parar, tenta recarregar a última imagem salva no SD
      setSavedImageUrl(`http://${ESP32_IP}/saved.jpg?_=${Date.now()}`);
    } catch (err) {
      Alert.alert("Erro de conexão", String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 HIVE STREAM - SD</Text>

      {savedImageUrl ? (
        <Image
          source={{ uri: savedImageUrl }}
          style={styles.preview}
          resizeMode="contain"
          onError={() => setSavedImageUrl("")} // Reseta caso não consiga carregar
        />
      ) : (
        <Text style={styles.info}>Carregando imagem do SD...</Text>
      )}

      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button title="▶️ Iniciar Gravação" onPress={iniciarGravacao} />
        </View>
        <View style={styles.button}>
          <Button title="⏹ Parar Gravação" onPress={pararGravacao} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center",  
    alignItems: "center",      
    backgroundColor: "#111",
    padding: 20
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#fff", 
    marginBottom: 20 
  },
  preview: { 
    width: "90%", 
    height: 300, 
    borderRadius: 10, 
    backgroundColor: "#000" 
  },
  info: { 
    color: "#aaa", 
    marginBottom: 20 
  },
  buttons: { 
    marginTop: 20, 
    width: "90%", 
    flexDirection: "row", 
    justifyContent: "space-evenly" 
  },
  button: { 
    flex: 1, 
    marginHorizontal: 5 
  }
});