import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface SensorData {
  device: string;
  server_ip: string;
  sta_ip: string;
  sensor_raw: number;
  sensor_db: number;
  status: string;
  anomaly: {
    detected: boolean;
    message: string;
    current_value: number;
  };
}

const SparkBar: React.FC<{ data: number[]; width: number; height?: number }> = ({ data, width, height = 120 }) => {
  const n = Math.max(data.length, 1);
  const barGap = 2;
  const barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));

  return (
    <View style={[styles.chartBox, { width, height }]}>
      <View style={styles.chartAxis} />
      <View style={styles.chartBarsRow}>
        {data.map((v, i) => {
          const clamped = Math.max(0, Math.min(100, v));
          const h = Math.max(2, Math.round((clamped / 100) * (height - 16)));
          return (
            <View
              key={`${i}-${v}`}
              style={[styles.chartBar, { width: barWidth, height: h, marginRight: i === n - 1 ? 0 : barGap }]}
            />
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabelText}>0%</Text>
        <Text style={styles.chartLabelText}>100%</Text>
      </View>
    </View>
  );
};

export default function DataScienceCardScreen() {
  const { width: winWidth } = useWindowDimensions();
  const [node, setNode] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const [page, setPage] = useState<number>(0); // página atual do card

  // IPs
  const STA_IP = '192.168.15.138'; // STA - conectado ao seu roteador
  const STA_VESPA = '192.168.15.166'; // STA - conectado ao seu roteador
  const SOFTAP_IP = '192.168.4.1'; // SoftAP - fallback

  const graphWidth = useMemo(() => Math.min(winWidth * 0.9 - 24, 600), [winWidth]);

  // Envia comando para o nó
  const sendCommand = async (cmd: 'on' | 'off') => {
    if (!node) return;
    const ip = node.sta_ip !== 'desconectado' ? node.sta_ip : node.server_ip;
    try {
      await fetch(`http://${ip}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: cmd }),
      });
    } catch (error) {
      console.log(`Erro enviando comando para ${ip}:`, error);
    }
  };

  // Loop de coleta de dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tenta no IP STA
        let response = await fetch(`http://${STA_IP}/status`);
        if (!response.ok) throw new Error('STA offline');
        const data: SensorData = await response.json();
        setNode(data);

        setHistory(prev => {
          const next = { ...prev };
          const key = data.sta_ip;
          const values = next[key] ?? [];
          const newArr = [...values, data.sensor_db];
          if (newArr.length > 60) newArr.splice(0, newArr.length - 60);
          next[key] = newArr;
          return next;
        });
      } catch {
        try {
          // Fallback no SoftAP
          let response = await fetch(`http://${SOFTAP_IP}/status`);
          if (!response.ok) throw new Error('Soft-AP offline');
          const data: SensorData = await response.json();
          setNode(data);

          setHistory(prev => {
            const next = { ...prev };
            const key = data.server_ip;
            const values = next[key] ?? [];
            const newArr = [...values, data.sensor_db];
            if (newArr.length > 60) newArr.splice(0, newArr.length - 60);
            next[key] = newArr;
            return next;
          });
        } catch (error) {
          console.log('Erro ao obter dados do nó:', error);
          setNode(null);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const nextPage = () => setPage((prev) => (prev + 1) % 3);
  const prevPage = () => setPage((prev) => (prev - 1 + 3) % 3);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📊 Data Science Dashboard</Text>

      {/* Card principal */}
      <View style={[styles.card, { backgroundColor: '#1f2937' }]}>
        {node ? (
          <>
            {page === 0 && (
              <View>
                <Text style={styles.description}>🖥 Dispositivo: {node.device}</Text>
                <Text style={styles.description}>📡 IP AP: {node.server_ip}</Text>
                <Text style={styles.description}>🌐 IP STA: {node.sta_ip}</Text>
                <Text style={styles.description}>🔊 Som (raw): {node.sensor_raw}</Text>
                <Text style={styles.description}>📈 Som (dB): {node.sensor_db.toFixed(1)}</Text>
                <Text style={styles.description}>
                  ⚠️ Anomalia: {node.anomaly.detected ? node.anomaly.message : 'Normal'}
                </Text>
                <Text style={styles.description}>🔌 Status: {node.status}</Text>
              </View>
            )}

            {page === 1 && history[node.sta_ip] && history[node.sta_ip].length > 0 && (
              <View>
                <Text style={{ color: '#fff', marginBottom: 8 }}>📊 Histórico do Sensor ({node.sta_ip})</Text>
                <SparkBar data={history[node.sta_ip]} width={graphWidth} height={120} />

                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.cmdBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={() => sendCommand('on')}
                  >
                    <Text style={styles.cmdBtnText}>Ativar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cmdBtn, { backgroundColor: '#f44336', marginLeft: 10 }]}
                    onPress={() => sendCommand('off')}
                  >
                    <Text style={styles.cmdBtnText}>Desativar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {page === 2 && Object.keys(history).length > 0 && (
              <View>
                <Text style={{ color: '#f1faee', fontWeight: '600', marginBottom: 8, fontSize: 16 }}>
                  📦 Histórico Geral
                </Text>
                {Object.entries(history).map(([serverIp, values]) => (
                  <View key={serverIp} style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#a8dadc', fontSize: 14, marginBottom: 4 }}>
                      🌐 {serverIp} — Últimos {values.length} pontos
                    </Text>
                    <SparkBar data={values} width={graphWidth} height={80} />
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity onPress={prevPage} style={styles.pageBtn}>
                <Text style={styles.pageBtnText}>⬅ Anterior</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextPage} style={styles.pageBtn}>
                <Text style={styles.pageBtnText}>Próximo ➡</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#a8dadc', textAlign: 'center', marginTop: 8 }}>Página {page + 1} de 3</Text>
          </>
        ) : (
          <Text style={{ color: '#facc15', textAlign: 'center' }}>
            Conecte-se ao nó via WiFi (STA ou Soft-AP)...
          </Text>
        )}
      </View>

      {/* Segundo Card - Energia */}
      <View style={[styles.card, { backgroundColor: '#111827', marginTop: 20 }]}>
        {node ? (
          <>
            <Text style={{ color: '#facc15', fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
              ⚡ Energia & Bateria
            </Text>

            <Text style={styles.description}>
              🔋 Nível da Bateria: {Math.max(0, Math.min(100, (node.sensor_raw / 4095) * 100)).toFixed(0)}%
            </Text>
            <Text style={styles.description}>
              ⚡ Tensão: {(node.sensor_raw * 3.3 / 4095).toFixed(2)} V
            </Text>
            <Text style={styles.description}>📶 Status Vespa: {node.status}</Text>

            {history[node.sta_ip] && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: '#fff', marginBottom: 8 }}>🔋 Histórico de Tensão</Text>
                <SparkBar
                  data={history[node.sta_ip].map(v => Math.max(0, Math.min(100, (v / 4095) * 100)))}
                  width={graphWidth}
                  height={80}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.cmdBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => sendCommand('on')}
              >
                <Text style={styles.cmdBtnText}>Ligar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cmdBtn, { backgroundColor: '#ef4444', marginLeft: 10 }]}
                onPress={() => sendCommand('off')}
              >
                <Text style={styles.cmdBtnText}>Desligar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={{ color: '#facc15', textAlign: 'center' }}>
            Conecte-se à Vespa para visualizar energia...
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#facc15',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
  cmdBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cmdBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#50fa7b',
    borderRadius: 8,
  },
  pageBtnText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  chartBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "center",
    paddingTop: 8,
    paddingHorizontal: 8
  },
  chartAxis: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  chartBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "100%",
    paddingBottom: 8
  },
  chartBar: {
    backgroundColor: "#50fa7b",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  chartLabels: {
    position: "absolute",
    top: 4,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  chartLabelText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)"
  },
});