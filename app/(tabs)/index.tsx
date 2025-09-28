// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from '@env';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../../hive_body/BottomNav';

export default function TelaPrinc() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [firewallData, setFirewallData] = useState<any | null>(null);
  const [firewallPage, setFirewallPage] = useState(1);
  const [routeSaved, setRouteSaved] = useState(false);
  const ipsPerPage = 10;

  const previousAttemptsRef = useRef<number>(0);
  const flashAnim = useRef(new Animated.Value(0)).current;

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
          // Bloqueio de IP
          // -------------------------
          if (data.data.tentativasBloqueadas > data.data.regrasAplicadas) {
            try {
              // Alerta
              await fetch(`${VERCEL_URL}/api/firewall?action=alert`);

              // Bloqueio do IP (usar último bloqueado ou fictício)
              const ipParaBloquear = data.data.ip || "192.168.1.125";
              await fetch(`${VERCEL_URL}/api/firewall?action=block`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: ipParaBloquear }),
              });
            } catch (err) {
              console.error("Erro ao bloquear IP:", err);
            }
          }

          // -------------------------
          // Salvar rota automaticamente
          // -------------------------
          if (
            data.data.tentativasBloqueadas === data.data.regrasAplicadas &&
            !routeSaved
          ) {
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
            } catch (err) {
              console.error("Erro ao salvar rota:", err);
            }
          }

          // -------------------------
          // Animação para novas tentativas
          // -------------------------
          if (previousAttemptsRef.current < data.data.tentativasBloqueadas) {
            Animated.sequence([
              Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
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
  }, [accessCode, flashAnim, routeSaved]);

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

        {/* ------------------------- */}
        {/* Card Firewall */}
        {/* ------------------------- */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["#22223b", "#f87171"],
              }),
            },
          ]}
        >
          <Text style={styles.cardTitle}>🔥 Firewall</Text>
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
            </>
          ) : (
            <Text style={styles.description}>Carregando dados do firewall...</Text>
          )}
        </Animated.View>
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
});