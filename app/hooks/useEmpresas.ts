/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  buscarEmpresasDoUsuario,
  buscarMeuAcessoEmpresa,
  buscarUsuariosEmpresa,
  criarUsuarioEmpresa,
  buscarUsuarioExistenteEmpresa,
  vincularUsuarioExistenteEmpresa,
  atualizarEmpresa,
  atualizarUsuarioEmpresa,
  bloquearUsuarioEmpresa,
  excluirUsuarioEmpresa,
  redefinirSenhaUsuarioEmpresa,
} from '../lib/database';
import { normalizarTipoPerfil, type TipoPerfil } from '../lib/perfis';
import { validarNomeCompleto } from '../lib/nome-pessoa';
import { validarEmail } from '../lib/email';
import type { AbrirAvisoFn, AbrirConfirmacaoFn } from './useUI';

const CHAVE_RASCUNHO_USUARIO_WEB = 'avantalab:rascunho:v1:gestao-web:usuarios:';
const VALIDADE_RASCUNHO_USUARIO_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type UseEmpresasDeps = {
  abrirAviso: AbrirAvisoFn;
  abrirConfirmacao: AbrirConfirmacaoFn;
  /** Logout completo — definido em page.tsx */
  handleLogout: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEmpresas(deps: UseEmpresasDeps) {
  const { abrirAviso, abrirConfirmacao, handleLogout } = deps;

  // --- Empresa atual ---
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresaAtual, setNomeEmpresaAtual] = useState('');
  const [tipoPerfilAtual, setTipoPerfilAtual] = useState<TipoPerfil>('empresa');
  const [nomeUsuarioAtual, setNomeUsuarioAtual] = useState('');
  const [emailUsuarioAtual, setEmailUsuarioAtual] = useState('');
  const [acessoUsuarioAtualId, setAcessoUsuarioAtualId] = useState<string | null>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<
    'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples' | null
  >(null);

  // --- Lista de empresas ---
  const [empresasDoUsuario, setEmpresasDoUsuario] = useState<any[]>([]);
  const [empresaParaSelecionar, setEmpresaParaSelecionar] = useState<any | null>(null);

  // --- Acesso / configuração ---
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [acessoNaoConfigurado, setAcessoNaoConfigurado] = useState(false);

  // --- Modais de empresa ---
  const [modalSelecionarEmpresa, setModalSelecionarEmpresa] = useState(false);
  const [modalEmpresasAberto, setModalEmpresasAberto] = useState(false);
  const [modalEditarEmpresaAberto, setModalEditarEmpresaAberto] = useState(false);
  const [editEmpresaNome, setEditEmpresaNome] = useState('');
  const [editTipoPerfil, setEditTipoPerfil] = useState<TipoPerfil>('empresa');
  const [editEmpresaLogin, setEditEmpresaLogin] = useState('');
  const [editEmpresaSenha, setEditEmpresaSenha] = useState('');
  const [editEmpresaSalvando, setEditEmpresaSalvando] = useState(false);
  const [modalExcluirEmpresa, setModalExcluirEmpresa] = useState(false);
  const [nomeConfirmacaoExclusao, setNomeConfirmacaoExclusao] = useState('');
  const [excluindoEmpresa, setExcluindoEmpresa] = useState(false);

  // --- Gestão de usuários ---
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
  const [usuariosCarregando, setUsuariosCarregando] = useState(false);
  const [usuarioSalvando, setUsuarioSalvando] = useState(false);
  const [usuarioNome, setUsuarioNome] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [usuarioSenha, setUsuarioSenha] = useState('');
  const [mostrarUsuarioSenha, setMostrarUsuarioSenha] = useState(false);
  const [usuarioPerfil, setUsuarioPerfil] = useState<
    '' | 'administrador' | 'operador_completo' | 'operador_simples'
  >('');
  const [modoFormularioUsuario, setModoFormularioUsuario] = useState<'' | 'criar' | 'existente'>('');
  const [usuarioExistenteTermo, setUsuarioExistenteTermo] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<any | null>(null);
  const [perfilUsuarioExistente, setPerfilUsuarioExistente] = useState<
    '' | 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
  >('');
  const [pesquisandoUsuarioExistente, setPesquisandoUsuarioExistente] = useState(false);
  const [vinculandoUsuarioExistente, setVinculandoUsuarioExistente] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
  const [editUsuarioNome, setEditUsuarioNome] = useState('');
  const [editUsuarioLogin, setEditUsuarioLogin] = useState('');
  const [editUsuarioEmail, setEditUsuarioEmail] = useState('');
  const [editUsuarioNovaSenha, setEditUsuarioNovaSenha] = useState('');
  const [editUsuarioConfirmarSenha, setEditUsuarioConfirmarSenha] = useState('');
  const [mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha] = useState(false);
  const [editUsuarioPerfil, setEditUsuarioPerfil] = useState<
    'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
  >('operador_simples');
  const [modalUsuarios, setModalUsuarios] = useState(false);
  const [ajudaUsuariosAberta, setAjudaUsuariosAberta] = useState(false);
  const rascunhoUsuarioCarregadoRef = useRef('');

  const chaveRascunhoUsuario = empresaId && acessoUsuarioAtualId
    ? `${CHAVE_RASCUNHO_USUARIO_WEB}${acessoUsuarioAtualId}:${empresaId}`
    : '';

  const removerRascunhoUsuario = () => {
    if (!chaveRascunhoUsuario || typeof window === 'undefined') return;
    try { window.sessionStorage.removeItem(chaveRascunhoUsuario); } catch { /* armazenamento indisponível */ }
  };

  useEffect(() => {
    if (!chaveRascunhoUsuario || typeof window === 'undefined') return;
    rascunhoUsuarioCarregadoRef.current = '';
    let timer: number | undefined;
    try {
      const salvo = JSON.parse(window.sessionStorage.getItem(chaveRascunhoUsuario) || 'null') as {
        expiraEm?: number;
        nome?: string;
        email?: string;
        login?: string;
        perfil?: '' | 'administrador' | 'operador_completo' | 'operador_simples';
      } | null;
      if (salvo && Number(salvo.expiraEm) > Date.now()) {
        timer = window.setTimeout(() => {
          setUsuarioNome(String(salvo.nome || ''));
          setUsuarioEmail(String(salvo.email || ''));
          setUsuarioLogin(String(salvo.login || ''));
          setUsuarioPerfil(salvo.perfil || '');
          rascunhoUsuarioCarregadoRef.current = chaveRascunhoUsuario;
        }, 0);
      } else {
        window.sessionStorage.removeItem(chaveRascunhoUsuario);
        rascunhoUsuarioCarregadoRef.current = chaveRascunhoUsuario;
      }
    } catch {
      try { window.sessionStorage.removeItem(chaveRascunhoUsuario); } catch { /* armazenamento indisponível */ }
      rascunhoUsuarioCarregadoRef.current = chaveRascunhoUsuario;
    }
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [chaveRascunhoUsuario]);

  useEffect(() => {
    if (
      !chaveRascunhoUsuario ||
      rascunhoUsuarioCarregadoRef.current !== chaveRascunhoUsuario ||
      typeof window === 'undefined'
    ) return;
    try {
      window.sessionStorage.setItem(chaveRascunhoUsuario, JSON.stringify({
        versao: 1,
        expiraEm: Date.now() + VALIDADE_RASCUNHO_USUARIO_MS,
        nome: usuarioNome,
        email: usuarioEmail,
        login: usuarioLogin,
        perfil: usuarioPerfil,
      }));
    } catch { /* armazenamento indisponível */ }
  }, [chaveRascunhoUsuario, usuarioEmail, usuarioLogin, usuarioNome, usuarioPerfil]);

  // ---------------------------------------------------------------------------
  // Permissões derivadas
  // ---------------------------------------------------------------------------

  const podeGerenciarUsuarios =
    perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

  const focarCampoUsuario = (id: string) => {
    const elemento = document.getElementById(id) as HTMLElement | null;
    elemento?.focus();
    elemento?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const idCampoUsuario = (
    campo: string | null | undefined,
    modo: 'criar' | 'editar'
  ) => campo
    ? `${modo === 'criar' ? 'novo-usuario-' : 'editar-usuario-'}${campo}`
    : '';

  const avisarCampoUsuario = (
    titulo: string,
    mensagem: string,
    campo: string,
    modo: 'criar' | 'editar'
  ) => {
    const id = idCampoUsuario(campo, modo);
    abrirAviso(titulo, mensagem, id ? () => focarCampoUsuario(id) : undefined);
  };

  // ---------------------------------------------------------------------------
  // Funções — Usuários da empresa
  // ---------------------------------------------------------------------------

  const carregarUsuariosEmpresa = async () => {
    if (!empresaId || !podeGerenciarUsuarios) return;
    setUsuariosCarregando(true);
    const usuarios = await buscarUsuariosEmpresa(empresaId);
    setUsuariosEmpresa(usuarios);
    setUsuariosCarregando(false);
  };

  const abrirModalUsuarios = () => {
    setModalUsuarios(true);
    setUsuarioSenha('');
    setModoFormularioUsuario('');
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
  };

  const abrirCriarNovoUsuario = () => {
    setModoFormularioUsuario('criar');
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
    setPesquisandoUsuarioExistente(false);
    setVinculandoUsuarioExistente(false);
  };

  const abrirAdicionarUsuarioExistente = () => {
    setModoFormularioUsuario('existente');
    setUsuarioEditandoId(null);
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
    setPesquisandoUsuarioExistente(false);
    setVinculandoUsuarioExistente(false);
  };

  const ocultarFormularioUsuario = () => {
    setModoFormularioUsuario('');
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
    setPesquisandoUsuarioExistente(false);
    setVinculandoUsuarioExistente(false);
  };

  const buscaUsuarioExistente = async () => {
    if (!empresaId) { abrirAviso('Erro', 'Empresa não carregada.'); return; }
    if (!podeGerenciarUsuarios) {
      abrirAviso('Acesso não permitido', 'Você não tem permissão para gerenciar usuários.');
      return;
    }

    const termoLimpo = usuarioExistenteTermo.trim().toLowerCase();
    if (!termoLimpo) {
      abrirAviso('Campo obrigatório', 'Informe o e-mail ou login do usuário já cadastrado.');
      return;
    }

    setPesquisandoUsuarioExistente(true);
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');

    const resultado = await buscarUsuarioExistenteEmpresa({ empresaId, termo: termoLimpo });
    setPesquisandoUsuarioExistente(false);

    if (resultado.erro) { abrirAviso('Erro ao pesquisar usuário', resultado.mensagem); return; }
    if (!resultado.encontrado) {
      abrirAviso('Usuário não encontrado', 'Nenhum usuário encontrado com este e-mail ou login.');
      return;
    }
    if (resultado.jaVinculado) {
      abrirAviso('Usuário já vinculado', 'Este usuário já está vinculado a esta empresa.');
      return;
    }

    setUsuarioEncontrado(resultado.usuario);
    setPerfilUsuarioExistente('operador_simples');
  };

  const confirmarVinculoUsuarioExistente = async () => {
    if (!empresaId || !usuarioEncontrado?.id) return;
    if (!perfilUsuarioExistente) {
      abrirAviso('Perfil obrigatório', 'Selecione o perfil de acesso para este usuário.');
      return;
    }

    setVinculandoUsuarioExistente(true);

    const resultado = await vincularUsuarioExistenteEmpresa({
      empresaId,
      userId: usuarioEncontrado.id,
      perfil: perfilUsuarioExistente,
    });

    setVinculandoUsuarioExistente(false);

    if (resultado.erro) { abrirAviso('Erro ao vincular usuário', resultado.mensagem); return; }

    setModalUsuarios(false);
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
    setModoFormularioUsuario('criar');

    await carregarUsuariosEmpresa();
    abrirAviso('Usuário vinculado', 'Usuário vinculado com sucesso.', undefined, 'sucesso');
  };

  const adicionarUsuarioEmpresa = async () => {
    if (usuarioSalvando) return;
    if (!empresaId) { abrirAviso('Erro', 'Empresa não carregada.'); return; }
    if (!podeGerenciarUsuarios) {
      abrirAviso('Acesso não permitido', 'Você não tem permissão para gerenciar usuários.');
      return;
    }

    const nomeLimpo = usuarioNome.trim();
    const emailLimpo = usuarioEmail.trim().toLowerCase();
    const loginLimpo = usuarioLogin.trim().toLowerCase();
    const senhaLimpa = usuarioSenha.trim();

    if (!nomeLimpo || !emailLimpo || !loginLimpo || !senhaLimpa || !usuarioPerfil) {
      const campo = !nomeLimpo ? 'nome' : !emailLimpo ? 'email' : !loginLimpo ? 'login' : !senhaLimpa ? 'senha' : 'perfil';
      avisarCampoUsuario('Campos obrigatórios', 'Informe nome completo, e-mail, login, senha e tipo de usuário.', campo, 'criar');
      return;
    }
    if (!validarNomeCompleto(nomeLimpo)) {
      avisarCampoUsuario('Nome incompleto', 'Informe o nome completo do usuário, com nome e sobrenome.', 'nome', 'criar');
      return;
    }
    if (!validarEmail(emailLimpo)) {
      avisarCampoUsuario('E-mail inválido', 'Informe um e-mail válido para este usuário.', 'email', 'criar');
      return;
    }

    const loginJaExiste = usuariosEmpresa.some(
      (u) => (u.login || '').trim().toLowerCase() === loginLimpo
    );
    if (loginJaExiste) {
      abrirAviso(
        'Login indisponível',
        'Este login já está em uso nesta empresa. Escolha outro login para criar o usuário.',
        () => focarCampoUsuario('novo-usuario-login')
      );
      return;
    }

    if (loginLimpo.includes('@')) {
      abrirAviso(
        'Login inválido',
        'Para usuários internos, use um login simples, sem @. Exemplo: financeiro, caixa ou operador1.',
        () => focarCampoUsuario('novo-usuario-login')
      );
      return;
    }

    if (senhaLimpa.length < 8) {
      avisarCampoUsuario('Senha muito curta', 'A senha deve ter pelo menos 8 caracteres.', 'senha', 'criar');
      return;
    }

    setUsuarioSalvando(true);
    const resultado = await criarUsuarioEmpresa({
        empresaId,
        nome: nomeLimpo,
        email: emailLimpo,
        login: loginLimpo,
        senha: senhaLimpa,
        perfil: usuarioPerfil,
      })
      .catch(() => ({
        erro: true,
        mensagem: 'Não foi possível consultar o servidor. Verifique a conexão e tente novamente.',
        campo: null,
        data: null,
      }))
      .finally(() => setUsuarioSalvando(false));

    if (resultado.erro) {
      const id = idCampoUsuario(resultado.campo, 'criar');
      abrirAviso('Erro ao criar usuário', resultado.mensagem, id ? () => focarCampoUsuario(id) : undefined);
      return;
    }

    setUsuarioNome('');
    setUsuarioEmail('');
    setUsuarioLogin('');
    setUsuarioSenha('');
    setUsuarioPerfil('operador_simples');
    removerRascunhoUsuario();

    await carregarUsuariosEmpresa();
  };

  const iniciarEdicaoUsuario = (usuario: any) => {
    const loginUsuario = (usuario.login || usuario.email || '').toLowerCase();
    const emailAtual = (emailUsuarioAtual || '').toLowerCase();
    const usuarioEhAtual =
      loginUsuario === emailAtual || usuario.email?.toLowerCase() === emailAtual;

    if (
      usuario.perfil === 'gestor_master' &&
      !usuarioEhAtual &&
      perfilUsuario !== 'gestor_master'
    ) {
      abrirAviso('Acesso não permitido', 'O gestor master só pode editar o próprio acesso.');
      return;
    }

    setUsuarioEditandoId(usuario.id);
    setEditUsuarioNome(usuario.nome || '');
    setEditUsuarioLogin(usuario.login || '');
    setEditUsuarioEmail(String(usuario.email || '').includes('@usuarios.avantalab.local') ? '' : (usuario.email || ''));
    setEditUsuarioNovaSenha('');
    setEditUsuarioConfirmarSenha('');
    setMostrarEditUsuarioNovaSenha(false);
    setEditUsuarioPerfil(
      usuario.perfil as
        | 'gestor_master'
        | 'administrador'
        | 'operador_completo'
        | 'operador_simples'
    );
  };

  const cancelarEdicaoUsuario = () => {
    setUsuarioEditandoId(null);
    setEditUsuarioNome('');
    setEditUsuarioLogin('');
    setEditUsuarioEmail('');
    setEditUsuarioPerfil('operador_simples');
    setEditUsuarioNovaSenha('');
    setEditUsuarioConfirmarSenha('');
    setMostrarEditUsuarioNovaSenha(false);
  };

  const salvarEdicaoUsuario = async () => {
    if (!usuarioEditandoId || usuarioSalvando) return;

    const usuarioOriginal = usuariosEmpresa.find((u) => u.id === usuarioEditandoId);
    if (!usuarioOriginal) { abrirAviso('Erro', 'Usuário não encontrado para edição.'); return; }

    const nomeLimpo = editUsuarioNome.trim();
    const emailLimpo = editUsuarioEmail.trim().toLowerCase();
    const loginLimpo = editUsuarioLogin.trim().toLowerCase();

    if (!validarNomeCompleto(nomeLimpo)) { avisarCampoUsuario('Nome incompleto', 'Informe o nome completo do usuário, com nome e sobrenome.', 'nome', 'editar'); return; }
    if (!emailLimpo) { avisarCampoUsuario('Campo obrigatório', 'Informe o e-mail deste usuário.', 'email', 'editar'); return; }
    if (!validarEmail(emailLimpo)) { avisarCampoUsuario('E-mail inválido', 'Informe um e-mail válido para este usuário.', 'email', 'editar'); return; }
    if (!loginLimpo) { avisarCampoUsuario('Campo obrigatório', 'Informe o login deste usuário.', 'login', 'editar'); return; }
    if (loginLimpo.includes('@')) { avisarCampoUsuario('Login inválido', 'Use um login simples, sem @.', 'login', 'editar'); return; }
    if (editUsuarioNovaSenha.trim() !== editUsuarioConfirmarSenha.trim()) { avisarCampoUsuario('Senha não confere', 'Repita a nova senha exatamente igual.', 'confirmar-senha', 'editar'); return; }

    const nomeOriginal = (usuarioOriginal.nome || '').trim();
    const loginOriginal = (usuarioOriginal.login || usuarioOriginal.email || '').toLowerCase();
    const perfilOriginal = usuarioOriginal.perfil;

    const houveAlteracao =
      nomeLimpo !== nomeOriginal ||
      loginLimpo !== loginOriginal ||
      emailLimpo !== String(usuarioOriginal.email || '').toLowerCase() ||
      editUsuarioPerfil !== perfilOriginal ||
      Boolean(editUsuarioNovaSenha.trim());

    if (!houveAlteracao) {
      abrirAviso('Nenhuma alteração', 'Altere algum dado do usuário antes de salvar.');
      return;
    }

    setUsuarioSalvando(true);
    const resultado = await atualizarUsuarioEmpresa({
        acessoId: usuarioEditandoId,
        nome: nomeLimpo,
        login: loginLimpo,
        email: emailLimpo,
        perfil: editUsuarioPerfil,
        novaSenha: editUsuarioNovaSenha,
      })
      .catch(() => ({
        erro: true,
        mensagem: 'Não foi possível consultar o servidor. Verifique a conexão e tente novamente.',
        campo: null,
        data: null,
      }))
      .finally(() => setUsuarioSalvando(false));

    if (resultado.erro) {
      const id = idCampoUsuario(resultado.campo, 'editar');
      abrirAviso('Erro ao atualizar usuário', resultado.mensagem, id ? () => focarCampoUsuario(id) : undefined);
      return;
    }

    await carregarUsuariosEmpresa();
    setEditUsuarioNovaSenha('');
    setEditUsuarioConfirmarSenha('');
    setMostrarEditUsuarioNovaSenha(false);
    abrirAviso('Usuário atualizado', 'Os dados do usuário foram salvos com sucesso.');
  };

  const redefinirSenhaUsuario = async () => {
    if (!usuarioEditandoId) return;

    const senhaLimpa = editUsuarioNovaSenha.trim();
    if (!senhaLimpa) {
      abrirAviso('Senha obrigatória', 'Informe a nova senha antes de redefinir.');
      return;
    }
    if (senhaLimpa.length < 8) {
      abrirAviso('Senha muito curta', 'A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    const resultado = await redefinirSenhaUsuarioEmpresa({
      acessoId: usuarioEditandoId,
      novaSenha: senhaLimpa,
    });

    if (resultado.erro) { abrirAviso('Erro ao redefinir senha', resultado.mensagem); return; }

    setEditUsuarioNovaSenha('');
    setMostrarEditUsuarioNovaSenha(false);
    abrirAviso(
      'Senha redefinida',
      'A nova senha foi salva com sucesso. Não é necessário clicar em Salvar para confirmar a senha.',
      undefined,
      'sucesso'
    );
  };

  const bloquearAcessoUsuario = async (acessoId: string) => {
    if (!podeGerenciarUsuarios) {
      abrirAviso('Acesso não permitido', 'Você não tem permissão para bloquear usuários.');
      return;
    }

    abrirConfirmacao({
      titulo: 'Bloquear usuário',
      mensagem:
        'Deseja bloquear este usuário?\n\nEle não conseguirá mais acessar esta empresa.',
      acao: async () => {
        const resultado = await bloquearUsuarioEmpresa(acessoId);
        if (resultado.erro) { abrirAviso('Erro ao bloquear usuário', resultado.mensagem); return; }
        await carregarUsuariosEmpresa();
      },
    });
  };

  const excluirAcessoUsuario = async (acessoId: string) => {
    const excluindoProprioAcesso = acessoId === acessoUsuarioAtualId;

    abrirConfirmacao({
      titulo: excluindoProprioAcesso ? 'Excluir minha conta' : 'Excluir usuário',
      mensagem: excluindoProprioAcesso
        ? 'Você está prestes a excluir o seu próprio acesso a esta empresa.\n\nApós a exclusão, você será desconectado e voltará para a tela de login.\n\nDeseja continuar?'
        : 'Deseja excluir este usuário?\n\nEle perderá o acesso a esta empresa. Se esta conta tiver sido criada neste perfil e não possuir outros vínculos ou histórico, o login também será excluído definitivamente. Caso contrário, somente este acesso será removido.',
      textoConfirmar: 'Excluir',
      acao: async () => {
        const resultado = await excluirUsuarioEmpresa(acessoId);
        if (resultado.erro) { abrirAviso('Erro ao excluir usuário', resultado.mensagem); return; }

        if (excluindoProprioAcesso) {
          setModalUsuarios(false);
          setUsuarioEditandoId(null);
          setAcessoUsuarioAtualId(null);
          await handleLogout();
          window.location.href = window.location.origin + window.location.pathname;
          return;
        }

        await carregarUsuariosEmpresa();
        abrirAviso(
          resultado.data?.exclusaoTotal
            ? 'Usuário excluído definitivamente'
            : 'Acesso removido',
          resultado.mensagem,
          undefined,
          'sucesso'
        );
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Funções — Edição de empresa
  // ---------------------------------------------------------------------------

  const abrirEdicaoEmpresaAtual = async (
    podeAcessarAjustes: boolean,
    tipoPerfilAtualNormalizado: TipoPerfil,
    inline = false
  ) => {
    if (!empresaId) {
      abrirAviso('Empresa não carregada', 'Não foi possível identificar a empresa atual.');
      return;
    }
    if (!podeAcessarAjustes) {
      abrirAviso(
        'Acesso não permitido',
        'Somente Gestor Master e Administrador podem editar estes dados.'
      );
      return;
    }

    setEditEmpresaNome(nomeEmpresaAtual || '');
    setEditTipoPerfil(tipoPerfilAtualNormalizado);
    setEditEmpresaLogin(emailUsuarioAtual || '');
    setEditEmpresaSenha('');

    const { data: usuarioLogado } = await supabase.auth.getUser();
    const usuarioId = usuarioLogado.user?.id;

    if (usuarioId) {
      const acessoAtual = await buscarMeuAcessoEmpresa(empresaId, usuarioId);
      if (acessoAtual) {
        setEditEmpresaLogin(acessoAtual.login || acessoAtual.email || emailUsuarioAtual || '');
      }
    }

    if (!inline) {
      setModalEmpresasAberto(false);
      setModalEditarEmpresaAberto(true);
    }
  };

  const fecharEdicaoEmpresaAtual = () => {
    if (editEmpresaSalvando) return;
    setModalEditarEmpresaAberto(false);
    setEditEmpresaNome('');
    setEditTipoPerfil('empresa');
    setEditEmpresaLogin('');
    setEditEmpresaSenha('');
  };

  const salvarEdicaoEmpresaAtual = async (): Promise<boolean> => {
    if (!empresaId || !acessoUsuarioAtualId) {
      abrirAviso('Dados incompletos', 'Não foi possível identificar a empresa ou o acesso atual.');
      return false;
    }
    if (!podeGerenciarUsuarios) {
      abrirAviso('Acesso não permitido', 'Somente Gestor Master e Administrador podem editar estes dados.');
      return false;
    }

    const nomeLimpo = editEmpresaNome.trim();
    const loginLimpo = editEmpresaLogin.trim().toLowerCase();
    const senhaLimpa = editEmpresaSenha.trim();
    const tipoPerfilLimpo = normalizarTipoPerfil(editTipoPerfil);

    if (!nomeLimpo) { abrirAviso('Nome obrigatório', 'Informe o nome da empresa.'); return false; }
    if (!loginLimpo) { abrirAviso('Login obrigatório', 'Informe o login ou email do acesso atual.'); return false; }
    if (senhaLimpa && senhaLimpa.length < 8) {
      abrirAviso('Senha inválida', 'A nova senha deve ter pelo menos 8 caracteres.');
      return false;
    }

    try {
      setEditEmpresaSalvando(true);

      const resultadoEmpresa = await atualizarEmpresa({ empresaId, nome: nomeLimpo, tipoPerfil: tipoPerfilLimpo });
      if (resultadoEmpresa.erro) {
        abrirAviso('Erro ao salvar empresa', resultadoEmpresa.mensagem || 'Não foi possível atualizar o nome da empresa.', undefined, 'erro');
        return false;
      }

      const resultadoUsuario = await atualizarUsuarioEmpresa({
        acessoId: acessoUsuarioAtualId,
        nome: nomeUsuarioAtual || nomeLimpo,
        email: loginLimpo,
        perfil: perfilUsuario || 'operador_simples',
      });
      if (resultadoUsuario.erro) {
        abrirAviso('Erro ao salvar acesso', resultadoUsuario.mensagem || 'Não foi possível atualizar login/email.', undefined, 'erro');
        return false;
      }

      if (senhaLimpa) {
        const resultadoSenha = await redefinirSenhaUsuarioEmpresa({ acessoId: acessoUsuarioAtualId, novaSenha: senhaLimpa });
        if (resultadoSenha.erro) {
          abrirAviso('Dados salvos parcialmente', resultadoSenha.mensagem || 'Empresa e login foram salvos, mas a senha não foi alterada.', undefined, 'alerta');
          setNomeEmpresaAtual(nomeLimpo);
          setTipoPerfilAtual(tipoPerfilLimpo);
          setEmpresasDoUsuario((empresas) =>
            empresas.map((e) =>
              e.id === empresaId ? { ...e, nome: nomeLimpo, empresa_nome: nomeLimpo, tipo_perfil: tipoPerfilLimpo } : e
            )
          );
          setEditEmpresaSenha('');
          return false;
        }
      }

      setNomeEmpresaAtual(nomeLimpo);
      setTipoPerfilAtual(tipoPerfilLimpo);
      setEmailUsuarioAtual(loginLimpo.includes('@') ? loginLimpo : emailUsuarioAtual);
      setEmpresasDoUsuario((empresas) =>
        empresas.map((e) =>
          e.id === empresaId
            ? { ...e, nome: nomeLimpo, empresa_nome: nomeLimpo, tipo_perfil: tipoPerfilLimpo, usuario_login: loginLimpo }
            : e
        )
      );

      fecharEdicaoEmpresaAtual();
      abrirAviso('Dados atualizados', 'Empresa e acesso foram atualizados com sucesso.', undefined, 'sucesso');
      return true;
    } finally {
      setEditEmpresaSalvando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Funções — Troca de empresa
  // ---------------------------------------------------------------------------

  const abrirTrocaEmpresa = async (ajustesAberto: boolean, setPainelAvisosAberto: (v: boolean) => void, setAjustesAberto: (v: boolean) => void) => {
    const { data: usuarioLogado } = await supabase.auth.getUser();
    const usuarioId = usuarioLogado.user?.id;

    if (!usuarioId) {
      abrirAviso(
        'Sessao nao encontrada',
        'Entre novamente para carregar suas empresas vinculadas.'
      );
      return;
    }

    let empresasAtualizadas;
    try {
      empresasAtualizadas = (await buscarEmpresasDoUsuario(usuarioId)).filter(
        (empresa): empresa is NonNullable<typeof empresa> => Boolean(empresa)
      );
    } catch (e) {
      console.error('Erro ao carregar empresas para troca:', e);
      abrirAviso('Não foi possível carregar', 'Houve uma falha ao buscar suas empresas. Tente novamente em instantes.');
      return;
    }
    setEmpresasDoUsuario(empresasAtualizadas);

    if (empresasAtualizadas.length <= 1) {
      abrirAviso(
        'Troca indisponível',
        'Este usuário possui acesso a apenas uma empresa no momento.'
      );
      return;
    }

    setAjustesAberto(false);
    setPainelAvisosAberto(false);
    setEmpresaParaSelecionar(
      empresasAtualizadas.find((empresa) => empresa.id !== empresaId) ||
        empresasAtualizadas[0] ||
        null
    );
    setModalSelecionarEmpresa(true);
  };

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------

  return {
    // Empresa atual
    empresaId, setEmpresaId,
    nomeEmpresaAtual, setNomeEmpresaAtual,
    tipoPerfilAtual, setTipoPerfilAtual,
    nomeUsuarioAtual, setNomeUsuarioAtual,
    emailUsuarioAtual, setEmailUsuarioAtual,
    acessoUsuarioAtualId, setAcessoUsuarioAtualId,
    perfilUsuario, setPerfilUsuario,

    // Lista de empresas
    empresasDoUsuario, setEmpresasDoUsuario,
    empresaParaSelecionar, setEmpresaParaSelecionar,

    // Acesso
    acessoLiberado, setAcessoLiberado,
    acessoNaoConfigurado, setAcessoNaoConfigurado,

    // Permissões
    podeGerenciarUsuarios,

    // Modais de empresa
    modalSelecionarEmpresa, setModalSelecionarEmpresa,
    modalEmpresasAberto, setModalEmpresasAberto,
    modalEditarEmpresaAberto, setModalEditarEmpresaAberto,
    editEmpresaNome, setEditEmpresaNome,
    editTipoPerfil, setEditTipoPerfil,
    editEmpresaLogin, setEditEmpresaLogin,
    editEmpresaSenha, setEditEmpresaSenha,
    editEmpresaSalvando, setEditEmpresaSalvando,
    modalExcluirEmpresa, setModalExcluirEmpresa,
    nomeConfirmacaoExclusao, setNomeConfirmacaoExclusao,
    excluindoEmpresa, setExcluindoEmpresa,

    // Usuários
    usuariosEmpresa, setUsuariosEmpresa,
    usuariosCarregando, setUsuariosCarregando,
    usuarioSalvando, setUsuarioSalvando,
    usuarioNome, setUsuarioNome,
    usuarioEmail, setUsuarioEmail,
    usuarioLogin, setUsuarioLogin,
    usuarioSenha, setUsuarioSenha,
    mostrarUsuarioSenha, setMostrarUsuarioSenha,
    usuarioPerfil, setUsuarioPerfil,
    modoFormularioUsuario, setModoFormularioUsuario,
    usuarioExistenteTermo, setUsuarioExistenteTermo,
    usuarioEncontrado, setUsuarioEncontrado,
    perfilUsuarioExistente, setPerfilUsuarioExistente,
    pesquisandoUsuarioExistente, setPesquisandoUsuarioExistente,
    vinculandoUsuarioExistente, setVinculandoUsuarioExistente,
    usuarioEditandoId, setUsuarioEditandoId,
    editUsuarioNome, setEditUsuarioNome,
    editUsuarioLogin, setEditUsuarioLogin,
    editUsuarioEmail, setEditUsuarioEmail,
    editUsuarioNovaSenha, setEditUsuarioNovaSenha,
    editUsuarioConfirmarSenha, setEditUsuarioConfirmarSenha,
    mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha,
    editUsuarioPerfil, setEditUsuarioPerfil,
    modalUsuarios, setModalUsuarios,
    ajudaUsuariosAberta, setAjudaUsuariosAberta,

    // Funções
    carregarUsuariosEmpresa,
    abrirModalUsuarios,
    abrirCriarNovoUsuario,
    abrirAdicionarUsuarioExistente,
    ocultarFormularioUsuario,
    buscaUsuarioExistente,
    confirmarVinculoUsuarioExistente,
    adicionarUsuarioEmpresa,
    iniciarEdicaoUsuario,
    cancelarEdicaoUsuario,
    salvarEdicaoUsuario,
    redefinirSenhaUsuario,
    bloquearAcessoUsuario,
    excluirAcessoUsuario,
    abrirEdicaoEmpresaAtual,
    fecharEdicaoEmpresaAtual,
    salvarEdicaoEmpresaAtual,
    abrirTrocaEmpresa,
  };
}
