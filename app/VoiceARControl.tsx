// VoiceARControl.tsx
import * as Speech from 'expo-speech';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NodeStatus = {
  status?: string;
  sensor?: number;
  anomaly?: string;
  error?: string;
};

type VoiceARControlProps = {
  status: Record<string, NodeStatus>;
  onVoiceCommand: (command: string) => void;
};

const VoiceARControl: React.FC<VoiceARControlProps> = ({ status, onVoiceCommand }) => {
  useEffect(() => {
    const commandListener = setInterval(() => {
      // Simula um comando por voz para teste
      const fakeCommand = 'ativar hive'; // substitua por reconhecimento real futuramente
      onVoiceCommand(fakeCommand);
    }, 30000); // a cada 30 segundos

    return () => clearInterval(commandListener);
  }, [onVoiceCommand]);

  useEffect(() => {
    let response = '';

    Object.entries(status).forEach(([node, data]) => {
      if (data.error) {
        response += `${node} está offline. `;
      } else {
        const condition = data.anomaly === 'Anômalo' ? 'com anomalia' : 'normal';
        response += `${node} está ${data.status}, sensor em ${data.sensor}, ${condition}. `;
      }
    });

    if (response.length > 0) {
      Speech.speak(response, {
        rate: 0.95,
        pitch: 1,
        language: 'pt-BR',
      });
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎤 Controle de Voz Ativo (Simulado)</Text>
      <Text style={styles.subText}>Comandos automáticos são disparados a cada 30s para testes.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#facc15',
    fontWeight: '600',
    textAlign: 'center',
  },
  subText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default VoiceARControl;