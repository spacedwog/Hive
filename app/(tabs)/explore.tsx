import { Camera, CameraType } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExploreScreen() {
  const cameraRef = useRef<React.ComponentRef<typeof Camera> | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [type, setType] = useState<CameraType>(CameraType.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Você precisa liberar acesso à câmera nas configurações do dispositivo.'
        );
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao tirar a foto.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Solicitando permissão da câmera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
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
            type={type}
            ratio="16:9"
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