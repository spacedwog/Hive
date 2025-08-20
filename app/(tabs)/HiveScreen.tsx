import axios from "axios";
import * as base64 from "base-64";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Button, Dimensions, FlatList, StyleSheet, Text, Vibration, View } from "react-native";

type NodeStatus = {
    device?: string;
    server?: string;
    status?: string;
    ultrassonico_cm?: number;
    analog?: number;
    error?: string;
};

export default function HiveScreen() {
    const [status, setStatus] = useState<NodeStatus[]>([]);
    const [pingValues, setPingValues] = useState<{ [key: string]: number }>({});

    const authUsername = "spacedwog";
    const authPassword = "Kimera12@";
    const authHeader = "Basic " + base64.encode(`${authUsername}:${authPassword}`);

    const fetchStatus = async () => {
        try {
            const servers = ["192.168.4.1"];
            const responses = await Promise.all(
                servers.map(async (server) => {
                    try {
                        const res = await axios.get(`http://${server}/status`, {
                            timeout: 3000,
                            headers: { Authorization: authHeader },
                        });
                        return { ...res.data, server };
                    } catch (err) {
                        return { server, status: "offline", error: String(err) };
                    }
                })
            );
            setStatus(responses);

            responses.forEach((s) => {
                if (s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10) {
                    Vibration.vibrate(500);
                }
            });
        } catch (err) {
            console.error("Erro ao buscar status:", err);
        }
    };

    const sendCommand = async (server: string, command: string) => {
        try {
            const res = await axios.post(
                `http://${server}/command`,
                { command },
                { headers: { Authorization: authHeader } }
            );

            if (command === "ping" && res.data.analog !== undefined) {
                setPingValues((prev) => ({ ...prev, [server]: res.data.analog }));
            }

            fetchStatus();
        } catch (err) {
            console.error("Erro ao enviar comando:", err);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const getAnalogColor = (analog?: number) => {
        if (analog === undefined) return "#ffffff";
        const min = 0;
        const max = 2400;
        const norm = Math.min(Math.max(analog, min), max) / max;

        if (norm < 0.5) {
            const r = 255;
            const g = Math.round(510 * norm);
            return `rgb(${r},${g},0)`;
        } else {
            const r = Math.round(510 * (1 - norm));
            const g = 255;
            return `rgb(${r},${g},0)`;
        }
    };

    const firstAnalog = status.find((s) => s.analog !== undefined)?.analog;
    const containerColorTuple: [string, string] = [getAnalogColor(firstAnalog), "#000000"];

    // Obter altura da tela para centralizar verticalmente
    const screenHeight = Dimensions.get("window").height;

    return (
        <LinearGradient
            colors={containerColorTuple}
            style={[styles.container, { minHeight: screenHeight }]}
        >
            <FlatList
                data={status}
                keyExtractor={(item) => item.server || Math.random().toString()}
                contentContainerStyle={styles.flatListContent}
                renderItem={({ item: s }) => {
                    const serverKey = s.server ?? "unknown";
                    const isOffline = s.status === "offline";
                    const isActive = s.status === "ativo";
                    const isNear = s.ultrassonico_cm !== undefined && s.ultrassonico_cm < 10;

                    const cardGradient: [string, string] = isNear
                        ? ["#fff3cd", "#ffeeba"]
                        : isOffline
                        ? ["#f8d7da", "#f5c6cb"]
                        : s.analog !== undefined
                        ? [getAnalogColor(s.analog), "#000000"]
                        : isActive
                        ? ["#d4edda", "#c3e6cb"]
                        : ["#ffffff", "#f8f9fa"];

                    return (
                        <LinearGradient colors={cardGradient} style={styles.nodeCard}>
                            <Text style={styles.nodeText}>🖥️ {s.device || "Dispositivo"}</Text>
                            <Text style={styles.statusText}>
                                📡 {s.server || "-"} - {s.status || "offline"}
                            </Text>
                            <Text style={styles.statusText}>
                                📏 Distância: {s.ultrassonico_cm ?? "-"} cm
                            </Text>

                            {isNear && (
                                <Text style={styles.warningText}>⚠️ Dispositivo próximo!</Text>
                            )}

                            {s.analog !== undefined && (
                                <Text style={styles.statusText}>⚡ Sensor: {s.analog}</Text>
                            )}

                            {pingValues[serverKey] !== undefined && (
                                <Text style={styles.statusText}>
                                    ⚡ Ping Sensor: {pingValues[serverKey]}
                                </Text>
                            )}

                            <View style={styles.buttonRow}>
                                <Button
                                    title="Ativar"
                                    disabled={isOffline || !s.server || isNear}
                                    onPress={() => s.server && sendCommand(s.server, "activate")}
                                />
                                <Button
                                    title="Desativar"
                                    disabled={isOffline || !s.server || isNear}
                                    onPress={() => s.server && sendCommand(s.server, "deactivate")}
                                />
                                <Button
                                    title="Ping"
                                    disabled={isOffline || !s.server || isNear}
                                    onPress={() => s.server && sendCommand(s.server, "ping")}
                                />
                            </View>
                        </LinearGradient>
                    );
                }}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    flatListContent: {
        flexGrow: 1,
        justifyContent: "center", // centraliza verticalmente
    },
    nodeCard: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 3,
        width: "90%",
        alignSelf: "center",
    },
    nodeText: {
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    statusText: {
        fontSize: 14,
        marginTop: 4,
        textAlign: "center",
    },
    warningText: {
        fontSize: 16,
        marginTop: 6,
        fontWeight: "bold",
        color: "#856404",
        textAlign: "center",
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 10,
    },
});