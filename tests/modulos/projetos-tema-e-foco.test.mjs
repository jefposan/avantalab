import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const acesso = readFileSync('app/api/modulos/acesso/route.ts', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const cliente = readFileSync('app/projetos/ProjetosClient.tsx', 'utf8');
const workspace = readFileSync('app/projetos/components/ProjectWorkspace.tsx', 'utf8');
const estilos = readFileSync('app/projetos/projetos.module.css', 'utf8');
const ajustes = readFileSync('app/api/modulos/projetos/ajustes/route.ts', 'utf8');

test('AvantaProjetos recebe o tema salvo no perfil, sem depender do sistema operacional', () => {
  assert.match(acesso, /select\('cor_primaria, dark_mode'\)/);
  assert.match(acesso, /temaEscuro: configuracao\?\.dark_mode === true/);
  assert.match(gestao, /setDarkMode\(config\.dark_mode === true\)/);
  assert.match(gestao, /darkMode,\n\s*duplicadosAtivo,/);
  assert.match(cliente, /access\.empresa\.temaEscuro \? styles\.darkTheme/);
  assert.match(estilos, /\.darkTheme \{[\s\S]*color-scheme: dark/);
  assert.doesNotMatch(estilos, /prefers-color-scheme/);
  assert.match(estilos, /\.darkTheme \.moduleLogo \{ filter: brightness\(0\) invert\(1\)/);
  assert.match(cliente, /TelaCarregandoAcesso/);
  assert.match(cliente, /Ajustes do AvantaProjetos/);
  assert.match(ajustes, /autenticarPerfilCobranca\(request, empresaId, true\)/);
  assert.match(ajustes, /update\(\{ dark_mode: temaEscuro \}\)/);
});

test('modo de foco do mapa oculta os cabeçalhos e preserva o retorno flutuante', () => {
  assert.match(workspace, /mapaEmFoco/);
  assert.match(workspace, /Ocultar cabeçalho/);
  assert.match(workspace, /Exibir cabeçalho do mapa/);
  assert.match(workspace, /proximaVisualizacao !== 'mapa'\) onMapaEmFocoChange\(false\)/);
  assert.match(estilos, /\.mapFocusMode \.moduleHeader \{ display: none/);
  assert.match(estilos, /\.mapFocusMode \.workspaceHeader, \.mapFocusMode \.workspaceToolbar \{ display: none/);
  assert.match(estilos, /\.mapFocusMode \.workspace \{ height: 100dvh; min-height: 0; grid-template-rows: minmax\(0, 1fr\)/);
  assert.match(estilos, /\.mapFocusMode \.workspaceContent, \.mapFocusMode \.primaryView, \.mapFocusMode \.canvas \{ height: 100%; min-height: 0/);
  assert.match(estilos, /\.mapFocusToggleFloating \{ position: fixed/);
});
