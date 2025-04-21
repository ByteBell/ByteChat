const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ExtensionReloader = require('webpack-extension-reloader');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    index: path.join(__dirname, 'src', 'index.tsx')
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'manifest.json', to: '.' }
      ]
    }),
    process.env.NODE_ENV === 'development' 
      ? new ExtensionReloader({
          reloadPage: true,
          entries: {
            contentScript: 'index',
            background: 'background',
            extensionPage: 'popup'
          }
        })
      : null
  ].filter(Boolean),
  devtool: 'cheap-module-source-map'
};