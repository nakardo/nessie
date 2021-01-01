'use strict';

const path = require('path');
const webpack = require('webpack');

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new webpack.ProvidePlugin({process: 'process/browser'}),
    new webpack.NormalModuleReplacementPlugin(
      /.*assert$/,
      path.resolve(__dirname, 'src/shims/assert.js'),
    ),
    new webpack.NormalModuleReplacementPlugin(
      /.*number$/,
      path.resolve(__dirname, 'src/shims/number.js'),
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^canvas$/,
      path.resolve(__dirname, 'src/shims/canvas.js'),
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^debug$/,
      path.resolve(__dirname, 'src/shims/debug.js'),
    ),
  ],
};
