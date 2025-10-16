# 🚀 Guia de Uso Rápido - HIVE StreamScreen

**Data:** 16 de outubro de 2025  
**Versão:** 2.0 - Simplificado

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Preparar o ESP32-CAM

```bash
# 1. Conecte o ESP32-CAM ao computador via USB
# 2. Abra a Arduino IDE
# 3. Carregue o firmware: hive_mind/esp32_cam/esp32_cam.ino
# 4. Upload para o ESP32
# 5. Aguarde o LED acender
```

**Credenciais Wi-Fi no firmware:**
```cpp
const char* sta_ssid = "FAMILIA SANTOS";
const char* sta_password = "6z2h1j3k9f";
const char* ap_ssid = "HIVE STREAM";
const char* ap_password = "hvstream";
```

### 2️⃣ Descobrir o IP do ESP32

**Opção A: Via Serial Monitor (Arduino IDE)**
```
📡 AP iniciado. IP: 192.168.4.1
✅ STA Conectada. IP: 192.168.1.100  ← Este é o IP!
```

**Opção B: Via Router**
- Acesse o painel do roteador
- Procure por "ESP32" ou "HIVE" nos dispositivos conectados
- Anote o IP

### 3️⃣ Configurar o App

**Edite o arquivo `.env`:**
```env
ESP32_STA_IP=http://192.168.1.100
ESP32_SOFTAP_IP=http://192.168.4.1
VERCEL_URL=https://seu-app.vercel.app
```

⚠️ **IMPORTANTE:** Sempre inclua `http://` antes do IP!

### 4️⃣ Iniciar o App

```bash
# No terminal, na pasta do projeto:
npm start
# ou
npx expo start

# Depois, pressione:
# - 'i' para iOS
# - 'a' para Android
# - 'w' para web
```

### 5️⃣ Usar o StreamScreen

1. **Abra o app** no dispositivo
2. **Navegue para "Stream"** (terceira aba)
3. **Observe o status de conexão** no topo:
   - ✅ Verde = Conectado
   - ❌ Vermelho = Desconectado

## 🎮 Controles Disponíveis

### 🔘 Botões Principais

| Botão | Função | Endpoint |
|-------|--------|----------|
| **Ligar/Desligar LED** | Alterna LED do ESP32 | `GET /led/on` ou `/led/off` |
| **Modo: STA/Soft-AP** | Troca entre modos de conexão | Local |
| **ESP32-CAM(Data)** | Mostra JSON completo do status | Modal |
| **API(Infra-estrutura)** | Status da API Vercel | Modal |
| **Ver Erros (N)** | Histórico de erros | Modal |
| **Trocar câmera** | Alterna entre frontal/traseira | Local |
| **Tirar Foto** | Captura e envia para Vercel | POST |

### 📊 Informações Exibidas

```
LED Built-in: ON/OFF
LED Opposite: OFF/ON
IP AP: 192.168.4.1
IP STA: 192.168.1.100
🔊 Nível de Som: 1234
⏲️ Auto-off: 5000ms
```

## 🔧 Modos de Conexão

### 📡 Modo STA (Station) - Padrão
**Quando usar:**
- ✅ ESP32 está na mesma rede Wi-Fi que você
- ✅ Precisa de acesso à internet simultaneamente
- ✅ Tem roteador por perto

**Como conectar:**
1. ESP32 conecta automaticamente ao Wi-Fi configurado
2. Use o IP atribuído pelo roteador (ex: 192.168.1.100)
3. No app, modo deve estar em "STA"

**Vantagens:**
- 🌐 Mantém acesso à internet
- 📱 Pode usar outros apps online
- 🔒 Mais seguro (rede protegida)

**Desvantagens:**
- ⚠️ Depende do roteador estar funcionando
- ⚠️ Precisa estar na mesma rede

---

### 📶 Modo Soft-AP (Access Point)
**Quando usar:**
- ✅ Não tem roteador disponível
- ✅ Modo STA não está funcionando
- ✅ Quer conexão direta e confiável
- ✅ Está em campo aberto/externo

**Como conectar:**
1. No Wi-Fi do celular, conecte-se a: **"HIVE STREAM"**
2. Senha: **"hvstream"**
3. No app, clique em "Modo" até aparecer "Soft-AP"
4. O IP será sempre: **192.168.4.1**

**Vantagens:**
- 🎯 Conexão direta e estável
- 🚀 Menor latência
- 💪 Mais confiável
- 📍 IP fixo (sempre 192.168.4.1)

**Desvantagens:**
- ❌ Perde acesso à internet no celular
- ❌ Alcance limitado (5-10 metros)

## 🆘 Solução de Problemas

### ❌ "Desconectado" ou "Network request failed"

**1. Verificar ESP32:**
```bash
✓ ESP32 está ligado?
✓ LED está aceso?
✓ Firmware foi carregado corretamente?
```

**2. Verificar IP no .env:**
```env
# Deve ter http:// no início
ESP32_STA_IP=http://192.168.1.100  ✅
ESP32_STA_IP=192.168.1.100          ❌
```

**3. Testar conectividade:**
```bash
# No computador ou celular:
ping 192.168.1.100

# No navegador:
http://192.168.1.100/status
```

**4. Trocar para modo Soft-AP:**
```
1. Conecte ao Wi-Fi "HIVE STREAM"
2. Senha: hvstream
3. No app, clique em "Modo" até aparecer "Soft-AP"
4. Deve conectar em http://192.168.4.1
```

### ⏱️ Timeout / Resposta Lenta

**Possíveis causas:**
- ESP32 sobrecarregado
- Muitas requisições simultâneas
- Problema no firmware
- Sinal Wi-Fi fraco

**Soluções:**
```
1. Reinicie o ESP32 (desconectar/reconectar USB)
2. Aproxime-se do dispositivo
3. Reduza frequência de atualização no código
4. Use modo Soft-AP para menor latência
```

### 🔴 LED não liga/desliga

**Checklist:**
```
✓ Status mostra "Conectado"?
✓ Botão LED está respondendo?
✓ Observe os logs no console
✓ Teste endpoint direto no navegador:
  http://192.168.1.100/led/on
  http://192.168.1.100/led/off
```

## 📱 Usando Câmera do Celular

### Funcionalidades:
1. **Trocar Câmera:** Frontal ↔ Traseira
2. **Tirar Foto:** Captura imagem
3. **Upload Automático:** Envia para Vercel + ESP32 status

### Fluxo:
```
1. Permitir acesso à câmera
2. Ajustar tipo (frontal/traseira)
3. Tirar foto
4. Aguardar upload
5. Ver resultado nos logs
```

## 🎯 Endpoints do ESP32-CAM

| Endpoint | Método | Função | Retorno |
|----------|--------|--------|---------|
| `/status` | GET | Status completo | JSON |
| `/led/on` | GET | Liga LED | JSON |
| `/led/off` | GET | Desliga LED | JSON |
| `/image` | GET | Imagem JPG | Binary |
| `/snapshot` | GET | Status + imagem | Multipart |
| `/config?auto_off_ms=X` | GET | Configura auto-off | JSON |

### Exemplo de `/status`:
```json
{
  "led_builtin": "on",
  "led_opposite": "off",
  "ip_ap": "192.168.4.1",
  "ip_sta": "192.168.1.100",
  "sound_level": 1234,
  "auto_off_ms": 5000
}
```

## 📊 Lendo os Logs

### ✅ Conexão Bem-Sucedida:
```
📡 ESP32-CAM Service iniciado
🌐 Fazendo request para: http://192.168.1.100/status
📍 Modo: STA | IP: http://192.168.1.100
⏱️  Request completado em 245ms
✅ Status obtido com sucesso
```

### ❌ Erro de Conexão:
```
❌ Falha no request: Network request failed
   URL: http://192.168.1.100/status
   Modo: STA

🔴 ERRO DE REDE DETECTADO:
   ✓ Verifique se o ESP32 está ligado
   ✓ Confirme que está na mesma rede Wi-Fi
   
💡 SUGESTÕES:
   → Use o botão 'Modo' para trocar para Soft-AP
```

## 🔄 Workflow Típico

### Cenário 1: Uso Diário (Casa/Escritório)
```
1. ESP32 já está conectado ao Wi-Fi
2. Abrir app (modo STA automático)
3. Usar normalmente
4. Status atualiza a cada 2 segundos
```

### Cenário 2: Primeiro Uso
```
1. Carregar firmware no ESP32
2. Anotar IP no Serial Monitor
3. Configurar .env com o IP
4. Reiniciar app
5. Conectar e testar
```

### Cenário 3: Modo Soft-AP (Campo)
```
1. Ligar ESP32
2. Conectar celular ao Wi-Fi "HIVE STREAM"
3. Abrir app
4. Clicar em "Modo" até aparecer "Soft-AP"
5. Usar normalmente (sem internet)
```

## 💡 Dicas e Truques

### 🎨 Personalizações:
```typescript
// Alterar intervalo de atualização (StreamScreen.tsx, linha ~168)
setInterval(async () => {
  // ...
}, 2000); // ← Mudar para 5000 = 5 segundos
```

### 🔧 Configurar Auto-off:
```javascript
// Via código:
await esp32Service.setAutoOff(10000); // 10 segundos

// Via browser:
http://192.168.1.100/config?auto_off_ms=10000
```

### 📝 Ver Histórico de Erros:
```
1. Clique em "Ver Erros (N)" no StreamScreen
2. Modal mostra:
   - Timestamp de cada erro
   - Tipo (network, timeout, http)
   - Endpoint que falhou
   - IP e modo usados
3. Use "Limpar Histórico" para resetar
```

## 📚 Arquivos Importantes

```
app/(tabs)/StreamScreen.tsx          ← UI principal
hive_brain/hive_stream/Esp32Service.ts  ← Lógica de conexão
hive_mind/esp32_cam/esp32_cam.ino    ← Firmware do ESP32
.env                                  ← Configurações (IPs)
NETWORK_ERROR_SOLUTION.md            ← Solução detalhada de erros
```

## ⚙️ Comandos Úteis

```bash
# Reiniciar Metro Bundler
npm start -- --reset-cache

# Limpar cache completo
rm -rf node_modules
npm install
npm start

# Ver logs detalhados (Android)
npx react-native log-android

# Ver logs detalhados (iOS)
npx react-native log-ios

# Testar endpoint manualmente
curl http://192.168.1.100/status
```

## 🎓 Próximos Passos

1. **Explorar outros endpoints** (`/image`, `/snapshot`)
2. **Configurar Vercel API** para persistência
3. **Adicionar notificações** para eventos do ESP32
4. **Implementar histórico** de readings de sensores
5. **Criar dashboard** com gráficos

---

**📞 Suporte:** Veja `NETWORK_ERROR_SOLUTION.md` para troubleshooting avançado  
**🐛 Issues:** Verifique histórico de erros no app  
**📖 Docs:** `ESP32_CONNECTION_GUIDE.md` para detalhes técnicos

**Status:** ✅ PRONTO PARA USO  
**Última Atualização:** 16/10/2025
