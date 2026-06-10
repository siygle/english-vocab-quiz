import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/quizEngine.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
