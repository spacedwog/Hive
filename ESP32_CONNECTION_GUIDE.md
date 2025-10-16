# 🔧 Guia de Conexão ESP32 - Troubleshooting

## 🚨 Erro: "Network request failed"

Este erro indica que o aplicativo não consegue se conectar ao ESP32. Siga este guia passo a passo.

---

## 📋 Checklist Rápido

Antes de tudo, verifique:

- [ ] ESP32 está fisicamente ligado (LED aceso)?
- [ ] Cabo USB está conectado e funcional?
- [ ] Fonte de alimentação está adequada (mínimo 5V 2A)?
- [ ] Você está na mesma rede WiFi que o ESP32 (modo STA)?
- [ ] O IP no arquivo `.env` está correto?

---

## 🔍 Diagnóstico Automatizado

### Passo 1: Execute o Script de Diagnóstico

```bash
node scripts/diagnose-esp32.js
```

Este script irá:
- ✅ Testar conectividade com ambos os modos (STA e Soft-AP)
- ✅ Validar a resposta JSON do ESP32
- ✅ Verificar se os IPs estão configurados corretamente
- ✅ Mostrar suas interfaces de rede ativas
- ✅ Dar recomendações específicas baseadas no resultado

---

## 🌐 Entendendo os Modos de Conexão

### Modo STA (Station - WiFi Normal)
- **IP**: `192.168.15.188` (pode variar na sua rede)
- **Uso**: ESP32 conectado à sua rede WiFi doméstica
- **Vantagem**: Você pode usar seu celular/PC normalmente na internet
- **Requisito**: Estar na mesma rede WiFi

### Modo Soft-AP (Access Point - Rede do ESP32)
- **IP**: `192.168.4.1` (fixo)
- **Uso**: ESP32 cria sua própria rede WiFi
- **Vantagem**: Funciona sem depender de roteador
- **Desvantagem**: Você perde acesso à internet enquanto conectado

---

## 🛠️ Soluções por Cenário

### Cenário 1: ESP32 não responde em NENHUM modo

**Sintomas:**
```
❌ Modo STA não está acessível
❌ Modo Soft-AP não está acessível
```

**Causas Possíveis:**
1. ESP32 está desligado ou sem energia
2. Firmware corrompido ou não carregado
3. Problema de hardware

**Soluções:**

#### 1.1 Verificar Alimentação
```bash
# No monitor serial, você deve ver logs do ESP32
# Use Arduino IDE ou PlatformIO para abrir o Serial Monitor
```

#### 1.2 Verificar LED Indicador
- LED azul deve piscar ao ligar
- LED vermelho indica erro de boot

#### 1.3 Reflash do Firmware
```bash
# No Arduino IDE ou PlatformIO
# 1. Abra o projeto em hive_mind/esp32_vespa/
# 2. Conecte o ESP32 via USB
# 3. Selecione a porta correta
# 4. Faça upload do código
```

---

### Cenário 2: Apenas Soft-AP funciona

**Sintomas:**
```
❌ Modo STA não está acessível
✅ Modo Soft-AP funcionando corretamente
```

**Causas Possíveis:**
1. ESP32 não está conectado ao WiFi
2. Credenciais WiFi incorretas no ESP32
3. IP do ESP32 mudou e o .env está desatualizado

**Soluções:**

#### 2.1 Configurar WiFi no ESP32
```bash
# 1. Conecte-se à rede WiFi do ESP32 (geralmente "ESP32-CAM")
# 2. Acesse http://192.168.4.1
# 3. Configure as credenciais WiFi
# 4. Anote o IP que o ESP32 receber
```

#### 2.2 Atualizar .env com novo IP
```env
# Atualize este arquivo: .env
ESP32_STA_IP=http://192.168.15.XXX  # Coloque o IP correto
```

#### 2.3 Verificar no Monitor Serial
No monitor serial, você deve ver algo como:
```
WiFi conectado
IP: 192.168.15.188
```

---

### Cenário 3: Apenas STA funciona

**Sintomas:**
```
✅ Modo STA funcionando corretamente
❌ Modo Soft-AP não está acessível
```

**Causa:**
- O ESP32 está configurado apenas para modo STA (normal)

**Solução:**
- **Não precisa fazer nada!** Use o modo STA normalmente
- Certifique-se de sempre estar na mesma rede WiFi

---

### Cenário 4: IP está incorreto no .env

**Sintomas:**
```
⚠️  AVISO: IP no .env (192.168.15.188) diferente do ESP32 (192.168.15.200)
```

**Solução:**
```env
# Atualize o arquivo .env
ESP32_STA_IP=http://192.168.15.200  # Use o IP que o diagnóstico mostrou
```

Depois:
```bash
# Reinicie o aplicativo
npm start
```

---

## 🔧 Testes Manuais

### Teste 1: Ping (Windows)
```cmd
ping 192.168.15.188
```

**Resultado esperado:**
```
Resposta de 192.168.15.188: bytes=32 tempo<1ms TTL=255
```

**Se falhar:**
- ❌ ESP32 não está acessível na rede
- Verifique se está na mesma rede WiFi

---

### Teste 2: cURL (com autenticação)
```bash
curl -u spacedwog:Kimera12@ http://192.168.15.188/status
```

**Resultado esperado:**
```json
{
  "led_builtin": "off",
  "led_opposite": "on",
  "sensor_db": 42,
  "ip_ap": "192.168.4.1",
  "ip_sta": "192.168.15.188",
  "auto_off_ms": 5000
}
```

**Se falhar:**
- Status 401: Credenciais incorretas
- Timeout: ESP32 não está respondendo
- Connection refused: Porta 80 não está aberta

---

### Teste 3: Navegador
Abra no navegador:
```
http://spacedwog:Kimera12@@192.168.15.188/status
```

Se pedir usuário/senha:
- **Usuário**: spacedwog
- **Senha**: Kimera12@

---

## 🔍 Verificar Configuração de Rede

### Windows - Ver seu IP atual
```cmd
ipconfig
```

Procure por:
```
Adaptador de Rede sem Fio Wi-Fi:
   Endereço IPv4: 192.168.15.XXX
```

**O ESP32 deve estar na mesma sub-rede** (192.168.15.x)

### macOS/Linux - Ver seu IP atual
```bash
ifconfig
```

---

## 🚀 Dicas de Sucesso

### 1. Sempre use o diagnóstico primeiro
```bash
node scripts/diagnose-esp32.js
```

### 2. Anote os IPs
Mantenha uma nota com:
- IP do ESP32 em modo STA
- Nome da rede WiFi
- Se o Soft-AP está ativo

### 3. Modo de desenvolvimento
Para desenvolvimento, use o modo STA:
- Mais estável
- Não perde internet
- Mais rápido

### 4. Use o alternador de modo no app
O aplicativo tem um botão para alternar entre STA e Soft-AP.
Use-o se um modo falhar.

---

## 📊 Entendendo os Logs

### Log de Sucesso
```
📡 Consultando status...
⏱️  Request completado em 234ms
✅ Status obtido com sucesso
```

### Log de Erro de Rede
```
❌ Falha no request: Network request failed
   URL: http://192.168.15.188/status
   Modo: STA
```

**Significa:** O dispositivo não conseguiu estabelecer conexão TCP

### Log de Timeout
```
❌ Falha no request: aborted
   URL: http://192.168.15.188/status
```

**Significa:** O ESP32 está lento ou travado

### Log de HTTP Error
```
❌ HTTP 404 - Not Found
   Endpoint não encontrado: /status
```

**Significa:** Firmware desatualizado ou endpoint incorreto

---

## 🆘 Últimos Recursos

### Se nada funcionar:

1. **Hard Reset do ESP32**
   - Desconecte da energia
   - Aguarde 10 segundos
   - Reconecte

2. **Verificar Firewall**
   ```cmd
   # Windows - desabilitar temporariamente
   netsh advfirewall set allprofiles state off
   
   # Não esqueça de reativar depois!
   netsh advfirewall set allprofiles state on
   ```

3. **Usar outro dispositivo**
   - Tente conectar com outro celular/PC
   - Isso ajuda a isolar se o problema é no ESP32 ou no seu dispositivo

4. **Verificar logs do ESP32**
   - Conecte via USB
   - Abra o Serial Monitor
   - Veja se há erros no boot

5. **Reflash completo**
   - Apague a memória flash
   - Carregue o firmware novamente

---

## 📞 Suporte

Se ainda tiver problemas:

1. Execute o diagnóstico e salve o resultado:
   ```bash
   node scripts/diagnose-esp32.js > diagnostico.txt
   ```

2. Capture os logs do aplicativo

3. Tire uma foto do ESP32 (para verificar conexões)

4. Abra uma issue no GitHub com todas essas informações

---

## 🎯 Checklist Final

Antes de reportar um problema, confirme:

- [ ] Executou o script de diagnóstico
- [ ] Verificou a alimentação do ESP32
- [ ] Confirmou que está na mesma rede (modo STA)
- [ ] Testou ambos os modos (STA e Soft-AP)
- [ ] Verificou o arquivo .env
- [ ] Tentou ping e curl manualmente
- [ ] Verificou logs do Serial Monitor
- [ ] Tentou hard reset do ESP32
- [ ] Desabilitou firewall temporariamente (teste)

---

**Última atualização:** 15/10/2025
**Versão do guia:** 1.0
