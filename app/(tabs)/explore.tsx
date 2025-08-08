import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraPermissionStatus, useCameraDevices } from 'react-native-vision-camera';

export default function ExploreScreen() {
  const devices = useCameraDevices();
  const device = devices?.find(d => d.position === 'back');

  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    async function requestPermission() {
      const status: CameraPermissionStatus = await Camera.requestCameraPermission();

      // Correção: comparar com 'granted'
      const authorized = status === 'granted';

      setHasPermission(authorized);

      if (!authorized) {
        Alert.alert(
          'Permissão negada',
          'Você precisa liberar acesso à câmera nas configurações do iOS.'
        );
      }
    }
    requestPermission();
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      setPhotoUri('file://' + photo.path);
    } catch {
      Alert.alert('Erro', 'Falha ao tirar a foto.');
    }
  };

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Carregando câmera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Permissão para câmera negada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
          />
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
            <Text style={styles.captureButtonText}>📸</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✖ Fechar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#facc15',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#facc15',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  captureButtonText: { fontSize: 30 },
  previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  previewImage: { width: '100%', height: '80%', resizeMode: 'contain' },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#f87171',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  closeButtonText: { color: '#fff', fontSize: 16 },
});