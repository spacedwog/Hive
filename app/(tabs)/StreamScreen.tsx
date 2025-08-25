import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';

const { width } = Dimensions.get('window');

const ESP32CamScreen: React.FC = () => {
  const [ip] = useState('192.168.4.1'); // IP do Soft-AP do ESP32
  const streamUrl = `http://${ip}/stream`; // URL do stream MJPEG

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32-CAM Live Stream</Text>

      <Video
        source={{ uri: streamUrl }}
        style={styles.video}
        resizeMode="cover"
        repeat
        paused={false}
        controls={false}
        ignoreSilentSwitch="ignore"
      />

      <Text style={styles.info}>Conectado ao ESP32-CAM: {ip}</Text>
    </View>
  );
};

export default ESP32CamScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  video: {
    width: width - 20,
    height: (width - 20) * 0.75,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  info: {
    color: '#fff',
    marginTop: 10,
  },
});