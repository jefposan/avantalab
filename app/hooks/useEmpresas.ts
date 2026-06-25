/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
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
import type { AbrirAvisoFn, AbrirConfirmacaoFn } from './useUI';

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
  const [usuarioNome, setUsuarioNome] = useState('');
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
  const [editUsuarioEmail, setEditUsuarioEmail] = useState('');
  const [editUsuarioNovaSenha, setEditUsuarioNovaSenha] = useState('');
  const [mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha] = useState(false);
  const [editUsuarioPerfil, setEditUsuarioPerfil] = useState<
    'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
  >('operador_simples');
  const [modalUsuarios, setModalUsuarios] = useState(false);
  const [ajudaUsuariosAberta, setAjudaUsuariosAberta] = useState(false);

  // ---------------------------------------------------------------------------
  // Permissões derivadas
  // ---------------------------------------------------------------------------

  const podeGerenciarUsuarios =
    perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

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
    setTimeout(() => {
      setUsuarioNome('');
      setUsuarioLogin('');
      setUsuarioSenha('');
      setUsuarioPerfil('');
      setModoFormularioUsuario('');
      setUsuarioExistenteTermo('');
      setUsuarioEncontrado(null);
      setPerfilUsuarioExistente('');
    }, 50);
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
    if (!empresaId) { abrirAviso('Erro', 'Empresa não carregada.'); return; }
    if (!podeGerenciarUsuarios) {
      abrirAviso('Acesso não permitido', 'Você não tem permissão para gerenciar usuários.');
      return;
    }

    const nomeLimpo = usuarioNome.trim();
    const loginLimpo = usuarioLogin.trim().toLowerCase();
    const senhaLimpa = usuarioSenha.trim();

    if (!nomeLimpo || !loginLimpo || !senhaLimpa || !usuarioPerfil) {
      abrirAviso('Campos obrigatórios', 'Informe nome, login, senha e tipo de usuário.');
      return;
    }

    const loginJaExiste = usuariosEmpresa.some(
      (u) => (u.login || '').trim().toLowerCase() === loginLimpo
    );
    if (loginJaExiste) {
      abrirAviso(
        'Login indisponível',
        'Este login já está em uso nesta empresa. Escolha outro login para criar o usuário.'
      );
      return;
    }

    if (loginLimpo.includes('@')) {
      abrirAviso(
        'Login inválido',
        'Para usuários internos, use um login simples, sem @. Exemplo: financeiro, caixa ou operador1.'
      );
      return;
    }

    if (senhaLimpa.length < 8) {
      abrirAviso('Senha muito curta', 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    const resultado = await criarUsuarioEmpresa({
      empresaId,
      nome: nomeLimpo,
      login: loginLimpo,
      senha: senhaLimpa,
      perfil: usuarioPerfil,
    });

    if (resultado.erro) { abrirAviso('Erro ao criar usuário', resultado.mensagem); return; }

    setUsuarioNome('');
    setUsuarioLogin('');
    setUsuarioSenha('');
    setUsuarioPerfil('operador_simples');

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
    setEditUsuarioEmail(usuario.login || usuario.email || '');
    setEditUsuarioNovaSenha('');
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
    setEditUsuarioEmail('');
    setEditUsuarioPerfil('operador_simples');
    setEditUsuarioNovaSenha('');
    setMostrarEditUsuarioNovaSenha(false);
  };

  const salvarEdicaoUsuario = async () => {
    if (!usuarioEditandoId) return;

    const usuarioOriginal = usuariosEmpresa.find((u) => u.id === usuarioEditandoId);
    if (!usuarioOriginal) { abrirAviso('Erro', 'Usuário não encontrado para edição.'); return; }

    const nomeLimpo = editUsuarioNome.trim();
    const emailLimpo = editUsuarioEmail.trim().toLowerCase();

    if (!nomeLimpo) { abrirAviso('Campo obrigatório', 'Informe o nome do usuário.'); return; }
    if (!emailLimpo) { abrirAviso('Campo obrigatório', 'Informe o login/email deste usuário.'); return; }

    const nomeOriginal = (usuarioOriginal.nome || '').trim();
    const loginOriginal = (usuarioOriginal.login || usuarioOriginal.email || '').toLowerCase();
    const perfilOriginal = usuarioOriginal.perfil;

    const houveAlteracao =
      nomeLimpo !== nomeOriginal ||
      emailLimpo !== loginOriginal ||
      editUsuarioPerfil !== perfilOriginal;

    if (!houveAlteracao) {
      abrirAviso('Nenhuma alteração', 'Altere algum dado do usuário antes de salvar.');
      return;
    }

    const resultado = await atualizarUsuarioEmpresa({
      acessoId: usuarioEditandoId,
      nome: nomeLimpo,
      email: emailLimpo,
      perfil: editUsuarioPerfil,
    });

    if (resultado.erro) { abrirAviso('Erro ao atualizar usuário', resultado.mensagem); return; }

    await carregarUsuariosEmpresa();
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
        : 'Deseja excluir este usuário?\n\nEle perderá o acesso a esta empresa. Essa ação não poderá ser desfeita.',
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
    usuarioNome, setUsuarioNome,
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
    editUsuarioEmail, setEditUsuarioEmail,
    editUsuarioNovaSenha, setEditUsuarioNovaSenha,
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
