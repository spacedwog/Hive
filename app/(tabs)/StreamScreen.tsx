// eslint-disable-next-line import/no-unresolved
import { VERCEL_URL } from "@env";
import { Camera, CameraView } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import ErrorModal from "../../hive_body/hive_modal/ErrorModal.tsx";
import LogModal, { LogEntry } from "../../hive_body/hive_modal/LogModal.tsx";
import StatusModal from "../../hive_body/hive_modal/StatusModal.tsx";
import VercelModal from "../../hive_body/hive_modal/VercelModal.tsx";

import LogService from "../../hive_brain/hive_one/LogService.ts";
import Esp32Service, { ErrorLog, Esp32Status } from "../../hive_brain/hive_stream/Esp32Service.ts";

export default function StreamScreen() {
  const [logService] = useState(() => LogService.getInstance());
  const [esp32Service] = useState(() => new Esp32Service());
  const [status, setStatus] = useState<Esp32Status>({ ...esp32Service.status });
  const [mode, setMode] = useState<"Soft-AP" | "STA">(esp32Service.mode);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  
  // Estados de conectividade
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [vercelModalVisible, setVercelModalVisible] = useState(false);
  const [vercelStatus, setVercelStatus] = useState<any>(null);

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  // Configura callbacks para capturar erros do ESP32Service
  useEffect(() => {
    esp32Service.onError((error: ErrorLog) => {
      setErrorLogs(esp32Service.getErrorHistory());
    });
  }, [esp32Service]);

  // Subscreve ao LogService para atualizar logs em tempo real
  useEffect(() => {
    const updateLogs = () => {
      setSystemLogs(logService.getLogs());
    };
    
    logService.subscribe(updateLogs);
    updateLogs(); // Carrega logs iniciais
    
    logService.info("StreamScreen iniciado");
    
    return () => {
      logService.unsubscribe(updateLogs);
    };
  }, [logService]);

  // Função para exibir erros com modal
  const showError = (err: any, isUserAction = false, forceModal = false) => {
    let msg = "";
    if (typeof err === "string") {
      msg = err;
    } else if (err instanceof Error) {
      msg = err.message;
    } else {
      try { msg = JSON.stringify(err, null, 2); } catch { msg = String(err); }
    }
    
    // Mostra modal se:
    // 1. For ação do usuário OU
    // 2. forceModal = true (erros críticos)
    if (isUserAction || forceModal) {
      setErrorMessage(msg);
      setErrorModalVisible(true);
      logService.error("Erro crítico", msg);
    } else {
      logService.warn("Erro em background", msg);
    }
  };

  // Função para mostrar o modal de erros com histórico
  const showErrorHistory = () => {
    setErrorLogs(esp32Service.getErrorHistory());
    setErrorModalVisible(true);
  };

  // Função para limpar histórico de erros
  const clearErrorHistory = () => {
    esp32Service.clearErrorHistory();
    setErrorLogs([]);
  };

  // Solicita permissão para câmera
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        const granted = status === "granted";
        setHasPermission(granted);
        
        if (!granted) {
          logService.error("Permissão de câmera negada");
          showError(
            "Permissão de câmera negada. O app precisa de acesso à câmera para funcionar corretamente.",
            false,
            true // forceModal = true (erro crítico)
          );
        } else {
          logService.success("Permissão de câmera concedida");
        }
      } catch (error) {
        logService.error("Erro ao solicitar permissão de câmera", String(error));
        showError(
          "Erro ao solicitar permissão de câmera: " + String(error),
          false,
          true // forceModal = true (erro crítico)
        );
      }
    })();
  }, []);

  // Toggle LED
  const toggleLed = async () => {
    logService.info("Alternando LED...");
    try {
      await esp32Service.toggleLed();
      const newStatus = await esp32Service.fetchStatus();
      setStatus({ ...newStatus });
      setIsConnected(true);
      setConsecutiveErrors(0);
      logService.success("LED alternado com sucesso");
    } catch (error) {
      showError(error, true); // true = ação do usuário
      setIsConnected(false);
    }
  };

  // Troca modo Soft-AP <-> STA
  const switchMode = async () => {
    logService.info(`Trocando para modo ${esp32Service.mode === 'STA' ? 'Soft-AP' : 'STA'}...`);
    try {
      esp32Service.switchMode();
      setMode(esp32Service.mode);
      setStatus({ ...esp32Service.status });
      setIsConnecting(true);
      setConsecutiveErrors(0);
      logService.success(`Modo alterado para ${esp32Service.mode}`);
      
      // Tenta reconectar imediatamente no novo modo
      try {
        const newStatus = await esp32Service.fetchStatus();
        setStatus({ ...newStatus });
        setIsConnected(true);
        setIsConnecting(false);
        logService.success("Conectado no novo modo");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logService.warn("Não foi possível conectar no novo modo ainda", errorMsg);
        setIsConnecting(false);
        
        // Mostra modal se o erro persistir por mais de 10 segundos
        setTimeout(() => {
          if (!isConnected) {
            showError(
              `⚠️ Não foi possível conectar no modo ${esp32Service.mode}.\n\n` +
              `Erro: ${errorMsg}\n\n` +
              `💡 Tente:\n` +
              `• Aguardar alguns segundos\n` +
              `• Trocar novamente de modo\n` +
              `• Verificar o IP: ${esp32Service.mode === 'STA' ? status.ip_sta : status.ip_ap}`,
              false,
              true // forceModal = true
            );
          }
        }, 10000);
      }
    } catch (error) {
      showError(error, true);
    }
  };

  // GET status do Vercel (somente para modal)
  const fetchStatusFromVercel = async () => {
    logService.info("Buscando status do Vercel...");
    try {
      const response = await fetch(`${VERCEL_URL}/api/status?info=server`, {
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        throw new Error(
          `Erro HTTP ${response.status}: ${response.statusText}\n\n` +
          `Não foi possível obter status do Vercel.\n` +
          `Verifique se a API está disponível.`
        );
      }
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          "Resposta inválida do Vercel\n\n" +
          "A API retornou conteúdo que não é JSON válido.\n\n" +
          `Preview: ${text.substring(0, 100)}...`
        );
      }
      setVercelStatus(result);
      setVercelModalVisible(true);
      logService.success("Status Vercel obtido", JSON.stringify(result));
    } catch (err) {
      showError(err, true); // true = ação do usuário
    }
  };

  // POST dados/foto para Vercel
  const sendDataToVercel = useCallback(
    async (photoBase64?: string) => {
      logService.info("Enviando dados para Vercel...");
      try {
        const payload = { status, image: photoBase64 || null };
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error(
            `❌ Erro ao enviar dados para Vercel\n\n` +
            `HTTP ${response.status}: ${response.statusText}\n\n` +
            `Verifique a conexão com a API Vercel.`
          );
        }
        
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(
            "Resposta inválida do Vercel\n\n" +
            "A API retornou conteúdo que não é JSON válido.\n\n" +
            `Preview: ${text.substring(0, 100)}...`
          );
        }
        if (result.success) {
          logService.success("Dados enviados para Vercel", JSON.stringify(result.logData));
        } else {
          throw new Error(
            result.message || 
            "Erro desconhecido ao enviar dados.\n\nA API retornou success: false sem mensagem de erro."
          );
        }
      } catch (err) {
        showError(err, true); // true = ação do usuário
      }
    },
    [status, VERCEL_API_URL]
  );

  // Captura e envia foto
  const captureAndUploadPhoto = async () => {
    if (!cameraRef.current) {
      const errorMsg = "Câmera não está pronta. Aguarde a inicialização da câmera.";
      logService.error(errorMsg);
      showError(errorMsg, true, true); // forceModal = true
      return;
    }
    
    if (hasPermission === false) {
      const errorMsg = "Permissão de câmera negada. Não é possível tirar fotos.";
      logService.error(errorMsg);
      showError(errorMsg, true, true); // forceModal = true
      return;
    }
    
    logService.info("Capturando foto...");
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
        exif: false,
        skipProcessing: true,
      });
      setCapturedPhoto(photo.uri);
      logService.success("Foto capturada", photo.uri);
      await sendDataToVercel(photo.base64);
    } catch (err) {
      showError(err, true); // true = ação do usuário
    }
  };

  // Polling inteligente com backoff exponencial
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isActive = true;
    
    const fetchStatusWithBackoff = async () => {
      if (!isActive || isFetchingStatus) return;
      
      setIsFetchingStatus(true);
      
      try {
        const newStatus = await esp32Service.fetchStatus();
        setStatus({ ...newStatus });
        setIsConnected(true);
        setIsConnecting(false);
        setConsecutiveErrors(0);
        
        // Sucesso: polling normal (2s)
        if (isActive) {
          interval = setTimeout(fetchStatusWithBackoff, 2000);
        }
      } catch (err) {
        setIsConnected(false);
        const newErrorCount = consecutiveErrors + 1;
        setConsecutiveErrors(newErrorCount);
        
        const errorMsg = err instanceof Error ? err.message : String(err);
        logService.warn(`Erro no polling automático (${newErrorCount}x)`, errorMsg);
        
        // Backoff exponencial: 5s, 10s, 20s, 30s (máximo)
        const backoffDelay = Math.min(5000 * Math.pow(2, consecutiveErrors), 30000);
        
        if (newErrorCount >= 3) {
          logService.warn(`Múltiplas falhas consecutivas. Pausando polling por ${backoffDelay/1000}s`);
        }
        
        // ERRO CRÍTICO: Mostra modal após 5 falhas consecutivas
        if (newErrorCount === 5) {
          logService.error("Erro crítico: ESP32 não responde após 5 tentativas");
          showError(
            `❌ ESP32 não responde após ${newErrorCount} tentativas consecutivas.\n\n` +
            `💡 Sugestões:\n` +
            `• Verifique se o ESP32 está ligado\n` +
            `• Confirme a conexão Wi-Fi\n` +
            `• Tente trocar de modo (STA ↔ Soft-AP)\n` +
            `• Verifique o IP no arquivo .env\n\n` +
            `IP atual: ${mode === 'STA' ? status.ip_sta : status.ip_ap}`,
            false,
            true // forceModal = true (erro crítico)
          );
        }
        
        if (isActive) {
          interval = setTimeout(fetchStatusWithBackoff, backoffDelay);
        }
      } finally {
        setIsFetchingStatus(false);
      }
    };
    
    // Inicia polling
    fetchStatusWithBackoff();
    
    return () => {
      isActive = false;
      if (interval) clearTimeout(interval);
    };
  }, [esp32Service, consecutiveErrors, isFetchingStatus]);

  return (
    <View style={styles.container}>
      <Text style={[styles.connectionText, {
        color: isConnected ? "#0af" : isConnecting ? "#facc15" : "#ff6666"
      }]}>
        {isConnecting ? (
          `🔄 Conectando... (${mode})`
        ) : isConnected ? (
          `✅ Conectado (${mode}: ${mode === "STA" ? status.ip_sta : status.ip_ap})`
        ) : consecutiveErrors > 0 ? (
          `❌ Desconectado - ${consecutiveErrors} tentativas falharam`
        ) : (
          "⏳ Iniciando..."
        )}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        {/* Status ESP32-CAM */}
        <Text style={[styles.text, { marginTop: 20 }]}>📷 Status ESP32-CAM:</Text>
        <View style={[styles.dataBox, { alignSelf: "center" }]}>
          <Text style={styles.overlayText}>
            LED Built-in:{" "}
            <Text style={{ color: status.led_builtin === "on" ? "lightgreen" : "red" }}>
              {status.led_builtin.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>
            LED Opposite:{" "}
            <Text style={{ color: status.led_opposite === "on" ? "lightgreen" : "red" }}>
              {status.led_opposite.toUpperCase()}
            </Text>
          </Text>
          <Text style={styles.overlayText}>
            IP AP: {status.ip_ap}
          </Text>
                    <Text style={styles.overlayText}>
            IP STA: {status.ip_sta}
          </Text>
          <Text style={styles.overlayText}>
            🔊 Nível de Som: {status.sound_level}
          </Text>
          <Text style={styles.overlayText}>
            ⏲️ Auto-off: {status.auto_off_ms}ms
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title={status.led_builtin === "on" ? "Desligar LED" : "Ligar LED"}
              onPress={toggleLed}
            />
            <Button
              title={`Modo: ${mode === "Soft-AP" ? "STA" : "Soft-AP"}`}
              onPress={switchMode}
              color="#facc15"
            />
          </View>
          <Button
            title="🛜 ESP32-CAM(Data)"
            onPress={() => setStatusModalVisible(true)}
            color="#0af"
          />
          <Button
            title="❤️‍🔥 API(Infra-estrutura)"
            onPress={fetchStatusFromVercel}
            color="#ff9900"
          />
          <View style={{ marginTop: 10 }}>
            <Button
              title={`📝 Ver Erros (${errorLogs.length})`}
              onPress={showErrorHistory}
              color={errorLogs.length > 0 ? "#ff6666" : "#666"}
            />
          </View>
          <View style={{ marginTop: 10 }}>
            <Button
              title={`📋 Ver Logs (${systemLogs.length})`}
              onPress={() => setLogModalVisible(true)}
              color="#0af"
            />
          </View>
        </View>

        {/* Câmera iOS */}
        <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera iOS:</Text>
        <View style={styles.nativeCamera}>
          {hasPermission ? (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={type} />
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 5 }}>
                <Button
                  title="🔄 Trocar câmera"
                  onPress={() => setType(type === "back" ? "front" : "back")}
                  color="#0af"
                />
              </View>
              <Button
                title="📸 Tirar Foto"
                onPress={captureAndUploadPhoto}
                color="#4caf50"
              />
              {capturedPhoto && (
                <Image source={{ uri: capturedPhoto }} style={{ width: "100%", height: 240, marginTop: 10 }} />
              )}
            </>
          ) : (
            <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
          )}
        </View>
      </ScrollView>

      <ErrorModal
        visible={errorModalVisible}
        errorMessage={errorMessage}
        errorLogs={errorLogs}
        errorStats={esp32Service.getErrorStats()}
        onClose={() => setErrorModalVisible(false)}
        onClearHistory={clearErrorHistory}
      />
      <StatusModal
        visible={statusModalVisible}
        status={status}
        onClose={() => setStatusModalVisible(false)}
      />
      <VercelModal
        visible={vercelModalVisible}
        vercelStatus={vercelStatus}
        onClose={() => setVercelModalVisible(false)}
      />
      <LogModal
        visible={logModalVisible}
        logs={systemLogs}
        onClose={() => setLogModalVisible(false)}
        onClearLogs={() => {
          logService.clearLogs();
          setSystemLogs([]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 42, backgroundColor: "#121212", alignItems: "center", justifyContent: "flex-start"},
  connectionText: { fontSize: 16, fontWeight: "bold", color: "#0af", marginBottom: 10, textAlign: "center" },
  text: { fontSize: 16, color: "#fff", marginVertical: 5, textAlign: "center" },
  dataBox: { width: "90%", maxWidth: 400, padding: 10, backgroundColor: "#222", borderRadius: 8, marginBottom: 15 },
  nativeCamera: { width: 320, height: 350, borderWidth: 2, borderColor: "#0f0", borderRadius: 10, overflow: "hidden", marginTop: 10, backgroundColor: "black", padding: 5 },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  modalBackground: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalBox: { width: "85%", backgroundColor: "#1e1e1e", borderRadius: 10, padding: 20, shadowColor: "#000", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0af", marginBottom: 10 },
  modalText: { color: "#fff", fontSize: 14 },
  modalButton: { marginTop: 15, backgroundColor: "#0af", padding: 10, borderRadius: 8, alignItems: "center" },
});
