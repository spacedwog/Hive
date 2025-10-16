# 🎯 DIAGNÓSTICO FINAL - ESP32 Não Respondendo

## ✅ O QUE FUNCIONA

```
✅ ESP32 está ligado
✅ ESP32 está na rede (IP: 192.168.15.188)
✅ Ping funciona (responde em ~95ms)
✅ Porta 80 HTTP está aberta
✅ TCP handshake funciona
✅ Seu PC está na mesma rede (192.168.15.8)
```

## ❌ O PROBLEMA

```
❌ Todos os endpoints retornam 404 Not Found
❌ GET /status → 404
❌ GET / → 404  
❌ O servidor HTTP está respondendo, mas sem rotas configuradas
```

---

## 🔍 ANÁLISE TÉCNICA

### O que está acontecendo:

1. **ESP32 está online e respondendo HTTP**
   - Conexão TCP estabelecida com sucesso
   - Servidor HTTP retorna resposta (404)
   
2. **Firmware não tem os endpoints esperados**
   - O código espera: `/status`, `/led/on`, `/led/off`, etc.
   - ESP32 retorna: 404 para TUDO
   
3. **Possíveis causas:**
   - ✗ Firmware errado foi carregado no ESP32
   - ✗ Firmware está corrompido
   - ✗ ESP32 rodando firmware de fábrica/vazio
   - ✗ Código do servidor não foi inicializado corretamente

---

## 🛠️ SOLUÇÃO: Reflash do Firmware

### ⚡ SOLUÇÃO RÁPIDA

1. **Conecte o ESP32 via USB**

2. **Abra o Arduino IDE**

3. **Abra o firmware correto:**
   ```
   c:\Users\felip\Hive\hive_mind\esp32_cam\esp32_cam.ino
   ```

4. **Configure:**
   - Tools → Board → "ESP32 Dev Module" ou "AI Thinker ESP32-CAM"
   - Tools → Port → (selecione a porta COM do ESP32)
   
5. **Edite as credenciais WiFi no código (linhas 15-17):**
   ```cpp
   const char* sta_ssid = "SEU_WIFI";        // <<< MUDAR AQUI
   const char* sta_password = "SUA_SENHA";    // <<< MUDAR AQUI
   ```

6. **Upload:**
   - Click no botão "Upload" (→)
   - Aguarde "Done uploading"

7. **Abra o Serial Monitor:**
   - Tools → Serial Monitor
   - Configure para 115200 baud
   - Pressione botão RESET no ESP32

8. **Verifique os logs:**
   ```
   ✅ Logs esperados:
   🚀 Iniciando HIVE STREAM (ESP32)...
   📡 AP iniciado. IP: 192.168.4.1
   🔄 Conectando à STA...
   ✅ STA Conectada. IP: 192.168.15.XXX
   ✅ Servidor HTTP iniciado
   ```

9. **Anote o IP que aparecer nos logs**

10. **Atualize o .env:**
    ```env
    ESP32_STA_IP=http://192.168.15.XXX  # IP do passo 9
    ```

11. **Teste novamente:**
    ```bash
    node scripts/diagnose-esp32.cjs
    ```

---

## 📋 PASSO A PASSO DETALHADO

### 1. Preparar Ambiente Arduino IDE

#### Instalar Arduino IDE (se não tiver)
- Download: https://www.arduino.cc/en/software
- Instale normalmente

#### Instalar Suporte ESP32
1. Arduino IDE → File → Preferences
2. Em "Additional Board Manager URLs", adicione:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Tools → Board → Boards Manager
4. Pesquise "esp32"
5. Instale "esp32 by Espressif Systems"

---

### 2. Preparar o Código

1. **Abra o firmware:**
   ```
   Arquivo → Abrir → c:\Users\felip\Hive\hive_mind\esp32_cam\esp32_cam.ino
   ```

2. **Edite as credenciais WiFi:**

   Encontre estas linhas (próximo ao topo):
   ```cpp
   // Configuração STA (conecta a um WiFi existente)
   const char* sta_ssid = "SeuWiFi";      // <<< MUDE AQUI
   const char* sta_password = "SuaSenha";  // <<< MUDE AQUI
   ```

   Substitua por suas credenciais:
   ```cpp
   const char* sta_ssid = "MinhaRede";
   const char* sta_password = "minha_senha_123";
   ```

3. **Verifique o código (opcional):**
   - Click no botão ✓ (Verify)
   - Deve compilar sem erros

---

### 3. Configurar Hardware

#### Para ESP32-CAM:
⚠️ **IMPORTANTE:** ESP32-CAM não tem USB direto!

**Você precisa de um adaptador USB-TTL (FTDI):**

```
ESP32-CAM    →    FTDI
5V           →    5V (ou VCC)
GND          →    GND
U0R (RX)     →    TX
U0T (TX)     →    RX
IO0          →    GND (apenas durante upload!)
```

**Modo de Upload:**
1. Conecte IO0 ao GND (ponte/jumper)
2. Conecte o FTDI no USB
3. ESP32-CAM entra em modo de programação

**Depois do Upload:**
1. **Desconecte** IO0 do GND
2. Pressione RESET
3. ESP32 roda normalmente

#### Para ESP32 Dev Module (placa com USB):
- Simplesmente conecte o cabo USB
- Selecione a porta COM correta

---

### 4. Upload do Firmware

1. **Tools → Board:**
   - ESP32-CAM: "AI Thinker ESP32-CAM"
   - ESP32 Dev: "ESP32 Dev Module"

2. **Tools → Port:**
   - Windows: COMx (ex: COM3, COM4)
   - Selecione a porta onde está conectado

3. **Tools → Upload Speed:**
   - 115200 (recomendado)
   - Se der erro, tente 9600

4. **Click Upload (→):**
   ```
   Sketch uses XXXX bytes
   ...
   Connecting........___...
   Writing at 0x00010000... (XX%)
   ...
   Hard resetting via RTS pin...
   ```

5. **Se falhar:**
   - Pressione e segure o botão BOOT no ESP32
   - Click Upload novamente
   - Solte BOOT quando começar a fazer upload

---

### 5. Verificar Funcionamento

1. **Abra Serial Monitor:**
   - Tools → Serial Monitor
   - Baud rate: 115200
   - Pressione RESET no ESP32

2. **Logs esperados:**
   ```
   🚀 Iniciando HIVE STREAM (ESP32)...
   📡 AP iniciado. IP: 192.168.4.1
   🔄 Conectando à STA.......
   ✅ STA Conectada. IP: 192.168.15.188
   ✅ Servidor HTTP iniciado
   ```

3. **ANOTE o IP que aparecer!**

4. **Teste manualmente:**
   ```bash
   curl http://192.168.15.188/status
   ```

   **Resposta esperada:**
   ```json
   {
     "led_builtin": "off",
     "led_opposite": "on",
     "sensor_db": 0,
     "ip_ap": "192.168.4.1",
     "ip_sta": "192.168.15.188",
     "auto_off_ms": 5000
   }
   ```

---

### 6. Atualizar Configuração do App

1. **Edite `.env`:**
   ```env
   ESP32_STA_IP=http://192.168.15.188  # Use o IP dos logs
   ESP32_SOFTAP_IP=http://192.168.4.1
   ```

2. **Reinicie o app:**
   ```bash
   npm start
   ```

3. **Execute diagnóstico:**
   ```bash
   node scripts/diagnose-esp32.cjs
   ```

   **Resultado esperado:**
   ```
   ✅ Modo STA funcionando corretamente
   ```

---

## 🔧 TROUBLESHOOTING DO UPLOAD

### Erro: "Failed to connect"
```bash
A fatal error occurred: Failed to connect to ESP32
```

**Soluções:**
1. **Segure o botão BOOT** durante upload
2. Verifique se a porta COM está correta
3. Feche outros programas que usam serial (PlatformIO, outro Arduino IDE)
4. Tente velocidade menor (9600 baud)
5. Para ESP32-CAM: verifique se IO0 está em GND

---

### Erro: "espcomm_upload_mem failed"
```
warning: espcomm_upload_mem failed
```

**Soluções:**
1. Pressione RESET no ESP32
2. Tente novamente
3. Use velocidade menor
4. Verifique a alimentação (precisa 5V 2A mínimo)

---

### Erro: Port already in use
```
Serial port 'COM3' not found
```

**Soluções:**
1. Feche Serial Monitor
2. Desconecte e reconecte USB
3. Verifique Device Manager (Windows) → Ports (COM & LPT)
4. Instale drivers CH340 ou CP2102 se necessário

---

### ESP32-CAM não entra em modo de programação

**Checklist:**
- [ ] IO0 está conectado ao GND?
- [ ] FTDI está em 5V (não 3.3V)?
- [ ] TX-RX cruzados (TX do FTDI → RX do ESP32)?
- [ ] Alimentação adequada (2A)?
- [ ] Pressionar RESET com IO0 em GND?

---

## ✅ CHECKLIST FINAL

Depois do reflash, confirme:

- [ ] Upload completou sem erros
- [ ] Serial Monitor mostra "Servidor HTTP iniciado"
- [ ] IP foi anotado dos logs
- [ ] `.env` atualizado com IP correto
- [ ] `curl http://IP/status` retorna JSON
- [ ] `node scripts/diagnose-esp32.cjs` passa
- [ ] App React Native conecta

---

## 📊 VERIFICAÇÃO DE SUCESSO

Execute:
```bash
curl http://192.168.15.188/status
```

**✅ SUCESSO:**
```json
{
  "led_builtin": "off",
  "led_opposite": "on",
  "sensor_db": 0,
  "ip_ap": "192.168.4.1",
  "ip_sta": "192.168.15.188",
  "auto_off_ms": 5000
}
```

**❌ AINDA COM PROBLEMA:**
```
404 Not Found
```
→ Firmware ainda não foi carregado corretamente
→ Repita o processo de upload

---

## 🎯 ALTERNATIVA: Usar outro Firmware

Se você tem múltiplos ESP32, pode estar com firmware diferente:

### Firmware ESP32-VESPA (com autenticação)
```
c:\Users\felip\Hive\hive_mind\esp32_vespa\esp32_vespa.ino
```

### Firmware ESP32-CAM-ECO (com otimização)
```
c:\Users\felip\Hive\hive_mind\esp32_cam_eco\esp32_cam_eco.ino
```

Teste cada um e veja qual está configurado no seu hardware.

---

## 📞 PRÓXIMOS PASSOS

### Depois de carregar o firmware:

1. ✅ **Teste endpoints:**
   ```bash
   curl http://192.168.15.188/status
   curl http://192.168.15.188/led/on
   curl http://192.168.15.188/led/off
   ```

2. ✅ **Configure IP estático no roteador**
   - Reserve sempre o IP 192.168.15.188 para o ESP32
   - Evita problemas quando ESP32 reinicia

3. ✅ **Mantenha Serial Monitor aberto**
   - Durante desenvolvimento, monitore os logs
   - Veja requests em tempo real

4. ✅ **Documente sua configuração**
   - Anote qual firmware está usando
   - Anote o IP fixo
   - Anote credenciais WiFi

---

## 💡 DICAS IMPORTANTES

### Durante Desenvolvimento:
- Sempre teste com `curl` antes do app
- Mantenha Serial Monitor aberto
- Use IP estático no roteador
- Documente mudanças no firmware

### Para Produção:
- Configure OTA (Over The Air) updates
- Implemente watchdog timer
- Adicione logs mais detalhados
- Configure auto-recovery se WiFi cair

---

**Problema identificado:** Firmware não está carregado ou incorreto
**Solução:** Reflash do firmware ESP32-CAM
**Próximo teste:** `curl http://192.168.15.188/status` após reflash

---

**Gerado automaticamente pelo diagnóstico**
**Data:** 15/10/2025
