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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<"front" | "back">("back");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [vercelModalVisible, setVercelModalVisible] = useState(false);
  const [vercelStatus, setVercelStatus] = useState<any>(null);

  const cameraRef = useRef<CameraView>(null);
  const VERCEL_API_URL = `${VERCEL_URL}/api/esp32-camera`;

  useEffect(() => {
    esp32Service.onError(() => {
      setErrorLogs(esp32Service.getErrorHistory());
    });
  }, [esp32Service]);

  useEffect(() => {
    const updateLogs = () => {
      setSystemLogs(logService.getLogs());
    };
    logService.subscribe(updateLogs);
    updateLogs();
    logService.info("StreamScreen iniciado");
    return () => logService.unsubscribe(updateLogs);
  }, [logService]);

  const showError = (err: any, isUserAction = false, forceModal = false) => {
    let msg = "";
    if (typeof err === "string") msg = err;
    else if (err instanceof Error) msg = err.message;
    else try { msg = JSON.stringify(err, null, 2); } catch { msg = String(err); }
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

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        const granted = status === "granted";
        setHasPermission(granted);
        if (!granted) {
          logService.error("Permissão de câmera negada");
          showError("Permissão de câmera negada. O app precisa de acesso à câmera.", false, true);
        } else {
          logService.success("Permissão de câmera concedida");
        }
      } catch (error) {
        logService.error("Erro ao solicitar permissão de câmera", String(error));
        showError("Erro ao solicitar permissão de câmera: " + String(error), false, true);
      }
    })();
  }, []);

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

  const fetchStatusFromVercel = async () => {
    logService.info("Buscando status do Vercel...");
    try {
      const response = await fetch(`${VERCEL_URL}/api/status?info=server`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      setVercelStatus(result);
      setVercelModalVisible(true);
      logService.success("Status Vercel obtido", JSON.stringify(result));
    } catch (err) {
      showError(err, true);
    }
  };

  const sendDataToVercel = useCallback(async (photoBase64?: string) => {
    logService.info("Enviando dados para Vercel...");
    try {
      const payload = { status, image: photoBase64 || null };
      const response = await fetch(VERCEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(`Erro ao enviar dados para Vercel: ${response.statusText}`);
      const result = await response.json();
      if (result.success) {
        logService.success("Dados enviados para Vercel", JSON.stringify(result.logData));
      } else {
        throw new Error(result.message || "Erro desconhecido ao enviar dados.");
      }
    } catch (err) {
      showError(err, true);
    }
  }, [status, VERCEL_API_URL]);

  const captureAndUploadPhoto = async () => {
    if (!cameraRef.current) {
      const msg = "Câmera não está pronta.";
      logService.error(msg);
      showError(msg, true, true);
      return;
    }
    if (hasPermission === false) {
      const msg = "Permissão de câmera negada.";
      logService.error(msg);
      showError(msg, true, true);
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
        if (isActive) interval = setTimeout(fetchStatusWithBackoff, 2000);
      } catch (err) {
        setIsConnected(false);
        const newCount = consecutiveErrors + 1;
        setConsecutiveErrors(newCount);
        const delay = Math.min(5000 * Math.pow(2, newCount), 30000);
        if (newCount === 5) {
          showError("ESP32 não responde após 5 tentativas.", false, true);
        }
        if (isActive) interval = setTimeout(fetchStatusWithBackoff, delay);
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
        {isConnecting
          ? "🔄 Conectando..."
          : isConnected
          ? "✅ Conectado ao ESP32"
          : "❌ Desconectado"}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%" }}>
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
          <Text style={styles.overlayText}>🔊 Nível de Som: {status.sound_level}</Text>
          <Text style={styles.overlayText}>⏲️ Auto-off: {status.auto_off_ms}ms</Text>

          <Button title={status.led_builtin === "on" ? "Desligar LED" : "Ligar LED"} onPress={toggleLed} />
          <Button title="🛜 ESP32-CAM(Data)" onPress={() => setStatusModalVisible(true)} color="#0af" />
          <Button title="❤️‍🔥 API(Infra-estrutura)" onPress={fetchStatusFromVercel} color="#ff9900" />
          <Button title={`📝 Ver Erros (${errorLogs.length})`} onPress={showErrorHistory} color={errorLogs.length > 0 ? "#ff6666" : "#666"} />
          <Button title={`📋 Ver Logs (${systemLogs.length})`} onPress={() => setLogModalVisible(true)} color="#0af" />
        </View>

        <Text style={[styles.text, { marginTop: 20 }]}>📱 Câmera iOS:</Text>
        <View style={styles.nativeCamera}>
          {hasPermission ? (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={type} />
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 5 }}>
                <Button title="🔄 Trocar câmera" onPress={() => setType(type === "back" ? "front" : "back")} color="#0af" />
              </View>
              <Button title="📸 Tirar Foto" onPress={captureAndUploadPhoto} color="#4caf50" />
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
      <StatusModal visible={statusModalVisible} status={status} onClose={() => setStatusModalVisible(false)} />
      <VercelModal visible={vercelModalVisible} vercelStatus={vercelStatus} onClose={() => setVercelModalVisible(false)} />
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
});