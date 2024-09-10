module.exports = {
  apps: [
    {
      name: 'ms2_handbook',
      interpreter: 'node',
      script: '--env-file=.env build'
    }
  ]
};
