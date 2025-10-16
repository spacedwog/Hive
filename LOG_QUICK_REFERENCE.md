# 🚀 Guia Rápido - Sistema de Logs

## ⚡ Para Usar no App

1. **Abrir StreamScreen**
2. **Clicar no botão:** `📋 Ver Logs (N)`
3. **Ver logs em tempo real**
4. **Filtrar:** Clique em `[Todos]` `[✅]` `[ℹ️]` `[⚠️]` `[❌]`
5. **Limpar:** Botão `🧹 Limpar Logs`
6. **Fechar:** Botão `✖️ Fechar`

---

## 💻 Para Usar no Código

```typescript
import LogService from "../../hive_brain/hive_one/LogService.ts";

const logService = LogService.getInstance();

// Info (azul ℹ️)
logService.info("Operação iniciada");
logService.info("Conectando ao servidor", "IP: 192.168.1.100");

// Sucesso (verde ✅)
logService.success("Conexão estabelecida");
logService.success("Dados enviados", "200 bytes");

// Aviso (amarelo ⚠️)
logService.warn("Latência alta detectada");
logService.warn("Circuit breaker aberto", "Aguarde 30s");

// Erro (vermelho ❌)
logService.error("Falha na conexão");
logService.error("Timeout", "ESP32 não respondeu");
```

---

## 📊 Níveis de Log

| Nível | Cor | Emoji | Quando usar |
|-------|-----|-------|------------|
| **info** | Azul | ℹ️ | Informações gerais |
| **success** | Verde | ✅ | Operações bem-sucedidas |
| **warn** | Amarelo | ⚠️ | Avisos não-críticos |
| **error** | Vermelho | ❌ | Erros críticos |

---

## 🎨 Interface do Modal

```
┌─────────────────────────────┐
│ 📋 Logs do Sistema          │
├─────────────────────────────┤
│ Total: 45 | ✅:12 ℹ️:15     │
│             ⚠️:8  ❌:10     │
├─────────────────────────────┤
│ [Filtros]                   │
├─────────────────────────────┤
│ Scroll com histórico        │
│ (últimos 100 logs)          │
├─────────────────────────────┤
│ [Limpar] [Fechar]           │
└─────────────────────────────┘
```

---

## 🔧 API Completa

```typescript
const logService = LogService.getInstance();

// Adicionar logs
logService.info(message: string, details?: string)
logService.warn(message: string, details?: string)
logService.error(message: string, details?: string)
logService.success(message: string, details?: string)

// Obter logs
const logs = logService.getLogs() // LogEntry[]

// Limpar logs
logService.clearLogs()

// Estatísticas
const stats = logService.getStats()
// { total, info, warn, error, success }

// Subscription (para componentes React)
logService.subscribe((log: LogEntry) => {
  // Atualiza UI com novo log
})

logService.unsubscribe(callback)
```

---

## 📦 Tipo LogEntry

```typescript
type LogEntry = {
  id: string;           // UUID único
  timestamp: Date;      // Quando ocorreu
  level: LogLevel;      // info|warn|error|success
  message: string;      // Mensagem principal
  details?: string;     // Detalhes opcionais
}
```

---

## 🎯 Exemplos Práticos

### Conectando ao ESP32:
```typescript
logService.info("Conectando ao ESP32...", "IP: 192.168.1.100");

try {
  const status = await esp32Service.fetchStatus();
  logService.success("Conectado ao ESP32", JSON.stringify(status));
} catch (error) {
  logService.error("Falha ao conectar", error.message);
}
```

### Alternando LED:
```typescript
logService.info("Alternando LED...");

try {
  await esp32Service.toggleLed();
  logService.success("LED alternado com sucesso");
} catch (error) {
  logService.error("Erro ao alternar LED", error.message);
}
```

### Circuit Breaker:
```typescript
if (failures >= 5) {
  logService.error(
    "Circuit breaker aberto",
    "Pausando requisições por 30s"
  );
}

// Ao resetar
logService.success(
  "Circuit breaker resetado",
  "Reconectando..."
);
```

### Polling:
```typescript
try {
  const status = await fetchStatus();
  logService.info("Polling bem-sucedido");
} catch (error) {
  logService.warn(
    `Erro no polling (tentativa ${count})`,
    error.message
  );
}
```

---

## ✅ Checklist de Uso

Ao adicionar novo código:

- [ ] Importou LogService?
- [ ] Obteve instância com `getInstance()`?
- [ ] Usou nível correto (info/warn/error/success)?
- [ ] Adicionou detalhes quando relevante?
- [ ] Testou no modal?

---

## 🐛 Troubleshooting

### Logs não aparecem no modal:
1. ✓ LogService importado?
2. ✓ `getInstance()` chamado?
3. ✓ Modal está visível?
4. ✓ Subscription ativa no componente?

### Modal não abre:
1. ✓ Botão "Ver Logs" está presente?
2. ✓ `logModalVisible` state existe?
3. ✓ `setLogModalVisible(true)` é chamado?

### Logs desaparecem:
- ✓ Normal! Limite de 100 logs (FIFO)
- ✓ Use `clearLogs()` para limpar manualmente

---

## 📚 Documentação Completa

- **Implementação:** `LOG_MODAL_IMPLEMENTATION.md`
- **Resumo:** `LOG_SYSTEM_SUMMARY.md`
- **Este guia:** `LOG_QUICK_REFERENCE.md`

---

**Criado:** 16/10/2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para uso
