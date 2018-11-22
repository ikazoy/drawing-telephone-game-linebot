const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const Dotenv = require('dotenv-webpack');

module.exports = {
  target: 'node',
  entry: slsw.lib.entries,
  // slsw.lib.webpack.isLocal is set to false somehow.....
  mode: slsw.lib.serverless.service.provider.stage === 'development' ? 'development' : 'production',
  externals: [nodeExternals()],
  plugins: [
    new Dotenv(),
  ],
};
