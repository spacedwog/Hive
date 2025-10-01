// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import {
  View as AnimatedView,
  FlatList,
  Modal,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import BottomNav from '../../hive_body/BottomNav.tsx';

interface Rule {
  destination: string;
  gateway: string;
}

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [firewallPage, setFirewallPage] = useState(1);
  const [routeSaved, setRouteSaved] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const ipsPerPage = 10;

  const previousAttemptsRef = useRef<number>(0);
  const flashAnim = useSharedValue(0);

  // -------------------------
  // HIVE Animations
  // -------------------------
  const [showHiveCreated, setShowHiveCreated] = useState(false);
  const [showHiveApplied, setShowHiveApplied] = useState(false);
  const hiveCreatedAnim = useRef(new RNAnimated.Value(0)).current;
  const hiveAppliedAnim = useRef(new RNAnimated.Value(0)).current;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const triggerHiveAnimation = (type: 'created' | 'applied') => {
    const anim = type === 'created' ? hiveCreatedAnim : hiveAppliedAnim;
    const setter = type === 'created' ? setShowHiveCreated : setShowHiveApplied;

    setter(true);
    RNAnimated.sequence([
      RNAnimated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
      RNAnimated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setter(false));
  };

  // -------------------------
  // Dados do Firewall em tempo real
  // -------------------------
  useEffect(() => {
    if (!accessCode || accessCode.trim() === "") {
      return;
    }

    const fetchFirewallData = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await response.json();

        if (data.success) {
          setFirewallData(data.data);

          // -------------------------
          // Bloqueio de IP e nova regra
          // -------------------------
          if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
            try {
              await fetch(`${VERCEL_URL}/api/firewall?action=alert`);

              const ipParaBloquear =
                data.data.ip || `192.168.1.${Math.floor(Math.random() * 254 + 1)}`;
              await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: ipParaBloquear }),
              });

              // -------------------------
              // Regra criada
              // -------------------------
              const destination = `10.0.${Math.floor(Math.random() * 255)}.0/24`;
              const gateway = "192.168.1.1";
              await fetch(`${VERCEL_URL}/api/firewall?action=route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, gateway }),
              });

              // Salva regra localmente
              setRules(prev => [...prev, { destination, gateway }]);

              setAlertMsg(prev => [
                `IP bloqueado automaticamente: ${ipParaBloquear}`,
                `Nova regra criada: ${destination} -> ${gateway}`,
                ...prev,
              ]);

              // Trigger HIVE "Regra Criada"
              triggerHiveAnimation('created');

            } catch (err) {
              console.error("Erro ao bloquear IP ou criar regra:", err);
              setAlertMsg(prev => [
                `Erro: ${err instanceof Error ? err.message : String(err)}`,
                ...prev,
              ]);
            }
          }

          // -------------------------
          // Salvar rota automaticamente quando tentativas = regras
          // -------------------------
          if (data.data.tentativasBloqueadas === data.data.regrasAplicadas && !routeSaved) {
            try {
              const destination = "192.168.15.166/24";
              const gateway = "192.168.1.1";

              const routeResponse = await fetch(`${VERCEL_URL}/api/firewall?action=route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, gateway }),
              });
              const result = await routeResponse.json();
              console.log("Rota salva automaticamente:", result);
              setRouteSaved(true);

              setRules(prev => [...prev, { destination, gateway }]);

              setAlertMsg(prev => [
                `Rota automática salva: ${destination} -> ${gateway}`,
                ...prev,
              ]);

              // Trigger HIVE "Regra Aplicada"
              triggerHiveAnimation('applied');

            } catch (err) {
              console.error("Erro ao salvar rota:", err);
              setAlertMsg(prev => [
                `Erro ao salvar rota: ${err instanceof Error ? err.message : String(err)}`,
                ...prev,
              ]);
            }
          }

          // -------------------------
          // Animação para novas tentativas
          // -------------------------
          if (previousAttemptsRef.current < data.data.tentativasBloqueadas) {
            flashAnim.value = withTiming(1, { duration: 300 }, () => {
              flashAnim.value = withTiming(0, { duration: 300 });
            });
          }

          previousAttemptsRef.current = data.data.tentativasBloqueadas;
        } else {
          setFirewallData(null);
        }
      } catch (err) {
        setFirewallData(null);
        console.error("Erro ao buscar dados do firewall:", err);
      }
    };

    fetchFirewallData();
    const interval = setInterval(fetchFirewallData, 5000);
    return () => clearInterval(interval);
  }, [accessCode, flashAnim, routeSaved, triggerHiveAnimation]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: flashAnim.value === 1 ? "#f87171" : "#22223b",
  }));

  if (!accessCode || accessCode.trim() === "")
    return (
      <View style={styles.loginContainer}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Insira o código de acesso:</Text>
        <TouchableOpacity
          onPress={() => setAccessCode("ACESSO_LIBERADO")}
          style={styles.loginBtn}
        >
          <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Login</Text>
        </TouchableOpacity>
      </View>
    );

  const paginatedIPs = firewallData?.blocked
    ? firewallData.blocked.slice((firewallPage - 1) * ipsPerPage, firewallPage * ipsPerPage)
    : [];
  const totalPages = firewallData?.blocked ? Math.ceil(firewallData.blocked.length / ipsPerPage) : 1;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Data Science Dashboard</Text>

        <AnimatedView style={[styles.card, animatedCardStyle]}>
          {firewallData ? (
            <>
              <Text style={styles.description}>
                Status:{" "}
                <Text
                  style={{
                    color: firewallData.status === "Ativo" ? "#50fa7b" : "#f87171",
                    fontWeight: "bold",
                  }}
                >
                  {firewallData.status}
                </Text>
              </Text>
              <Text style={styles.description}>
                Última atualização:{" "}
                <Text style={{ color: "#fff" }}>
                  {firewallData.ultimaAtualizacao
                    ? new Date(firewallData.ultimaAtualizacao).toLocaleString("pt-BR")
                    : "-"}
                </Text>
              </Text>
              <Text style={styles.description}>
                Tentativas bloqueadas:{" "}
                <Text style={{ color: "#f87171", fontWeight: "bold" }}>
                  {firewallData.tentativasBloqueadas ?? "-"}
                </Text>
              </Text>
              <Text style={styles.description}>
                Regras aplicadas:{" "}
                <Text style={{ color: "#50fa7b" }}>{firewallData.regrasAplicadas ?? "-"}</Text>
              </Text>

              {/* ------------------------- */}
              {/* Botão Modal Regras (acima dos IPs) */}
              {/* ------------------------- */}
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={[styles.loginBtn, { marginTop: 12, alignSelf: 'flex-start' }]}
              >
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Ver Regras / Rotas</Text>
              </TouchableOpacity>

              {paginatedIPs.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.description, { color: "#facc15", fontWeight: "bold" }]}>
                    IPs bloqueados:
                  </Text>
                  {paginatedIPs.map((ip: string, idx: number) => (
                    <Text key={idx} style={styles.description}>
                      {ip}
                    </Text>
                  ))}

                  {totalPages > 1 && (
                    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
                      <TouchableOpacity
                        disabled={firewallPage <= 1}
                        onPress={() => setFirewallPage((prev) => prev - 1)}
                        style={{ marginHorizontal: 8 }}
                      >
                        <Text style={{ color: firewallPage > 1 ? "#50fa7b" : "#888" }}>◀</Text>
                      </TouchableOpacity>
                      <Text style={{ color: "#fff" }}>
                        {firewallPage} / {totalPages}
                      </Text>
                      <TouchableOpacity
                        disabled={firewallPage >= totalPages}
                        onPress={() => setFirewallPage((prev) => prev + 1)}
                        style={{ marginHorizontal: 8 }}
                      >
                        <Text style={{ color: firewallPage < totalPages ? "#50fa7b" : "#888" }}>▶</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* ------------------------- */}
              {/* Mensagens de alerta */}
              {/* ------------------------- */}
              {alertMsg.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  {alertMsg.map((msg, idx) => (
                    <Text key={idx} style={[styles.description, { color: "#f87171" }]}>
                      {msg}
                    </Text>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.description}>Carregando dados do firewall...</Text>
          )}
        </AnimatedView>

        {/* ------------------------- */}
        {/* Sprite HIVE Animations */}
        {/* ------------------------- */}
        {showHiveCreated && (
          <RNAnimated.View
            style={{
              position: "absolute",
              top: 100,
              right: 24,
              opacity: hiveCreatedAnim,
              transform: [
                {
                  scale: hiveCreatedAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            }}
          >
            <Text style={{ fontSize: 48 }}>🐝 (Criada)</Text>
          </RNAnimated.View>
        )}
        {showHiveApplied && (
          <RNAnimated.View
            style={{
              position: "absolute",
              top: 160,
              right: 24,
              opacity: hiveAppliedAnim,
              transform: [
                {
                  scale: hiveAppliedAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            }}
          >
            <Text style={{ fontSize: 48 }}>🐝 (Aplicada)</Text>
          </RNAnimated.View>
        )}

        {/* ------------------------- */}
        {/* Modal Regras e Rotas */}
        {/* ------------------------- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Regras e Rotas</Text>
              {rules.length > 0 ? (
                <FlatList
                  data={rules}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <Text style={styles.description}>
                      {item.destination} → {item.gateway}
                    </Text>
                  )}
                />
              ) : (
                <Text style={styles.description}>Nenhuma regra criada ainda.</Text>
              )}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.loginBtn, { marginTop: 16 }]}
              >
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#0f172a", alignItems: "center" },
  title: { fontSize: 28, color: "#facc15", fontWeight: "bold", marginBottom: 20 },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: "100%",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, color: "#facc15", fontWeight: "bold", marginBottom: 10 },
  description: { fontSize: 16, color: "#e2e8f0", lineHeight: 24 },
  loginContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loginBtn: { backgroundColor: "#50fa7b", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, marginTop: 12 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#1a1a2e", padding: 24, borderRadius: 16, width: "90%" },
  modalTitle: { fontSize: 20, color: "#facc15", fontWeight: "bold", marginBottom: 12 },
});