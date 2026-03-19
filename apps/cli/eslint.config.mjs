import prettier from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  globalIgnores(['dist/**', 'bundles/**']),
]);

export default eslintConfig;
