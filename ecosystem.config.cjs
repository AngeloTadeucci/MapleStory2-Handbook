module.exports = {
  apps: [
    {
      name: 'ms2_handbook',
      script: 'bash',
      args: ['-c', 'node --env-file=.env build'],
    }
  ]
};
