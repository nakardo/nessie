const path = require('path');

module.exports = {
  entry: './scripts/debug.js',
  target: 'node',
  mode: 'development',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
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
              require('babel-plugin-transform-strict-mode'),
              require('babel-plugin-transform-object-rest-spread'),
              require('babel-plugin-transform-class-properties')
            ]
          }
        }
      }
    ]
  }
};
