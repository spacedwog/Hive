// eslint-disable-next-line import/no-unresolved
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from '@env';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GitHubIssueService } from '../../hive_brain/hive_one/GitHubIssueService';

const gitHubService = new GitHubIssueService(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);

export default function IssuesScreen() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      const data = await gitHubService.listarIssues();
      setIssues(data);
      setLoading(false);
    };
    fetchIssues();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Minhas Issues do GitHub</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#facc15" />
      ) : (
        issues.map(issue => (
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
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0f172a', alignItems: 'center' },
  title: { fontSize: 24, color: '#facc15', fontWeight: 'bold', marginBottom: 20 },
  issueCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%' },
  issueTitle: { fontSize: 18, color: '#50fa7b', fontWeight: 'bold', marginBottom: 8 },
  issueBody: { fontSize: 14, color: '#e2e8f0', marginBottom: 8 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  label: { color: '#0f172a', fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8, marginBottom: 4, fontSize: 12 },
});