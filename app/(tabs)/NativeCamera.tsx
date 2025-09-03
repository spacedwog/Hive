import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";

export default function NativeCamera() {
  const [permission, setPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === "back");

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();
      setPermission(cameraPermission === "granted" && microphonePermission === "granted");
    })();
  }, []);

  if (!device) return <Text style={{ color: "white" }}>Carregando câmera...</Text>;
  if (!permission) return <Text style={{ color: "red" }}>Permissão negada</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      <View style={styles.overlay}>
        <Button title="Capturar" onPress={() => console.log("Captura implementada depois")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
});