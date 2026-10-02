import js from "@eslint/js"
import ts from "typescript-eslint"
import prettier from "eslint-config-prettier"

export default ts.config(
  { ignores: ["dist/**", "node_modules/**", "src/scripts/**", "*.cjs"] },

  js.configs.recommended,
  ...ts.configs.recommended,

  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      // Required for Express global namespace augmentation (declare global { namespace Express {...} })
      "@typescript-eslint/no-namespace": "off",

      "no-console": "off",
    },
  },

  prettier,
)