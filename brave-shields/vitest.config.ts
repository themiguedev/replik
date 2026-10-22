import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['reconstruction/brave-shields/tests/**/*.test.ts'],
  },
});
