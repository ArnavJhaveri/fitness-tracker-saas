import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    rules: {
      // Catch accidental console.log commits to production
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Disallow `any` — use `unknown` for truly unknown shapes
      "@typescript-eslint/no-explicit-any": "error",
      // Prevent accidental unused vars from slipping in
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
