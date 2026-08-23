const { getListenHost, getPort } = require('../config/serverConfig');

describe('server configuration', () => {
  const originalHost = process.env.HOST;
  const originalPort = process.env.PORT;

  afterEach(() => {
    if (originalHost === undefined) delete process.env.HOST;
    else process.env.HOST = originalHost;

    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
  });

  test('uses 127.0.0.1 by default for local development', () => {
    delete process.env.HOST;
    expect(getListenHost()).toBe('127.0.0.1');
  });

  test('uses the configured host when provided', () => {
    process.env.HOST = '0.0.0.0';
    expect(getListenHost()).toBe('0.0.0.0');
  });

  test('uses the configured port when provided', () => {
    process.env.PORT = '5002';
    expect(getPort()).toBe(5002);
  });
});
