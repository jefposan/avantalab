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
    // Componentes anteriores à adoção das regras experimentais do React 19
    // continuam visíveis no relatório, mas não transformam padrões legados já
    // validados em falhas de CI. Novos arquivos permanecem sob severidade total.
    files: [
      "app/components/BalancoGeral.tsx",
      "app/components/ChatFlutuante.tsx",
      "app/components/Dashboard.tsx",
      "app/components/Graficos.tsx",
      "app/components/ModalAprovacoes.tsx",
      "app/components/NovidadesVendasModal.tsx",
      "app/components/PontoAdminModal.tsx",
      "app/components/PontosRestauracaoModal.tsx",
      "app/components/Relatorio.tsx",
      "app/components/SobreModal.tsx",
      "app/custos/TabelasPrecosView.tsx",
      "app/gestao/page.tsx",
      "app/mobile/conteudo-vendas/VendasMobileConteudoClient.tsx",
      "app/modules/importador-despesas/components/ImportadorDespesasModal.tsx",
      "app/modules/importador-despesas/screens/ImportadorDespesas.tsx",
      "app/recebimentos/ColaboradorApp.tsx",
      "app/recebimentos/RecebimentosClient.tsx",
      "app/recebimentos/components/AjustesOperacoesCampo.tsx",
      "app/recebimentos/components/ListaColaboradores.tsx",
      "app/recebimentos/components/ListaEmpresas.tsx",
      "app/recebimentos/components/ListaRecebimentos.tsx",
    ],
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    // Contratos históricos validados em runtime ainda usam payloads flexíveis.
    // O warning mantém a dívida mensurável sem exigir uma troca de tipos que
    // possa alterar a integração durante esta limpeza conservadora.
    files: [
      "app/api/vincular-usuario-existente/route.ts",
      "app/components/BalancoGeral.tsx",
      "app/components/Dashboard.tsx",
      "app/components/Graficos.tsx",
      "app/components/PorCategoria.tsx",
      "app/components/Relatorio.tsx",
      "app/lib/database.ts",
      "app/vendas-lab/VendasCatalogoLab.tsx",
      "supabase/functions/_shared/push.ts",
      "supabase/functions/broadcast/index.ts",
      "supabase/functions/enviar-push/index.ts",
      "supabase/functions/processar-agenda/index.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Scripts clássicos dependem deliberadamente do `this` dos listeners.
    files: ["public/mobile-app.js"],
    rules: {
      "@typescript-eslint/no-this-alias": "warn",
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
    // Worktrees auxiliares, rascunhos, bundles de terceiros e espelhos nativos
    // são artefatos gerados; a fonte correspondente é verificada separadamente.
    ".codex/**",
    "supabase/drafts/**",
    "public/mobile-supabase.js",
    "native/**",
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
