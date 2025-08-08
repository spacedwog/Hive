// app/(tabs)/explore.tsx

import { useIsFocused } from '@react-navigation/native';
import { Camera, CameraType } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExploreScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>(CameraType.back);
  const cameraRef = useRef<Camera>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const flipCamera = () => {
    setType((prevType) =>
      prevType === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      Alert.alert('Foto tirada!', JSON.stringify(photo.uri));
      // Aqui você pode navegar, salvar ou exibir a foto
    }
  };

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Sem permissão para usar a câmera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <Camera
          style={styles.camera}
          type={type}
          ref={cameraRef}
          ratio="16:9"
        />
      )}
      <View style={styles.controls}>
        <TouchableOpacity onPress={flipCamera} style={styles.button}>
          <Text style={styles.buttonText}>Trocar Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePicture} style={styles.button}>
          <Text style={styles.buttonText}>Tirar Foto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  button: {
    backgroundColor: '#ffffffaa',
    padding: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
  },
});