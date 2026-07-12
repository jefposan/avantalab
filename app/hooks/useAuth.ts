/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  buscarEmpresasDoUsuario,
  buscarEmpresaDoUsuario,
  buscarEmailPorLogin,
  criarEmpresaInicial,
  atualizarEmpresa,
  inserirDespesasPadraoPerfil,
} from '../lib/database';
import { normalizarTipoPerfil, type TipoPerfil } from '../lib/perfis';
import { TERMOS_VERSAO } from '../lib/legal';
import { DDI_PADRAO } from '../lib/paises';
import { COBRANCA_ATIVA } from '../lib/cobranca';
import type { AbrirAvisoFn } from './useUI';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type UseAuthDeps = {
  /** Exibir modal de aviso — fornecido por useUI */
  abrirAviso: AbrirAvisoFn;
  /** Carrega a empresa selecionada — definido em page.tsx como orquestrador */
  carregarEmpresaSelecionada: (empresa: any) => Promise<void>;
  /** Chamado quando o login retorna múltiplas empresas para selecionar */
  onMultiplasEmpresas: (empresas: any[]) => void;
  /** Chamado quando o login retorna zero empresas configuradas */
  onSemEmpresa: () => void;
  /** Seters de estados não-auth necessários em handleCriarEmpresaInicial */
  setTipoPerfilAtual: React.Dispatch<React.SetStateAction<TipoPerfil>>;
  setDuplicadosAtivo: React.Dispatch<React.SetStateAction<boolean>>;
};

function telefoneCadastroConfirmado(metadata: Record<string, unknown> | null | undefined) {
  const telefoneOriginal = String(metadata?.telefone || '');
  const digitos = telefoneOriginal.replace(/\D/g, '');
  if (!digitos) return '';

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos.slice(2);
  }

  return digitos;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(deps: UseAuthDeps) {
  const {
    abrirAviso,
    carregarEmpresaSelecionada,
    onMultiplasEmpresas,
    onSemEmpresa,
    setTipoPerfilAtual,
    setDuplicadosAtivo,
  } = deps;

  // --- Estados de autenticação de entrada ---
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');
  const [mostrarLandingPreLogin, setMostrarLandingPreLogin] = useState(true);

  // Deep link da landing: /?cadastro=1 abre direto a tela de criar cadastro.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('cadastro') === '1') {
      // Ajuste único no mount a partir de estado externo (URL); não gera cascata.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMostrarLandingPreLogin(false);
      setModoAuth('cadastro');
    }
  }, []);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
  const [mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro] = useState(false);

  // --- Estados de cadastro ---
  const [cadastroNome, setCadastroNome] = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroTelefone, setCadastroTelefone] = useState('');
  const [cadastroSenha, setCadastroSenha] = useState('');
  const [cadastroCupom, setCadastroCupom] = useState('');
  const [cadastroConfirmarSenha, setCadastroConfirmarSenha] = useState('');
  // DDI (código do país) do celular do cadastro. Padrão: Brasil.
  const [cadastroDdi, setCadastroDdi] = useState(DDI_PADRAO);
  // Início do perfil empresa: '7 dias grátis' (trial) ou 'assinar agora'.
  const [inicioEmpresaModo, setInicioEmpresaModo] = useState<'trial' | 'assinar'>('trial');

  // --- Estados de SMS cadastro ---
  const [codigoSmsCadastro, setCodigoSmsCadastro] = useState('');
  const [smsCadastroEnviado, setSmsCadastroEnviado] = useState(false);
  const [telefoneSmsCadastroConfirmado, setTelefoneSmsCadastroConfirmado] = useState('');
  const [segundosReenvioSms, setSegundosReenvioSms] = useState(0);
  const [reenviandoSmsCadastro, setReenviandoSmsCadastro] = useState(false);

  // --- Estados de redefinição de senha ---
  const [modoRedefinirSenha, setModoRedefinirSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState(false);
  const [codigoSmsRedefinirSenha, setCodigoSmsRedefinirSenha] = useState('');
  const [smsRedefinirSenhaEnviado, setSmsRedefinirSenhaEnviado] = useState(false);
  const [segundosReenvioRedefinirSenha, setSegundosReenvioRedefinirSenha] = useState(0);
  const [reenviandoSmsRedefinirSenha, setReenviandoSmsRedefinirSenha] = useState(false);

  // --- Estados de status de autenticação ---
  const [authErro, setAuthErro] = useState('');
  const [authMensagem, setAuthMensagem] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [carregandoSistema, setCarregandoSistema] = useState(true);
  const [mensagemCarregamentoSistema, setMensagemCarregamentoSistema] = useState(
    'Carregando sistema...'
  );

  // --- Estados de onboarding (criar empresa inicial) ---
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [nomeEmpresaInicial, setNomeEmpresaInicial] = useState('');
  const [tipoPerfilInicial, setTipoPerfilInicial] = useState<TipoPerfil>('empresa');
  const [criandoEmpresaInicial, setCriandoEmpresaInicial] = useState(false);
  const criandoEmpresaInicialRef = useRef(false);
  const [criandoNovaEmpresaLogada, setCriandoNovaEmpresaLogada] = useState(false);

  // ---------------------------------------------------------------------------
  // Efeitos — contagem regressiva para reenvio de SMS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (segundosReenvioSms <= 0) return;
    const timer = window.setTimeout(() => {
      setSegundosReenvioSms((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [segundosReenvioSms]);

  useEffect(() => {
    if (segundosReenvioRedefinirSenha <= 0) return;
    const timer = window.setTimeout(() => {
      setSegundosReenvioRedefinirSenha((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [segundosReenvioRedefinirSenha]);

  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------

  const lerRespostaApi = async (resposta: Response) => {
    try {
      return await resposta.json();
    } catch {
      return {};
    }
  };

  const mensagemSmsAmigavel = (
    mensagemTecnica?: string,
    tipo: 'enviar' | 'reenviar' | 'verificar' | 'redefinir' = 'enviar'
  ): string => {
    const texto = String(mensagemTecnica || '').toLowerCase();

    if (
      texto.includes('twilio') ||
      texto.includes('configuração') ||
      texto.includes('configuracao') ||
      texto.includes('environment') ||
      texto.includes('env') ||
      texto.includes('token') ||
      texto.includes('sid') ||
      texto.includes('auth')
    ) {
      return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
    }
    if (
      texto.includes('rate limit') ||
      texto.includes('too many requests') ||
      texto.includes('limite') ||
      texto.includes('many attempts')
    ) {
      return 'Por segurança, existe um limite temporário de tentativas. Aguarde alguns minutos e tente novamente.';
    }
    if (
      texto.includes('telefone') ||
      texto.includes('phone') ||
      texto.includes('number') ||
      texto.includes('invalid')
    ) {
      return 'Informe um celular válido com DDD.';
    }
    if (tipo === 'verificar') return 'Código inválido ou expirado. Verifique o código recebido ou solicite um novo.';
    if (tipo === 'redefinir') return 'Não foi possível redefinir a senha neste momento. Tente novamente em alguns minutos.';
    if (tipo === 'reenviar') return 'Não foi possível reenviar o SMS neste momento. Tente novamente em alguns minutos.';
    return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
  };

  const tratarErroAuth = (mensagem: string) => {
    const texto = mensagem.toLowerCase();

    if (
      texto.includes('rate limit') ||
      texto.includes('too many requests') ||
      texto.includes('for security purposes') ||
      texto.includes('only request this after')
    ) {
      return {
        tipo: 'limite',
        mensagem:
          'Por segurança, existe um limite temporário de tentativas. Aguarde alguns minutos e tente novamente.',
      };
    }
    if (
      texto.includes('already registered') ||
      texto.includes('already been registered') ||
      texto.includes('user already registered') ||
      texto.includes('email address has already')
    ) {
      return {
        tipo: 'erro',
        mensagem:
          'Este e-mail já possui cadastro. Faça login ou use a recuperação de senha.',
      };
    }
    if (mensagem === 'Email not confirmed') {
      return {
        tipo: 'erro',
        mensagem:
          'Não foi possível liberar este acesso. Solicite um novo cadastro ou entre em contato com o suporte.',
      };
    }
    if (mensagem === 'Invalid login credentials') {
      return {
        tipo: 'erro',
        mensagem: 'Email, login ou senha incorretos. Verifique os dados e tente novamente.',
      };
    }
    return { tipo: 'erro', mensagem };
  };

  // ---------------------------------------------------------------------------
  // Funções — Login
  // ---------------------------------------------------------------------------

  const CHAVE_ULTIMA_ATIVIDADE = 'avantalab_ultima_atividade';

  const handleLogin = async () => {
    setAuthErro('');
    setAuthMensagem('');
    setAuthLoading(true);

    const loginDigitado = loginEmail.trim().toLowerCase();

    if (!loginDigitado) {
      setAuthErro('Informe seu email ou login.');
      setAuthLoading(false);
      return;
    }

    if (!loginSenha) {
      setAuthErro('Informe sua senha.');
      setAuthLoading(false);
      return;
    }

    let emailParaLogin = loginDigitado;

    if (!loginDigitado.includes('@')) {
      const emailEncontrado = await buscarEmailPorLogin(loginDigitado);
      if (!emailEncontrado) {
        setAuthErro('Login não encontrado.');
        setAuthLoading(false);
        return;
      }
      emailParaLogin = emailEncontrado;
    }

    const { data: dadosLogin, error } = await supabase.auth.signInWithPassword({
      email: emailParaLogin,
      password: loginSenha,
    });

    if (error) {
      console.error('Erro login:', error);
      const erroTratado = tratarErroAuth(error.message);
      if (erroTratado.tipo === 'limite') {
        abrirAviso('Limite temporário', erroTratado.mensagem);
      } else {
        setAuthErro(erroTratado.mensagem);
      }
      setAuthLoading(false);
      return;
    }

    // Funcionário do Controle de Ponto não entra no sistema (usa o app /ponto).
    if (dadosLogin.user?.user_metadata?.tipo === 'funcionario_ponto') {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
      setAuthErro('Este acesso é do Controle de Ponto. Registre seu horário pelo app de ponto.');
      setAuthLoading(false);
      return;
    }

    setAuthMensagem('Login realizado. Carregando seus dados...');
    setMensagemCarregamentoSistema('Carregando seus dados...');
    setCarregandoSistema(true);

    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));

    try {
      let usuarioId: string | undefined = dadosLogin.user?.id ?? dadosLogin.session?.user?.id;

      if (!usuarioId) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        const { data: usuarioLogado } = await supabase.auth.getUser();
        usuarioId = usuarioLogado.user?.id;
      }

      if (!usuarioId) {
        setAuthErro('Não foi possível confirmar sua sessão. Tente entrar novamente.');
        return;
      }

      const empresasEncontradas = await buscarEmpresasDoUsuario(usuarioId);

      if (!empresasEncontradas || empresasEncontradas.length === 0) {
        onSemEmpresa();

        const empresaFallback = await buscarEmpresaDoUsuario(usuarioId);
        if (empresaFallback) {
          await carregarEmpresaSelecionada(empresaFallback);
        }
      } else if (empresasEncontradas.length === 1) {
        await carregarEmpresaSelecionada(empresasEncontradas[0]);
      } else {
        onMultiplasEmpresas(empresasEncontradas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados após login:', error);
      setAuthErro(
        'Login realizado, mas não foi possível carregar seus dados. Tente novamente.'
      );
    } finally {
      setCarregandoSistema(false);
      setAuthLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Funções — Cadastro
  // ---------------------------------------------------------------------------

  const reenviarCodigoSmsCadastro = async () => {
    if (reenviandoSmsCadastro || segundosReenvioSms > 0) return;

    const telefoneLimpo = cadastroTelefone.replace(/\D/g, '');

    if (!telefoneLimpo) {
      setAuthErro('Informe seu número de celular.');
      return;
    }
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
      setAuthErro('Informe um celular válido com DDD.');
      return;
    }

    setAuthErro('');
    setAuthMensagem('');
    setReenviandoSmsCadastro(true);

    const respostaSms = await fetch('/api/sms/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: telefoneLimpo }),
    });

    const resultadoSms = await lerRespostaApi(respostaSms);
    setReenviandoSmsCadastro(false);

    if (!respostaSms.ok || resultadoSms.erro) {
      setAuthErro(mensagemSmsAmigavel(resultadoSms.mensagem, 'reenviar'));
      return;
    }

    setSmsCadastroEnviado(true);
    setTelefoneSmsCadastroConfirmado(telefoneLimpo);
    setCodigoSmsCadastro('');
    setSegundosReenvioSms(60);
    setAuthMensagem(
      'Reenviamos o código por SMS. Digite o código mais recente para concluir o cadastro.'
    );
  };

  const handleCadastroTeste = async () => {
    setAuthErro('');
    setAuthMensagem('');
    setAuthLoading(true);

    const nomeLimpo = cadastroNome.trim();
    const emailLimpo = cadastroEmail.trim().toLowerCase();
    const telefoneLimpo = cadastroTelefone.replace(/\D/g, '');
    const ddiLimpo = cadastroDdi.replace(/\D/g, '') || DDI_PADRAO;
    // Número no formato internacional E.164 (+DDI + número nacional).
    const telefoneCompleto = `+${ddiLimpo}${telefoneLimpo}`;
    const ehBrasil = ddiLimpo === '55';

    if (!nomeLimpo) { setAuthErro('Informe seu nome completo.'); setAuthLoading(false); return; }
    if (!emailLimpo) { setAuthErro('Informe seu email.'); setAuthLoading(false); return; }
    if (!emailLimpo.includes('@') || !emailLimpo.includes('.')) {
      setAuthErro('Informe um email válido.'); setAuthLoading(false); return;
    }
    if (!telefoneLimpo) { setAuthErro('Informe seu número de celular.'); setAuthLoading(false); return; }
    if (ehBrasil ? (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) : (telefoneLimpo.length < 6 || telefoneLimpo.length > 15)) {
      setAuthErro(ehBrasil ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido para o país selecionado.');
      setAuthLoading(false); return;
    }
    if (!cadastroSenha) { setAuthErro('Crie uma senha.'); setAuthLoading(false); return; }
    if (cadastroSenha.length < 8) {
      setAuthErro('A senha deve ter pelo menos 8 caracteres.'); setAuthLoading(false); return;
    }
    if (!cadastroConfirmarSenha) { setAuthErro('Repita a senha para confirmação.'); setAuthLoading(false); return; }
    if (cadastroSenha !== cadastroConfirmarSenha) {
      setAuthErro('As senhas não coincidem.'); setAuthLoading(false); return;
    }
    if (!smsCadastroEnviado) {
      const respostaSms = await fetch('/api/sms/enviar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneCompleto }),
      });

      const resultadoSms = await lerRespostaApi(respostaSms);
      setAuthLoading(false);

      if (!respostaSms.ok || resultadoSms.erro) {
        setAuthErro(resultadoSms.mensagem || 'Não foi possível enviar o código por SMS.');
        return;
      }

      setSmsCadastroEnviado(true);
      setTelefoneSmsCadastroConfirmado(telefoneLimpo);
      setCodigoSmsCadastro('');
      setSegundosReenvioSms(60);
      setAuthMensagem(
        'Enviamos um código por SMS. Digite o código recebido para concluir o cadastro.'
      );
      return;
    }

    if (!codigoSmsCadastro.trim()) {
      setAuthErro('Digite o código recebido por SMS.');
      setAuthLoading(false);
      return;
    }

    if (telefoneLimpo !== telefoneSmsCadastroConfirmado) {
      setAuthErro(
        'O número de celular foi alterado. Solicite um novo código antes de concluir o cadastro.'
      );
      setSmsCadastroEnviado(false);
      setCodigoSmsCadastro('');
      setTelefoneSmsCadastroConfirmado('');
      setAuthLoading(false);
      return;
    }

    const respostaVerificacaoSms = await fetch('/api/sms/verificar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: telefoneCompleto, codigo: codigoSmsCadastro.trim() }),
    });

    const resultadoVerificacaoSms = await lerRespostaApi(respostaVerificacaoSms);

    if (!respostaVerificacaoSms.ok || resultadoVerificacaoSms.erro) {
      setAuthErro(mensagemSmsAmigavel(resultadoVerificacaoSms.mensagem, 'verificar'));
      setAuthLoading(false);
      return;
    }

    const aceiteLegalEm = new Date().toISOString();

    const { error } = await supabase.auth.signUp({
      email: emailLimpo,
      password: cadastroSenha,
      options: {
        data: {
          nome: nomeLimpo,
          telefone: telefoneCompleto,
          // Prova de consentimento (LGPD): versao, data/hora e origem do aceite.
          aceite_termos_versao: TERMOS_VERSAO,
          aceite_termos_em: aceiteLegalEm,
          aceite_privacidade_versao: TERMOS_VERSAO,
          aceite_privacidade_em: aceiteLegalEm,
          aceite_origem: 'web',
        },
      },
    });

    setAuthLoading(false);

    if (error) {
      console.error('Erro cadastro:', error);
      const erroTratado = tratarErroAuth(error.message);
      if (erroTratado.tipo === 'limite') {
        abrirAviso('Limite temporário', erroTratado.mensagem);
      } else {
        setAuthErro(erroTratado.mensagem);
      }
      return;
    }

    setAuthMensagem(
      'Cadastro criado e celular confirmado com sucesso. Faça login para acessar o sistema.'
    );
    setCadastroNome('');
    setCadastroEmail('');
    setCadastroTelefone('');
    setCadastroSenha('');
    setCadastroConfirmarSenha('');
    setCodigoSmsCadastro('');
    setSmsCadastroEnviado(false);
    setTelefoneSmsCadastroConfirmado('');
    setSegundosReenvioSms(0);
    setReenviandoSmsCadastro(false);
    setCadastroDdi(DDI_PADRAO);
    setModoAuth('login');
  };

  // ---------------------------------------------------------------------------
  // Funções — Recuperação / Redefinição de Senha
  // ---------------------------------------------------------------------------

  const handleRecuperarSenha = async () => {
    setAuthErro('');
    setAuthMensagem('');

    const loginLimpo = loginEmail.trim().toLowerCase();

    if (!loginLimpo) {
      setAuthErro('Informe seu email ou login para recuperar a senha.');
      return;
    }

    setAuthLoading(true);

    const resposta = await fetch('/api/senha/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginLimpo }),
    });

    const resultado = await lerRespostaApi(resposta);
    setAuthLoading(false);

    if (!resposta.ok || resultado.erro) {
      setAuthErro(resultado.mensagem || 'Não foi possível enviar o código por SMS.');
      return;
    }

    setModoRedefinirSenha(true);
    setSmsRedefinirSenhaEnviado(true);
    setCodigoSmsRedefinirSenha('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setSegundosReenvioRedefinirSenha(60);
    setAuthMensagem('Enviamos um código por SMS para o celular confirmado neste acesso.');
  };

  const reenviarCodigoRedefinirSenha = async () => {
    if (reenviandoSmsRedefinirSenha || segundosReenvioRedefinirSenha > 0) return;

    setAuthErro('');
    setAuthMensagem('');

    const loginLimpo = loginEmail.trim().toLowerCase();

    if (!loginLimpo) {
      setAuthErro('Informe seu email ou login para recuperar a senha.');
      return;
    }

    setReenviandoSmsRedefinirSenha(true);

    const resposta = await fetch('/api/senha/enviar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginLimpo }),
    });

    const resultado = await lerRespostaApi(resposta);
    setReenviandoSmsRedefinirSenha(false);

    if (!resposta.ok || resultado.erro) {
      setAuthErro(resultado.mensagem || 'Não foi possível reenviar o código por SMS.');
      return;
    }

    setSmsRedefinirSenhaEnviado(true);
    setCodigoSmsRedefinirSenha('');
    setSegundosReenvioRedefinirSenha(60);
    setAuthMensagem(
      'Reenviamos o código por SMS. Digite o código mais recente para redefinir sua senha.'
    );
  };

  const handleAtualizarSenha = async () => {
    setAuthErro('');
    setAuthMensagem('');

    const loginLimpo = loginEmail.trim().toLowerCase();

    if (!loginLimpo) {
      setAuthErro('Informe seu email ou login para recuperar a senha.');
      return;
    }
    if (!smsRedefinirSenhaEnviado) {
      await handleRecuperarSenha();
      return;
    }
    if (!codigoSmsRedefinirSenha.trim()) {
      setAuthErro('Digite o código recebido por SMS.');
      return;
    }
    if (!novaSenha) { setAuthErro('Digite a nova senha.'); return; }
    if (novaSenha.length < 8) { setAuthErro('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (!confirmarNovaSenha) { setAuthErro('Confirme a nova senha.'); return; }
    if (novaSenha !== confirmarNovaSenha) { setAuthErro('As senhas não coincidem.'); return; }

    setAuthLoading(true);

    const resposta = await fetch('/api/senha/redefinir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: loginLimpo,
        codigo: codigoSmsRedefinirSenha.trim(),
        novaSenha,
      }),
    });

    const resultado = await lerRespostaApi(resposta);
    setAuthLoading(false);

    if (!resposta.ok || resultado.erro) {
      setAuthErro(mensagemSmsAmigavel(resultado.mensagem, 'redefinir'));
      return;
    }

    setModoRedefinirSenha(false);
    setSmsRedefinirSenhaEnviado(false);
    setCodigoSmsRedefinirSenha('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setSegundosReenvioRedefinirSenha(0);
    setModoAuth('login');
    setLoginSenha('');
    setAuthMensagem('Senha redefinida com sucesso. Faça login com a nova senha.');
  };

  // ---------------------------------------------------------------------------
  // Funções — Google Login
  // ---------------------------------------------------------------------------

  const handleGoogleLogin = async () => {
    setAuthErro('');
    setAuthMensagem('');
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });

    if (error) {
      console.error('Erro login Google:', error);
      setAuthErro(`Erro Google: ${error.message}`);
      setGoogleLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Funções — Criar empresa inicial (onboarding)
  // ---------------------------------------------------------------------------

  const handleCriarEmpresaInicial = async () => {
    if (criandoEmpresaInicialRef.current) return;

    const nomeLimpo = nomeEmpresaInicial.trim();
    const tipoPerfil = normalizarTipoPerfil(tipoPerfilInicial);

    if (!nomeLimpo) {
      setAuthErro('Informe o nome do perfil financeiro para criar o ambiente.');
      return;
    }

    criandoEmpresaInicialRef.current = true;
    setAuthErro('');
    setAuthMensagem('');
    setCriandoEmpresaInicial(true);

    const { data: sessaoAtual } = await supabase.auth.getSession();
    if (!sessaoAtual.session) {
      criandoEmpresaInicialRef.current = false;
      setCriandoEmpresaInicial(false);
      setAuthErro('Sua sessão expirou. Faça login novamente para continuar.');
      return;
    }

    let resultado;
    try {
      resultado = await criarEmpresaInicial(nomeLimpo);
    } catch (e: any) {
      criandoEmpresaInicialRef.current = false;
      setCriandoEmpresaInicial(false);
      console.error('Erro inesperado ao criar empresa inicial:', e);
      setAuthErro(e?.message || 'Erro inesperado ao criar o perfil. Tente novamente.');
      return;
    }

    if (resultado.erro || !resultado.data) {
      criandoEmpresaInicialRef.current = false;
      setCriandoEmpresaInicial(false);
      setAuthErro(resultado.mensagem || 'Não foi possível criar o perfil financeiro. Tente novamente.');
      return;
    }

    const empresaCriada = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    const empresaCriadaId = empresaCriada?.id || empresaCriada?.empresa_id;

    if (empresaCriadaId) {
      const telefoneConfirmado = telefoneCadastroConfirmado(sessaoAtual.session.user.user_metadata);
      if (telefoneConfirmado) {
        const agoraTelefone = new Date().toISOString();
        const { error: erroTelefoneConfirmado } = await supabase
          .from('usuarios_empresa')
          .update({
            telefone: telefoneConfirmado,
            telefone_confirmado: true,
            telefone_confirmado_em: agoraTelefone,
            atualizado_em: agoraTelefone,
          })
          .eq('empresa_id', empresaCriadaId)
          .eq('user_id', sessaoAtual.session.user.id);

        if (erroTelefoneConfirmado) {
          console.error('Erro ao aplicar telefone confirmado do cadastro:', erroTelefoneConfirmado);
        }
      }

      const resultadoTipoPerfil = await atualizarEmpresa({
        empresaId: empresaCriadaId,
        nome: nomeLimpo,
        tipoPerfil,
      });

      if (resultadoTipoPerfil.erro) {
        console.error(
          'Erro ao salvar tipo do perfil financeiro:',
          resultadoTipoPerfil.mensagem
        );
      }

      await inserirDespesasPadraoPerfil(empresaCriadaId, tipoPerfil);

      const { error: erroConfigInicial } = await supabase
        .from('configuracoes')
        .upsert(
          { empresa_id: empresaCriadaId, duplicados_ativo: true },
          { onConflict: 'empresa_id' }
        );

      if (erroConfigInicial) {
        console.error('Erro ao salvar configuração inicial:', erroConfigInicial);
      }
    }

    // Cupom informado no cadastro: concede cortesia ao novo perfil (opcional).
    // Falha silenciosa — se o cupom for inválido, o cadastro segue no trial normal.
    if (empresaCriadaId && cadastroCupom.trim()) {
      try {
        const tokenSessao = sessaoAtual.session?.access_token;
        if (tokenSessao) {
          await fetch('/api/cobranca/resgatar-cupom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSessao}` },
            body: JSON.stringify({ empresaId: empresaCriadaId, codigo: cadastroCupom.trim() }),
          });
        }
      } catch { /* silencioso */ }
    }

    // Cobrança: define o início do perfil EMPRESA (7 dias grátis x assinar agora).
    // Só quando a flag está ligada e não houve cupom (o cupom já concede cortesia).
    if (empresaCriadaId && COBRANCA_ATIVA && tipoPerfil === 'empresa' && !cadastroCupom.trim()) {
      try {
        const tokenSessao = sessaoAtual.session?.access_token;
        if (tokenSessao) {
          await fetch('/api/cobranca/definir-inicio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSessao}` },
            body: JSON.stringify({ empresaId: empresaCriadaId, modo: inicioEmpresaModo }),
          });
        }
      } catch { /* silencioso */ }
    }

    setDuplicadosAtivo(true);
    setTipoPerfilAtual(tipoPerfil);
    setAuthMensagem('Perfil financeiro criado com sucesso. Carregando o sistema...');

    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname;
    }, 700);
  };

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------

  return {
    // Modo de autenticação
    modoAuth, setModoAuth,
    mostrarLandingPreLogin, setMostrarLandingPreLogin,

    // Campos de login
    loginEmail, setLoginEmail,
    loginSenha, setLoginSenha,
    mostrarSenhaLogin, setMostrarSenhaLogin,

    // Campos de cadastro
    mostrarSenhaCadastro, setMostrarSenhaCadastro,
    mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro,
    cadastroNome, setCadastroNome,
    cadastroEmail, setCadastroEmail,
    cadastroTelefone, setCadastroTelefone,
    cadastroSenha, setCadastroSenha,
    cadastroConfirmarSenha, setCadastroConfirmarSenha,
    cadastroCupom, setCadastroCupom,
    cadastroDdi, setCadastroDdi,

    // SMS cadastro
    codigoSmsCadastro, setCodigoSmsCadastro,
    smsCadastroEnviado, setSmsCadastroEnviado,
    telefoneSmsCadastroConfirmado, setTelefoneSmsCadastroConfirmado,
    segundosReenvioSms, setSegundosReenvioSms,
    reenviandoSmsCadastro, setReenviandoSmsCadastro,

    // Redefinir senha
    modoRedefinirSenha, setModoRedefinirSenha,
    novaSenha, setNovaSenha,
    confirmarNovaSenha, setConfirmarNovaSenha,
    mostrarNovaSenha, setMostrarNovaSenha,
    mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha,
    codigoSmsRedefinirSenha, setCodigoSmsRedefinirSenha,
    smsRedefinirSenhaEnviado, setSmsRedefinirSenhaEnviado,
    segundosReenvioRedefinirSenha, setSegundosReenvioRedefinirSenha,
    reenviandoSmsRedefinirSenha, setReenviandoSmsRedefinirSenha,

    // Status de auth
    authErro, setAuthErro,
    authMensagem, setAuthMensagem,
    authLoading, setAuthLoading,
    googleLoading, setGoogleLoading,
    carregandoSistema, setCarregandoSistema,
    mensagemCarregamentoSistema, setMensagemCarregamentoSistema,

    // Onboarding
    emailConfirmado, setEmailConfirmado,
    nomeEmpresaInicial, setNomeEmpresaInicial,
    tipoPerfilInicial, setTipoPerfilInicial,
    inicioEmpresaModo, setInicioEmpresaModo,
    criandoEmpresaInicial, setCriandoEmpresaInicial,
    criandoNovaEmpresaLogada, setCriandoNovaEmpresaLogada,

    // Funções
    handleLogin,
    handleCadastroTeste,
    reenviarCodigoSmsCadastro,
    handleRecuperarSenha,
    reenviarCodigoRedefinirSenha,
    handleAtualizarSenha,
    handleGoogleLogin,
    handleCriarEmpresaInicial,

    // Helpers (usados em componentes e page.tsx)
    lerRespostaApi,
    mensagemSmsAmigavel,
    tratarErroAuth,
  };
}
