# 🚨 Guia Rápido - Modais de Erro

## 📋 Todos os Erros que Mostram Modal

### 1. 📷 **Permissão de Câmera Negada**
**Quando:** App solicita permissão e usuário nega  
**O que fazer:** Ir em configurações do dispositivo e permitir acesso à câmera

---

### 2. 🔴 **ESP32 Não Responde (5+ Falhas)**
**Quando:** Polling falha 5 vezes consecutivas  
**O que fazer:**
1. Verificar se ESP32 está ligado
2. Confirmar conexão Wi-Fi
3. Trocar modo (STA ↔ Soft-AP)
4. Verificar IP no .env

---

### 3. ⚠️ **Não Conectou no Novo Modo**
**Quando:** 10s após trocar modo sem sucesso  
**O que fazer:**
1. Aguardar mais alguns segundos
2. Trocar modo novamente
3. Verificar IP do modo atual

---

### 4. 📸 **Câmera Não Pronta**
**Quando:** Tenta tirar foto antes da inicialização  
**O que fazer:** Aguardar inicialização da câmera

---

### 5. 🚫 **Foto Sem Permissão**
**Quando:** Tenta tirar foto sem permissão  
**O que fazer:** Permitir acesso à câmera nas configurações

---

### 6. 🌐 **Erro HTTP Vercel**
**Quando:** API Vercel retorna erro  
**O que fazer:** Verificar se API está online

---

### 7. 📄 **Resposta Inválida Vercel**
**Quando:** API retorna conteúdo não-JSON  
**O que fazer:** Reportar ao desenvolvedor

---

### 8. ❌ **Falha ao Enviar Dados**
**Quando:** POST para Vercel falha  
**O que fazer:** Verificar conexão com internet

---

### 9. 💡 **Toggle LED Falhou**
**Quando:** Erro ao alternar LED  
**O que fazer:** Verificar ESP32

---

### 10. 🔄 **Erro ao Trocar Modo**
**Quando:** Erro durante switch de modo  
**O que fazer:** Tentar novamente

---

## 🎯 Tipos de Modal

### Modal Crítico (Vermelho ❌)
- Bloqueia funcionalidade
- Requer ação do usuário
- Exemplos: permissão negada, câmera não pronta

### Modal de Aviso (Amarelo ⚠️)
- Funcionalidade degradada
- Pode continuar usando
- Exemplos: ESP32 não responde, modo não conecta

### Modal de Erro (Laranja 🔴)
- Operação falhou
- Pode tentar novamente
- Exemplos: falha em API, erro de rede

---

## 🔧 O Que Fazer em Cada Erro

### Se ESP32 Não Responde:
```
1. ✓ Verificar alimentação
2. ✓ Verificar LED Wi-Fi
3. ✓ Testar ping (192.168.x.x)
4. ✓ Trocar modo STA↔Soft-AP
5. ✓ Reiniciar ESP32
```

### Se Câmera Não Funciona:
```
1. ✓ Verificar permissão
2. ✓ Aguardar inicialização
3. ✓ Reiniciar app
4. ✓ Verificar câmera do dispositivo
```

### Se API Vercel Falha:
```
1. ✓ Verificar internet
2. ✓ Verificar VERCEL_URL no .env
3. ✓ Testar URL no navegador
4. ✓ Verificar se API está online
```

---

## 📊 Fluxo de Decisão

```
Erro Ocorreu
     │
     ├─> Ação do usuário?
     │   └─> SIM → ✅ MOSTRA MODAL
     │
     ├─> forceModal = true?
     │   └─> SIM → ✅ MOSTRA MODAL
     │
     └─> Background não-crítico?
         └─> NÃO MOSTRA MODAL
             (apenas logs)
```

---

## ✅ Checklist ao Ver Modal

- [ ] Ler mensagem completa
- [ ] Verificar sugestões (💡)
- [ ] Anotar informações (IP, modo)
- [ ] Seguir sugestões em ordem
- [ ] Ver logs se necessário
- [ ] Reportar se persistir

---

**Documentação completa:** `ERROR_MODALS_IMPLEMENTATION.md`  
**Sistema de logs:** `LOG_QUICK_REFERENCE.md`
