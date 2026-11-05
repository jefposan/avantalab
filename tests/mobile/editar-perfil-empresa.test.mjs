import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('public/mobile-app.js', 'utf8');
const fn = source.slice(source.indexOf('  async function salvarEdicaoEmpresaMobile()'), source.indexOf('  async function excluirEmpresaMobile('));
function ambiente({ nome = 'Bóra', login = 'jeff', senha = '', falha = '', perfil = 'gestor_master' } = {}) {
  const state = { empresa: { id: 'empresa', acessoId: 'acesso', usuario_nome: 'Jeff', nome: 'BORA BEBIDAS', email: 'jeff@example.com', login: 'jeff', perfil }, usuario: { id: 'user' }, editEmpresaTipoPerfil: 'empresa', empresaEdicaoAberta: true };
  const calls = [], erros = [], avisos = [];
  const ctx = { state, campo: id => ({ 'editar-empresa-nome': nome, 'editar-empresa-login': login, 'editar-empresa-senha': senha })[id], podeGerenciarUsuarios: () => true, normalizarTipoPerfil: v => v, emailRealUsuario: u => u.email, setErro: e => erros.push(e), render() {}, tokenSessao: async () => 'teste', lerResposta: async r => r.json(), carregarEmpresas: async () => {}, carregarDados: async () => {}, mostrarToast: m => avisos.push(m), fetch: async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (falha === 'rede') throw Error('Offline');
    return { ok: url !== falha, json: async () => url === falha ? { erro: true, mensagem: 'Erro simulado' } : { erro: false } };
  } };
  vm.runInNewContext(fn + '\nthis.salvar = salvarEdicaoEmpresaMobile;', ctx);
  return { state, calls, erros, avisos, salvar: ctx.salvar };
}
test('nome empresarial simples salva apenas empresa, sem tocar na conta pessoal', async () => {
  for (const nome of ['Bóra', 'Tridium', 'J&W', 'BORA BEBIDAS']) {
    const a = ambiente({ nome }); await a.salvar();
    assert.equal(a.calls.length, 1);
    assert.equal(a.calls[0].url, '/api/atualizar-empresa');
    assert.equal(a.calls[0].body.nome, nome);
    assert.equal(a.state.empresaEdicaoAberta, false);
    assert.deepEqual(a.erros, []);
  }
});
test('nome vazio não grava e erro de rede preserva rascunho e libera formulário', async () => {
  const vazio = ambiente({ nome: ' ' }); await vazio.salvar(); assert.equal(vazio.calls.length, 0);
  const a = ambiente({ falha: 'rede' }); await a.salvar();
  assert.equal(a.state.carregando, false); assert.equal(a.state.empresaAcao, '');
  assert.equal(a.state.editEmpresaNome, 'Bóra'); assert.equal(a.state.empresaEdicaoAberta, true);
  assert.equal(a.avisos.length, 0);
});
test('alterar login ou email não envia nome da empresa como nome pessoal', async () => {
  for (const login of ['novo.login', 'novo@example.com']) {
    const a = ambiente({ login }); await a.salvar();
    const body = a.calls[1].body;
    assert.equal(a.calls[1].url, '/api/atualizar-usuario-empresa');
    assert.equal('nome' in body, false); assert.equal('liberacoes' in body, false);
    assert.equal(body.email, login.includes('@') ? login : 'jeff@example.com');
    assert.equal(body.login, login.includes('@') ? undefined : login);
  }
});
test('senha isolada não grava usuário e falha parcial não informa sucesso', async () => {
  const a = ambiente({ senha: 'senha-teste' }); await a.salvar();
  assert.deepEqual(a.calls.map(c => c.url), ['/api/atualizar-empresa', '/api/redefinir-senha-usuario']);
  const b = ambiente({ login: 'novo', falha: '/api/atualizar-usuario-empresa' }); await b.salvar();
  assert.equal(b.state.empresaEdicaoAberta, true); assert.equal(b.avisos.length, 0);
  assert.match(b.erros[0], /perfil foi salvo/);
});
