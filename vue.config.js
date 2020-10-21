module.exports = {
    publicPath: '/work',
    lintOnSave: false,
    devServer: {
        https: false,
        proxy: {
            '^/(task)': {
                target: 'http://81.68.200.164:4001/',//订单接口
                // target: 'http://localhost:4001/',//订单接口
                ws: true,
                changOrigin: true,
            },
            '^/(md)': {
                target: 'http://81.68.200.164:4001/',//订单接口
                // target: 'http://localhost:4001/',//订单接口
                ws: true,
                changOrigin: true,
            },
            '^/(socket.io)': {
                // target: 'http://81.68.200.164:4001/',//订单接口
                target: 'http://localhost:4002/',//订单接口
                ws: true,
                changOrigin: true,
            }
        }
    }
}