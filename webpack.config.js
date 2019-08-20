var path = require('path');
var HtmlWebpackPlugin =  require('html-webpack-plugin');

module.exports = {
    entry : './app/index.jsx',
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
    mode:'development',
    plugins : [
        new HtmlWebpackPlugin ({
            template : 'app/index.html'
        })
    ]

}
