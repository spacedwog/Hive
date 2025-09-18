import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize?client_id=Ov23lipnSCTehxkZTzx5';

type LoginScreenProps = {
  onLogin?: (code: string) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [showWebView, setShowWebView] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const handleLogin = () => {
    setAuthUrl(GITHUB_AUTH_URL);
    setShowWebView(true);
  };

  // Simulação de captura do código de acesso via redirect
  const handleWebViewNavigationStateChange = (navState: any) => {
    if (navState.url.includes('code=')) {
      const code = navState.url.split('code=')[1].split('&')[0];
      setAccessCode(code);
      setShowWebView(false);
      onLogin && onLogin(code);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Entrar com GitHub</Text>
      </TouchableOpacity>
      {accessCode ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>Código de acesso: {accessCode}</Text>
        </View>
      ) : null}
      <Modal visible={showWebView} animationType="slide">
        <WebView
          source={{ uri: authUrl }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowWebView(false)}>
          <Text style={styles.btnText}>Fechar</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 28, color: '#facc15', fontWeight: 'bold', marginBottom: 20 },
  btn: { backgroundColor: '#222', padding: 16, borderRadius: 8, marginVertical: 8 },
  btnText: { color: '#facc15', fontWeight: 'bold' },
  codeBox: { marginTop: 24, backgroundColor: '#1f2937', padding: 12, borderRadius: 8 },
  codeText: { color: '#50fa7b', fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 40, right: 20, backgroundColor: '#222', padding: 10, borderRadius: 8 },
});