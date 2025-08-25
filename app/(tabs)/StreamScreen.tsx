import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

const StreamScreen: React.FC = () => {
  const [frameUri, setFrameUri] = useState(''); 
  const ip = '192.168.4.1'; // IP do Soft-AP do ESP32-CAM

  useEffect(() => {
    // Atualiza o frame a cada 150ms (~6-7fps)
    const interval = setInterval(() => {
      setFrameUri(`http://${ip}/stream?time=${Date.now()}`);
    }, 150);

    return () => clearInterval(interval);
  }, [ip]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32-CAM Live Stream</Text>

      <View style={styles.videoContainer}>
        {frameUri ? (
          <Image
            source={{ uri: frameUri }}
            style={styles.video}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.loading}>Conectando ao stream...</Text>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loading: {
    color: '#fff',
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