import { MotiView } from 'moti';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

export default function HiveHomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 1000 }}
        style={styles.header}
      >
        <Text style={styles.title}>🧠 H.I.V.E. Project</Text>
        <Text style={styles.subtitle}>Hyper-Intelligent Virtual Entity</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 500, duration: 1000 }}
        style={styles.card}
      >
        <Text style={styles.description}>
          H.I.V.E. é uma IA descentralizada inspirada em colmeias, composta por múltiplos nós físicos e digitais que colaboram
          para tomar decisões inteligentes. Cada nó (ESP32, Blackboard, NodeMCU) envia dados sensoriais para um núcleo de controle
          que aprende, interpreta e reage em tempo real. Sua missão: coordenar, vigiar e otimizar sistemas embarcados.
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, rotate: '-10deg' }}
        animate={{ opacity: 1, rotate: '0deg' }}
        transition={{ delay: 1000, type: 'spring' }}
        style={styles.hexagonWrapper}
      >
        <Svg height="120" width={screenWidth}>
          <Polygon
            points="60,10 90,30 90,70 60,90 30,70 30,30"
            fill="#facc15"
            stroke="#eab308"
            strokeWidth="3"
          />
        </Svg>
        <Text style={styles.hexagonLabel}>Nó Ativo</Text>
      </MotiView>
    </ScrollView>
  );
}

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
  hexagonLabel: {
    marginTop: 10,
    fontSize: 16,
    color: '#facc15',
    fontWeight: '600',
  },
});