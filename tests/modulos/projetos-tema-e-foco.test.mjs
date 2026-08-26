import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const acesso = readFileSync('app/api/modulos/acesso/route.ts', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const cliente = readFileSync('app/projetos/ProjetosClient.tsx', 'utf8');
const workspace = readFileSync('app/projetos/components/ProjectWorkspace.tsx', 'utf8');
const mapa = readFileSync('app/projetos/components/MapCanvas.tsx', 'utf8');
const nodeCard = readFileSync('app/projetos/components/ProjectNodeCard.tsx', 'utf8');
const kanban = readFileSync('app/projetos/components/KanbanView.tsx', 'utf8');
const estilos = readFileSync('app/projetos/projetos.module.css', 'utf8');
const ajustes = readFileSync('app/api/modulos/projetos/ajustes/route.ts', 'utf8');
const inicioProjetos = readFileSync('app/projetos/components/ProjectHome.tsx', 'utf8');
const compartilhamentosProjetos = readFileSync('app/api/modulos/projetos/compartilhamentos/route.ts', 'utf8');
const compartilhadosProjetos = readFileSync('app/api/modulos/projetos/compartilhados/route.ts', 'utf8');
const indiceCompartilhados = readFileSync('app/lib/projetos-compartilhados-servidor.ts', 'utf8');
const documentoProjetos = readFileSync('app/api/modulos/projetos/documento/route.ts', 'utf8');
const listarModulos = readFileSync('app/api/cobranca/modulos/listar/route.ts', 'utf8');
const paginaProjetos = readFileSync('app/projetos/page.tsx', 'utf8');

test('AvantaProjetos recebe o tema salvo no perfil, sem depender do sistema operacional', () => {
  assert.match(acesso, /select\('cor_primaria, dark_mode'\)/);
  assert.match(acesso, /temaEscuro: configuracao\?\.dark_mode === true/);
  assert.match(gestao, /setDarkMode\(config\.dark_mode === true\)/);
  assert.match(gestao, /darkMode,\n\s*duplicadosAtivo,/);
  assert.match(cliente, /access\.empresa\.temaEscuro \? styles\.darkTheme/);
  assert.match(cliente, /'--project-profile-color': access\.empresa\.corPrimaria/);
  assert.match(estilos, /--brand: var\(--project-profile-color, #003e73\);/);
  assert.match(estilos, /--accent: color-mix\(in srgb, var\(--brand\) 55%, #22c5d8\);/);
  assert.match(estilos, /--quadrant-radius: 8px 18px 18px 18px;/);
  assert.match(estilos, /--quadrant-small-radius: 6px 13px 13px 13px;/);
  assert.match(estilos, /\.projectCard \{[^}]*border-radius: var\(--quadrant-radius\);/);
  assert.match(estilos, /\.projectCover \{[^}]*border-radius: 7px 17px 0 0;/);
  assert.match(estilos, /\.kanbanColumn article \{[^}]*border-radius: var\(--quadrant-small-radius\);/);
  assert.match(estilos, /\.darkTheme \{[\s\S]*color-scheme: dark/);
  assert.doesNotMatch(estilos, /prefers-color-scheme/);
  assert.match(estilos, /\.darkTheme \.moduleLogo \{ filter: brightness\(0\) invert\(1\)/);
  assert.match(cliente, /access\.empresa\.temaEscuro \? 'ON' : 'OFF'/);
  assert.match(estilos, /\.settingsSection \{ display: flex; align-items: center; justify-content: space-between; gap: 10px;/);
  assert.match(estilos, /\.settingsThemeSwitch \{ display: inline-flex; width: 104px; min-width: 104px;/);
  assert.match(cliente, /TelaCarregandoAcesso/);
  assert.match(cliente, /Ajustes do AvantaProjetos/);
  assert.match(cliente, /Voltar ao início do AvantaLab/);
  assert.match(cliente, /<Icon name="back" size=\{16\} \/> Início/);
  assert.match(cliente, /const proximoAcesso = \{ \.\.\.access, empresa: \{ \.\.\.access\.empresa, temaEscuro \} \}/);
  assert.doesNotMatch(cliente, /Atualizando…/);
  assert.match(ajustes, /autenticarPerfilCobranca\(request, empresaId, true\)/);
  assert.match(ajustes, /update\(\{ dark_mode: temaEscuro \}\)/);
});

test('modo de foco do mapa oculta os cabeçalhos e preserva o retorno flutuante', () => {
  assert.match(workspace, /mapaEmFoco/);
  assert.match(workspace, /Ocultar cabeçalho/);
  assert.match(workspace, /Exibir cabeçalho do mapa/);
  assert.match(workspace, /proximaVisualizacao !== 'mapa'\) onMapaEmFocoChange\(false\)/);
  assert.match(workspace, /const requestDeleteNode = useCallback/);
  assert.match(workspace, /const \[deleteStep, setDeleteStep\] = useState<'choice' \| 'successor'>\('choice'\)/);
  assert.match(workspace, /Excluir nós conectados/);
  assert.match(workspace, /setDeleteStep\('successor'\)/);
  assert.match(workspace, /const confirmDeleteConnected = useCallback/);
  assert.match(workspace, /onClick=\{confirmDelete\} disabled=\{!replacementNodeId\}>Excluir<\/button>/);
  assert.match(workspace, /action: 'Nó removido'/);
  assert.match(workspace, /getDescendantIds\(project\.nodes, deleteNode\.id\)/);
  assert.match(workspace, /const removeConnection = useCallback/);
  assert.match(workspace, /onDeleteConnection=\{removeConnection\}/);
  assert.match(workspace, /action: 'Relação removida'/);
  assert.match(workspace, /Os cards foram mantidos/);
  assert.match(cliente, /Ajustes do AvantaProjetos/);
  assert.match(estilos, /\.mapFocusMode \.moduleHeader \{ display: none/);
  assert.match(estilos, /\.mapFocusMode \.workspaceHeader, \.mapFocusMode \.workspaceToolbar \{ display: none/);
  assert.match(estilos, /\.mapFocusMode \.workspace \{ height: 100dvh; min-height: 0; grid-template-rows: minmax\(0, 1fr\)/);
  assert.match(estilos, /\.mapFocusMode \.workspaceContent, \.mapFocusMode \.primaryView, \.mapFocusMode \.canvas \{ height: 100%; min-height: 0/);
  assert.match(estilos, /\.mapFocusToggleFloating \{ position: fixed/);
  assert.match(estilos, /\.edgeLine \{ fill: none; stroke: #879aa7; stroke-width: 2\.2; \}/);
  assert.doesNotMatch(estilos, /\.edgeLine \{[^}]*transition:/);
  assert.match(estilos, /\.root \.dangerButton \{ color: #fff; background: var\(--danger\); \}/);
  assert.match(estilos, /\.deleteNodeSelect select \{ width: 100%; min-height: 46px; border: 1px solid var\(--border\);/);
  assert.match(mapa, /x: drag\.origin\.x \+ \(event\.clientX - drag\.x\) \/ viewport\.scale, y: drag\.origin\.y \+ \(event\.clientY - drag\.y\) \/ viewport\.scale/);
  assert.doesNotMatch(mapa, /Math\.max\(0, drag\.origin\.y/);
  assert.match(nodeCard, /node\.description && <p className=\{styles\.nodeDescription\}>\{node\.description\}<\/p>/);
  assert.match(estilos, /\.mapNode \{[^}]*height: 132px/);
  assert.match(mapa, /Cores pré-definidas/);
  assert.match(mapa, /onColorPresetsChange/);
  assert.match(estilos, /\.colorPalette \{ display: flex; align-items: center; gap: 8px;/);
  assert.match(estilos, /\.presetColor, \.presetColorEditor \{[^}]*background: repeating-conic-gradient\([^}]*6px 6px; cursor: pointer;/);
  assert.doesNotMatch(estilos, /\.presetColor, \.presetColorEditor \{[^}]*background:[^}]*!important/);
  assert.match(inicioProjetos, /Icon name="people" size=\{16\} \/> Participantes/);
  assert.match(inicioProjetos, /title="Participantes" description="Cadastre pessoas para atribuí-las a projetos e tarefas\."/);
  assert.match(inicioProjetos, /participantManagerList/);
  assert.match(inicioProjetos, /id="edit-participant-registration"/);
  assert.match(inicioProjetos, /if \(editingProject\) setEditForm/);
  assert.match(estilos, /\.peopleChecks input\[type="checkbox"\] \{ width: 16px; height: 16px; min-height: 0; flex: 0 0 16px;/);
  assert.match(inicioProjetos, /import Tooltip from '@\/app\/components\/Tooltip';/);
  assert.match(inicioProjetos, /texto=\{person\.name\} posicao="top" wrapperClassName=\{styles\.avatarTooltip\}/);
  assert.match(nodeCard, /texto=\{person\.name\} posicao="top" wrapperClassName=\{styles\.avatarTooltip\}/);
  assert.match(kanban, /texto=\{person\.name\} posicao="top" wrapperClassName=\{styles\.avatarTooltip\}/);
  assert.match(mapa, /import Tooltip from '@\/app\/components\/Tooltip';/);
  assert.match(mapa, /<Tooltip texto="Adicionar filho \(Tab\)" posicao="bottom">/);
  assert.doesNotMatch(mapa, /title="Adicionar filho \(Tab\)"/);
  assert.match(estilos, /\.moduleExit svg \{ display: block; flex: 0 0 16px; \}/);
  assert.match(estilos, /\.moduleExit \{[^}]*background: var\(--brand\);/);
});

test('botão de compartilhamento executa a função de cópia', () => {
  assert.match(inicioProjetos, /const copyShareLink = async \(\) => \{/);
  assert.match(inicioProjetos, /onClick=\{\(\) => void copyShareLink\(\)\}/);
  assert.doesNotMatch(inicioProjetos, /onClick=\{\(\) => void copyShareLink\}/);
});

test('modal de compartilhamento é compacto e concentra a ação junto ao acesso', () => {
  assert.match(inicioProjetos, /className=\{styles\.shareAccessRow\}/);
  assert.match(inicioProjetos, /onClose=\{closeShareModal\}/);
  assert.match(inicioProjetos, /headerTone="accent" compact/);
  assert.doesNotMatch(inicioProjetos, /Conteúdo copiado e confirmado\. O link está pronto/);
  assert.doesNotMatch(inicioProjetos, />Fechar<\/button>/);
  assert.match(estilos, /\.shareAccessRow \{ grid-column: 1 \/ -1; display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(estilos, /\.shareFormGrid input, \.shareFormGrid select \{[^}]*height: 34px;[^}]*min-height: 34px;/);
  assert.match(estilos, /\.shareVerifyButton \{[^}]*min-height: 34px;/);
  assert.match(estilos, /\.shareVerifyButton::after \{[^}]*inset: -5px 0;/);
  assert.match(estilos, /\.sharePeopleList > div \{[^}]*min-height: 46px;/);
  assert.match(inicioProjetos, /shareState\.duplicate \? styles\.shareResultWarning : ''/);
  assert.match(inicioProjetos, /role=\{shareState\.duplicate \? 'alert' : 'status'\}/);
  assert.match(estilos, /\.shareResultWarning \{[^}]*border: 1px solid color-mix\(in srgb, var\(--danger\) 52%, var\(--border\)\);[^}]*background: color-mix\(in srgb, var\(--danger\) 8%, var\(--surface\)\);/);
});

test('compartilhamento bloqueia duplicidade no mesmo projeto e recupera o acesso existente', () => {
  assert.match(compartilhamentosProjetos, /\.eq\('empresa_id', empresaId\)\.eq\('projeto_id', projetoId\)\.eq\('email', email\)\.maybeSingle\(\)/);
  assert.match(compartilhamentosProjetos, /codigo: 'acesso_existente'/);
  assert.match(compartilhamentosProjetos, /\{ status: 409 \}/);
  assert.match(inicioProjetos, /response\.status === 409 && json\.codigo === 'acesso_existente'/);
  assert.match(inicioProjetos, /Acesso já existente/);
  assert.match(inicioProjetos, /Pessoas com acesso a “\{shareProject\?\.name\}”/);
  assert.match(inicioProjetos, /Esta lista pertence somente a este projeto\./);
});

test('compartilhamento interno respeita a hierarquia do perfil e não cria acesso redundante', () => {
  assert.match(compartilhamentosProjetos, /codigo: 'usuario_ja_vinculado_ao_perfil'/);
  assert.match(compartilhamentosProjetos, /Este usuário já participa deste perfil\. O acesso aos projetos deve seguir a hierarquia definida na equipe\./);
  assert.match(compartilhamentosProjetos, /\.from\('usuarios_empresa'\)[\s\S]*\.eq\('empresa_id', empresaId\)[\s\S]*\.eq\('user_id', conta\.user_id\)[\s\S]*\.eq\('status', 'ativo'\)/);
  assert.match(indiceCompartilhados, /const externalShares = sharedRows\.filter\(\(item\) => !ownCompanyIds\.has\(item\.empresa_id\)\)/);
  assert.match(inicioProjetos, /json\.codigo === 'usuario_ja_vinculado_ao_perfil'/);
});

test('conta reúne projetos compartilhados de empresas diferentes sem liberar o módulo completo', () => {
  assert.match(indiceCompartilhados, /\.eq\('user_id', userId\)[\s\S]*\.eq\('situacao', 'ativo'\)/);
  assert.match(indiceCompartilhados, /empresa_modulos/);
  assert.match(indiceCompartilhados, /projetos_documentos/);
  assert.match(indiceCompartilhados, /companyName: companies\.get\(share\.empresa_id\)/);
  assert.match(indiceCompartilhados, /access: share\.acesso/);
  assert.match(compartilhadosProjetos, /listarProjetosCompartilhados\(db, auth\.user\.id\)/);
  assert.match(listarModulos, /projetosCompartilhados = \(await listarProjetosCompartilhados\(acesso\.db, acesso\.usuario\.id\)\)\.length/);
  assert.match(gestao, /!modulosAtivos\.includes\('projetos'\) && projetosCompartilhados > 0/);
  assert.match(gestao, />Compartilhado<\/span>/);
  assert.match(cliente, /if \(!accessResponse\.ok && projects\.length > 0\) \{ setSharedOnly\(true\); return; \}/);
  assert.match(cliente, /sharedAccessOnly/);
  assert.match(inicioProjetos, /shared:\$\{project\.companyId\}:\$\{project\.projectId\}/);
  assert.match(inicioProjetos, /project\.companyName/);
});

test('link abre o projeto exato e aplica a permissão individual de cada compartilhamento', () => {
  assert.match(paginaProjetos, /initialProjectId=\{String\(projetoId \|\| ''\)\.trim\(\)\}/);
  assert.match(cliente, /projetoId=\$\{encodeURIComponent\(project\.projectId\)\}/);
  assert.match(cliente, /access\.compartilhamentos\?\.find\(\(item\) => item\.projetoId === activeProjectId\)\?\.acesso/);
  assert.match(cliente, /activeSharedAccess !== 'editor'/);
  assert.match(acesso, /compartilhamentos = vinculos\.map/);
  assert.match(documentoProjetos, /const compartilhados = new Set/);
  assert.match(documentoProjetos, /const editaveis = new Set/);
  assert.match(documentoProjetos, /Um projeto de somente visualização não pode ser alterado\./);
  assert.match(documentoProjetos, /editaveis\.has\(project\.id\) \? recebidos\.get\(project\.id\) : null/);
});
