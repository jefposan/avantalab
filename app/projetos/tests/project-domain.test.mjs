import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const loadModule = createRequire(import.meta.url);

let compiledDir;
let domain;
let demo;
let permissions;
let history;
let repository;

before(() => {
  compiledDir = mkdtempSync(path.join(tmpdir(), 'avanta-projetos-tests-'));
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/projetos/types.ts',
    'app/projetos/domain/project.ts',
    'app/projetos/domain/history.ts',
    'app/projetos/data/demo.ts',
    'app/projetos/permissions.ts',
    'app/projetos/services/repository.ts',
    '--outDir', compiledDir,
    '--module', 'commonjs',
    '--target', 'ES2022',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  domain = loadModule(path.join(compiledDir, 'domain/project.js'));
  history = loadModule(path.join(compiledDir, 'domain/history.js'));
  demo = loadModule(path.join(compiledDir, 'data/demo.js'));
  permissions = loadModule(path.join(compiledDir, 'permissions.js'));
  repository = loadModule(path.join(compiledDir, 'services/repository.js'));
});

after(() => { if (compiledDir) rmSync(compiledDir, { recursive: true, force: true }); });

function freshProject(template = 'blank') {
  return demo.createProjectFromTemplate({
    name: 'Projeto de teste', description: '', color: '#0A1F44', icon: '◇',
    startDate: '2026-08-07', dueDate: null, participantIds: ['ana'], template,
    companyId: demo.DEMO_COMPANY_ID,
  });
}

function node(id, parentId = null) {
  return {
    id, parentId, type: 'tarefa', title: id, description: '', color: '#1F8A9E', icon: '✓',
    status: 'planejado', priority: 'normal', assigneeIds: [], startDate: null, dueDate: null,
    progress: 0, tags: [], checklist: [], comments: 0, attachments: 0, collapsed: false,
    position: { x: 0, y: 0 }, createdAt: '2026-08-07T00:00:00.000Z', updatedAt: '2026-08-07T00:00:00.000Z',
  };
}

test('cria projeto e modelos como estruturas editáveis', () => {
  const project = freshProject('campaign');
  assert.equal(project.name, 'Projeto de teste');
  assert.ok(project.nodes.length > 1);
  assert.equal(project.connections.filter((edge) => edge.type === 'hierarquica').length, project.nodes.length - 1);
});

test('cria nós raiz, filho e irmão preservando a hierarquia', () => {
  let project = freshProject();
  const root = project.nodes[0];
  project = domain.addNodeToProject(project, node('filho', root.id));
  project = domain.addNodeToProject(project, node('irmao', root.id));
  project = domain.addNodeToProject(project, node('outra-raiz', null));
  assert.deepEqual(project.nodes.filter((item) => item.parentId === root.id).map((item) => item.id), ['filho', 'irmao']);
  assert.equal(project.connections.filter((edge) => edge.type === 'hierarquica').length, 2);
  assert.equal(project.nodes.filter((item) => item.parentId === null).length, 2);
});

test('edita e movimenta nó sem aceitar coordenadas negativas', () => {
  const project = domain.addNodeToProject(freshProject(), node('movel'));
  const edited = domain.updateProjectNode(project, 'movel', { title: 'Título editado', priority: 'urgente' });
  const moved = domain.moveProjectNode(edited, 'movel', { x: -40, y: 127.7 });
  const result = moved.nodes.find((item) => item.id === 'movel');
  assert.equal(result.title, 'Título editado');
  assert.equal(result.priority, 'urgente');
  assert.deepEqual(result.position, { x: 0, y: 128 });
});

test('cria conexões hierárquica e livre e bloqueia ciclo hierárquico', () => {
  let project = freshProject();
  project = domain.addNodeToProject(project, node('a'));
  project = domain.addNodeToProject(project, node('b'));
  project = domain.connectHierarchy(project, 'a', 'b');
  assert.equal(project.nodes.find((item) => item.id === 'b').parentId, 'a');
  assert.equal(domain.wouldCreateHierarchyCycle(project.nodes, 'b', 'a'), true);
  assert.throws(() => domain.connectHierarchy(project, 'b', 'a'), /ciclo/i);
  project = domain.addFreeConnection(project, 'b', 'a', 'bloqueia');
  assert.equal(project.connections.find((edge) => edge.type === 'livre').label, 'bloqueia');
});

test('calcula checklist, conclusão, ramo e progresso geral', () => {
  const base = freshProject();
  const root = base.nodes[0];
  let project = domain.addNodeToProject(base, { ...node('tarefa-a', root.id), checklist: [{ id: '1', title: 'A', completed: true }, { id: '2', title: 'B', completed: false }] });
  project = domain.addNodeToProject(project, { ...node('tarefa-b', root.id), status: 'concluido' });
  assert.equal(domain.nodeOwnProgress(project.nodes.find((item) => item.id === 'tarefa-a')), 50);
  assert.equal(domain.calculateNodeProgress(project.nodes, root.id), 75);
  assert.equal(domain.calculateProjectProgress(project), 75);
  assert.equal(domain.completeProjectNode(project, 'tarefa-a').nodes.find((item) => item.id === 'tarefa-a').status, 'concluido');
});

test('mesmo registro reflete mudança usada por mapa, lista e Kanban', () => {
  const base = domain.addNodeToProject(freshProject(), node('sincronizado'));
  const updated = domain.updateProjectNode(base, 'sincronizado', { status: 'em_andamento', dueDate: '2026-08-20' });
  const mapRecord = updated.nodes.find((item) => item.id === 'sincronizado');
  const listRecord = updated.nodes.find((item) => item.id === 'sincronizado');
  const kanbanRecord = updated.nodes.filter((item) => item.status === 'em_andamento').find((item) => item.id === 'sincronizado');
  assert.equal(mapRecord, listRecord);
  assert.equal(listRecord, kanbanRecord);
});

test('importa JSON válido, trata IDs duplicados e rejeita arquivo inválido', () => {
  const project = freshProject();
  const duplicated = { ...domain.exportProject(project), project: { ...project, nodes: [node('duplicado'), node('duplicado')] } };
  const imported = domain.validateProjectImport(duplicated, 'empresa-segura');
  assert.equal(imported.companyId, 'empresa-segura');
  assert.equal(new Set(imported.nodes.map((item) => item.id)).size, 2);
  assert.throws(() => domain.validateProjectImport({ version: 1 }, 'empresa-segura'), /exportação/i);
  assert.throws(() => domain.validateProjectImport({ ...duplicated, version: 99 }, 'empresa-segura'), /versão/i);
});

test('isola empresa, respeita permissões e arquiva de forma recuperável', () => {
  assert.doesNotThrow(() => permissions.assertCompanyScope('empresa-a', 'empresa-a'));
  assert.throws(() => permissions.assertCompanyScope('empresa-a', 'empresa-b'), /empresa selecionada/i);
  assert.equal(permissions.can('gestor_master', 'project.delete'), true);
  assert.equal(permissions.can('operador_simples', 'project.delete'), false);
  const archived = domain.setProjectArchived(freshProject(), true);
  assert.ok(archived.archivedAt);
  assert.equal(domain.setProjectArchived(archived, false).archivedAt, null);
});

test('exclui participante e limpa vínculos em projetos e tarefas', () => {
  const project = freshProject();
  project.nodes[0].assigneeIds = ['ana'];
  const collection = { ...demo.createDemoCollection(), projects: [project] };
  const result = domain.removeParticipantFromCollection(collection, 'ana');
  assert.equal(result.people.some((person) => person.id === 'ana'), false);
  assert.deepEqual(result.projects[0].participantIds, []);
  assert.deepEqual(result.projects[0].nodes[0].assigneeIds, []);
});

test('exclui projeto definitivamente sem alterar os demais', () => {
  const first = freshProject();
  const second = { ...freshProject(), id: 'segundo-projeto' };
  const collection = { ...demo.createDemoCollection(), projects: [first, second] };
  const result = domain.removeProjectFromCollection(collection, first.id);
  assert.deepEqual(result.projects.map((project) => project.id), ['segundo-projeto']);
});

test('undo e redo restauram operações locais', () => {
  let state = history.createHistory({ title: 'A' });
  state = history.commitHistory(state, { title: 'B' });
  state = history.commitHistory(state, { title: 'C' });
  state = history.undoHistory(state);
  assert.equal(state.present.title, 'B');
  state = history.redoHistory(state);
  assert.equal(state.present.title, 'C');
});

test('autosave local mantém backup recuperável', async () => {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  } };
  const storage = new repository.BrowserDemoProjectRepository();
  const first = demo.createDemoCollection();
  await storage.save(first);
  const second = { ...first, projects: first.projects.map((project, index) => index ? project : { ...project, name: 'Versão mais nova' }) };
  await storage.save(second);
  const primaryKey = [...values.keys()].find((key) => !key.endsWith(':backup'));
  values.set(primaryKey, '{json-corrompido');
  const recovered = await storage.load(first.companyId);
  assert.equal(recovered.projects[0].name, first.projects[0].name);
  delete globalThis.window;
});

test('reorganiza mapa com 300 nós dentro de um orçamento interativo', () => {
  let project = freshProject();
  const root = project.nodes[0];
  for (let index = 0; index < 300; index += 1) {
    const parentId = index < 10 ? root.id : `node-${Math.floor(index / 3)}`;
    const safeParent = project.nodes.some((item) => item.id === parentId) ? parentId : root.id;
    project = domain.addNodeToProject(project, node(`node-${index}`, safeParent));
  }
  const startedAt = performance.now();
  const arranged = domain.layoutProject(project, 'horizontal');
  const elapsed = performance.now() - startedAt;
  assert.equal(arranged.nodes.length, 301);
  assert.ok(arranged.nodes.every((item) => Number.isFinite(item.position.x) && Number.isFinite(item.position.y)));
  assert.ok(elapsed < 500, `layout levou ${elapsed.toFixed(1)}ms`);
});
