// ESLint flat config for the root Node.js (Fastify) project.
//
// Scope: src/, tests/, scripts/. The Next.js subprojects (comply, finops,
// portal, website) each have their own tooling and are ignored here.
//
// Customize by editing the `rules` block below. Run with `npm run lint`
// or `npm run lint:fix` to auto-fix.

import js from '@eslint/js'
import globals from 'globals'

export default [
  // Global ignores — must be the first entry with only `ignores`.
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'drizzle/**',
      // Subprojects with their own ESLint configs.
      'comply/**',
      'finops/**',
      'portal/**',
      'website/**',
      // Generated or vendored files.
      '**/*.min.js',
      '**/generated/**',
    ],
  },

  // Base JS recommended rules.
  js.configs.recommended,

  // Project-wide language options and custom rules.
  {
    files: ['src/**/*.js', 'scripts/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Errors — catch real bugs.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'no-console': 'off', // Server logs via console are fine.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],

      // Style — match the existing codebase (single quotes, no semis).
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'never'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'comma-dangle': ['error', 'only-multiline'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
    },
  },

  // Test files: add Jest globals and relax a few rules.
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-expressions': 'off',
    },
  },
]
