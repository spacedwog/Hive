import { ResizeMode, Video } from 'expo-av';
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

const StreamScreen: React.FC = () => {
  const videoRef = useRef<Video>(null);

  // IP padrão do Soft-AP do ESP32-CAM
  const ip = '192.168.4.1';
  const streamUrl = `http://${ip}/stream`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32-CAM Live Stream</Text>

      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER} // <- aqui
          shouldPlay
          isLooping
          useNativeControls={false}
        />
      </View>

      <Text style={styles.info}>Conectado ao ESP32-CAM: {ip}</Text>
      <Text style={styles.infoSmall}>
        Certifique-se de que seu dispositivo está conectado à rede Wi-Fi do ESP32-CAM.
      </Text>
    </View>
  );
};

export default StreamScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  videoContainer: {
    width: width - 30,
    height: (width - 30) * 0.75, // proporção 4:3
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#000',
    marginBottom: 15,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  info: {
    color: '#fff',
    fontSize: 16,
    marginTop: 5,
  },
  infoSmall: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});