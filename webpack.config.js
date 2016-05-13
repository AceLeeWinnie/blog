var path = require('path');
var webpack = require('webpack');
var node_modules_dir = path.resolve(__dirname, 'node_modules');

var config = {
  entry: {
    'demo': [
      './src/main.js',
      'webpack/hot/dev-server',
      'webpack-dev-server/client?http://localhost:3001'
    ]
  },
  output: {
    path: __dirname,
    filename: '[name].js',
    publicPath: "http://localhost:3001/assets/"
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: [node_modules_dir],
      loaders: ['react-hot-loader', 'babel-loader']
    }]
  },
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ]
};
