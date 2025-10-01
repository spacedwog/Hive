// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import {
  View as AnimatedView,
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

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [firewallPage, setFirewallPage] = useState(1);
  const [routeSaved, setRouteSaved] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string[]>([]);
  const [rules, setRules] = useState<{ destination: string; gateway: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [retroModalVisible, setRetroModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [potentialIPs, setPotentialIPs] = useState<string[]>([]); // Cache IPs de domínios reais

  const ipsPerPage = 10;
  const rulesPerPage = 5;

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
  // Função para obter IPs de domínios reais
  // -------------------------
  const getPotentialIPs = async (): Promise<string[]> => {
    const domains = [
      "google.com",
      "github.com",
      "microsoft.com",
      "youtube.com",
      "twitter.com",
      "cloudflare.com",
    ];
    const ips: string[] = [];

    for (const domain of domains) {
      try {
        const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        const data = await response.json();
        if (data.Answer) {
          data.Answer.forEach((answer: any) => {
            if (answer.data) {
              ips.push(answer.data);
            }
          });
        }
      } catch (err) {
        console.warn(`Não foi possível obter IP de ${domain}:`, err);
      }
    }
    return ips;
  };

  // -------------------------
  // Dados do Firewall em tempo real
  // -------------------------
  useEffect(() => {
    if (!accessCode || accessCode.trim() === "") {
      return;
    }

    // Precarregar IPs de domínios reais
    if (potentialIPs.length === 0) {
      getPotentialIPs().then(setPotentialIPs);
    }

    const fetchFirewallData = async () => {
      try {
        const response = await fetch(`${VERCEL_URL}/api/firewall?action=info`);
        const data = await response.json();

        if (!data.success) {
          setFirewallData(null);
          return;
        }

        setFirewallData(data.data);

        // -------------------------
        // Bloqueio de IP e nova regra
        // -------------------------
        if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
          try {
            await fetch(`${VERCEL_URL}/api/firewall?action=alert`);

            const ipParaBloquear =
              data.data.ip ||
              (potentialIPs.length > 0
                ? potentialIPs[Math.floor(Math.random() * potentialIPs.length)]
                : `192.168.1.${Math.floor(Math.random() * 254 + 1)}`);

            await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ip: ipParaBloquear }),
            });

            // Criação de nova regra
            const destination = `10.0.${Math.floor(Math.random() * 255)}.0/24`;
            const gatewayResp = await fetch(`${VERCEL_URL}/api/firewall?action=getGateway`);
            const gatewayData = await gatewayResp.json();
            const gateway = gatewayData.gateway || "192.168.1.1";

            await fetch(`${VERCEL_URL}/api/firewall?action=route`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination, gateway }),
            });

            setRules(prev => [...prev, { destination, gateway }]);
            setAlertMsg(prev => [
              `IP bloqueado automaticamente: ${ipParaBloquear}`,
              `Nova regra criada: ${destination} -> ${gateway}`,
              ...prev,
            ]);

            triggerHiveAnimation('created');

          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setErrorModal(errorMsg);
            setAlertMsg(prev => [`Erro: ${errorMsg}`, ...prev]);
          }
        }

        // -------------------------
        // Salvar rota automaticamente quando tentativas = regras
        // -------------------------
        if (data.data.tentativasBloqueadas === data.data.regrasAplicadas && !routeSaved) {
          try {
            const destination = "192.168.15.166/24";
            const gatewayResp = await fetch(`${VERCEL_URL}/api/firewall?action=getGateway`);
            const gatewayData = await gatewayResp.json();
            const gateway = gatewayData.gateway || "192.168.1.1";

            await fetch(`${VERCEL_URL}/api/firewall?action=route`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destination, gateway }),
            });

            setRules(prev => [...prev, { destination, gateway }]);
            setRouteSaved(true);
            setAlertMsg(prev => [
              `Rota automática salva: ${destination} -> ${gateway}`,
              ...prev,
            ]);

            triggerHiveAnimation('applied');

            // Abrir modal retroativo se houver diferença
            if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
              setRetroModalVisible(true);
            }

          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setErrorModal(errorMsg);
            setAlertMsg(prev => [`Erro ao salvar rota: ${errorMsg}`, ...prev]);
          }
        }

        // -------------------------
        // Flash animation
        // -------------------------
        if (previousAttemptsRef.current < data.data.tentativasBloqueadas) {
          flashAnim.value = withTiming(1, { duration: 300 }, () => {
            flashAnim.value = withTiming(0, { duration: 300 });
          });
        }
        previousAttemptsRef.current = data.data.tentativasBloqueadas;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setErrorModal(errorMsg);
        setFirewallData(null);
      }
    };

    fetchFirewallData();
    const interval = setInterval(fetchFirewallData, 5000);
    return () => clearInterval(interval);
  }, [accessCode, flashAnim, routeSaved, triggerHiveAnimation, potentialIPs]);

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

  const paginatedRules = rules.slice((modalPage - 1) * rulesPerPage, modalPage * rulesPerPage);
  const totalModalPages = Math.ceil(rules.length / rulesPerPage);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <AnimatedView style={[styles.card, animatedCardStyle]}>
          {firewallData ? (
            <>
              <Text style={styles.description}>
                Status:{" "}
                <Text style={{ color: firewallData.status === "Ativo" ? "#50fa7b" : "#f87171", fontWeight: "bold" }}>
                  {firewallData.status}
                </Text>
              </Text>
              <Text style={styles.description}>
                Última atualização:{" "}
                <Text style={{ color: "#fff" }}>
                  {firewallData.ultimaAtualizacao ? new Date(firewallData.ultimaAtualizacao).toLocaleString("pt-BR") : "-"}
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
              {/* Botão modal acima dos IPs */}
              {/* ------------------------- */}
              <TouchableOpacity
                style={[styles.loginBtn, { alignSelf: 'center', marginVertical: 12 }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Ver Regras / Rotas</Text>
              </TouchableOpacity>

              {paginatedIPs.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.description, { color: "#facc15", fontWeight: "bold" }]}>
                    IPs bloqueados:
                  </Text>
                  {paginatedIPs.map((ip: string, idx: number) => (
                    <Text key={idx} style={styles.description}>{ip}</Text>
                  ))}

                  {totalPages > 1 && (
                    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
                      <TouchableOpacity disabled={firewallPage <= 1} onPress={() => setFirewallPage(prev => prev - 1)} style={{ marginHorizontal: 8 }}>
                        <Text style={{ color: firewallPage > 1 ? "#50fa7b" : "#888" }}>◀</Text>
                      </TouchableOpacity>
                      <Text style={{ color: "#fff" }}>{firewallPage} / {totalPages}</Text>
                      <TouchableOpacity disabled={firewallPage >= totalPages} onPress={() => setFirewallPage(prev => prev + 1)} style={{ marginHorizontal: 8 }}>
                        <Text style={{ color: firewallPage < totalPages ? "#50fa7b" : "#888" }}>▶</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {alertMsg.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  {alertMsg.map((msg, idx) => (
                    <Text key={idx} style={[styles.description, { color: "#f87171" }]}>{msg}</Text>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.description}>Carregando dados do firewall...</Text>
          )}
        </AnimatedView>

        {/* ------------------------- */}
        {/* HIVE Animations */}
        {/* ------------------------- */}
        {showHiveCreated && (
          <RNAnimated.View style={{
            position: "absolute", top: 100, right: 24, opacity: hiveCreatedAnim,
            transform: [{ scale: hiveCreatedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
          }}>
            <Text style={{ fontSize: 48 }}>🐝 (Criada)</Text>
          </RNAnimated.View>
        )}
        {showHiveApplied && (
          <RNAnimated.View style={{
            position: "absolute", top: 160, right: 24, opacity: hiveAppliedAnim,
            transform: [{ scale: hiveAppliedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
          }}>
            <Text style={{ fontSize: 48 }}>🐝 (Aplicada)</Text>
          </RNAnimated.View>
        )}

        {/* ------------------------- */}
        {/* Modal Regras / Rotas */}
        {/* ------------------------- */}
        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Regras e Rotas</Text>
              {paginatedRules.length > 0 ? (
                paginatedRules.map((item, idx) => (
                  <Text key={idx} style={styles.description}>{item.destination} → {item.gateway}</Text>
                ))
              ) : (
                <Text style={styles.description}>Nenhuma regra criada ainda.</Text>
              )}

              {totalModalPages > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                  <TouchableOpacity disabled={modalPage <= 1} onPress={() => setModalPage(prev => prev - 1)} style={{ marginHorizontal: 8 }}>
                    <Text style={{ color: modalPage > 1 ? "#50fa7b" : "#888" }}>◀</Text>
                  </TouchableOpacity>
                  <Text style={{ color: "#fff" }}>{modalPage} / {totalModalPages}</Text>
                  <TouchableOpacity disabled={modalPage >= totalModalPages} onPress={() => setModalPage(prev => prev + 1)} style={{ marginHorizontal: 8 }}>
                    <Text style={{ color: modalPage < totalModalPages ? "#50fa7b" : "#888" }}>▶</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.loginBtn, { marginTop: 16 }]}>
                <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ------------------------- */}
        {/* Modal Retroativo */}
        {/* ------------------------- */}
        <Modal transparent visible={retroModalVisible}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Aplicar regras retroativamente?</Text>
              <Text style={[styles.description, { marginBottom: 12 }]}>
                Existem {firewallData?.tentativasBloqueadas ?? 0} tentativas bloqueadas e {firewallData?.regrasAplicadas ?? 0} regras aplicadas.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity style={[styles.loginBtn, { paddingHorizontal: 16 }]} onPress={() => { setRetroModalVisible(false); /* aplicar retroativamente */ }}>
                  <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Sim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.loginBtn, { paddingHorizontal: 16 }]} onPress={() => setRetroModalVisible(false)}>
                  <Text style={{ color: "#0f172a", fontWeight: "bold" }}>Não</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ------------------------- */}
        {/* Modal Erro */}
        {/* ------------------------- */}
        <Modal transparent visible={!!errorModal} onRequestClose={() => setErrorModal(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Erro</Text>
              <Text style={styles.description}>{errorModal}</Text>
              <TouchableOpacity style={[styles.loginBtn, { marginTop: 16 }]} onPress={() => setErrorModal(null)}>
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
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    width: "100%",
    marginBottom: 20,
  },
  description: { fontSize: 16, color: "#e2e8f0", lineHeight: 24 },
  loginContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loginBtn: { backgroundColor: "#50fa7b", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, marginTop: 12 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { backgroundColor: "#1e293b", padding: 24, borderRadius: 16, width: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#facc15", marginBottom: 12 },
});