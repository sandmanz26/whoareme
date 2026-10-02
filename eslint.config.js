import js from "@eslint/js"
import ts from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import prettier from "eslint-config-prettier"

export default ts.config(
  { ignores: ["dist", "node_modules", "scripts"] },

  js.configs.recommended,
  ...ts.configs.recommended,

  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // These v7 rules are too strict for patterns that are valid in the React docs
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // TypeScript
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  prettier,
)