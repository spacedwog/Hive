# 🚀 ESP32 Vespa - Quick Reference

## 📡 Connection
```typescript
import Esp32Service from './Esp32Service';
const esp32 = new Esp32Service();
```

## 🔗 IPs
- **STA Mode:** `http://192.168.15.188` (your WiFi)
- **Soft-AP Mode:** `http://192.168.4.1` (direct)

## 🔐 Auth
```
Username: spacedwog
Password: Kimera12@
```

## 📊 Methods

### Get Status
```typescript
const status = await esp32.fetchStatus();
// Returns: device, status, sensors, location...
```

### Activate/Deactivate
```typescript
await esp32.activate();    // Turns device ON
await esp32.deactivate();  // Turns device OFF
```

### Ping
```typescript
const result = await esp32.ping();
// Returns: { result: "success", analog_percent: 67.3 }
```

### Check Connection
```typescript
const isConnected = await esp32.checkConnection();
// Auto-switches to Soft-AP if STA fails
```

### Switch Mode
```typescript
esp32.switchMode();  // Toggle STA ↔ Soft-AP
```

### Get Sensor Data
```typescript
const sensors = esp32.getSensorData();
// Returns: ultrasonico, analogico, presenca, temperatura, umidade, localizacao
```

### Check if Active
```typescript
const active = esp32.isActive();  // true/false
```

## 📡 Status Response
```json
{
  "device": "Vespa",
  "status": "ativo",              // or "parado"
  "ultrassonico_m": 1.25,         // distance in meters
  "analog_percent": 67.3,         // 0-100%
  "presenca": true,               // PIR sensor
  "temperatura_C": 24.5,          // DHT22 (optional)
  "umidade_pct": 65.2,            // DHT22 (optional)
  "wifi_mode": "STA",             // or "AP"
  "ip": "192.168.15.188",
  "timestamp": "2025-10-15T14:30:25Z",
  "location": {
    "latitude": -23.550520,
    "longitude": -46.633308
  }
}
```

## 🧪 Test with cURL

### Status
```bash
curl -u spacedwog:Kimera12@ http://192.168.15.188/status
```

### Activate
```bash
curl -X POST -u spacedwog:Kimera12@ \
  -H "Content-Type: application/json" \
  -d '{"command":"activate"}' \
  http://192.168.15.188/command
```

### Deactivate
```bash
curl -X POST -u spacedwog:Kimera12@ \
  -H "Content-Type: application/json" \
  -d '{"command":"deactivate"}' \
  http://192.168.15.188/command
```

### Ping
```bash
curl -X POST -u spacedwog:Kimera12@ \
  -H "Content-Type: application/json" \
  -d '{"command":"ping"}' \
  http://192.168.15.188/command
```

## ⚙️ Sensors

| Sensor | GPIO | Range | Unit |
|--------|------|-------|------|
| Ultrasonic | 21/22 | 0-4m | meters |
| Potentiometer | 33 | 0-4095 | % |
| PIR Motion | 25 | - | bool |
| DHT22 Temp | 26 | -40~80 | °C |
| DHT22 Humidity | 26 | 0-100 | % |
| Control Pin | 32 | - | on/off |

## 🔧 Troubleshooting

### HTTP 404
✅ Fixed! Use only `/status` and `/command` endpoints

### Connection Failed
```bash
# Check ESP32 is on
ping 192.168.15.188

# Try Soft-AP mode
esp32.switchMode();
```

### Find ESP32 IP
1. USB Serial Monitor (115200 baud)
2. Router DHCP client list
3. `arp -a` (Windows)

## 📚 Full Docs
- `hive_mind/ESP32_VESPA_API.md` - Complete API reference
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `.env.example` - Configuration template
