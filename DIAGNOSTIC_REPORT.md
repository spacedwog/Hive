# 🚨 DIAGNÓSTICO: ESP32 Não Respondendo

## 📊 Resultado do Diagnóstico

```
❌ Modo STA não está acessível (ECONNRESET)
❌ Modo Soft-AP não está acessível (Timeout)
✅ Seu PC está na mesma sub-rede (192.168.15.x)
```

---

## 🔍 Análise do Problema

### Erro ECONNRESET (Modo STA)
**O que significa:** A conexão foi estabelecida, mas foi imediatamente encerrada.

**Causas possíveis:**
1. ✅ ESP32 **está ligado** (conseguiu estabelecer conexão TCP)
2. ❌ ESP32 **fechou a conexão imediatamente**
   - Pode estar travado
   - Firmware pode estar corrompido
   - Autenticação pode estar falhando
   - Firmware pode não ter o endpoint `/status`

### Erro Timeout (Modo Soft-AP)
**O que significa:** Você não está conectado à rede do ESP32.

**Esperado:** Só funciona se você se conectar à rede WiFi criada pelo ESP32.

---

## 🎯 Plano de Ação Imediato

### PASSO 1: Verificar se o ESP32 está realmente ligado

1. Olhe para o ESP32 físico:
   - LED vermelho (power) deve estar aceso
   - LED azul pode piscar ocasionalmente

2. Se **não** há LEDs acesos:
   ```
   ❌ ESP32 está sem energia
   - Verifique o cabo USB
   - Teste em outra porta USB
   - Use um adaptador de energia externo (5V 2A)
   ```

3. Se há LEDs acesos:
   ```
   ✅ ESP32 está ligado, mas pode estar travado
   - Continue para o PASSO 2
   ```

---

### PASSO 2: Hard Reset do ESP32

1. **Desconecte** o ESP32 da energia (USB)
2. **Aguarde 10 segundos**
3. **Reconecte** o ESP32
4. **Aguarde 30 segundos** para boot completo
5. **Execute o diagnóstico novamente:**
   ```bash
   node scripts/diagnose-esp32.cjs
   ```

---

### PASSO 3: Verificar Logs do ESP32 (Monitor Serial)

#### Opção A: Arduino IDE
```
1. Abra Arduino IDE
2. Tools → Port → Selecione a porta COM do ESP32
3. Tools → Serial Monitor
4. Configure para 115200 baud
5. Pressione o botão RESET no ESP32
6. Observe os logs
```

#### Opção B: PlatformIO
```bash
pio device monitor
```

#### O que procurar nos logs:
```
✅ Logs esperados (ESP32 funcionando):
   WiFi conectado
   IP: 192.168.15.188
   Servidor HTTP iniciado
   
❌ Logs de erro:
   Falha ao conectar WiFi
   Timeout de conexão
   Reset devido a exceção
```

---

### PASSO 4: Testar Conexão sem Autenticação

Vamos testar se o problema é a autenticação HTTP Basic:

```bash
# Teste 1: Sem autenticação
curl http://192.168.15.188/status

# Teste 2: Com autenticação
curl -u spacedwog:Kimera12@ http://192.168.15.188/status

# Teste 3: Testar endpoint raiz
curl http://192.168.15.188/
```

**Resultados esperados:**

✅ Se retornar JSON → Problema é autenticação no código do app
❌ Se retornar erro 401 → Autenticação correta, mas credenciais erradas
❌ Se não responder → ESP32 não está servindo HTTP

---

### PASSO 5: Verificar IP Real do ESP32

O IP pode ter mudado! Vamos descobrir o IP real:

#### Método 1: Verificar no Roteador
1. Acesse seu roteador (geralmente `192.168.15.1`)
2. Login (usuário/senha no roteador)
3. Procure "Dispositivos Conectados" ou "DHCP Clients"
4. Procure por "ESP32" ou pelo MAC address

#### Método 2: Scan da Rede
```bash
# Windows - instale nmap primeiro: https://nmap.org/download.html
nmap -sn 192.168.15.0/24

# Ou use o comando ping em loop
for /L %i in (1,1,254) do @ping -n 1 -w 100 192.168.15.%i | find "Reply"
```

#### Método 3: Monitor Serial
```
Olhe nos logs do ESP32 no monitor serial:
  IP: 192.168.15.XXX  <--- Este é o IP real!
```

---

### PASSO 6: Atualizar .env com IP Correto

Se você descobriu que o IP mudou:

```env
# Arquivo: .env
ESP32_STA_IP=http://192.168.15.XXX  # <<< Coloque o IP real aqui
```

Depois:
```bash
# Reinicie o app
npm start
```

---

### PASSO 7: Reflash do Firmware (Se necessário)

Se nada acima funcionou, pode ser necessário recarregar o firmware:

1. **Localize o código do ESP32:**
   ```
   hive_mind/esp32_vespa/
   ```

2. **Abra no Arduino IDE ou PlatformIO**

3. **Configure:**
   - Board: ESP32 Dev Module (ou ESP32-CAM se for CAM)
   - Port: A porta COM correta

4. **Edite as credenciais WiFi no código:**
   ```cpp
   const char* ssid = "SUA_REDE_WIFI";
   const char* password = "SUA_SENHA_WIFI";
   ```

5. **Upload:**
   - Click em "Upload" (→)
   - Aguarde "Done uploading"
   - Pressione RESET no ESP32

6. **Verifique os logs:**
   - Abra Serial Monitor
   - Deve ver "WiFi conectado" e o IP

---

## 🔧 Soluções Rápidas por Erro

### Se o erro for: ECONNRESET

```bash
# 1. Teste sem autenticação
curl http://192.168.15.188/status

# 2. Verifique se o endpoint existe
curl http://192.168.15.188/

# 3. Verifique logs do ESP32 no Serial Monitor
```

**Causa mais provável:** 
- Firmware do ESP32 não tem o endpoint `/status`
- Autenticação HTTP está falhando no ESP32
- ESP32 está crashando ao receber request

**Solução:**
- Reflash do firmware
- Verificar código do ESP32 se tem o endpoint `/status`

---

### Se o erro for: Timeout

```bash
# Teste básico de ping
ping 192.168.15.188
```

**Se o ping falhar:**
- ❌ ESP32 não está na rede ou IP está errado
- Verifique IP real (método acima)
- Verifique WiFi do ESP32 no Serial Monitor

**Se o ping funcionar mas HTTP falhar:**
- ❌ Servidor HTTP não está rodando
- Reflash do firmware
- Verifique logs do ESP32

---

## 🎬 Checklist de Recuperação

Execute nesta ordem:

- [ ] **1. Hard Reset** - Desconectar energia, aguardar 10s, reconectar
- [ ] **2. Diagnóstico** - `node scripts/diagnose-esp32.cjs`
- [ ] **3. Serial Monitor** - Verificar logs do ESP32
- [ ] **4. Ping Test** - `ping 192.168.15.188`
- [ ] **5. cURL Test** - Testar endpoint manualmente
- [ ] **6. IP Scan** - Verificar se IP mudou
- [ ] **7. Atualizar .env** - Se IP mudou
- [ ] **8. Reflash** - Se firmware corrompido
- [ ] **9. Firewall** - Desabilitar temporariamente para teste
- [ ] **10. Teste em outro dispositivo** - Isolar o problema

---

## 📞 Próximos Passos

### ✅ Depois de resolver:

1. **Salve o IP correto** no arquivo `.env`
2. **Teste o app** - Deve conectar normalmente
3. **Execute diagnóstico** periodicamente
4. **Configure IP estático** no roteador para o ESP32 (recomendado)

### ❌ Se ainda não funcionar:

1. **Capture informações:**
   ```bash
   # Diagnóstico
   node scripts/diagnose-esp32.cjs > diagnostico.txt
   
   # Ping
   ping 192.168.15.188 > ping-result.txt
   
   # Logs do ESP32 (copie do Serial Monitor)
   ```

2. **Abra uma issue** no GitHub com:
   - Arquivo `diagnostico.txt`
   - Arquivo `ping-result.txt`
   - Logs do Serial Monitor
   - Foto do ESP32 físico
   - Versão do firmware

---

## 💡 Dicas Importantes

### Configure IP Estático no Roteador

Para evitar que o IP mude:

1. Entre no roteador (`192.168.15.1`)
2. Procure "DHCP" ou "Reserva de IP"
3. Reserve o IP `192.168.15.188` para o MAC do ESP32
4. Salve e reinicie

### Mantenha Logs do Serial Monitor

Durante desenvolvimento, sempre mantenha o Serial Monitor aberto.
Você verá em tempo real:
- Requests recebidos
- Erros
- Resets
- Mudanças de IP

### Use Alimentação Externa

Se possível, use uma fonte 5V 2A externa ao invés do USB.
ESP32-CAM especialmente precisa de mais corrente.

---

**Arquivo gerado automaticamente pelo diagnóstico**
**Data:** 15/10/2025
