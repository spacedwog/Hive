// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🔑 Reanimated exige que o Metro reconheça arquivos .cjs
config.resolver.sourceExts.push('cjs');

module.exports = config;