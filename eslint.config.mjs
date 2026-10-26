import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default defineConfig([
  js.configs.recommended, ...ts.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], plugins: { 'react-hooks': hooks },
    rules: { ...hooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', '.test-results/**'])
]);
