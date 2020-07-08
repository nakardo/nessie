'use strict';

const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
  entry: './examples/dev-server/app.js',
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    open: true,
  },
  externals: {
    $: 'jquery',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'nessie',
      template: './examples/dev-server/index.html',
      inject: 'body',
    }),
  ],
});
