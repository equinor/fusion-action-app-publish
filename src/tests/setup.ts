import { vi } from "vitest";

/**
 * Vitest setup file
 *
 * Configures global test environment:
 * - Mocks console methods to prevent spam during tests
 * - Uses vitest's vi.fn() for better test tracking
 */

// Mock console methods to prevent spam during tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
