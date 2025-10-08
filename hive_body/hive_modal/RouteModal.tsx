import React, { Component } from 'react';
import { Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RouteModalProps {
  visible: boolean;
  fadeAnim: Animated.Value;
  newDestination: string;
  newGateway: string;
  setNewDestination: (v: string) => void;
  setNewGateway: (v: string) => void;
  hideModal: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export class RouteModal extends Component<RouteModalProps> {
  render() {
    const {
      visible, fadeAnim, newDestination, newGateway,
      setNewDestination, setNewGateway, hideModal, onSave, onDelete
    } = this.props;

    return (
      <Modal
        visible={visible}
        animationType="none"
        transparent={true}
        onRequestClose={hideModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Nova Rota</Text>
            <TextInput
              placeholder="Destino"
              value={newDestination}
              onChangeText={setNewDestination}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              placeholder="Gateway"
              value={newGateway}
              onChangeText={setNewGateway}
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#50fa7b' }]} onPress={onSave}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#fbbf24' }]} onPress={onDelete}>
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>Deletar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f87171' }]} onPress={hideModal}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalOverlay:{ flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)' },
  modalContent:{ backgroundColor:'#0f172a', padding:24, borderRadius:16, width:'80%' },
  input:{ borderWidth:1, borderColor:'#94a3b8', borderRadius:8, padding:8, color:'#fff', marginTop:8 },
  modalBtn:{ flex:1, padding:12, borderRadius:8, alignItems:'center', marginHorizontal:4 },
});