module.exports = {
    configureWebpack: {
        output: {
            filename: '[name].[hash].js',
            chunkFilename: '[name].[hash].js'
        }
    },
    devServer: {
        https: false,
        port: 8081
    }
}