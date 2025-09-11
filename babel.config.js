module.exports = function(api) {
  // Habilita cache para melhor performance
  api.cache(true);

  return {
    presets: ['babel-preset-expo'], // Preset padrão do Expo
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',       // Nome do módulo para importação
          path: '.env',             // Caminho para o arquivo .env
          safe: false,              // Se true, exige que todas as variáveis existam
          allowUndefined: true,     // Permite variáveis indefinidas sem quebrar build
        },
      ],
    ],
  };
};