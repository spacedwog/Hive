module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowUndefined: true,
        },
      ],
      // 🔑 O plugin do Reanimated deve ser o ÚLTIMO
      'react-native-reanimated/plugin',
    ],
  };
};