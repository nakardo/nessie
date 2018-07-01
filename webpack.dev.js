const path = require('path');

module.exports = {
  entry: './lib/nes.js',
  target: 'node',
  mode: 'development',
  output: {
    filename: 'nes.node.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['babel-preset-env', {
                targets: {
                  node: 'current'
                }
              }]
            ],
            plugins: [
              'transform-strict-mode',
              'transform-object-rest-spread',
              'transform-class-properties',
              'add-module-exports'
            ]
          }
        }
      }
    ]
  }
};
