// Vitest config — pure-logic unit tests only (no DOM needed).
// Run with `npm test`
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/hooks/useNewsFeed.ts'],
    },
  },
});
