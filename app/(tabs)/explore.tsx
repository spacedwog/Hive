import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Import Victory Native para gráficos
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryTheme,
} from 'victory-native';

type SensorData = {
  temperatura: number;
  umidade: number;
  luminosidade: number;
  pressao: number;
};

export default function TabTwoScreen() {
  const [espResponse, setEspResponse] = useState<SensorData | null>(null);
  const [historico, setHistorico] = useState<SensorData[]>([]);

  const fetchESP32Data = async () => {
    try {
      const response = await fetch('http://192.168.15.166/status'); // IP do ESP32
      const data: SensorData = await response.json();
      setEspResponse(data);

      // Mantém histórico com no máximo 20 leituras
      setHistorico((old) => [...old.slice(-19), data]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar ao ESP32');
      console.error(error);
    }
  };

  const calcularMedia = (valores: number[]) => {
    if (valores.length === 0) return 0;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  };

  const resumoEstatistico = () => {
    const temp = historico.map((h) => h.temperatura);
    const umid = historico.map((h) => h.umidade);
    const lum = historico.map((h) => h.luminosidade);
    const press = historico.map((h) => h.pressao);

    return {
      temperatura: {
        min: Math.min(...temp),
        max: Math.max(...temp),
        media: calcularMedia(temp),
      },
      umidade: {
        min: Math.min(...umid),
        max: Math.max(...umid),
        media: calcularMedia(umid),
      },
      luminosidade: {
        min: Math.min(...lum),
        max: Math.max(...lum),
        media: calcularMedia(lum),
      },
      pressao: {
        min: Math.min(...press),
        max: Math.max(...press),
        media: calcularMedia(press),
      },
    };
  };

  const resumo = resumoEstatistico();

  // Função auxiliar para formatar dados para Victory (x = índice, y = valor)
  const formatarDados = (arr: number[]) => arr.map((v, i) => ({ x: i + 1, y: v }));

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
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore - Data Science</ThemedText>
      </ThemedView>

      <View style={{ marginVertical: 16 }}>
        <Button title="Buscar dados do ESP32" onPress={fetchESP32Data} />
        {espResponse && (
          <ThemedText style={{ marginTop: 10 }}>
            Última leitura: {JSON.stringify(espResponse, null, 2)}
          </ThemedText>
        )}
      </View>

      <ScrollView horizontal style={{ height: 220, marginVertical: 20 }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 10 }}>
          {/* Temperatura */}
          <View style={{ width: 180, marginRight: 20 }}>
            <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
              Temperatura (°C)
            </ThemedText>
            <VictoryChart
              theme={VictoryTheme.material}
              height={150}
              width={180}
              domainPadding={{ x: 10, y: 20 }}
            >
              <VictoryAxis
                tickFormat={() => ''}
                style={{ axis: { stroke: 'none' }, ticks: { stroke: 'none' } }}
              />
              <VictoryAxis dependentAxis />
              <VictoryLine
                style={{ data: { stroke: 'red' } }}
                data={formatarDados(historico.map((h) => h.temperatura))}
              />
            </VictoryChart>
          </View>

          {/* Umidade */}
          <View style={{ width: 180, marginRight: 20 }}>
            <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
              Umidade (%)
            </ThemedText>
            <VictoryChart
              theme={VictoryTheme.material}
              height={150}
              width={180}
              domainPadding={{ x: 10, y: 20 }}
            >
              <VictoryAxis
                tickFormat={() => ''}
                style={{ axis: { stroke: 'none' }, ticks: { stroke: 'none' } }}
              />
              <VictoryAxis dependentAxis />
              <VictoryLine
                style={{ data: { stroke: 'blue' } }}
                data={formatarDados(historico.map((h) => h.umidade))}
              />
            </VictoryChart>
          </View>

          {/* Luminosidade */}
          <View style={{ width: 180, marginRight: 20 }}>
            <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
              Luminosidade (lx)
            </ThemedText>
            <VictoryChart
              theme={VictoryTheme.material}
              height={150}
              width={180}
              domainPadding={{ x: 10, y: 20 }}
            >
              <VictoryAxis
                tickFormat={() => ''}
                style={{ axis: { stroke: 'none' }, ticks: { stroke: 'none' } }}
              />
              <VictoryAxis dependentAxis />
              <VictoryLine
                style={{ data: { stroke: 'orange' } }}
                data={formatarDados(historico.map((h) => h.luminosidade))}
              />
            </VictoryChart>
          </View>

          {/* Pressão */}
          <View style={{ width: 180 }}>
            <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
              Pressão (hPa)
            </ThemedText>
            <VictoryChart
              theme={VictoryTheme.material}
              height={150}
              width={180}
              domainPadding={{ x: 10, y: 20 }}
            >
              <VictoryAxis
                tickFormat={() => ''}
                style={{ axis: { stroke: 'none' }, ticks: { stroke: 'none' } }}
              />
              <VictoryAxis dependentAxis />
              <VictoryLine
                style={{ data: { stroke: 'green' } }}
                data={formatarDados(historico.map((h) => h.pressao))}
              />
            </VictoryChart>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20 }}>
        <ThemedText
          type="defaultSemiBold"
          style={{ fontSize: 16, marginBottom: 10 }}
        >
          Resumo Estatístico (últimos {historico.length} registros)
        </ThemedText>
        {historico.length > 0 ? (
          <>
            <ThemedText>
              Temperatura: min {resumo.temperatura.min.toFixed(1)}°C, max{' '}
              {resumo.temperatura.max.toFixed(1)}°C, média{' '}
              {resumo.temperatura.media.toFixed(1)}°C
            </ThemedText>
            <ThemedText>
              Umidade: min {resumo.umidade.min.toFixed(1)}%, max{' '}
              {resumo.umidade.max.toFixed(1)}%, média {resumo.umidade.media.toFixed(1)}%
            </ThemedText>
            <ThemedText>
              Luminosidade: min {resumo.luminosidade.min.toFixed(1)}, max{' '}
              {resumo.luminosidade.max.toFixed(1)}, média{' '}
              {resumo.luminosidade.media.toFixed(1)}
            </ThemedText>
            <ThemedText>
              Pressão: min {resumo.pressao.min.toFixed(1)} hPa, max{' '}
              {resumo.pressao.max.toFixed(1)} hPa, média{' '}
              {resumo.pressao.media.toFixed(1)} hPa
            </ThemedText>
          </>
        ) : (
          <ThemedText>Nenhum dado coletado ainda.</ThemedText>
        )}
      </View>

      {/* Seus collapsibles originais continuam aqui */}
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