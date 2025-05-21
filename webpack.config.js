// webpack.config.js
const path               = require('path');
const HtmlWebpackPlugin  = require('html-webpack-plugin');
const CopyPlugin         = require('copy-webpack-plugin');
const ExtensionReloader  = require('webpack-ext-reloader');

module.exports = {
  mode: process.env.NODE_ENV || 'development',

    entry: {
      popup: './src/index.tsx',
      contentScript: './src/contentScript.ts',
      background: './src/background.ts',
    },

  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },

  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/,  use: ['style-loader', 'css-loader', 'postcss-loader'] },
    ],
  },

  resolve: { extensions: ['.tsx', '.ts', '.js'] },

  plugins: [
    /* ①  Generates dist/popup.html and injects the bundle */
    new HtmlWebpackPlugin({
      template: 'public/popup.html',      // <- source file
      filename: 'popup.html',             // <- output file
      inject: 'body',
      chunks: ['index']  
    }),

    /* ②  Copies everything that isn’t bundled */
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' }, // KEEP THIS – copies the manifest
        { from: 'icons',         to: 'icons' }      
      ],
    }),

    /* ③  Hot-reload in dev only */
    process.env.NODE_ENV === 'development' &&
      new ExtensionReloader({
        reloadPage: true,
        entries: { extensionPage: 'popup'},
      }),
  ].filter(Boolean),

  devtool: 'cheap-module-source-map',
};
