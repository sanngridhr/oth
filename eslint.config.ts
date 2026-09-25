import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**"]),
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: { "simple-import-sort": simpleImportSort },
    extends: [tseslint.configs.recommended, tseslint.configs.stylistic],
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": "warn",
    },
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  eslintConfigPrettier,
]);
