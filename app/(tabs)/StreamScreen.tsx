import React, { useRef, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { RNCamera } from "react-native-camera";

export default function CameraScreen() {
  const cameraRef = useRef<RNCamera>(null);
  const [recording, setRecording] = useState(false);

  const startRecording = async () => {
    if (cameraRef.current && !recording) {
      try {
        setRecording(true);
        const promise = cameraRef.current.recordAsync({
          quality: RNCamera.Constants.VideoQuality["480p"],
        });

        if (promise) {
          const data = await promise;
          Alert.alert("✅ Gravação finalizada", `Arquivo salvo em: ${data.uri}`);
        }
      } catch (err) {
        Alert.alert("❌ Erro ao gravar", String(err));
      } finally {
        setRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && recording) {
      cameraRef.current.stopRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 HIVE STREAM NATIVE</Text>

      <RNCamera
        ref={cameraRef}
        style={styles.preview}
        type={RNCamera.Constants.Type.back}
        captureAudio={true}
      />

      <View style={styles.buttons}>
        <Button title="▶️ Iniciar Gravação" onPress={startRecording} disabled={recording} />
        <Button title="⏹ Parar Gravação" onPress={stopRecording} disabled={!recording} />
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
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  preview: { width: "90%", height: 400, borderRadius: 10, overflow: "hidden" },
  buttons: { marginTop: 20, width: "90%", gap: 10, alignItems: "center" }
});