import { useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function TabTwoScreen() {
  const [espResponse, setEspResponse] = useState<string | null>(null);

  const fetchESP32Data = async () => {
    try {
      const response = await fetch('http://192.168.15.166/status'); // Substitua pelo IP real do ESP32
      const data = await response.json();
      setEspResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar ao ESP32');
      console.error(error);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>

      {/* Botão e exibição de resposta do ESP32 */}
      <View style={{ marginVertical: 16 }}>
        <Button title="Conectar ao ESP32" onPress={fetchESP32Data} />
        {espResponse && (
          <ThemedText style={{ marginTop: 10 }}>
            Resposta do ESP32: {espResponse}
          </ThemedText>
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});