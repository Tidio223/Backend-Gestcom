const getListenHost = () => process.env.HOST || '127.0.0.1';

const getPort = () => Number(process.env.PORT || 5001);

module.exports = {
  getListenHost,
  getPort,
};
