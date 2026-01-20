import { vi } from "vitest";

// Test setup for Vitest
global.console = {
  ...console,
  // Mock console methods to prevent spam during tests
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
