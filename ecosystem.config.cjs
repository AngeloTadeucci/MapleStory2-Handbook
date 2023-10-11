module.exports = {
  apps: [
    {
      name: 'ms2_handbook',
      interpreter: 'node',
      interpreterArgs: '-r dotenv/config build',
      script: 'build/index.js'
    }
  ]
};
