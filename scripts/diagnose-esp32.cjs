/**
 * Script de diagnóstico ESP32
 * Testa conectividade e configuração do ESP32
 */

const http = require('http');
const https = require('https');

// Configurações do .env
const ESP32_STA_IP = '192.168.15.188';
const ESP32_SOFTAP_IP = '192.168.4.1';
const AUTH_USERNAME = 'spacedwog';
const AUTH_PASSWORD = 'Kimera12@';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(host, path, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: 80,
      path: path,
      method: 'GET',
      timeout: timeout,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${AUTH_USERNAME}:${AUTH_PASSWORD}`).toString('base64')
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testConnection(ip, mode) {
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  log(`🧪 Testando modo ${mode} (${ip})`, colors.blue);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);

  // Teste 1: Ping básico (tentativa de conexão)
  log(`\n[1/4] 🏓 Teste de conectividade básica...`, colors.yellow);
  try {
    const result = await makeRequest(ip, '/status', 5000);
    log(`  ✅ Conectividade OK (Status HTTP ${result.statusCode})`, colors.green);
    
    // Teste 2: Parse do JSON
    log(`\n[2/4] 📦 Validando resposta JSON...`, colors.yellow);
    try {
      const jsonData = JSON.parse(result.data);
      log(`  ✅ JSON válido recebido`, colors.green);
      log(`  📊 Dados recebidos:`, colors.cyan);
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Teste 3: Validar estrutura esperada
      log(`\n[3/4] 🔍 Validando estrutura de dados...`, colors.yellow);
      const expectedFields = ['led_builtin', 'led_opposite', 'sensor_db', 'ip_ap', 'ip_sta'];
      const missingFields = expectedFields.filter(field => !(field in jsonData));
      
      if (missingFields.length === 0) {
        log(`  ✅ Estrutura de dados completa`, colors.green);
      } else {
        log(`  ⚠️  Campos faltando: ${missingFields.join(', ')}`, colors.yellow);
      }
      
      // Teste 4: Verificar IPs configurados
      log(`\n[4/4] 🌐 Verificando configuração de rede...`, colors.yellow);
      log(`  IP AP (Soft-AP): ${jsonData.ip_ap || 'N/A'}`, colors.cyan);
      log(`  IP STA (WiFi): ${jsonData.ip_sta || 'N/A'}`, colors.cyan);
      
      if (jsonData.ip_sta && jsonData.ip_sta !== ip && mode === 'STA') {
        log(`  ⚠️  AVISO: IP no .env (${ip}) diferente do ESP32 (${jsonData.ip_sta})`, colors.yellow);
        log(`  💡 Atualize o .env com: ESP32_STA_IP=http://${jsonData.ip_sta}`, colors.yellow);
      } else if (mode === 'STA') {
        log(`  ✅ IP configurado corretamente`, colors.green);
      }
      
      return true;
    } catch (parseErr) {
      log(`  ❌ Erro ao parsear JSON: ${parseErr.message}`, colors.red);
      log(`  📄 Resposta raw:`, colors.yellow);
      console.log(result.data);
      return false;
    }
  } catch (err) {
    log(`  ❌ Falha na conectividade: ${err.message}`, colors.red);
    
    if (err.message === 'Timeout') {
      log(`  💡 O ESP32 não respondeu em 5 segundos`, colors.yellow);
      log(`     - Verifique se está ligado`, colors.yellow);
      log(`     - Confirme que está na mesma rede (para modo STA)`, colors.yellow);
    } else if (err.code === 'ECONNREFUSED') {
      log(`  💡 Conexão recusada`, colors.yellow);
      log(`     - O ESP32 pode estar ligado mas não aceitando conexões`, colors.yellow);
      log(`     - Verifique o firmware do ESP32`, colors.yellow);
    } else if (err.code === 'ENETUNREACH' || err.code === 'EHOSTUNREACH') {
      log(`  💡 Rede inacessível`, colors.yellow);
      log(`     - Você não está na mesma rede que o ESP32`, colors.yellow);
      log(`     - Para modo STA: conecte-se ao mesmo WiFi`, colors.yellow);
      log(`     - Para Soft-AP: conecte-se à rede do ESP32`, colors.yellow);
    }
    
    return false;
  }
}

async function getSystemInfo() {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  log(`💻 Informações do Sistema`, colors.blue);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  
  log(`\n📱 Interfaces de rede ativas:`, colors.yellow);
  
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    const ipv4 = interfaces.find(iface => iface.family === 'IPv4' && !iface.internal);
    if (ipv4) {
      log(`  • ${name}: ${ipv4.address}`, colors.green);
      
      // Verifica se está na mesma sub-rede que o ESP32
      const deviceSubnet = ipv4.address.split('.').slice(0, 3).join('.');
      const esp32Subnet = ESP32_STA_IP.split('.').slice(0, 3).join('.');
      
      if (deviceSubnet === esp32Subnet) {
        log(`    ✅ Na mesma sub-rede que o ESP32 (${esp32Subnet}.x)`, colors.green);
      }
    }
  }
}

async function main() {
  log(`\n╔════════════════════════════════════════╗`, colors.cyan);
  log(`║   🔧 Diagnóstico ESP32 - Hive App      ║`, colors.cyan);
  log(`╚════════════════════════════════════════╝`, colors.cyan);
  
  await getSystemInfo();
  
  log(`\n📋 Configurações do .env:`, colors.yellow);
  log(`  ESP32_STA_IP: http://${ESP32_STA_IP}`, colors.cyan);
  log(`  ESP32_SOFTAP_IP: http://${ESP32_SOFTAP_IP}`, colors.cyan);
  
  // Testa modo STA (WiFi normal)
  const staSuccess = await testConnection(ESP32_STA_IP, 'STA');
  
  // Testa modo Soft-AP (ponto de acesso do ESP32)
  const apSuccess = await testConnection(ESP32_SOFTAP_IP, 'Soft-AP');
  
  // Resumo final
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  log(`📊 Resumo do Diagnóstico`, colors.blue);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
  
  if (staSuccess) {
    log(`\n✅ Modo STA funcionando corretamente`, colors.green);
    log(`   Use este IP no app: http://${ESP32_STA_IP}`, colors.green);
  } else {
    log(`\n❌ Modo STA não está acessível`, colors.red);
  }
  
  if (apSuccess) {
    log(`\n✅ Modo Soft-AP funcionando corretamente`, colors.green);
    log(`   Conecte-se à rede WiFi do ESP32 e use: http://${ESP32_SOFTAP_IP}`, colors.green);
  } else {
    log(`\n❌ Modo Soft-AP não está acessível`, colors.red);
  }
  
  if (!staSuccess && !apSuccess) {
    log(`\n🔴 PROBLEMA CRÍTICO: Nenhum modo está funcionando`, colors.red);
    log(`\n🔧 Próximos passos:`, colors.yellow);
    log(`   1. Verifique se o ESP32 está ligado (LED deve estar aceso)`, colors.yellow);
    log(`   2. Verifique o cabo USB e a fonte de alimentação`, colors.yellow);
    log(`   3. Acesse o monitor serial do ESP32 para ver logs`, colors.yellow);
    log(`   4. Reflashe o firmware se necessário`, colors.yellow);
    log(`   5. Verifique se o firewall não está bloqueando a conexão`, colors.yellow);
  } else if (staSuccess && !apSuccess) {
    log(`\n💡 RECOMENDAÇÃO: Use o modo STA`, colors.yellow);
    log(`   O modo STA está funcionando. Certifique-se de estar sempre na mesma rede WiFi.`, colors.yellow);
  } else if (!staSuccess && apSuccess) {
    log(`\n💡 RECOMENDAÇÃO: Use o modo Soft-AP temporariamente`, colors.yellow);
    log(`   Para usar o modo STA:`, colors.yellow);
    log(`   1. Conecte-se à rede WiFi do ESP32 (Soft-AP)`, colors.yellow);
    log(`   2. Configure as credenciais WiFi do ESP32`, colors.yellow);
    log(`   3. Anote o novo IP que o ESP32 receber`, colors.yellow);
    log(`   4. Atualize o .env com o novo IP`, colors.yellow);
  }
  
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, colors.cyan);
}

main().catch(err => {
  log(`\n❌ Erro fatal no diagnóstico: ${err.message}`, colors.red);
  console.error(err);
  process.exit(1);
});
