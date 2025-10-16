import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ErrorLog } from "../../hive_brain/hive_stream/Esp32Service.ts";

interface ErrorModalProps {
  visible: boolean;
  errorMessage?: string;
  errorLogs?: ErrorLog[];
  errorStats?: {
    total: number;
    network: number;
    timeout: number;
    http: number;
    unknown: number;
  };
  onClose: () => void;
  onClearHistory?: () => void;
}

export default function ErrorModal({ 
  visible, 
  errorMessage, 
  errorLogs, 
  errorStats, 
  onClose, 
  onClearHistory 
}: ErrorModalProps) {
  const getErrorIcon = (type: ErrorLog['type']) => {
    switch (type) {
      case 'network': return '🔴';
      case 'timeout': return '⏱️';
      case 'http': return '🌐';
      default: return '⚠️';
    }
  };

  const getErrorColor = (type: ErrorLog['type']) => {
    switch (type) {
      case 'network': return '#ff4444';
      case 'timeout': return '#ffaa00';
      case 'http': return '#ff9900';
      default: return '#ff6666';
    }
  };

  const formatTimestamp = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>
            ⚠️ {errorLogs && errorLogs.length > 0 ? 'Histórico de Erros' : 'Erro Capturado'}
          </Text>

          {/* Estatísticas de erros */}
          {errorStats && errorStats.total > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>📊 Resumo ({errorStats.total} erros)</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>🔴 Rede: {errorStats.network}</Text>
                <Text style={styles.statsText}>⏱️ Timeout: {errorStats.timeout}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>🌐 HTTP: {errorStats.http}</Text>
                <Text style={styles.statsText}>⚠️ Outros: {errorStats.unknown}</Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.scrollView}>
            {/* Exibe logs de erro se disponíveis */}
            {errorLogs && errorLogs.length > 0 ? (
              errorLogs.map((error) => (
                <View key={error.id} style={[styles.errorCard, { borderLeftColor: getErrorColor(error.type) }]}>
                  <View style={styles.errorHeader}>
                    <Text style={styles.errorType}>
                      {getErrorIcon(error.type)} {error.type.toUpperCase()}
                    </Text>
                    <Text style={styles.errorTime}>{formatTimestamp(error.timestamp)}</Text>
                  </View>
                  <Text style={styles.errorMessage}>{error.message}</Text>
                  {error.endpoint && (
                    <Text style={styles.errorDetail}>📍 Endpoint: {error.endpoint}</Text>
                  )}
                  {error.ip && (
                    <Text style={styles.errorDetail}>🌐 IP: {error.ip} ({error.mode})</Text>
                  )}
                  {error.details && (
                    <Text style={styles.errorDetail}>ℹ️ {error.details}</Text>
                  )}
                </View>
              ))
            ) : errorMessage ? (
              // Exibe mensagem de erro simples se não houver logs
              <Text style={styles.modalText}>{errorMessage}</Text>
            ) : (
              <Text style={styles.emptyText}>Nenhum erro registrado</Text>
            )}
          </ScrollView>

          <View style={styles.buttonRow}>
            {onClearHistory && errorLogs && errorLogs.length > 0 && (
              <TouchableOpacity 
                style={[styles.modalButton, styles.clearButton]} 
                onPress={onClearHistory}
              >
                <Text style={styles.buttonText}>🗑️ Limpar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.modalButton, styles.closeButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.8)" 
  },
  modalBox: { 
    width: "90%", 
    maxHeight: "80%",
    backgroundColor: "#1e1e1e", 
    borderRadius: 12, 
    padding: 20, 
    shadowColor: "#000", 
    shadowOpacity: 0.5, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 8, 
    elevation: 5 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#ff6666", 
    marginBottom: 15,
    textAlign: "center"
  },
  statsContainer: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  statsTitle: {
    color: "#0af",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statsText: {
    color: "#ccc",
    fontSize: 12,
  },
  scrollView: {
    maxHeight: 400,
    marginBottom: 15,
  },
  errorCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  errorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  errorType: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  errorTime: {
    color: "#888",
    fontSize: 11,
  },
  errorMessage: {
    color: "#fff",
    fontSize: 13,
    marginBottom: 6,
  },
  errorDetail: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  modalText: { 
    color: "#fff", 
    fontSize: 14,
    padding: 10,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: { 
    flex: 1,
    padding: 12, 
    borderRadius: 8, 
    alignItems: "center" 
  },
  closeButton: {
    backgroundColor: "#0af",
  },
  clearButton: {
    backgroundColor: "#ff6666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});