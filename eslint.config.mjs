import eslint from '@eslint/js'
import tsEslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactPluginHooks from 'eslint-plugin-react-hooks'
import expoPlugin from 'eslint-config-expo'

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    ...reactPlugin.configs.flat.recommended,
    // Required when using React 17+.
    ...reactPlugin.configs.flat['jsx-runtime'],
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...expoPlugin.globals,
      },
    },
  },
  {
    plugins: {
      'react-hooks': reactPluginHooks,
    },
    rules: {
      ...reactPluginHooks.configs.recommended.rules,
      'jsx-quotes': ['error', 'prefer-double'],
      'react/jsx-curly-brace-presence': [
        'error',
        {
          props: 'never',
          children: 'never',
        },
      ],
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: [
      '.expo',
      'android',
      'ios',
      'eslint.config.mjs',
      'tailwind.config.js',
      'babel.config.js',
      'metro.config.js',
      'components/ui/**',
    ],
  },
)
