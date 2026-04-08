import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Architectural rule: only files under src/services/ are allowed to import
  // the raw axios instance (the default export from services/api). Everything
  // else must go through a wrapper function in a *Api.js service file so that
  // we have one place to add auth, logging, retries, error normalisation, etc.
  // Named imports like extractApiError, timeAgo, PAGINATION_DEFAULTS, etc. are
  // still allowed everywhere.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [{
          group: ['**/services/api', '**/services/api.js'],
          importNames: ['default'],
          message:
            'Do not import the raw axios instance outside of src/services/. ' +
            'Add a wrapper function in the appropriate services/*Api.js file ' +
            'and import that instead.',
        }],
      }],
    },
  },
])
