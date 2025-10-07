import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GlobalErrorModalProps {
  visible: boolean;
  errorMessage: string;
  onClose: () => void;
}

export const GlobalErrorModal: React.FC<GlobalErrorModalProps> = ({
  visible,
  errorMessage,
  onClose,
}) => (
  <Modal
    transparent={true}
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: '#0f172a' }]}>
        <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
          Erro
        </Text>
        <Text style={{ color: '#fff', marginBottom: 16 }}>{errorMessage}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.modalBtn, { backgroundColor: '#f87171' }]}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)' },
  modalContent:{ backgroundColor:'#0f172a', padding:24, borderRadius:16, width:'80%' },
  modalBtn:{ flex:1, padding:12, borderRadius:8, alignItems:'center', marginHorizontal:4 },
});