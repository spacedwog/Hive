const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname); // 🔑 Necessário para Reanimated 4.1.1 funcionar com Expo 54
config.resolver.sourceExts.push('cjs');
module.exports = config;