# 🐝 Hive - Smart Sustainability IoT Platform

Sistema inteligente de monitoramento e controle IoT com foco em sustentabilidade, integrado com ESP32, GitHub Issues e Vercel.

---

## 🚨 TROUBLESHOOTING ESP32

Se você está tendo problemas de conexão com o ESP32:

### 🔧 Teste Rápido
```bash
# Windows
scripts\test-esp32.bat

# Ou diagnóstico completo
node scripts\diagnose-esp32.cjs
```

### 📚 Documentação de Suporte
- **Problema comum:** [README_FIX.md](README_FIX.md) - Resumo executivo
- **Diagnóstico:** [DIAGNOSTIC_REPORT.md](DIAGNOSTIC_REPORT.md) - Análise detalhada  
- **Solução:** [SOLUTION_REFLASH_FIRMWARE.md](SOLUTION_REFLASH_FIRMWARE.md) - Passo a passo
- **Guia completo:** [ESP32_CONNECTION_GUIDE.md](ESP32_CONNECTION_GUIDE.md) - Troubleshooting

---

## 🚀 Get Started

### 1. Configure o ambiente

```bash
npm install
```

### 2. Configure variáveis de ambiente

Copie `.env.example` para `.env` e configure:

```env
# ESP32 Configuration
ESP32_STA_IP=http://192.168.15.188
ESP32_SOFTAP_IP=http://192.168.4.1

# GitHub Configuration  
GITHUB_TOKEN=your_token_here
GITHUB_OWNER=spacedwog
GITHUB_REPO=hive

# Vercel Configuration
VERCEL_TOKEN=your_token_here
```

### 3. Configure o ESP32

Antes de iniciar o app, certifique-se de que o ESP32 está funcionando:

```bash
# Teste a conexão
node scripts\diagnose-esp32.cjs
```

Se o teste falhar, siga: [SOLUTION_REFLASH_FIRMWARE.md](SOLUTION_REFLASH_FIRMWARE.md)

### 4. Inicie o app

```bash
npx expo start
```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# hive
# hive
# Hive
