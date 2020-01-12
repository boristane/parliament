const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  mode: 'production',
  watchOptions: {
    ignored: /node_modules/,
  },
  devtool: 'source-map'
};
