import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

const nodes = [
  { name: 'NodeMCU', ip: '192.168.4.2' },
  { name: 'Blackboard', ip: '192.168.4.3' },
];

export default function HiveScreen() {
  const [status, setStatus] = useState<any>({});

  const fetchStatus = async () => {
    const newStatus: any = {};
    for (let node of nodes) {
      try {
        const response = await axios.get(`http://${node.ip}/status`);
        newStatus[node.name] = response.data;
      } catch (err) {
        newStatus[node.name] = { error: 'Offline' };
      }
    }
    setStatus(newStatus);
  };

  const sendCommand = async (node: string, command: string) => {
    const ip = nodes.find(n => n.name === node)?.ip;
    if (ip) {
      await axios.post(`http://${ip}/command`, { command });
      fetchStatus();
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <ScrollView>
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>🧠 HIVE Central Interface</Text>
      {nodes.map((node) => (
        <View key={node.name} style={{ padding: 12, margin: 8, borderWidth: 1 }}>
          <Text style={{ fontSize: 18 }}>{node.name}</Text>
          <Text>Status: {JSON.stringify(status[node.name])}</Text>
          <Button title="Ativar Nó" onPress={() => sendCommand(node.name, 'activate')} />
        </View>
      ))}
    </ScrollView>
  );
}