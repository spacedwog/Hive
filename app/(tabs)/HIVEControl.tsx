// HIVEControl.tsx
import React, { useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

export default function HIVEControl() {
  const [log, setLog] = useState<string[]>([]);

  const sendCommand = async (cmd: string) => {
    try {
      const res = await fetch(`http://192.168.4.1/command?cmd=${cmd}`);
      const data = await res.text();
      setLog(prev => [`> ${cmd}`, data, ...prev]);
    } catch (err) {
      setLog(prev => [`> ${cmd}`, '⚠️ Erro ao enviar', ...prev]);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#0d0d0d' }}>
      <Text style={{ color: 'lime', fontSize: 20, marginBottom: 12 }}>🧠 H.I.V.E. Terminal</Text>
      <ScrollView style={{ backgroundColor: '#111', padding: 10 }}>
        {log.map((line, idx) => (
          <Text key={idx} style={{ color: '#39ff14' }}>{line}</Text>
        ))}
      </ScrollView>
      <Button title="Scan" onPress={() => sendCommand('scan')} />
      <Button title="Ativar Alerta" onPress={() => sendCommand('alert')} />
      <Button title="Desligar Nodo" onPress={() => sendCommand('shutdown_nodemcu')} />
    </View>
  );
}