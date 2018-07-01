'use strict';

const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './lib/nes.js',
  target: 'node',
  mode: 'development',
  output: {
    filename: 'nes.node.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  plugins: [
    new CleanWebpackPlugin(['dist'])
  ],
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