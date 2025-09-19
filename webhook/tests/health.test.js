import config from '../src/config.js';

describe('Basic configuration', () => {
  test('port resolves to a number', () => {
    expect(typeof config.port).toBe('number');
  });
});
