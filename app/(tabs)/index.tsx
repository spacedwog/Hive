import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export default function HiveHomeScreen() {
  const opacityTitle = useSharedValue(0);
  const translateYTitle = useSharedValue(-20);
  const scaleCard = useSharedValue(0.9);
  const rotateHex = useSharedValue(-10);

  useEffect(() => {
    opacityTitle.value = withTiming(1, { duration: 800 });
    translateYTitle.value = withTiming(0, { duration: 800 });
    scaleCard.value = withDelay(400, withTiming(1, { duration: 800 }));
    rotateHex.value = withDelay(800, withTiming(0, { duration: 1000 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: opacityTitle.value,
    transform: [{ translateY: translateYTitle.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCard.value }],
  }));

  const hexStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateHex.value}deg` }],
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={[styles.header, titleStyle]}>
        <Text style={styles.title}>🧠 H.I.V.E. Project</Text>
        <Text style={styles.subtitle}>Hyper-Intelligent Virtual Entity</Text>
      </Animated.View>

      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.description}>
          H.I.V.E. é uma IA descentralizada inspirada em colmeias, composta por múltiplos nós físicos e digitais que colaboram
          para tomar decisões inteligentes. Cada nó (ESP32, NodeMCU) envia dados sensoriais para um núcleo de controle
          que aprende, interpreta e reage em tempo real. Sua missão: coordenar, vigiar e otimizar sistemas embarcados.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.hexagonWrapper, hexStyle]}>
        <View style={styles.hexagon}>
          <View style={styles.hexagonInner} />
        </View>
        <Text style={styles.hexagonLabel}>Nó Ativo</Text>
      </Animated.View>
    </ScrollView>
  );
}

const HEX_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#facc15',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginVertical: 12,
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  hexagonWrapper: {
    marginTop: 20,
    alignItems: 'center',
  },
  hexagon: {
    width: HEX_SIZE,
    height: HEX_SIZE * 0.866, // altura do hexágono (sin(60°))
    backgroundColor: '#facc15',
    marginVertical: HEX_SIZE * 0.133,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '30deg' }],
  },
  hexagonInner: {
    width: HEX_SIZE,
    height: HEX_SIZE * 0.866,
    backgroundColor: '#facc15',
    transform: [{ rotate: '-30deg' }],
  },
  hexagonLabel: {
    marginTop: 10,
    fontSize: 16,
    color: '#facc15',
    fontWeight: '600',
  },
});