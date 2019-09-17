var path = require('path');
var HtmlWebpackPlugin =  require('html-webpack-plugin');
const webpack = require("webpack");

console.log('Loading process.env')
require('dotenv').config()

const env = Object.keys(process.env).reduce((memo, key) => {
  memo[key] = JSON.stringify(process.env[key]);
  return memo;
}, {});

module.exports = {
    entry : './app/App.jsx',
    output : {
        path : path.resolve(__dirname , 'dist'),
        filename: 'index_bundle.js'
    },
    module : {
        rules : [
            {
              test: /\.(js|jsx)$/,
              loader: 'babel-loader',
              exclude: /node_modules/,
              query: {
                presets: ["@babel/preset-env"]
              }
            },
            {
              test : /\.css$/,
              use:['style-loader', 'css-loader']
            }
        ]
    },
    node: { fs: 'empty' },
    mode:'development',
    plugins : [
      new HtmlWebpackPlugin ({
          template : 'app/index.html'
      }),
      new webpack.DefinePlugin({
        "process.env": env
      })
    ]

}
