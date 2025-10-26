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

    if (isUserAction || forceModal) {
      setErrorMessage(msg);
      setErrorModalVisible(true);
      logService.error("Erro crítico", msg);
    } else {
      logService.warn("Erro em background", msg);
    }
  };

  const showErrorHistory = () => {
    setErrorLogs(esp32Service.getErrorHistory());
    setErrorModalVisible(true);
  };

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
            true
          );
        } else {
          logService.success("Permissão de câmera concedida");
        }
      } catch (error) {
        logService.error("Erro ao solicitar permissão de câmera", String(error));
        showError(
          "Erro ao solicitar permissão de câmera: " + String(error),
          false,
          true
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
      showError(error, true);
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
    } catch (error) {
      showError(error, true);
    }
  };

  // Fallback automático: tenta ESP32 e depois Vercel
  const safeFetchStatus = async () => {
    try {
      const newStatus = await esp32Service.fetchStatus();
      setStatus({ ...newStatus });
      setIsConnected(true);
      setIsConnecting(false);
      setConsecutiveErrors(0);
      logService.success("Status obtido do ESP32 local");
      return newStatus;
    } catch (err) {
      const newErrorCount = consecutiveErrors + 1;
      setConsecutiveErrors(newErrorCount);
      logService.warn(`Falha ao obter status do ESP32 (${newErrorCount}x)`, String(err));

      // Após 3 falhas, ativa fallback Vercel
      if (newErrorCount >= 3) {
        logService.info("Tentando fallback via API Vercel...");
        try {
          const response = await fetch(`${VERCEL_URL}/api/status?info=fallback`, {
            headers: { "Content-Type": "application/json" },
          });
          if (!response.ok) throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);

          const result = await response.json();
          setVercelStatus(result);
          setIsConnected(true);
          setIsConnecting(false);
          logService.success("Fallback ativo via API Vercel", JSON.stringify(result));
          return result;
        } catch (fallbackError) {
          logService.error("Falha também no fallback da Vercel", String(fallbackError));
          setIsConnected(false);
          throw fallbackError;
        }
      } else {
        setIsConnected(false);
        throw err;
      }
    }
  };

  // POST dados/foto com fallback
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

        if (!response.ok) throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();
        if (result.success) {
          logService.success("Dados enviados para Vercel", JSON.stringify(result.logData));
        } else {
          throw new Error(result.message || "Erro desconhecido no envio");
        }
      } catch (err) {
        logService.warn("Erro no envio direto, tentando fallback...");
        try {
          await fetch(`${VERCEL_URL}/api/fallback/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, image: photoBase64 }),
          });
          logService.success("Fallback de upload realizado via Vercel");
        } catch (fallbackErr) {
          showError(fallbackErr, true);
        }
      }
    },
    [status, VERCEL_API_URL]
  );

  // Captura e envia foto
  const captureAndUploadPhoto = async () => {
    if (!cameraRef.current) {
      const errorMsg = "Câmera não está pronta. Aguarde a inicialização da câmera.";
      logService.error(errorMsg);
      showError(errorMsg, true, true);
      return;
    }

    if (hasPermission === false) {
      const errorMsg = "Permissão de câmera negada. Não é possível tirar fotos.";
      logService.error(errorMsg);
      showError(errorMsg, true, true);
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
      showError(err, true);
    }
  };

  // Polling inteligente com fallback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isActive = true;

    const fetchStatusWithBackoff = async () => {
      if (!isActive || isFetchingStatus) return;
      setIsFetchingStatus(true);

      try {
        await safeFetchStatus();
        if (isActive) interval = setTimeout(fetchStatusWithBackoff, 2000);
      } catch (err) {
        const newErrorCount = consecutiveErrors + 1;
        setConsecutiveErrors(newErrorCount);
        const backoffDelay = Math.min(5000 * Math.pow(2, newErrorCount), 30000);
        if (isActive) interval = setTimeout(fetchStatusWithBackoff, backoffDelay);
      } finally {
        setIsFetchingStatus(false);
      }
    };

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
          `✅ Conectado (${mode === "STA" ? status.ip_sta : status.ip_ap || "Vercel"})`
        ) : (
          `❌ Desconectado`
        )}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
        <Text style={[styles.text, { marginTop: 20 }]}>📷 Status ESP32-CAM:</Text>
        <View style={[styles.dataBox, { alignSelf: "center" }]}>
          <Text style={styles.overlayText}>LED Built-in: {status.led_builtin}</Text>
          <Text style={styles.overlayText}>LED Opposite: {status.led_opposite}</Text>
          <Text style={styles.overlayText}>IP AP: {status.ip_ap}</Text>
          <Text style={styles.overlayText}>IP STA: {status.ip_sta}</Text>
          <Text style={styles.overlayText}>🔊 Nível de Som: {status.sound_level}</Text>
          <Text style={styles.overlayText}>⏲️ Auto-off: {status.auto_off_ms}ms</Text>

          <View style={styles.buttonRow}>
            <Button title="Alternar LED" onPress={toggleLed} />
            <Button title={`Modo: ${mode === "Soft-AP" ? "STA" : "Soft-AP"}`} onPress={switchMode} color="#facc15" />
          </View>

          <Button title="🛜 ESP32-CAM(Data)" onPress={() => setStatusModalVisible(true)} color="#0af" />
          <Button title="❤️‍🔥 API(Infra-estrutura)" onPress={() => setVercelModalVisible(true)} color="#ff9900" />
          <View style={{ marginTop: 10 }}>
            <Button title={`📝 Erros (${errorLogs.length})`} onPress={showErrorHistory} color="#ff6666" />
          </View>
          <View style={{ marginTop: 10 }}>
            <Button title={`📋 Logs (${systemLogs.length})`} onPress={() => setLogModalVisible(true)} color="#0af" />
          </View>
        </View>

        <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera iOS:</Text>
        <View style={styles.nativeCamera}>
          {hasPermission ? (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={type} />
              <Button title="🔄 Trocar câmera" onPress={() => setType(type === "back" ? "front" : "back")} color="#0af" />
              <Button title="📸 Tirar Foto" onPress={captureAndUploadPhoto} color="#4caf50" />
              {capturedPhoto && <Image source={{ uri: capturedPhoto }} style={{ width: "100%", height: 240, marginTop: 10 }} />}
            </>
          ) : (
            <Text style={{ color: "red" }}>Permissão para câmera negada</Text>
          )}
        </View>
      </ScrollView>

      <ErrorModal visible={errorModalVisible} errorMessage={errorMessage} errorLogs={errorLogs} onClose={() => setErrorModalVisible(false)} onClearHistory={clearErrorHistory} />
      <StatusModal visible={statusModalVisible} status={status} onClose={() => setStatusModalVisible(false)} />
      <VercelModal visible={vercelModalVisible} vercelStatus={vercelStatus} onClose={() => setVercelModalVisible(false)} />
      <LogModal visible={logModalVisible} logs={systemLogs} onClose={() => setLogModalVisible(false)} onClearLogs={() => { logService.clearLogs(); setSystemLogs([]); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 42, backgroundColor: "#121212", alignItems: "center", justifyContent: "flex-start" },
  connectionText: { fontSize: 16, fontWeight: "bold", color: "#0af", marginBottom: 10, textAlign: "center" },
  text: { fontSize: 16, color: "#fff", marginVertical: 5, textAlign: "center" },
  dataBox: { width: "90%", maxWidth: 400, padding: 10, backgroundColor: "#222", borderRadius: 8, marginBottom: 15 },
  nativeCamera: { width: 320, height: 350, borderWidth: 2, borderColor: "#0f0", borderRadius: 10, overflow: "hidden", marginTop: 10, backgroundColor: "black", padding: 5 },
  overlayText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  buttonRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
});