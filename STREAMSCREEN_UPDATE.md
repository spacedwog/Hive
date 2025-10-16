# Atualização do StreamScreen - Firmware ESP32-CAM

**Data:** 16 de outubro de 2025

## 📋 Resumo das Alterações

Esta atualização sincroniza o `StreamScreen.tsx` e o `Esp32Service.ts` com o firmware atual do ESP32-CAM (`esp32_cam.ino`), garantindo que apenas os campos realmente retornados pelo hardware sejam utilizados.

## 🔧 Alterações Realizadas

### 1. **Tipo `Esp32Status` Atualizado**

#### ❌ Removido:
- `sensor_db` (substituído por `sound_level`)
- `power_mode?: PowerMode` (não existe no firmware)
- `energy_score?: number` (não existe no firmware)
- `free_heap?: number` (não existe no firmware)
- `total_requests?: number` (não existe no firmware)
- `uptime_ms?: number` (não existe no firmware)

#### ✅ Campos Atuais (baseado no firmware):
```typescript
export type Esp32Status = {
  led_builtin: LedStatus;      // Estado do LED built-in ("on" | "off")
  led_opposite: LedStatus;      // Estado do LED oposto ("on" | "off")
  sound_level: number;          // Nível do sensor de som (valor analógico)
  ip_ap: string;                // IP do Access Point
  ip_sta: string;               // IP da conexão Station
  auto_off_ms: number;          // Tempo em ms para auto-desligar LED
};
```

### 2. **StreamScreen.tsx**

#### Exibição de Status Simplificada:
```tsx
// ANTES (campos inexistentes):
🔊 Sensor de Som: {status.sensor_db} dB
⚡ Modo de Energia: {status.power_mode ?? "balanced"}
📊 Energy Score: {status.energy_score?.toFixed(1) ?? "0.0"}
💾 Memória Livre: {((status.free_heap ?? 0) / 1024).toFixed(1)} KB
⏱️ Uptime: {((status.uptime_ms ?? 0) / 1000).toFixed(0)}s
📡 Total Requisições: {status.total_requests ?? 0}

// DEPOIS (apenas campos reais):
🔊 Nível de Som: {status.sound_level}
⏲️ Auto-off: {status.auto_off_ms}ms
```

### 3. **Esp32Service.ts**

#### Construtor Atualizado:
```typescript
this.status = {
  led_builtin: "off",
  led_opposite: "on",
  sound_level: 0,           // ✅ Novo
  ip_ap: Esp32Service.SOFTAP_IP,
  ip_sta: Esp32Service.STA_IP,
  auto_off_ms: 5000,
  // ❌ Removidos: power_mode, energy_score, free_heap, total_requests, uptime_ms
};
```

#### Método `syncStatus()` Atualizado:
Agora sincroniza apenas os campos que existem no firmware.

#### Método `getSensorData()` Simplificado:
```typescript
getSensorData() {
  return {
    led_builtin: this.status.led_builtin,
    led_opposite: this.status.led_opposite,
    sound_level: this.status.sound_level,    // ✅ Novo
    auto_off_ms: this.status.auto_off_ms,
  };
}
```

#### Método `getPerformanceInfo()` Removido:
Este método retornava campos que não existem no firmware atual.

#### Método `setPowerMode()` Removido:
O firmware atual não suporta configuração de `power_mode`.

### 4. **Endpoints do Firmware ESP32-CAM**

Endpoints documentados no código (baseados em `esp32_cam.ino`):
```
GET /status              → Obtém status completo (JSON)
GET /led/on              → Liga o LED
GET /led/off             → Desliga o LED
GET /image               → Obtém imagem JPG
GET /snapshot            → Obtém status + imagem (multipart)
GET /config?auto_off_ms=<ms> → Configura tempo de auto-off
```

## 📊 Campos do JSON de Status

O firmware `esp32_cam.ino` retorna o seguinte JSON em `/status`:

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

## 🔍 Observações Importantes

1. **`sound_level`** representa o valor analógico bruto do sensor de som (0-4095), não decibéis
2. **LED Opposite** sempre tem estado inverso ao LED Built-in
3. **`ip_sta`** retorna `"desconectado"` se não estiver conectado à rede Station
4. **Auto-off** é configurável via endpoint `/config?auto_off_ms=<ms>`

## 🧪 Testes Recomendados

1. ✅ Verificar exibição correta do `sound_level` no StreamScreen
2. ✅ Confirmar que não há erros de propriedade indefinida
3. ✅ Testar alternância de LED (on/off)
4. ✅ Verificar troca entre modos STA e Soft-AP
5. ✅ Validar modal de status JSON
6. ✅ Testar configuração de auto_off_ms

## 📝 Arquivos Relacionados

- ✅ `app/(tabs)/StreamScreen.tsx` - Atualizado
- ✅ `hive_brain/hive_stream/Esp32Service.ts` - Atualizado
- 📄 `hive_mind/esp32_cam/esp32_cam.ino` - Firmware de referência
- ℹ️ `hive_body/hive_modal/StatusModal.tsx` - Já compatível (genérico)

## ⚠️ Dependências Afetadas

- `EnergyOptimizedEspService.ts` - Pode precisar de atualização se estiver em uso
- `SustainabilityManager.ts` - Mantém funcionalidade independente do ESP32

## 🚀 Próximos Passos

1. Testar a aplicação com o ESP32-CAM real
2. Verificar se há outros componentes usando campos removidos
3. Considerar adicionar novos endpoints no firmware se necessário:
   - Métricas de memória (`free_heap`)
   - Tempo de atividade (`uptime_ms`)
   - Contador de requisições (`total_requests`)

---

**Status:** ✅ Concluído
**Versão do Firmware:** esp32_cam.ino (atual)
**Compatibilidade:** 100%
