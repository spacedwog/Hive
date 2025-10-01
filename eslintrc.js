module.exports = {
  root: true,
  env: {
    node: true,           // Permite __dirname, __filename e globals do Node
    es2021: true,         // Suporte para ES2021
    browser: true,        // Permite globals do navegador (se necessário)
  },
  parserOptions: {
    ecmaVersion: 2021,    // Suporte a sintaxe moderna
    sourceType: "module", // Permite import/export
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-native/all"
  ],
  plugins: ["react", "react-native"],
  rules: {
    // Ajustes recomendados
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": ["error"],
    "react/prop-types": "off", // desativa prop-types se usar TypeScript
    "react-native/no-inline-styles": "warn",
    "react-native/no-unused-styles": "warn",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};