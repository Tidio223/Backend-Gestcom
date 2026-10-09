const getListenHost = () => process.env.HOST || '0.0.0.0';

const getPort = () => Number(process.env.PORT || 5001);

module.exports = {
  getListenHost,
  getPort,
};
