module.exports = {
    apps: [{
        name: 'handbook',
        script: 'node',
        args: 'build/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_restart: 10,
        restart_delay: 5000,
    }],
}