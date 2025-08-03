import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceARControlProps {
  status: Record<string, any>;
  onVoiceCommand: (cmd: string) => void;
}

export default function VoiceARControl({ status, onVoiceCommand }: VoiceARControlProps) {
  const [activated, setActivated] = useState(false);
  const [message, setMessage] = useState('Esperando comando...');

  const handleToggle = () => {
    const nextState = !activated;
    setActivated(nextState);

    const spokenMsg = nextState ? 'Modo de visualização ativado.' : 'Modo de visualização desativado.';
    const stateMsg = nextState ? 'Ativado!' : 'Desativado!';
    setMessage(stateMsg);
    Speech.speak(spokenMsg);
  };

  const renderGL = (gl: ExpoWebGLRenderingContext) => {
    gl.clearColor(activated ? 0.0 : 0.1, 0.3, activated ? 0.0 : 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.endFrameEXP();
  };

  // Exemplo: comando automático de voz com base em algum status
  useEffect(() => {
    const anomalyNodes = Object.entries(status).filter(([, s]) => s.anomaly === 'Anômalo');
    if (anomalyNodes.length > 0) {
      Speech.speak(`Alerta. ${anomalyNodes.length} nós com anomalia detectada.`);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Visual AR (GLView + Voz)</Text>
      <GLView style={styles.glview} onContextCreate={renderGL} />
      <TouchableOpacity style={styles.button} onPress={handleToggle}>
        <Text style={styles.buttonText}>{activated ? 'Desativar' : 'Ativar'}</Text>
      </TouchableOpacity>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 60,
    alignItems: 'center',
  },
  label: {
    color: '#facc15',
    marginBottom: 10,
    fontSize: 16,
  },
  glview: {
    width: 300,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#facc15',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  text: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 8,
  },
});