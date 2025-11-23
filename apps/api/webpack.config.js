const webpack = require('webpack');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      // Externalize native modules
      'playwright',
      'playwright-core',
      'argon2',
      '@mapbox/node-pre-gyp',
      'mock-aws-s3',
      'aws-sdk',
      'nock',
    ],
    plugins: [
      ...options.plugins,
      // Ignore optional dependencies and UI assets
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/.*$/,
        contextRegExp: /playwright-core[\/\\]lib[\/\\]vite[\/\\]recorder/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^(mock-aws-s3|aws-sdk|nock)$/,
      }),
    ],
  };
};
