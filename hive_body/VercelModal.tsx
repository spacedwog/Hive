import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface VercelModalProps {
  visible: boolean;
  vercelStatus: any;
  onClose: () => void;
}

export default function VercelModal({ visible, vercelStatus, onClose }: VercelModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>🌐 Status Vercel JSON</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <Text style={styles.modalText}>{JSON.stringify(vercelStatus, null, 2)}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalBox: { width: "85%", backgroundColor: "#1e1e1e", borderRadius: 10, padding: 20, shadowColor: "#000", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0af", marginBottom: 10 },
  modalText: { color: "#fff", fontSize: 14 },
  modalButton: { marginTop: 15, backgroundColor: "#0af", padding: 10, borderRadius: 8, alignItems: "center" },
});