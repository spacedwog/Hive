# 🔍 Guia Visual de Diagnóstico - Network Issues

**Versão:** 3.0  
**Data:** 16/10/2025

---

## 🚦 Indicadores de Status

### Indicador de Conexão (Topo do StreamScreen)

#### 🔄 "Conectando... (STA)"
**Cor:** Amarelo (`#facc15`)  
**Significado:** Tentando estabelecer conexão  
**Ação:** Aguarde alguns segundos

#### ✅ "Conectado (STA: http://192.168.1.100)"
**Cor:** Verde (`#0af`)  
**Significado:** Conexão estabelecida e funcionando  
**Ação:** Use normalmente

#### ❌ "Desconectado - 3 tentativas falharam"
**Cor:** Vermelho (`#ff6666`)  
**Significado:** Múltiplas falhas de conexão  
**Ação:** Verifique ESP32 ou troque modo

#### ⏳ "Iniciando..."
**Cor:** Cinza (padrão)  
**Significado:** App está carregando  
**Ação:** Aguarde inicialização

---

## 📊 Fluxo de Diagnóstico

```
┌─────────────────────────────────────────┐
│  Abrir StreamScreen                     │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │ Que cor aparece?│
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼────┐
│ Verde │   │Amarelo│   │Vermelho│
└───┬───┘   └───┬───┘   └───┬────┘
    │           │            │
┌───▼────┐  ┌───▼────┐  ┌────▼────┐
│ SUCESSO│  │TENTANDO│  │ PROBLEMA│
└────────┘  └───┬────┘  └────┬────┘
                │             │
          Aguarde 5-10s       │
                │             │
          ┌─────▼──────┐      │
          │Mudou p/Verde?     │
          └─────┬──────┘      │
                │             │
           ┌────┴────┐        │
           │YES   NO │        │
           │         │        │
           OK    ┌───▼────────▼───┐
                 │ Verificar ESP32│
                 └────────────────┘
```

---

## 🔴 Cenários de Erro e Soluções

### Cenário 1: "Desconectado - 1 tentativa falhou"
```
Status: ⚠️  Aviso
Ação:  Aguarde backoff (5s)
Razão: Falha única, pode ser temporária
```

### Cenário 2: "Desconectado - 3 tentativas falharam"
```
Status: 🔴 Alerta
Ação:  Verificar ESP32 ou trocar modo
Razão: Múltiplas falhas indicam problema persistente
```

### Cenário 3: "Desconectado - 5+ tentativas falharam"
```
Status: 🚨 Crítico
Ação:  Circuit breaker ativado
Info:  Aguarde 30s para reset automático
```

---

## 🎯 Diagnóstico por Sintoma

### ❌ Sintoma: Vermelho Permanente
**Possíveis Causas:**
1. ESP32 desligado
2. IP errado no `.env`
3. Não está na mesma rede
4. Firewall bloqueando

**Passos:**
```bash
1. ✓ ESP32 está ligado?
2. ✓ LED Wi-Fi piscando?
3. ✓ Ping funciona?
   > ping 192.168.1.100
4. ✓ IP correto no .env?
5. ✓ Mesmo Wi-Fi?
```

**Solução Rápida:**
- Clique em "Modo" para trocar STA ↔ Soft-AP
- Aguarde 30s (circuit breaker)
- Reinicie ESP32 se necessário

---

### 🔄 Sintoma: Amarelo que não muda
**Possíveis Causas:**
1. Timeout muito longo
2. ESP32 muito lento
3. Rede congestionada

**Passos:**
```bash
1. Aguarde até 30s
2. Observe logs no console
3. Verifique sinal Wi-Fi
```

**Solução Rápida:**
- Aproxime-se do ESP32/Router
- Troque para modo Soft-AP (mais rápido)

---

### ⚡ Sintoma: Alterna Verde ↔ Vermelho
**Possíveis Causas:**
1. Conexão instável
2. ESP32 sobrecarregado
3. Sinal Wi-Fi fraco

**Passos:**
```bash
1. Ver console: quantos erros consecutivos?
2. Circuit breaker ativado?
3. Backoff aumentando?
```

**Solução Rápida:**
- Aproxime-se do dispositivo
- Reduza outras conexões ao ESP32
- Use modo Soft-AP (mais estável)

---

### 📱 Sintoma: Modais de Erro Constantes
**Possíveis Causas:**
1. Versão antiga do código (sem fix)
2. Alguma ação manual falhando repetidamente

**Verificação:**
```typescript
// Código atualizado tem:
showError(error, isUserAction)

// Se sempre TRUE, está desatualizado
```

**Solução:**
- Atualizar código para versão 3.0
- Modais só devem aparecer em ações manuais
- Polling automático só loga no console

---

## 🧪 Testes de Diagnóstico

### Teste 1: Conectividade Básica
```bash
# Terminal/CMD:
ping 192.168.1.100

# Resultado esperado:
✓ Reply from 192.168.1.100: bytes=32 time<10ms TTL=64
```

### Teste 2: Endpoint HTTP
```bash
# Navegador ou Postman:
http://192.168.1.100/status

# Resultado esperado:
{
  "led_builtin": "off",
  "led_opposite": "on",
  "ip_ap": "192.168.4.1",
  "ip_sta": "192.168.1.100",
  "sound_level": 1234,
  "auto_off_ms": 5000
}
```

### Teste 3: Circuit Breaker
```
1. Desligue ESP32
2. Aguarde aparecer "Desconectado - 5 tentativas"
3. Observe logs: "Circuit breaker aberto"
4. Aguarde 30s
5. Ligue ESP32
6. Deve conectar automaticamente
```

### Teste 4: Backoff Exponencial
```
1. Desconecte ESP32
2. Observe logs no console:
   - 1ª falha: 5s
   - 2ª falha: 10s
   - 3ª falha: 20s
   - 4ª+ falha: 30s
3. Reconecte ESP32
4. Deve voltar a 2s
```

---

## 📈 Logs e O Que Significam

### ✅ Logs de Sucesso:
```
📡 ESP32-CAM Service iniciado
🌐 Fazendo request para: http://192.168.1.100/status
📍 Modo: STA | IP: http://192.168.1.100
⏱️  Request completado em 245ms
✅ Status obtido com sucesso
```
**Significado:** Tudo funcionando perfeitamente

---

### ⚠️ Logs de Aviso:
```
⚠️ Erro no polling automático (1x): Network request failed
```
**Significado:** Primeira falha, tentará novamente em 5s

```
⚠️ Erro no polling automático (3x): Network request failed
🔴 Múltiplas falhas consecutivas. Pausando polling por 20s
```
**Significado:** Problema persistente, backoff ativado

---

### 🔴 Logs de Erro:
```
❌ Falha no request: Network request failed
   URL: http://192.168.1.100/status
   Modo: STA

🔴 ERRO DE REDE DETECTADO:
   ✓ Verifique se o ESP32 está ligado
   ✓ Confirme que está na mesma rede Wi-Fi
```
**Significado:** Erro de conectividade, verifique ESP32

```
🔴 Circuit breaker aberto após 5 falhas consecutivas
   Pausando requisições por 30s
```
**Significado:** Sistema pausou tentativas para economizar recursos

---

### 🔄 Logs de Recuperação:
```
✅ Circuit breaker resetado. Tentando reconectar...
🌐 Fazendo request para: http://192.168.1.100/status
✅ Status obtido com sucesso
✅ Conexão restaurada após 5 falhas
```
**Significado:** Sistema se recuperou automaticamente

---

## 🎨 Cores e Estados Visuais

### Indicador Principal:
| Cor | Hex | Estado | Ação |
|-----|-----|--------|------|
| 🟢 Verde | `#0af` | Conectado | Nenhuma |
| 🟡 Amarelo | `#facc15` | Conectando | Aguardar |
| 🔴 Vermelho | `#ff6666` | Desconectado | Verificar |
| ⚪ Cinza | padrão | Iniciando | Aguardar |

### Botões:
| Botão | Cor Normal | Cor Ação | Estado |
|-------|------------|----------|--------|
| LED | default | default | ON/OFF |
| Modo | `#facc15` | `#facc15` | STA/Soft-AP |
| ESP32 Data | `#0af` | `#0af` | Modal |
| API Status | `#ff9900` | `#ff9900` | Modal |
| Ver Erros | `#666` / `#ff6666` | - | 0+ erros |

---

## 📊 Métricas de Performance

### Indicadores Normais:
```
✅ Latência: < 500ms
✅ Sucesso: > 95%
✅ Backoff: Raro (< 1x/hora)
✅ Circuit breaker: Nunca abre
✅ Erros consecutivos: < 2
```

### Indicadores de Alerta:
```
⚠️  Latência: 500ms - 2s
⚠️  Sucesso: 80% - 95%
⚠️  Backoff: Ocasional (1-5x/hora)
⚠️  Circuit breaker: Abre 1x/hora
⚠️  Erros consecutivos: 2-4
```

### Indicadores Críticos:
```
🔴 Latência: > 2s
🔴 Sucesso: < 80%
🔴 Backoff: Frequente (> 5x/hora)
🔴 Circuit breaker: Abre múltiplas vezes
🔴 Erros consecutivos: > 5
```

---

## 🛠️ Ferramentas de Debug

### Console do Navegador/Metro:
```javascript
// Filtrar logs:
// - Procure por "📡" para inicialização
// - Procure por "✅" para sucessos
// - Procure por "❌" para erros
// - Procure por "🔴" para críticos
```

### Histórico de Erros (App):
```
1. Clique em "Ver Erros (N)" no StreamScreen
2. Modal mostra:
   - Timestamp de cada erro
   - Tipo (network/timeout/http)
   - Endpoint que falhou
   - IP e modo usados
3. Use "Limpar Histórico" para resetar
```

### Estatísticas de Erro:
```typescript
const stats = esp32Service.getErrorStats();
// {
//   total: 15,
//   network: 10,
//   timeout: 3,
//   http: 2,
//   unknown: 0
// }
```

---

## 🚀 Ações Corretivas por Cenário

### ESP32 Offline:
1. ✅ Aguarde circuit breaker (30s)
2. ✅ Sistema tentará reconectar automaticamente
3. ✅ Ligue ESP32 quando possível
4. ✅ Não force tentativas manuais

### IP Errado:
1. ❌ Verifique `.env`
2. ❌ Corrija IP
3. ❌ Reinicie app (Metro)
4. ❌ Teste conexão

### Modo Errado:
1. 🔄 Clique em "Modo" (STA ↔ Soft-AP)
2. 🔄 Aguarde 5-10s
3. 🔄 Observe mudança de cor
4. 🔄 Se conectar, mantenha modo

### Rede Instável:
1. 📶 Use modo Soft-AP (mais estável)
2. 📶 Aproxime-se do ESP32
3. 📶 Reduza outras conexões
4. 📶 Verifique sinal Wi-Fi

---

## ✅ Checklist de Verificação Rápida

### Antes de Reportar Bug:
- [ ] ESP32 está ligado e funcionando?
- [ ] Ping funciona no terminal?
- [ ] IP no `.env` está correto?
- [ ] Testou ambos os modos (STA e Soft-AP)?
- [ ] Aguardou circuit breaker (30s)?
- [ ] Verificou logs no console?
- [ ] Histórico de erros tem padrão?
- [ ] Código está atualizado (v3.0)?

### Debug Sistemático:
1. [ ] Verifique indicador de cor
2. [ ] Leia mensagem de status
3. [ ] Conte tentativas falhadas
4. [ ] Observe logs no console
5. [ ] Veja histórico de erros
6. [ ] Teste ping manual
7. [ ] Teste endpoint HTTP
8. [ ] Troque modo se necessário
9. [ ] Aguarde backoff/circuit breaker
10. [ ] Reinicie apenas se crítico

---

**📘 Para diagnóstico técnico completo:** `NETWORK_COMPLETE_SOLUTION.md`  
**🚀 Para começar a usar:** `QUICK_START_GUIDE.md`  
**🔧 Para configuração:** `NETWORK_ERROR_SOLUTION.md`

---

**Status:** ✅ PRONTO PARA USO  
**Versão:** 3.0 - Produção Robusta  
**Atualizado:** 16/10/2025
