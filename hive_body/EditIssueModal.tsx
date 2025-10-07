import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type EditIssueModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  editTitle: string;
  setEditTitle: (title: string) => void;
  editBody: string;
  setEditBody: (body: string) => void;
  editLabels: string;
  setEditLabels: (labels: string) => void;
  editStatus: "open" | "closed";
  setEditStatus: (status: "open" | "closed") => void;
  projectStatus: "Backlog" | "Ready" | "In Progress" | "In Review";
  setProjectStatus: (status: "Backlog" | "Ready" | "In Progress" | "In Review") => void;
  onSave: () => void;
};

export default function EditIssueModal({
  visible,
  onRequestClose,
  editTitle,
  setEditTitle,
  editBody,
  setEditBody,
  editLabels,
  setEditLabels,
  editStatus,
  setEditStatus,
  projectStatus,
  setProjectStatus,
  onSave,
}: EditIssueModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar Issue</Text>
          <TextInput
            style={styles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Título"
            placeholderTextColor="#888"
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={editBody}
            onChangeText={setEditBody}
            placeholder="Corpo"
            placeholderTextColor="#888"
            multiline
          />
          <TextInput
            style={styles.input}
            value={editLabels}
            onChangeText={setEditLabels}
            placeholder="Tags (separadas por vírgula)"
            placeholderTextColor="#888"
          />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                editStatus === "open" ? styles.statusBtnActive : null,
              ]}
              onPress={() => setEditStatus("open")}
            >
              <Text style={editStatus === "open" ? styles.statusBtnTextActive : styles.statusBtnText}>
                Aberta
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                editStatus === "closed" ? styles.statusBtnActive : null,
              ]}
              onPress={() => setEditStatus("closed")}
            >
              <Text style={editStatus === "closed" ? styles.statusBtnTextActive : styles.statusBtnText}>
                Fechada
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <TouchableOpacity
              style={[
                styles.projectStatusBtn,
                projectStatus === "Backlog" ? styles.projectStatusBtnActive : null,
              ]}
              onPress={() => setProjectStatus("Backlog")}
            >
              <Text style={projectStatus === "Backlog" ? styles.projectStatusBtnTextActive : styles.projectStatusBtnText}>
                Backlog
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.projectStatusBtn,
                projectStatus === "Ready" ? styles.projectStatusBtnActive : null,
              ]}
              onPress={() => setProjectStatus("Ready")}
            >
              <Text style={projectStatus === "Ready" ? styles.projectStatusBtnTextActive : styles.projectStatusBtnText}>
                Ready
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.projectStatusBtn,
                projectStatus === "In Progress" ? styles.projectStatusBtnActive : null,
              ]}
              onPress={() => setProjectStatus("In Progress")}
            >
              <Text style={projectStatus === "In Progress" ? styles.projectStatusBtnTextActive : styles.projectStatusBtnText}>
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.projectStatusBtn,
                projectStatus === "In Review" ? styles.projectStatusBtnActive : null,
              ]}
              onPress={() => setProjectStatus("In Review")}
            >
              <Text style={projectStatus === "In Review" ? styles.projectStatusBtnTextActive : styles.projectStatusBtnText}>
                In Review
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onRequestClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1f2937', borderRadius: 12, padding: 24, width: '80%' },
  modalTitle: { fontSize: 20, color: '#facc15', fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 12 },
  saveBtn: { backgroundColor: '#50fa7b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#f87171', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' },
  statusBtn: { flex: 1, backgroundColor: '#222', borderRadius: 8, paddingVertical: 8, marginHorizontal: 4, alignItems: 'center' },
  statusBtnActive: { backgroundColor: '#50fa7b' },
  statusBtnText: { color: '#fff', fontWeight: 'bold' },
  statusBtnTextActive: { color: '#0f172a', fontWeight: 'bold' },
  projectStatusBtn: { flex: 1, backgroundColor: '#222', borderRadius: 8, paddingVertical: 8, marginHorizontal: 4, alignItems: 'center' },
  projectStatusBtnActive: { backgroundColor: '#facc15' },
  projectStatusBtnText: { color: '#fff', fontWeight: 'bold' },
  projectStatusBtnTextActive: { color: '#0f172a', fontWeight: 'bold' },
});