'use strict';

const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './src/nes.js',
  mode: 'development',
  devtool: 'eval-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    library: 'Nes',
    libraryTarget: 'window',
  },
  plugins: [new CleanWebpackPlugin(['dist'])],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: ['node_modules'],
        use: {loader: 'babel-loader'},
      },
    ],
  },
};
