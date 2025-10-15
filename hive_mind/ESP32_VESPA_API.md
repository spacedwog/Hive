# ESP32 Vespa - Documentação da API

## 📡 Visão Geral

O ESP32 Vespa é um dispositivo IoT que monitora diversos sensores e pode ser controlado remotamente via HTTP.

## 🔐 Autenticação

Todos os endpoints requerem autenticação HTTP Basic:

```
Username: spacedwog
Password: Kimera12@
```

**Header de Autenticação:**
```
Authorization: Basic c3BhY2Vkd29nOktpbWVyYTEyQA==
```

## 🌐 Modos de Conexão

O ESP32 Vespa suporta dois modos de conexão:

### 1. **Modo STA (Station)**
- Conecta-se à rede WiFi: `FAMILIA SANTOS`
- IP padrão configurado: `http://192.168.15.188`
- Usado quando o dispositivo está na mesma rede

### 2. **Modo Soft-AP (Access Point)**
- Cria sua própria rede WiFi: `HIVE VESPA`
- IP padrão: `http://192.168.4.1`
- Usado quando conectado diretamente ao ESP32

## 📍 Endpoints Disponíveis

### 1. GET `/status`

Retorna o status completo do dispositivo e leituras dos sensores.

**Request:**
```http
GET /status HTTP/1.1
Host: 192.168.15.188
Authorization: Basic c3BhY2Vkd29nOktpbWVyYTEyQA==
```

**Response (200 OK):**
```json
{
  "device": "Vespa",
  "status": "ativo",
  "ultrassonico_m": 1.25,
  "analog_percent": 67.3,
  "presenca": true,
  "temperatura_C": 24.5,
  "umidade_pct": 65.2,
  "wifi_mode": "STA",
  "ip": "192.168.15.188",
  "timestamp": "2025-10-15T14:30:25Z",
  "location": {
    "latitude": -23.550520,
    "longitude": -46.633308
  }
}
```

**Campos:**
- `device`: Nome do dispositivo ("Vespa")
- `status`: Estado do dispositivo ("ativo" ou "parado")
- `ultrassonico_m`: Distância medida pelo sensor ultrassônico em metros
- `analog_percent`: Leitura do potenciômetro em percentual (0-100%)
- `presenca`: Detecção de presença pelo sensor PIR (true/false)
- `temperatura_C`: Temperatura em Celsius (pode ser null se sensor DHT22 falhar)
- `umidade_pct`: Umidade relativa em percentual (pode ser null)
- `wifi_mode`: Modo WiFi atual ("STA" ou "AP")
- `ip`: Endereço IP atual do dispositivo
- `timestamp`: Data/hora em formato ISO 8601
- `location`: Coordenadas GPS fixas do dispositivo

---

### 2. POST `/command`

Envia comandos para controlar o dispositivo.

**Request:**
```http
POST /command HTTP/1.1
Host: 192.168.15.188
Authorization: Basic c3BhY2Vkd29nOktpbWVyYTEyQA==
Content-Type: application/json

{
  "command": "activate"
}
```

**Comandos Disponíveis:**

#### `activate`
Ativa o dispositivo (liga o pino GPIO 32).

**Response:**
```json
{
  "result": "success",
  "status": "ativo"
}
```

#### `deactivate`
Desativa o dispositivo (desliga o pino GPIO 32).

**Response:**
```json
{
  "result": "success",
  "status": "parado"
}
```

#### `ping`
Testa a conexão e retorna leitura analógica.

**Response:**
```json
{
  "result": "success",
  "analog_percent": 67.3
}
```

**Erros:**
```json
{
  "result": "error",
  "status": "comando inválido"
}
```

## 🔧 Sensores Integrados

| Sensor | GPIO | Descrição |
|--------|------|-----------|
| **Ultrassônico** | TRIG: 21, ECHO: 22 | Mede distância (0-400cm) |
| **Potenciômetro** | 33 | Leitura analógica (0-4095) |
| **PIR** | 25 | Sensor de presença/movimento |
| **DHT22** | 26 | Temperatura e umidade |
| **GPIO 32** | 32 | Pino de controle (ativação) |

## 🛠️ Exemplo de Uso em TypeScript

```typescript
import Esp32Service from './Esp32Service';

const esp32 = new Esp32Service();

// Verificar conexão
await esp32.checkConnection();

// Buscar status
const status = await esp32.fetchStatus();
console.log('Temperatura:', status.temperatura_C);
console.log('Presença detectada:', status.presenca);

// Ativar dispositivo
await esp32.activate();

// Desativar dispositivo
await esp32.deactivate();

// Testar conexão
await esp32.ping();

// Obter dados dos sensores
const sensors = esp32.getSensorData();
console.log('Distância:', sensors.ultrasonico, 'm');
console.log('Umidade:', sensors.umidade, '%');
```

## 🔄 Reconexão Automática

O `Esp32Service` implementa reconexão automática com:
- **Backoff exponencial**: Aumenta o tempo entre tentativas
- **Máximo de 10 tentativas** por padrão
- **Fallback automático**: Tenta Soft-AP se STA falhar

## ⚠️ Troubleshooting

### Erro: HTTP 404
**Problema:** Endpoint não encontrado.
**Solução:** Verifique se está usando `/status` ou `/command` (não `/led/on`, `/snapshot`, etc.)

### Erro: HTTP 401
**Problema:** Autenticação falhou.
**Solução:** Verifique as credenciais (spacedwog:Kimera12@)

### Erro: Timeout
**Problema:** ESP32 não responde.
**Soluções:**
1. Verifique se o ESP32 está ligado
2. Confirme o IP correto no arquivo `.env`
3. Verifique se está na mesma rede WiFi
4. Tente alternar entre modos STA e Soft-AP

### Erro: Network Error
**Problema:** Não consegue alcançar o dispositivo.
**Soluções:**
1. Ping o IP: `ping 192.168.15.188`
2. Verifique firewall/roteador
3. Tente conectar diretamente ao AP do ESP32

## 🔗 Integração PROIoT

O ESP32 Vespa envia automaticamente dados de temperatura, umidade e localização para a plataforma PROIoT:
- **Servidor:** things.proiot.network
- **Token:** HIVE-TOKEN
- **Dispositivo:** HIVE-PRIME

## 📝 Notas

1. O ESP32 tenta conectar ao STA primeiro, fallback para AP após 10 segundos
2. Timestamp é sincronizado via NTP (pool.ntp.org)
3. Comunicação UART com ESP32-CAM na Serial1 (RX: 17, TX: 16, 9600 baud)
4. Buffer ultrassônico usa média móvel de 5 leituras para estabilidade
