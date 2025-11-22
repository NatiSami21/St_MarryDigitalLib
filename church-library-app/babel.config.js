module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }], // Configure expo preset for nativewind
      'nativewind/babel', // This should be treated as a preset/part of the config
    ],
    plugins: [
      // 2. DotEnv
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
        },
      ],
      // 3. Reanimated (must be the last plugin)
      'react-native-reanimated/plugin',
    ],
  };
};
