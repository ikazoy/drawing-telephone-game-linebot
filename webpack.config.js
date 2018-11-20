const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: slsw.lib.entries,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  externals: [nodeExternals()],
  plugins: [
    new Dotenv(),
  ],
};
