import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/ServerEventListener.ts',
        'src/TokenValidator.ts',
        'src/internal/protocol/AckPayload.ts',
        'src/internal/protocol/ErrorPayload.ts',
        'src/internal/protocol/PublishRequest.ts',
        'src/internal/protocol/SubscriptionRequest.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
