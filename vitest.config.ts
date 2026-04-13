import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/ServerEventListener.ts',
        'src/TokenValidator.ts',
        'src/internal/config/RawNamespaceConfig.ts',
        'src/internal/config/RawServerConfig.ts',
        'src/internal/config/RawServerEntry.ts',
        'src/internal/protocol/AckPayload.ts',
        'src/internal/protocol/ErrorPayload.ts',
        'src/internal/protocol/PublishRequest.ts',
        'src/internal/protocol/SubscriptionRequest.ts',
        'src/internal/transport/TransportClient.ts',
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
