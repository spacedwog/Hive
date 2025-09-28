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
      // 🔑 O plugin do Reanimated SEMPRE deve ser o último
      'react-native-reanimated/plugin',
    ],
  };
};