import * as Network from 'expo-network';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { getCurrentDateTime } from '../../hive_brain/hive_one/getCurrentDateTime.ts';
import {
  addBlockedEntry,
  addRule,
  deleteRule,
  getBlockedHistory,
  getRules,
  initDB
} from '../../hive_security/hive_database/database.ts';

export default function TelaPrinc({ navigation }: any) {
  const [networkInfo, setNetworkInfo] = useState<{ type?: string; details?: any }>({});
  const [blockedHistory, setBlockedHistory] = useState<{ ip: string; reason?: string; timestamp: string }[]>([]);
  const [rules, setRules] = useState<{ destination: string; gateway: string }[]>([]);
  const [visible, setVisible] = useState(false);
  const [newDestination, setNewDestination] = useState('');
  const [newGateway, setNewGateway] = useState('');

  // Inicializa banco e carrega dados
  useEffect(() => {
    initDB();
    (async () => {
      const history = await getBlockedHistory();
      setBlockedHistory(history);
      const rulesDb = await getRules();
      setRules(rulesDb);
    })();
  }, []);

  // Monitoramento da rede
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const networkType = networkState.type;

        let details: any = {};
        if (networkType === Network.NetworkStateType.WIFI) {
          const wifi = await Network.getIpAddressAsync();
          details = { ip: wifi };
        } else if (networkType === Network.NetworkStateType.CELLULAR) {
          details = { cellular: true };
        }

        setNetworkInfo({ type: networkType, details });

        if (!networkState.isConnected) {
          const now = getCurrentDateTime();
          const reason = 'Conexão perdida';
          await addBlockedEntry('0.0.0.0', reason, now);
          const history = await getBlockedHistory();
          setBlockedHistory(history);
        }
      } catch (error) {
        console.error("Erro ao obter informações de rede:", error);
      }
    };

    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // Adicionar nova rota
  const handleAddRoute = async () => {
    if (newDestination.trim() && newGateway.trim()) {
      await addRule(newDestination.trim(), newGateway.trim());
      const rulesDb = await getRules();
      setRules(rulesDb);
      setNewDestination('');
      setNewGateway('');
      setVisible(false);
    }
  };

  // Deletar rota
  const handleDeleteRule = async (destination: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja excluir a rota para ${destination}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteRule(destination);
            const rulesDb = await getRules();
            setRules(rulesDb);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="HiveNet Security" />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Configurações')} />
      </Appbar.Header>

      {/* Status da Rede */}
      <Card style={styles.card}>
        <Card.Title title="Status da Rede" />
        <Card.Content>
          <Text>Tipo: {networkInfo.type || 'Desconhecido'}</Text>
          {networkInfo.details?.ip && <Text>IP: {networkInfo.details.ip}</Text>}
        </Card.Content>
      </Card>

      {/* Histórico de Bloqueios */}
      <Card style={styles.card}>
        <Card.Title title="Histórico de Bloqueios" />
        <Card.Content>
          <FlatList
            data={blockedHistory}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text>{`${item.ip} - ${item.reason} - ${item.timestamp}`}</Text>
            )}
          />
        </Card.Content>
      </Card>

      {/* Regras */}
      <Card style={styles.card}>
        <Card.Title title="Regras de Bloqueio" />
        <Card.Content>
          <FlatList
            data={rules}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.ruleItem}>
                <Text>{`Destino: ${item.destination} → Gateway: ${item.gateway}`}</Text>
                <Button
                  onPress={() => handleDeleteRule(item.destination)}
                  mode="text"
                  textColor="red"
                >
                  Excluir
                </Button>
              </View>
            )}
          />
          <Button onPress={() => setVisible(true)} mode="contained" style={styles.addButton}>
            Adicionar Nova Rota
          </Button>
        </Card.Content>
      </Card>

      {/* Modal de Nova Rota */}
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Adicionar Nova Rota</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Destino"
              value={newDestination}
              onChangeText={setNewDestination}
              style={styles.input}
            />
            <TextInput
              label="Gateway"
              value={newGateway}
              onChangeText={setNewGateway}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancelar</Button>
            <Button onPress={handleAddRoute}>Adicionar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f4f6f8' },
  appbar: { backgroundColor: '#6200ee' },
  card: { marginBottom: 10, elevation: 4 },
  input: { marginBottom: 10 },
  addButton: { marginTop: 10 },
  ruleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});