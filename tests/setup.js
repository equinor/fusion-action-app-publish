// Test setup for Jest
global.console = {
  ...console,
  // Mock console methods to prevent spam during tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};