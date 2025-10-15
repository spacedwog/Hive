# 🐛 Guia de Troubleshooting - Hive ESP32 Vespa

## ❌ Erro: "WARN ❌ Tentativa X falhou: HTTP 404"

### 🔍 Causa
O serviço está tentando acessar endpoints que não existem no firmware do ESP32 Vespa.

### ✅ Solução
O código foi atualizado para usar apenas os endpoints corretos:
- ✅ `GET /status` - Buscar status do dispositivo
- ✅ `POST /command` - Enviar comandos (activate, deactivate, ping)

**Endpoints que NÃO existem no Vespa:**
- ❌ `/led/on`
- ❌ `/led/off`
- ❌ `/snapshot`
- ❌ `/config?auto_off_ms=`

### 📝 Métodos Disponíveis

```typescript
const esp32 = new Esp32Service();

// ✅ Métodos corretos
await esp32.fetchStatus();        // GET /status
await esp32.activate();           // POST /command {command: "activate"}
await esp32.deactivate();         // POST /command {command: "deactivate"}
await esp32.ping();               // POST /command {command: "ping"}
await esp32.checkConnection();    // Testa conectividade
await esp32.switchMode();         // Alterna entre STA e Soft-AP

// 📊 Helpers
const sensors = esp32.getSensorData();  // Retorna dados dos sensores
const isActive = esp32.isActive();      // Verifica se está ativo
```

---

## 🔴 Erro: "Network request failed" ou "Timeout"

### 🔍 Possíveis Causas
1. ESP32 está desligado ou não inicializado
2. IP incorreto no arquivo `.env`
3. Dispositivo móvel/computador não está na mesma rede
4. Firewall bloqueando conexão

### ✅ Soluções

#### 1. Verificar se ESP32 está ligado
- LED deve estar aceso
- Verifique alimentação USB/bateria
- Abra Serial Monitor (115200 baud) para ver logs

#### 2. Verificar IP no .env
Abra `.env` e confirme os IPs:

```env
ESP32_SOFTAP_IP=http://192.168.4.1
ESP32_STA_IP=http://192.168.15.188
```

#### 3. Descobrir o IP correto do ESP32

**Método 1 - Serial Monitor:**
```
1. Conecte ESP32 via USB
2. Abra Arduino IDE > Tools > Serial Monitor (115200 baud)
3. Reinicie o ESP32 (botão RST)
4. Procure por:
   "AP ativo. IP: 192.168.4.1"
   "Conectado ao STA. IP: 192.168.X.X"
```

**Método 2 - Roteador:**
```
1. Acesse painel do roteador (geralmente 192.168.1.1)
2. Procure por "DHCP Clients" ou "Dispositivos Conectados"
3. Encontre dispositivo "ESP32" ou "Vespa"
4. Anote o IP atribuído
```

**Método 3 - Network Scan (Windows):**
```cmd
arp -a
```
Procure por IPs na sua rede local.

#### 4. Testar conectividade

**Ping:**
```cmd
ping 192.168.15.188
```

**cURL:**
```bash
curl -u spacedwog:Kimera12@ http://192.168.15.188/status
```

**Browser:**
```
http://192.168.15.188/status
```
Credenciais: spacedwog / Kimera12@

---

## 🔐 Erro: "HTTP 401 Unauthorized"

### 🔍 Causa
Autenticação HTTP Basic falhou.

### ✅ Solução
Verifique as credenciais no `.env`:

```env
AUTH_USERNAME=spacedwog
AUTH_PASSWORD=Kimera12@
```

Se mudou as credenciais no firmware ESP32, atualize em:
1. `.env` (variáveis de ambiente)
2. `Esp32Service.ts` (hardcoded nas requisições)

---

## 📡 Modo STA vs Soft-AP

### 🌐 Modo STA (Station)
**Quando usar:**
- ESP32 e dispositivo móvel na mesma rede WiFi
- Melhor para uso doméstico/escritório
- Requer configuração do roteador

**Configuração:**
```cpp
// No firmware ESP32 (esp32_vespa.ino)
const char* sta_ssid = "FAMILIA SANTOS";      // Seu WiFi
const char* sta_password = "6z2h1j3k9f";      // Senha WiFi
```

**IP típico:** `192.168.X.X` (atribuído pelo roteador)

### 📶 Modo Soft-AP (Access Point)
**Quando usar:**
- Conexão direta ao ESP32
- Sem acesso ao roteador principal
- Configuração inicial ou troubleshooting

**Configuração:**
```cpp
// No firmware ESP32
const char* ap_ssid = "HIVE VESPA";
const char* ap_password = "hivemind";
```

**IP fixo:** `192.168.4.1` (sempre)

**Como conectar:**
1. No celular/computador, vá em WiFi
2. Conecte à rede "HIVE VESPA"
3. Senha: "hivemind"
4. Use IP `192.168.4.1`

### 🔄 Alternar modos no App

```typescript
const esp32 = new Esp32Service();
esp32.switchMode(); // Alterna entre STA ↔ Soft-AP
```

---

## 🔄 Sistema de Reconexão Automática

O serviço tenta reconectar automaticamente:

```
Tentativa 1: Imediato
Tentativa 2: ~5s depois
Tentativa 3: ~10s depois
Tentativa 4: ~20s depois
...até 10 tentativas (máximo 60s entre tentativas)
```

**Para interromper:**
```typescript
// Reconexão para automaticamente após sucesso
// Ou após 10 tentativas falhadas
```

---

## 🧪 Testes Manuais

### Teste 1: Verificar Status
```bash
curl -u spacedwog:Kimera12@ http://192.168.15.188/status
```

**Resposta esperada:**
```json
{
  "device": "Vespa",
  "status": "ativo",
  "ultrassonico_m": 1.25,
  ...
}
```

### Teste 2: Ativar Dispositivo
```bash
curl -X POST \
  -u spacedwog:Kimera12@ \
  -H "Content-Type: application/json" \
  -d '{"command":"activate"}' \
  http://192.168.15.188/command
```

**Resposta esperada:**
```json
{
  "result": "success",
  "status": "ativo"
}
```

### Teste 3: Ping
```bash
curl -X POST \
  -u spacedwog:Kimera12@ \
  -H "Content-Type: application/json" \
  -d '{"command":"ping"}' \
  http://192.168.15.188/command
```

---

## 📝 Checklist de Diagnóstico

Quando algo não funcionar, siga esta ordem:

- [ ] ESP32 está fisicamente ligado? (LED aceso)
- [ ] Serial Monitor mostra logs? (conexão USB OK)
- [ ] ESP32 conectou ao WiFi? (ver logs "Conectado ao STA")
- [ ] IP do .env está correto? (conferir com Serial Monitor)
- [ ] Ping funciona? (`ping 192.168.15.188`)
- [ ] cURL funciona? (teste manual no terminal)
- [ ] Credenciais corretas? (spacedwog:Kimera12@)
- [ ] App React Native rodando? (`npx expo start`)
- [ ] Celular na mesma rede WiFi? (se usando STA mode)

---

## 🆘 Últimos Recursos

Se nada funcionar:

1. **Reset completo do ESP32:**
   - Segure botão BOOT
   - Pressione botão RST
   - Solte ambos
   - Re-flash firmware

2. **Modo Soft-AP forçado:**
   ```cpp
   // Comente conexão STA no firmware:
   // WiFi.begin(sta_ssid, sta_password);
   ```
   - Conecte diretamente à rede "HIVE VESPA"
   - Use IP `192.168.4.1`

3. **Logs detalhados:**
   ```typescript
   // No app, todos os requests já têm logs extensivos
   // Verifique o console do Expo
   ```

4. **Reportar issue:**
   - Copie logs completos
   - Inclua IP usado
   - Descreva comportamento esperado vs atual
   - Abra issue no GitHub

---

## 📚 Documentação Relacionada

- [ESP32 Vespa API](./ESP32_VESPA_API.md) - Documentação completa da API
- [README.md](../README.md) - Visão geral do projeto
- `.env.example` - Exemplo de configuração

---

## 🔗 Links Úteis

- [Arduino IDE](https://www.arduino.cc/en/software)
- [ESP32 Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Networking](https://reactnative.dev/docs/network)
