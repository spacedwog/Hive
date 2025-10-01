// eslint-disable-next-line import/no-unresolved
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from '@env';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GitHubIssueService } from '../../hive_brain/hive_one/GitHubIssueService';

const gitHubService = new GitHubIssueService(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);

export default function IssuesScreen() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editIssue, setEditIssue] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editLabels, setEditLabels] = useState<string>('');
  const [editStatus, setEditStatus] = useState<"open" | "closed">("open");
  const [projectStatus, setProjectStatus] = useState<"Backlog" | "Ready" | "In Progress" | "In Review">("Backlog");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(issues.length / PAGE_SIZE);

  const fetchIssues = async () => {
    setLoading(true);
    const data = await gitHubService.listarIssues();
    setIssues(data);
    setLoading(false);
    setPage(1); // Sempre volta para a primeira página ao atualizar
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const openEditModal = (issue: any) => {
    setEditIssue(issue);
    setEditTitle(issue.title);
    setEditBody(issue.body || '');
    setEditLabels(issue.labels
      .filter((l: any) => !["Backlog", "Ready", "In Progress", "In Review"].includes(l.name))
      .map((l: any) => l.name)
      .join(','));
    setEditStatus(issue.state === "closed" ? "closed" : "open");
    // Detecta status do projeto pela label
    const statusLabel = issue.labels.find((l: any) =>
      ["Backlog", "Ready", "In Progress", "In Review"].includes(l.name)
    );
    setProjectStatus(
      statusLabel ? (statusLabel.name as "Backlog" | "Ready" | "In Progress" | "In Review") : "Backlog"
    );
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!editIssue) {
      return;
    }
    // Remove status antigo e adiciona o novo
    const labelsArray = editLabels
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !["Backlog", "Ready", "In Progress", "In Review"].includes(l));
    labelsArray.push(projectStatus);
    await gitHubService.editarIssue(editIssue.number, editTitle, editBody, labelsArray, editStatus);
    setEditModalVisible(false);
    setEditIssue(null);
    await fetchIssues();
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const paginatedIssues = issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#facc15" />
      ) : (
        <>
          {paginatedIssues.map(issue => (
            <View key={issue.id} style={styles.issueCard}>
              <Text style={styles.issueTitle}>#{issue.number} - {issue.title}</Text>
              <Text style={styles.issueBody}>{issue.body}</Text>
              <View style={styles.labelsRow}>
                {issue.labels.map((label: any) => (
                  <Text key={label.id} style={[styles.label, { backgroundColor: `#${label.color}` }]}>
                    {label.name}
                  </Text>
                ))}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEditModal(issue)}
              >
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              onPress={handlePrevPage}
              disabled={page === 1}
            >
              <Text style={styles.pageBtnText}>Anterior</Text>
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>
              Página {page} de {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
              onPress={handleNextPage}
              disabled={page === totalPages}
            >
              <Text style={styles.pageBtnText}>Próxima</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
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
              <TouchableOpacity style={styles.saveBtn} onPress={handleEditSave}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0f172a', alignItems: 'center' },
  issueCard: { backgroundColor: '#1f2937', borderRadius: 10, padding: 8, marginBottom: 8, width: '100%' },
  issueTitle: { fontSize: 15, color: '#50fa7b', fontWeight: 'bold', marginBottom: 4 },
  issueBody: { fontSize: 12, color: '#e2e8f0', marginBottom: 4 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  label: { color: '#0f172a', fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8, marginBottom: 4, fontSize: 12 },
  editBtn: { marginTop: 8, backgroundColor: '#facc15', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, alignSelf: 'flex-end' },
  editBtnText: { color: '#0f172a', fontWeight: 'bold' },
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
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 12 },
  pageBtn: { backgroundColor: '#facc15', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16, marginHorizontal: 8 },
  pageBtnDisabled: { backgroundColor: '#888' },
  pageBtnText: { color: '#0f172a', fontWeight: 'bold' },
  pageIndicator: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  projectStatusBtn: { flex: 1, backgroundColor: '#222', borderRadius: 8, paddingVertical: 8, marginHorizontal: 4, alignItems: 'center' },
  projectStatusBtnActive: { backgroundColor: '#facc15' },
  projectStatusBtnText: { color: '#fff', fontWeight: 'bold' },
  projectStatusBtnTextActive: { color: '#0f172a', fontWeight: 'bold' },
});