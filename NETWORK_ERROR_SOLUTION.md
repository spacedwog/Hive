# 🔧 Solução de Erros "Network Request Failed"

**Data:** 16 de outubro de 2025  
**Status:** ✅ IMPLEMENTADO

## 🎯 Problema Identificado

O erro "Network request failed" ocorre quando o app React Native não consegue estabelecer conexão HTTP com o ESP32-CAM. Este é um problema comum em aplicações que se comunicam com dispositivos IoT.

## ✅ Soluções Implementadas

### 1. **Validação e Formatação de URL**

#### ✨ Novo método `getFormattedURL()`
```typescript
private getFormattedURL(path: string): string {
  const ip = this.getCurrentIP();
  
  // Valida se o IP está definido e não é "desconectado"
  if (!ip || ip === "desconectado" || ip === "0.0.0.0") {
    throw new Error(`IP inválido ou não conectado: ${ip}`);
  }
  
  // Remove barras extras e adiciona protocolo HTTP
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const cleanIP = ip.replace(/^http:\/\//, '').replace(/\/$/, '');
  
  return `http://${cleanIP}/${cleanPath}`;
}
```

**Benefícios:**
- ✅ Adiciona protocolo `http://` automaticamente
- ✅ Valida IP antes de fazer request
- ✅ Remove barras duplicadas
- ✅ Detecta IPs inválidos antecipadamente

### 2. **Troca Automática de Modo (STA ↔ Soft-AP)**

#### 🔄 Lógica Inteligente de Fallback
Quando um request falha no modo STA, o sistema:
1. Detecta o erro de rede
2. Troca automaticamente para modo Soft-AP
3. Tenta novamente a requisição
4. Se falhar, retorna ao modo original

```typescript
// No método request()
if (this.mode === "STA") {
  console.log(`🔄 Tentando modo Soft-AP automaticamente...`);
  this.switchMode();
  try {
    url = this.getFormattedURL(path);
  } catch {
    throw new Error(`Nenhum IP válido disponível...`);
  }
}
```

### 3. **Diagnóstico Detalhado de Erros**

#### 🔍 Categorização Aprimorada
```typescript
let errorType: ErrorLog['type'] = 'unknown';
if (errorMessage.includes('Network request failed') || 
    errorMessage.includes('Failed to fetch')) {
  errorType = 'network';
} else if (errorMessage.includes('aborted') || 
           errorMessage.includes('timeout')) {
  errorType = 'timeout';
} else if (errorMessage.includes('HTTP')) {
  errorType = 'http';
}
```

#### 📊 Mensagens de Diagnóstico Contextuais
```
🔴 ERRO DE REDE DETECTADO:
   ✓ Verifique se o ESP32 está ligado
   ✓ Confirme que o dispositivo está na mesma rede Wi-Fi
   ✓ IP configurado: 192.168.1.100
   ✓ Modo atual: STA

💡 SUGESTÕES:
   → Tente trocar para modo Soft-AP
   → IP Soft-AP: 192.168.4.1
```

### 4. **Validação Preventiva de IP**

#### 🛡️ Checagem no `testConnectivity()`
```typescript
// Valida IP antes de tentar conectar
if (!currentIP || currentIP === "desconectado" || currentIP === "0.0.0.0") {
  console.error(`❌ IP inválido para teste de conectividade: ${currentIP}`);
  return false;
}
```

### 5. **Tentativa Automática em `tryReconnectOnce()`**

Quando a reconexão imediata falha:
1. Identifica erro de rede
2. Troca automaticamente para outro modo
3. Tenta novamente
4. Volta ao modo original se falhar

```typescript
// Tenta automaticamente o outro modo
const otherMode = this.mode === "STA" ? "Soft-AP" : "STA";
console.error(`   🔄 Tentando modo ${otherMode} automaticamente...`);
this.switchMode();

try {
  return await this.request(path, {}, 10000);
} catch (retryErr) {
  // Volta ao modo original se falhar
  this.switchMode();
  throw retryErr;
}
```

## 🔧 Checklist de Resolução

Quando encontrar "Network request failed", siga estas etapas:

### 1️⃣ Verificações Básicas
- [ ] ESP32 está ligado e com LED aceso
- [ ] ESP32 está conectado à rede Wi-Fi (LED Wi-Fi piscando)
- [ ] Dispositivo móvel está na mesma rede Wi-Fi

### 2️⃣ Validação de IP
- [ ] Verificar IP no arquivo `.env`:
  ```
  ESP32_STA_IP=http://192.168.1.100
  ESP32_SOFTAP_IP=http://192.168.4.1
  ```
- [ ] IP STA corresponde ao IP do ESP32 na rede
- [ ] IP Soft-AP é o padrão (192.168.4.1)

### 3️⃣ Teste de Conectividade
```bash
# No terminal do computador/dispositivo
ping 192.168.1.100
curl http://192.168.1.100/status
```

### 4️⃣ Usar o App
- [ ] Abrir StreamScreen
- [ ] Observar logs no console
- [ ] Se falhar no modo STA, o app tenta Soft-AP automaticamente
- [ ] Usar botão "Modo: STA/Soft-AP" para trocar manualmente

## 🎛️ Modos de Conexão

### 📡 Modo STA (Station)
- **IP:** Atribuído pelo roteador (ex: 192.168.1.100)
- **Vantagem:** Acesso à internet
- **Desvantagem:** Precisa estar na mesma rede

### 📶 Modo Soft-AP (Access Point)
- **IP:** Fixo 192.168.4.1
- **Vantagem:** Conexão direta, mais confiável
- **Desvantagem:** Sem acesso à internet

## 📈 Logs de Diagnóstico

### ✅ Conexão Bem-Sucedida
```
📡 ESP32-CAM Service iniciado
🌐 Fazendo request para: http://192.168.1.100/status
⏱️  Timeout configurado: 30000ms
📍 Modo: STA | IP: http://192.168.1.100
⏱️  Request completado em 245ms
✅ Status obtido com sucesso
```

### ❌ Erro de Rede
```
❌ Falha no request: Network request failed
   URL: http://192.168.1.100/status
   Modo: STA

🔴 ERRO DE REDE DETECTADO:
   ✓ Verifique se o ESP32 está ligado
   ✓ Confirme que o dispositivo está na mesma rede Wi-Fi
   ✓ IP configurado: http://192.168.1.100
   ✓ Modo atual: STA

💡 SUGESTÕES:
   → Tente trocar para modo Soft-AP
   → IP Soft-AP: http://192.168.4.1
```

### 🔄 Troca Automática de Modo
```
🔄 Tentando reconexão imediata para: status
   IP atual: http://192.168.1.100
   Modo atual: STA
   ⚠️ Erro na tentativa: Network request failed
   🔴 Falha de rede: ESP32 pode estar offline ou inacessível
   🔄 Tentando modo Soft-AP automaticamente...
🌐 Fazendo request para: http://192.168.4.1/status
✅ Status obtido com sucesso
```

## 🚀 Melhorias Futuras Sugeridas

1. **Descoberta Automática de IP**
   - Implementar mDNS/Bonjour para encontrar ESP32 automaticamente
   - Scanear range de IPs na rede local

2. **Cache de Última Conexão Bem-Sucedida**
   - Salvar último IP que funcionou
   - Tentar primeiro o último IP conhecido

3. **Indicador Visual de Status**
   - LED animado mostrando tentativas de conexão
   - Cores diferentes para cada modo (STA/Soft-AP)

4. **WebSocket como Fallback**
   - Manter conexão persistente
   - Reduzir latência e erros

5. **Modo Offline**
   - Cachear último status conhecido
   - Permitir uso limitado sem conexão

## 📚 Referências

- **Firmware:** `hive_mind/esp32_cam/esp32_cam.ino`
- **Service:** `hive_brain/hive_stream/Esp32Service.ts`
- **UI:** `app/(tabs)/StreamScreen.tsx`
- **Guia Original:** `ESP32_CONNECTION_GUIDE.md`

## 🎓 Comandos Úteis

### Verificar IP do ESP32
```bash
# Via Serial Monitor
# O ESP32 imprime o IP ao iniciar:
# "✅ STA Conectada. IP: 192.168.1.100"
```

### Testar Endpoint Manualmente
```bash
# No navegador ou Postman
http://192.168.1.100/status
http://192.168.4.1/status
```

### Ver Logs do App
```bash
# No Metro Bundler (React Native)
# Os logs aparecem automaticamente no terminal
# Procure por linhas com 📡, 🌐, ❌, ✅
```

---

**Status:** ✅ IMPLEMENTADO E TESTADO  
**Compatibilidade:** React Native, iOS, Android  
**Versão do Firmware:** esp32_cam.ino (atual)
