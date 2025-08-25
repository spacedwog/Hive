import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ESP32State {
  led: 'on' | 'off';
}

const StreamScreen: React.FC = () => {
  const [frameUri, setFrameUri] = useState('');
  const [espData, setEspData] = useState<ESP32State | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const ip = '192.168.4.1'; // IP do Soft-AP do ESP32-CAM

  // Atualiza o frame de vídeo a cada 150ms (~6-7fps)
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameUri(`http://${ip}/stream?time=${Date.now()}`);
    }, 150);
    return () => clearInterval(interval);
  }, [ip]);

  // Busca dados do ESP32 a cada 2 segundos
  const fetchESPData = async () => {
    try {
      const response = await fetch(`http://${ip}/state`);
      const json: ESP32State = await response.json();
      setEspData(json);
      setLoadingData(false);
    } catch (error) {
      console.log('Erro ao buscar dados do ESP32:', error);
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchESPData();
    const interval = setInterval(fetchESPData, 2000);
    return () => clearInterval(interval);
  }, [ip]);

  // Envia comando para ligar/desligar o LED
  const toggleLED = async (turnOn: boolean) => {
    try {
      await fetch(`http://${ip}/${turnOn ? 'H' : 'L'}`);
      fetchESPData(); // atualiza estado imediatamente
    } catch (error) {
      console.log('Erro ao enviar comando LED:', error);
    }
  };

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

      <View style={styles.dataContainer}>
        <Text style={styles.subtitle}>Dados do ESP32-CAM</Text>
        {loadingData ? (
          <ActivityIndicator size="small" color="#16a34a" />
        ) : espData ? (
          <Text style={[styles.ledState, { color: espData.led === 'on' ? '#16a34a' : '#ef4444' }]}>
            LED: {espData.led.toUpperCase()}
          </Text>
        ) : (
          <Text style={styles.error}>Não foi possível obter os dados.</Text>
        )}

        {/* Botões de controle */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#16a34a' }]} onPress={() => toggleLED(true)}>
            <Text style={styles.buttonText}>Ligar LED</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#ef4444' }]} onPress={() => toggleLED(false)}>
            <Text style={styles.buttonText}>Desligar LED</Text>
          </TouchableOpacity>
        </View>
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
    height: (width - 30) * 0.75,
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
  dataContainer: {
    width: width - 40,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginBottom: 8,
  },
  ledState: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  error: {
    color: '#ef4444',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 15,
    width: '100%',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
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