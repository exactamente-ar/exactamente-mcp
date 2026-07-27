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
      // Generado por `pnpm gen:api` desde el OpenAPI del backend.
      'src/types/api.d.ts',
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

  {
    // Scripts de tooling: corren en Node, no en el Worker.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // Prettier último: apaga todo lo que sea de formato.
  prettier,
);
