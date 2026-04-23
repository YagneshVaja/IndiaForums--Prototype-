module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4.x uses the worklets plugin — MUST be listed last
      'react-native-worklets/plugin',
    ],
  };
};
