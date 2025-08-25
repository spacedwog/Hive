import React, { useEffect, useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';

const StreamScreen: React.FC = () => {
  const [ip, setIp] = useState('192.168.4.1'); // IP padrão do Soft-AP do ESP32
  const [streamUri, setStreamUri] = useState('');

  useEffect(() => {
    // URI do stream
    setStreamUri(`http://${ip}/stream`);
  }, [ip]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32-CAM Live Stream</Text>

      {streamUri ? (
        <Image
          source={{ uri: streamUri }}
          style={styles.stream}
          resizeMode="cover"
        />
      ) : (
        <Text>Conectando ao ESP32...</Text>
      )}

      <Button
        title="Atualizar Stream"
        onPress={() => setStreamUri(`http://${ip}/stream?${Date.now()}`)}
      />
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
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 10,
  },
  stream: {
    width: '100%',
    height: 400,
    borderRadius: 10,
  },
});