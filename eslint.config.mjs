import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.xmcp/**',
      '.wrangler/**',
      'node_modules/**',
      'worker.js',
      'xmcp-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      // Corre en Workers y en Node (transporte stdio), así que los globals
      // de ambos son válidos.
      globals: { ...globals.node, ...globals.worker },
    },
    rules: {
      // `_` para lo que se descarta a propósito, e ignoreRestSiblings para el
      // patrón `const { a, ...resto } = obj`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  // Prettier último: apaga todo lo que sea de formato.
  prettier,
);
