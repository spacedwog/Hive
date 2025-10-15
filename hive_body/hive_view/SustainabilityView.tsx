/**
 * SustainabilityView - Interface de Sustentabilidade Tecnológica
 * 
 * Exibe métricas, relatórios e controles de sustentabilidade do sistema
 */

import React, { useEffect, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import SustainabilityManager, {
    PowerMode,
    SustainabilityReport
} from '../../hive_brain/hive_sustain/SustainabilityManager.ts';

export default function SustainabilityView() {
  const [sustainManager] = useState(() => SustainabilityManager.getInstance());
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualiza a cada 30s
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const newReport = sustainManager.generateReport();
    const newStats = sustainManager.getStatistics();
    setReport(newReport);
    setStats(newStats);
  };

  const handlePowerModeChange = (mode: PowerMode) => {
    sustainManager.setPowerMode(mode);
    loadData();
  };

  const handleClearCache = () => {
    sustainManager.clearCache();
    loadData();
  };

  const handleReset = () => {
    sustainManager.reset();
    loadData();
  };

  if (!report || !stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando dados de sustentabilidade...</Text>
      </View>
    );
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A+': return '#00ff00';
      case 'A': return '#50fa7b';
      case 'B': return '#f1fa8c';
      case 'C': return '#ffb86c';
      case 'D': return '#ff5555';
      default: return '#fff';
    }
  };

  const getModeColor = (mode: PowerMode) => {
    switch (mode) {
      case 'high-performance': return '#ff5555';
      case 'balanced': return '#f1fa8c';
      case 'eco': return '#50fa7b';
      case 'ultra-eco': return '#00ff00';
      default: return '#fff';
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🌱 Sustentabilidade Tecnológica</Text>
          <Text style={styles.subtitle}>Monitoramento e Otimização de Recursos</Text>
        </View>

        {/* Energy Score Card */}
        <View style={styles.card}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Energy Score</Text>
            <Text style={[styles.scoreValue, { color: getRatingColor(report.efficiency_rating) }]}>
              {report.metrics.energy_score.toFixed(0)}
            </Text>
            <View style={styles.ratingBadge}>
              <Text style={[styles.ratingText, { color: getRatingColor(report.efficiency_rating) }]}>
                {report.efficiency_rating}
              </Text>
            </View>
          </View>
        </View>

        {/* Power Mode Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Modo de Energia</Text>
          <View style={styles.modeGrid}>
            {(['high-performance', 'balanced', 'eco', 'ultra-eco'] as PowerMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  report.mode === mode && styles.modeButtonActive,
                  { borderColor: getModeColor(mode) }
                ]}
                onPress={() => handlePowerModeChange(mode)}
              >
                <Text style={[
                  styles.modeButtonText,
                  report.mode === mode && { color: getModeColor(mode) }
                ]}>
                  {mode === 'high-performance' ? '🚀 Alto Desempenho' :
                   mode === 'balanced' ? '⚖️ Balanceado' :
                   mode === 'eco' ? '🌿 Econômico' :
                   '⚡ Ultra Econômico'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Metrics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Métricas de Recursos</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>CPU:</Text>
            <Text style={styles.metricValue}>
              {report.metrics.cpu_usage_percent.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Memória:</Text>
            <Text style={styles.metricValue}>
              {report.metrics.memory_usage_mb.toFixed(1)} MB
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Requisições de Rede:</Text>
            <Text style={styles.metricValue}>
              {report.metrics.network_requests_count}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Dados Transferidos:</Text>
            <Text style={styles.metricValue}>
              {report.metrics.network_data_mb.toFixed(2)} MB
            </Text>
          </View>
        </View>

        {/* Carbon Footprint */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌍 Pegada de Carbono</Text>
          <View style={styles.carbonContainer}>
            <Text style={styles.carbonValue}>
              {report.carbon_footprint_estimate.toFixed(2)}g
            </Text>
            <Text style={styles.carbonLabel}>CO₂ estimado</Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Estatísticas Gerais</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Tempo Ativo:</Text>
            <Text style={styles.metricValue}>{stats.uptime_hours}h</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total de Requisições:</Text>
            <Text style={styles.metricValue}>{stats.total_requests}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cache Entries:</Text>
            <Text style={styles.metricValue}>{stats.cache_entries}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Energy Score Médio:</Text>
            <Text style={styles.metricValue}>{stats.avg_energy_score}</Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Recomendações</Text>
          {report.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recommendationItem}>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Text style={styles.actionButtonText}>🧹 Limpar Cache</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
            <Text style={styles.actionButtonText}>🔄 Resetar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={loadData}>
            <Text style={styles.actionButtonText}>🔃 Atualizar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Última atualização: {new Date(report.metrics.timestamp).toLocaleString('pt-BR')}
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#50fa7b',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#282a36',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#44475a',
  },
  cardTitle: {
    color: '#f8f8f2',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scoreLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  ratingBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#44475a',
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#44475a',
    marginBottom: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#44475a',
  },
  modeButtonText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#44475a',
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  metricValue: {
    color: '#f8f8f2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  carbonContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  carbonValue: {
    color: '#50fa7b',
    fontSize: 48,
    fontWeight: 'bold',
  },
  carbonLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  recommendationItem: {
    backgroundColor: '#44475a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    color: '#f8f8f2',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6272a4',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#f8f8f2',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#6272a4',
    fontSize: 12,
  },
});
