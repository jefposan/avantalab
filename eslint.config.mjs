import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // O protótipo consolidado mantém inicializações históricas em effects e a
    // ponte do iframe recebe contratos JSON validados em runtime. Mantemos
    // visibilidade como warning sem relaxar APIs, serviços ou repositórios.
    files: ["app/vendas/VendasIntegrado.tsx", "app/vendas/sistema/VendasServicosPrototype.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["app/vendas/sistema/VendasServicosPrototype.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["**/*.d.mts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees auxiliares, caches e cópias estáticas geradas não são fonte.
    ".codex/**",
    "app/avantavendas/documentacao/referencia_tridium/assets/**",
    "app/avantavendas/sistema/vendor/**",
    "android/app/build/**",
    "android/app/src/main/assets/public/**",
    "ios/**/build/**",
    "ios/DerivedData/**",
    "ios/App/App/public/**",
  ]),
]);

export default eslintConfig;
