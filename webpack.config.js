// webpack.config.js
const path               = require('path');
const HtmlWebpackPlugin  = require('html-webpack-plugin');
const CopyPlugin         = require('copy-webpack-plugin');
const ExtensionReloader  = require('webpack-ext-reloader');

module.exports = {
  mode: process.env.NODE_ENV || 'development',

    entry: {
      /* popup UI                      → dist/index.js  (or rename to popup) */
      index:         path.join(__dirname, 'src', 'index.tsx'),
      /* side panel UI                 → dist/panel.js */
      panel:         path.join(__dirname, 'src', 'index.tsx'),
      /* injected page script          → dist/contentScript.js */
      contentScript: path.join(__dirname, 'src', 'contentScript.ts'),
      background:    path.join(__dirname, "src", "background.ts")

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

    /* ②  Copies everything that isn't bundled */
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' }, // KEEP THIS – copies the manifest
        { from: 'panel.html', to: '.' },    // Copy side panel HTML
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
  //  isDev && new ExtensionReloader({
  //      manifest: path.resolve(__dirname, 'manifest.json'),
  //      entries: {
  //        background: 'background',
  //        contentScript: 'contentScript',
  //        extensionPage: 'popup',
  //      },
  //      // note: omit reloadPage → true if you don’t want the page to refresh on each build
  //    }),
  //   ].filter(Boolean),  

  devtool: 'cheap-module-source-map',
};

