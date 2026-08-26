module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@src':        './src',
            '@screens':    './src/screens',
            '@components': './src/components',
            '@constants':  './src/constants',
            '@utils':      './src/utils',
            '@store':      './src/store',
            '@hooks':      './src/hooks',
            '@db':         './src/db',
            '@sync':       './src/sync',
          },
        },
      ],
    ],
  };
};
