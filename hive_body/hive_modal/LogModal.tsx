import React, { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export type LogLevel = "info" | "warn" | "error" | "success";

export type LogEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: string;
};

interface LogModalProps {
  visible: boolean;
  logs: LogEntry[];
  onClose: () => void;
  onClearLogs: () => void;
}

export default function LogModal({
  visible,
  logs,
  onClose,
  onClearLogs,
}: LogModalProps) {
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.level === filter);

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case "info":
        return "#0af";
      case "warn":
        return "#facc15";
      case "error":
        return "#ff6666";
      case "success":
        return "#4caf50";
      default:
        return "#fff";
    }
  };

  const getLogIcon = (level: LogLevel): string => {
    switch (level) {
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
      case "success":
        return "✅";
      default:
        return "📝";
    }
  };

  const getLogStats = () => {
    return {
      total: logs.length,
      info: logs.filter((l) => l.level === "info").length,
      warn: logs.filter((l) => l.level === "warn").length,
      error: logs.filter((l) => l.level === "error").length,
      success: logs.filter((l) => l.level === "success").length,
    };
  };

  const stats = getLogStats();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackground}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>📋 Logs do Sistema</Text>

          {/* Estatísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: "#4caf50" }]}>✅</Text>
              <Text style={[styles.statValue, { color: "#4caf50" }]}>
                {stats.success}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: "#0af" }]}>ℹ️</Text>
              <Text style={[styles.statValue, { color: "#0af" }]}>
                {stats.info}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: "#facc15" }]}>⚠️</Text>
              <Text style={[styles.statValue, { color: "#facc15" }]}>
                {stats.warn}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: "#ff6666" }]}>❌</Text>
              <Text style={[styles.statValue, { color: "#ff6666" }]}>
                {stats.error}
              </Text>
            </View>
          </View>

          {/* Filtros */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("all")}
            >
              <Text style={styles.filterText}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "success" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("success")}
            >
              <Text style={styles.filterText}>✅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "info" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("info")}
            >
              <Text style={styles.filterText}>ℹ️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "warn" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("warn")}
            >
              <Text style={styles.filterText}>⚠️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "error" && styles.filterButtonActive,
              ]}
              onPress={() => setFilter("error")}
            >
              <Text style={styles.filterText}>❌</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Logs */}
          <ScrollView style={styles.logList}>
            {filteredLogs.length === 0 ? (
              <Text style={styles.noLogsText}>
                {filter === "all"
                  ? "📭 Nenhum log registrado"
                  : `📭 Nenhum log do tipo ${filter}`}
              </Text>
            ) : (
              filteredLogs.map((log) => (
                <View key={log.id} style={styles.logEntry}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.logIcon, { color: getLogColor(log.level) }]}>
                      {getLogIcon(log.level)}
                    </Text>
                    <Text style={styles.logTime}>
                      {log.timestamp.toLocaleTimeString("pt-BR")}
                    </Text>
                  </View>
                  <Text
                    style={[styles.logMessage, { color: getLogColor(log.level) }]}
                  >
                    {log.message}
                  </Text>
                  {log.details && (
                    <Text style={styles.logDetails}>{log.details}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Botões */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={onClearLogs}
            >
              <Text style={styles.buttonText}>🧹 Limpar Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>✖️ Fechar</Text>
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
    backgroundColor: "rgba(0,0,0,0.8)",
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
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0af",
    marginBottom: 15,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
    minWidth: 50,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#0af",
  },
  filterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  logList: {
    maxHeight: 400,
    marginBottom: 15,
  },
  noLogsText: {
    color: "#888",
    textAlign: "center",
    fontSize: 16,
    paddingVertical: 40,
  },
  logEntry: {
    backgroundColor: "#2a2a2a",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#0af",
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logTime: {
    fontSize: 12,
    color: "#888",
  },
  logMessage: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: "#ff9900",
  },
  closeButton: {
    backgroundColor: "#0af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
