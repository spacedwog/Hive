# 🚀 Instruções para Upload do Firmware ESP32-CAM ECO

## ✅ Firmware Corrigido e Melhorado

O firmware `esp32_cam_eco.ino` foi atualizado com:

- ✅ Todos os endpoints esperados pelo app (`/status`, `/led/on`, `/led/off`, etc.)
- ✅ Endpoint raiz `/` que retorna status
- ✅ Respostas 404 em JSON com lista de endpoints disponíveis
- ✅ Headers CORS para compatibilidade
- ✅ Informações adicionais (wifi_strength, firmware version)
- ✅ Lista de endpoints no Serial Monitor ao iniciar
- ✅ Modo sustentável com economia de energia

---

## 📋 PASSO A PASSO - Upload do Firmware

### 1️⃣ Abrir o Firmware

1. **Abra o Arduino IDE**

2. **Abra o arquivo:**
   ```
   c:\Users\felip\Hive\hive_mind\esp32_cam_eco\esp32_cam_eco.ino
   ```
   (Você já está com ele aberto!)

---

### 2️⃣ Configurar WiFi

**IMPORTANTE:** Configure suas credenciais WiFi no código (linhas 53-54):

```cpp
const char* sta_ssid = "FAMILIA SANTOS";        // <<< MUDAR AQUI
const char* sta_password = "6z2h1j3k9f";        // <<< MUDAR AQUI
```

Substitua por:
```cpp
const char* sta_ssid = "SEU_WIFI";
const char* sta_password = "SUA_SENHA";
```

---

### 3️⃣ Configurar Arduino IDE

#### Instalar Suporte ESP32 (se ainda não tiver)

1. **File → Preferences**
2. Em "Additional Board Manager URLs", adicione:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools → Board → Boards Manager**
4. Pesquise "esp32"
5. Instale "esp32 by Espressif Systems" (versão 2.0.0 ou superior)

#### Selecionar Board

**Tools → Board:**
- Para ESP32-CAM: "AI Thinker ESP32-CAM"
- Para ESP32 Dev Module: "ESP32 Dev Module"

#### Configurações Recomendadas

```
Tools → Board: "AI Thinker ESP32-CAM"
Tools → Upload Speed: 115200
Tools → Flash Frequency: 80MHz
Tools → Flash Mode: QIO
Tools → Partition Scheme: "Default 4MB with spiffs"
Tools → Core Debug Level: None
Tools → Port: (selecione a porta COM correta)
```

---

### 4️⃣ Conectar o Hardware

#### Para ESP32-CAM (não tem USB direto):

Você precisa de um **adaptador USB-TTL (FTDI)**:

```
ESP32-CAM    →    FTDI
━━━━━━━━━━━━━━━━━━━━━━
5V           →    5V
GND          →    GND
U0R (RX)     →    TX
U0T (TX)     →    RX
IO0          →    GND (apenas durante upload!)
```

**Modo de Upload:**
1. Conecte **IO0 ao GND** (use um jumper/fio)
2. Conecte o FTDI ao USB do PC
3. ESP32-CAM entra em modo de programação

**Depois do Upload:**
1. **Desconecte IO0 do GND**
2. Pressione RESET
3. ESP32 roda normalmente

#### Para ESP32 Dev Module (com USB):
- Simplesmente conecte o cabo USB
- Selecione a porta COM correta

---

### 5️⃣ Fazer Upload

1. **Verifique o código** (opcional):
   - Click no botão ✓ (Verify)
   - Deve compilar sem erros

2. **Selecione a porta:**
   - Tools → Port → COMx (ex: COM3, COM4, COM5...)

3. **Upload:**
   - Click no botão → (Upload)
   - Aguarde a mensagem: "Hard resetting via RTS pin..."

4. **Se falhar:**
   - Pressione e segure o botão **BOOT** no ESP32
   - Click Upload novamente
   - Solte BOOT quando aparecer "Connecting..."

---

### 6️⃣ Verificar Funcionamento

1. **Abra o Serial Monitor:**
   - Tools → Serial Monitor
   - Baud rate: **115200**
   - Pressione RESET no ESP32

2. **Logs esperados:**
   ```
   🌱 Iniciando HIVE STREAM ECO (ESP32)...
   📡 AP iniciado. IP: 192.168.4.1
   🔄 Conectando à STA.......
   ✅ Conectado à STA. IP: 192.168.15.XXX
   🚀 Servidor HTTP iniciado (Modo Sustentável)
   
   📋 Endpoints disponíveis:
     GET /status - Status completo do sistema
     GET /led/on - Liga o LED
     GET /led/off - Desliga o LED
     GET /image - Captura imagem
     GET /snapshot - Captura com status
     GET /sustainability - Relatório de sustentabilidade
     GET /config?auto_off_ms=<ms> - Configura auto-off
     GET /config?power_mode=<mode> - Configura modo de energia
   
   ⚖️ Modo: Balanceado
   ```

3. **ANOTE o IP que aparecer!** (ex: 192.168.15.188)

---

### 7️⃣ Testar Manualmente

Abra um terminal e teste:

```bash
# Teste 1: Endpoint /status
curl http://192.168.15.188/status

# Teste 2: Ligar LED
curl http://192.168.15.188/led/on

# Teste 3: Desligar LED
curl http://192.168.15.188/led/off

# Teste 4: Relatório de sustentabilidade
curl http://192.168.15.188/sustainability
```

**Resposta esperada do /status:**
```json
{
  "sensor_db": 0,
  "led_builtin": "off",
  "led_opposite": "on",
  "ip_ap": "192.168.4.1",
  "ip_sta": "192.168.15.188",
  "auto_off_ms": 5000,
  "power_mode": "balanced",
  "energy_score": 75.0,
  "total_requests": 1,
  "uptime_ms": 12345,
  "free_heap": 123456,
  "wifi_strength": -45,
  "firmware": "eco-v1.0"
}
```

---

### 8️⃣ Atualizar .env do App

Edite o arquivo `.env` na raiz do projeto:

```env
ESP32_STA_IP=http://192.168.15.XXX  # <<< IP do passo 6
ESP32_SOFTAP_IP=http://192.168.4.1
```

---

### 9️⃣ Executar Diagnóstico

```bash
node scripts/diagnose-esp32.cjs
```

**Resultado esperado:**
```
✅ Modo STA funcionando corretamente
   Use este IP no app: http://192.168.15.188
```

---

### 🔟 Reiniciar o App

```bash
npm start
```

O app agora deve conectar com sucesso! ✅

---

## 🔧 TROUBLESHOOTING

### Erro: "Failed to connect to ESP32"

**Soluções:**
1. Segure o botão **BOOT** durante upload
2. Verifique se a porta COM está correta (Device Manager)
3. Para ESP32-CAM: confirme que **IO0 está conectado ao GND**
4. Tente velocidade menor: Tools → Upload Speed → 9600

### Erro: "espcomm_upload_mem failed"

**Soluções:**
1. Pressione RESET no ESP32
2. Tente novamente
3. Verifique alimentação (precisa 5V 2A mínimo)
4. Use uma fonte de alimentação externa ao invés do USB

### ESP32-CAM não entra em modo de programação

**Checklist:**
- [ ] IO0 conectado ao GND?
- [ ] TX-RX cruzados (TX FTDI → RX ESP32)?
- [ ] Alimentação 5V adequada (2A)?
- [ ] Pressionar RESET com IO0 em GND?

### Serial Monitor não mostra nada

**Soluções:**
1. Verifique baud rate: **115200**
2. **Desconecte IO0 do GND** (deve estar conectado apenas durante upload!)
3. Pressione RESET no ESP32
4. Verifique se o cabo TX/RX não está invertido

### WiFi não conecta (STA)

**Soluções:**
1. Verifique se o SSID e senha estão corretos no código
2. Verifique se o roteador está próximo
3. Certifique-se de que é uma rede 2.4GHz (ESP32 não suporta 5GHz)
4. Veja se há caracteres especiais na senha

---

## 📊 Características do Firmware ECO

### Modos de Energia:
- **High Performance:** Sem throttle, LED 10s
- **Balanced:** Throttle 1s, LED 5s (padrão)
- **Eco:** Throttle 2s, LED 3s
- **Ultra Eco:** Throttle 5s, LED 1s

### Endpoints Disponíveis:
- `GET /` ou `GET /status` - Status completo
- `GET /led/on` - Liga LED
- `GET /led/off` - Desliga LED
- `GET /led?state=on|off` - Controla LED
- `GET /image` ou `/snapshot` - Captura imagem
- `GET /sustainability` - Relatório de sustentabilidade
- `GET /config?auto_off_ms=<ms>` - Configura auto-off
- `GET /config?power_mode=<mode>` - Muda modo de energia
- `GET /power?mode=<mode>` - Muda modo de energia (alternativo)

### Features de Sustentabilidade:
- ✅ Throttling de requests para economia
- ✅ Auto-off do LED configurável
- ✅ Score de energia (0-100)
- ✅ Tracking de uso de dados
- ✅ Estimativa de carbono
- ✅ Deep sleep em inatividade (desabilitado por padrão)

---

## ✅ CHECKLIST FINAL

Depois do upload, confirme:

- [ ] Upload completou: "Hard resetting via RTS pin..."
- [ ] Serial Monitor mostra: "🚀 Servidor HTTP iniciado"
- [ ] Lista de endpoints apareceu no Serial Monitor
- [ ] IP foi anotado: `192.168.15.XXX`
- [ ] `.env` atualizado com IP correto
- [ ] `curl http://IP/status` retorna JSON
- [ ] `node scripts/diagnose-esp32.cjs` retorna ✅
- [ ] App conecta com sucesso

---

## 🎯 PRÓXIMOS PASSOS

Depois de confirmar que funciona:

1. **Configure IP estático no roteador**
   - Reserve o IP `192.168.15.188` para o ESP32
   - Evita mudanças de IP ao reiniciar

2. **Documente sua configuração**
   - Anote o IP fixo
   - Anote credenciais WiFi usadas
   - Anote qual versão do firmware está usando

3. **Mantenha o Serial Monitor aberto durante desenvolvimento**
   - Monitore requests em tempo real
   - Veja logs de erros
   - Acompanhe score de energia

---

**Firmware:** esp32_cam_eco.ino (eco-v1.0)
**Data:** 15/10/2025
**Status:** ✅ Pronto para upload
