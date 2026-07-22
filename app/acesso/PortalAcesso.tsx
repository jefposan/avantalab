'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { buscarEmailPorLogin } from '../lib/database';
import { TERMOS_VERSAO } from '../lib/legal';
import { PAISES } from '../lib/paises';
import {
  buscarDestinosContaAvanta,
  type AcessoVendasDestino,
  type DestinosContaAvanta,
  type PerfilGestaoAcesso,
} from '../lib/destinos-acesso';

type ModoPortal =
  | 'login'
  | 'cadastro'
  | 'recuperar'
  | 'destinos'
  | 'criar-gestao'
  | 'solicitar-vendas';

const REDIRECT_GOOGLE_NATIVO = 'br.com.avantalab.app://auth/callback';
const CHAVE_PORTAL_OAUTH = 'avantalab.auth.portal.oauth_pendente.v1';
const CHAVE_RASCUNHO_CADASTRO = 'avantalab.auth.portal.rascunho_cadastro.v1';
const CHAVE_GOOGLE_INICIADO = 'avantalab.auth.google.iniciado_em';
const CHAVE_CALLBACK_PROCESSADO = 'avantalab.auth.google.callback_processado';
const LIMITE_OAUTH_MS = 15 * 60 * 1000;

type RascunhoPerfilCadastro = {
  nome: string;
  tipoPerfil: 'empresa' | 'pessoal';
  nomeEmpresa: string;
  cupom: string;
  telefone: string;
  telefoneConfirmadoEm: string;
};

function lerRascunhoPerfilCadastro(): RascunhoPerfilCadastro | null {
  try {
    const rascunho = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO_CADASTRO) || 'null');
    if (!rascunho || typeof rascunho !== 'object') return null;
    return {
      nome: String(rascunho.nome || ''),
      tipoPerfil: rascunho.tipoPerfil === 'pessoal' ? 'pessoal' : 'empresa',
      nomeEmpresa: String(rascunho.nomeEmpresa || ''),
      cupom: String(rascunho.cupom || '').toUpperCase(),
      telefone: String(rascunho.telefone || ''),
      telefoneConfirmadoEm: String(rascunho.telefoneConfirmadoEm || ''),
    };
  } catch {
    return null;
  }
}

function mensagemAuth(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message : String(erro || '');
  const normalizada = mensagem.toLowerCase();
  if (normalizada.includes('invalid login credentials')) {
    return 'Email, login, celular ou senha incorretos.';
  }
  if (normalizada.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.';
  }
  if (normalizada.includes('already registered')) {
    return 'Este email já possui uma conta. Entre ou recupere sua senha.';
  }
  if (normalizada.includes('session missing')) {
    return 'A tentativa de acesso expirou. Inicie novamente.';
  }
  return mensagem || 'Não foi possível concluir esta ação.';
}

function telefoneE164(ddi: string, telefone: string) {
  return `+${ddi.replace(/\D/g, '') || '55'}${telefone.replace(/\D/g, '')}`;
}

function callbackGoogleValido(url: string) {
  try {
    const callback = new URL(url);
    return callback.protocol === 'br.com.avantalab.app:'
      && callback.hostname === 'auth'
      && callback.pathname === '/callback';
  } catch {
    return false;
  }
}

function identificadorCallback(url: string) {
  let hash = 2166136261;
  for (let indice = 0; indice < url.length; indice += 1) {
    hash ^= url.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function papelGestao(perfil: string) {
  const papeis: Record<string, string> = {
    gestor_master: 'Gestor Master',
    administrador: 'Administrador',
    operador_completo: 'Operador completo',
    operador_simples: 'Operador simples',
  };
  return papeis[perfil] || 'Usuário';
}

function Icone({ tipo }: { tipo: 'gestao' | 'vendas' | 'usuario' | 'sair' }) {
  if (tipo === 'vendas') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H7l-3 3V5Z"/><path d="M8 9h8M8 13h5"/></svg>;
  }
  if (tipo === 'usuario') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  }
  if (tipo === 'sair') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3V10.5Z"/><path d="M9 21v-7h6v7"/></svg>;
}

const campoClasse = 'h-12 w-full rounded-xl border border-slate-300 bg-white/90 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 disabled:opacity-60';
const botaoPrimario = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#003E73] to-[#00A6C8] px-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';
const botaoSecundario = 'flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:opacity-60';

export default function PortalAcesso() {
  const [modo, setModo] = useState<ModoPortal>('login');
  const [usuario, setUsuario] = useState<User | null>(null);
  const [destinos, setDestinos] = useState<DestinosContaAvanta | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [googleCarregando, setGoogleCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const carregandoDestinosRef = useRef(false);

  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [cadastroNome, setCadastroNome] = useState('');
  const [cadastroTipoPerfil, setCadastroTipoPerfil] = useState<'empresa' | 'pessoal'>('empresa');
  const [cadastroNomeEmpresa, setCadastroNomeEmpresa] = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroDdi, setCadastroDdi] = useState('55');
  const [cadastroTelefone, setCadastroTelefone] = useState('');
  const [cadastroSenha, setCadastroSenha] = useState('');
  const [cadastroConfirmar, setCadastroConfirmar] = useState('');
  const [cadastroCupom, setCadastroCupom] = useState('');
  const [cadastroSmsEnviado, setCadastroSmsEnviado] = useState(false);
  const [cadastroCodigoSms, setCadastroCodigoSms] = useState('');
  const [cadastroTelefoneConfirmado, setCadastroTelefoneConfirmado] = useState('');

  const [perfilTipo, setPerfilTipo] = useState<'empresa' | 'pessoal'>('empresa');
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilCupom, setPerfilCupom] = useState('');

  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [vendasDdi, setVendasDdi] = useState('55');
  const [vendasTelefone, setVendasTelefone] = useState('');
  const [vendasSmsEnviado, setVendasSmsEnviado] = useState(false);
  const [vendasCodigoSms, setVendasCodigoSms] = useState('');
  const [vendasTelefoneConfirmado, setVendasTelefoneConfirmado] = useState('');

  const [recuperacaoCodigoEnviado, setRecuperacaoCodigoEnviado] = useState(false);
  const [recuperacaoApi, setRecuperacaoApi] = useState<'gestao' | 'vendas'>('gestao');
  const [recuperacaoCodigo, setRecuperacaoCodigo] = useState('');
  const [recuperacaoSenha, setRecuperacaoSenha] = useState('');
  const [recuperacaoConfirmar, setRecuperacaoConfirmar] = useState('');

  const limparAvisos = () => {
    setErro('');
    setMensagem('');
  };

  const carregarDestinos = useCallback(async () => {
    if (carregandoDestinosRef.current) return;
    carregandoDestinosRef.current = true;
    setProcessando(true);
    setErro('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error || new Error('Sessão não encontrada.');
      if (data.user.user_metadata?.tipo === 'funcionario_ponto') {
        window.location.replace('/ponto');
        return;
      }
      let usuarioCarregado = data.user;
      const resultado = await buscarDestinosContaAvanta();
      const rascunhoCadastro = lerRascunhoPerfilCadastro();
      if (!resultado.gestao.length && rascunhoCadastro) {
        const nomePerfil = rascunhoCadastro.tipoPerfil === 'empresa'
          ? rascunhoCadastro.nomeEmpresa.trim()
          : rascunhoCadastro.nome.trim();
        const atualizacao = await supabase.auth.updateUser({
          data: {
            nome: rascunhoCadastro.nome.trim(),
            nome_perfil_inicial: nomePerfil,
            tipo_perfil_inicial: rascunhoCadastro.tipoPerfil,
            cupom_perfil_inicial: rascunhoCadastro.cupom || null,
            inicio_empresa_modo: 'trial',
            ...(rascunhoCadastro.telefone ? {
              telefone: rascunhoCadastro.telefone,
              telefone_confirmado_em: rascunhoCadastro.telefoneConfirmadoEm,
            } : {}),
            aceite_termos_versao: TERMOS_VERSAO,
            aceite_termos_em: rascunhoCadastro.telefoneConfirmadoEm || new Date().toISOString(),
            aceite_privacidade_versao: TERMOS_VERSAO,
            aceite_privacidade_em: rascunhoCadastro.telefoneConfirmadoEm || new Date().toISOString(),
            aceite_origem: 'portal_acesso_google',
          },
        });
        if (atualizacao.error) throw atualizacao.error;
        if (atualizacao.data.user) {
          usuarioCarregado = atualizacao.data.user;
          try { localStorage.removeItem(CHAVE_RASCUNHO_CADASTRO); } catch {}
        }
      } else if (resultado.gestao.length) {
        try { localStorage.removeItem(CHAVE_RASCUNHO_CADASTRO); } catch {}
      }
      setUsuario(usuarioCarregado);
      const metadata = usuarioCarregado.user_metadata;
      const nomePerfilPendente = String(metadata?.nome_perfil_inicial || '').trim();
      if (nomePerfilPendente) {
        setPerfilTipo(metadata?.tipo_perfil_inicial === 'pessoal' ? 'pessoal' : 'empresa');
        setPerfilNome(nomePerfilPendente);
        setPerfilCupom(String(metadata?.cupom_perfil_inicial || '').trim().toUpperCase());
      }
      setDestinos(resultado);
      setModo('destinos');
      try { localStorage.removeItem(CHAVE_PORTAL_OAUTH); } catch {}
    } catch (falha) {
      setErro(mensagemAuth(falha));
      setModo('login');
    } finally {
      carregandoDestinosRef.current = false;
      setProcessando(false);
      setCarregandoInicial(false);
    }
  }, []);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const modoInicial = parametros.get('modo');
    try { localStorage.removeItem(CHAVE_PORTAL_OAUTH); } catch {}

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void carregarDestinos();
      else {
        if (modoInicial === 'cadastro') {
          setModo('cadastro');
          const rascunho = lerRascunhoPerfilCadastro();
          if (rascunho) {
            setCadastroNome(rascunho.nome);
            setCadastroTipoPerfil(rascunho.tipoPerfil);
            setCadastroNomeEmpresa(rascunho.nomeEmpresa);
            setCadastroCupom(rascunho.cupom);
          }
        }
        if (parametros.get('confirmado') === '1') {
          setMensagem('Email confirmado. Entre para escolher a plataforma.');
        } else if (parametros.get('motivo') === 'inatividade') {
          setMensagem('Sessão encerrada por inatividade. Entre novamente.');
        }
        setCarregandoInicial(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (sessao && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(evento)) {
        window.setTimeout(() => void carregarDestinos(), 0);
      } else if (evento === 'SIGNED_OUT') {
        setUsuario(null);
        setDestinos(null);
        setModo('login');
      }
    });
    return () => data.subscription.unsubscribe();
  }, [carregarDestinos]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let desmontado = false;
    let processandoCallbackGoogle = false;
    const listeners: PluginListenerHandle[] = [];

    const fecharNavegador = async () => {
      try { await Browser.close(); } catch {}
    };

    const processarCallback = async (url: string) => {
      if (!callbackGoogleValido(url)) return;
      const identificador = identificadorCallback(url);
      processandoCallbackGoogle = true;
      try {
        // Fechar programaticamente também emite browserFinished no iOS. A
        // flag impede que esse evento seja confundido com cancelamento e
        // apague o estado necessário antes de concluir a sessão.
        await fecharNavegador();
        if (sessionStorage.getItem(CHAVE_CALLBACK_PROCESSADO) === identificador) {
          return;
        }
        const iniciadoEm = Number(localStorage.getItem(CHAVE_GOOGLE_INICIADO) || 0);
        if (!iniciadoEm || Date.now() - iniciadoEm > LIMITE_OAUTH_MS) {
          localStorage.removeItem(CHAVE_PORTAL_OAUTH);
          localStorage.removeItem(CHAVE_GOOGLE_INICIADO);
          return;
        }

        sessionStorage.setItem(CHAVE_CALLBACK_PROCESSADO, identificador);
        const callback = new URL(url);
        const hash = new URLSearchParams(callback.hash.slice(1));
        const parametro = (nome: string) => callback.searchParams.get(nome) || hash.get(nome);
        const erroOAuth = parametro('error_description') || parametro('error');
        if (erroOAuth) throw new Error(erroOAuth);
        const codigo = callback.searchParams.get('code');
        if (codigo) {
          const { error } = await supabase.auth.exchangeCodeForSession(codigo);
          if (error) throw error;
        } else {
          const accessToken = parametro('access_token');
          const refreshToken = parametro('refresh_token');
          if (!accessToken || !refreshToken) throw new Error('O Google não retornou uma sessão válida.');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }
        localStorage.removeItem(CHAVE_GOOGLE_INICIADO);
        await carregarDestinos();
      } catch (falha) {
        sessionStorage.removeItem(CHAVE_CALLBACK_PROCESSADO);
        localStorage.removeItem(CHAVE_PORTAL_OAUTH);
        localStorage.removeItem(CHAVE_GOOGLE_INICIADO);
        setErro(mensagemAuth(falha));
      } finally {
        processandoCallbackGoogle = false;
        setGoogleCarregando(false);
      }
    };

    const guardar = async (promessa: Promise<PluginListenerHandle>) => {
      const listener = await promessa;
      if (desmontado) await listener.remove();
      else listeners.push(listener);
    };

    void (async () => {
      await guardar(CapacitorApp.addListener('appUrlOpen', ({ url }) => void processarCallback(url)));
      await guardar(Browser.addListener('browserFinished', () => {
        if (processandoCallbackGoogle) return;
        localStorage.removeItem(CHAVE_PORTAL_OAUTH);
        localStorage.removeItem(CHAVE_GOOGLE_INICIADO);
        setGoogleCarregando(false);
      }));
      const abertura = await CapacitorApp.getLaunchUrl();
      if (abertura?.url) await processarCallback(abertura.url);
    })();

    return () => {
      desmontado = true;
      for (const listener of listeners) void listener.remove();
    };
  }, [carregarDestinos]);

  const entrar = async (evento: FormEvent) => {
    evento.preventDefault();
    limparAvisos();
    const contato = login.trim().toLowerCase();
    if (!contato || !senha) {
      setErro('Informe seu email, login ou celular e a senha.');
      return;
    }
    setProcessando(true);
    try {
      let resposta;
      const numeros = contato.replace(/\D/g, '');
      if (!contato.includes('@') && numeros.length >= 10) {
        const phone = contato.startsWith('+') ? `+${numeros}` : `+55${numeros}`;
        resposta = await supabase.auth.signInWithPassword({ phone, password: senha });
      } else {
        const email = contato.includes('@') ? contato : await buscarEmailPorLogin(contato);
        if (!email) throw new Error('Login não encontrado.');
        resposta = await supabase.auth.signInWithPassword({ email, password: senha });
      }
      if (resposta.error) throw resposta.error;
      await carregarDestinos();
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const entrarGoogle = async () => {
    limparAvisos();
    let rascunhoCadastro: RascunhoPerfilCadastro | null = null;
    if (modo === 'cadastro') {
      const nome = cadastroNome.trim();
      const nomeEmpresa = cadastroNomeEmpresa.trim();
      const numero = cadastroTelefone.replace(/\D/g, '');
      const telefone = telefoneE164(cadastroDdi, cadastroTelefone);
      const telefoneValido = cadastroDdi === '55'
        ? numero.length >= 10 && numero.length <= 11
        : numero.length >= 6 && numero.length <= 15;
      if (cadastroTipoPerfil === 'empresa' && !nomeEmpresa) {
        setErro('Informe o nome fantasia da empresa antes de continuar com Google.');
        return;
      }
      if (!nome) {
        setErro(cadastroTipoPerfil === 'empresa' ? 'Informe o nome completo do responsável.' : 'Informe seu nome completo.');
        return;
      }
      if (!telefoneValido) {
        setErro(cadastroDdi === '55'
          ? 'Informe um celular válido com DDD antes de continuar com Google.'
          : 'Informe um celular válido para o país selecionado antes de continuar com Google.');
        return;
      }
      rascunhoCadastro = {
        nome,
        tipoPerfil: cadastroTipoPerfil,
        nomeEmpresa,
        cupom: cadastroCupom.trim().toUpperCase(),
        telefone,
        telefoneConfirmadoEm: '',
      };
    }
    setGoogleCarregando(true);
    try {
      if (rascunhoCadastro) {
        if (!cadastroSmsEnviado || cadastroTelefoneConfirmado !== rascunhoCadastro.telefone) {
          const resposta = await fetch('/api/sms/enviar-codigo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: rascunhoCadastro.telefone }),
          });
          const resultado = await resposta.json().catch(() => ({}));
          if (!resposta.ok || resultado.erro) {
            throw new Error(resultado.mensagem || 'Não foi possível enviar o SMS.');
          }
          setCadastroSmsEnviado(true);
          setCadastroTelefoneConfirmado(rascunhoCadastro.telefone);
          setMensagem('Digite o código enviado por SMS e toque novamente em Continuar com Google.');
          setGoogleCarregando(false);
          return;
        }
        if (!cadastroCodigoSms.trim()) throw new Error('Digite o código recebido por SMS.');
        const verificacao = await fetch('/api/sms/verificar-codigo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefone: rascunhoCadastro.telefone,
            codigo: cadastroCodigoSms.trim(),
          }),
        });
        const resultadoVerificacao = await verificacao.json().catch(() => ({}));
        if (!verificacao.ok || resultadoVerificacao.erro) {
          throw new Error(resultadoVerificacao.mensagem || 'Código inválido ou expirado.');
        }
        rascunhoCadastro.telefoneConfirmadoEm = new Date().toISOString();
        try {
          localStorage.setItem(CHAVE_RASCUNHO_CADASTRO, JSON.stringify(rascunhoCadastro));
        } catch {
          throw new Error('Não foi possível preservar os dados do cadastro para o retorno do Google. Tente novamente.');
        }
      } else {
        try { localStorage.removeItem(CHAVE_RASCUNHO_CADASTRO); } catch {}
      }
      localStorage.setItem(CHAVE_PORTAL_OAUTH, '1');
      if (!Capacitor.isNativePlatform()) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        return;
      }

      localStorage.setItem(CHAVE_GOOGLE_INICIADO, String(Date.now()));
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT_GOOGLE_NATIVO, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Não foi possível abrir o Google.');
      await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
    } catch (falha) {
      localStorage.removeItem(CHAVE_PORTAL_OAUTH);
      localStorage.removeItem(CHAVE_GOOGLE_INICIADO);
      setGoogleCarregando(false);
      setErro(mensagemAuth(falha));
    }
  };

  const cadastrar = async (evento: FormEvent) => {
    evento.preventDefault();
    limparAvisos();
    const nome = cadastroNome.trim();
    const nomeEmpresa = cadastroNomeEmpresa.trim();
    const nomePerfilInicial = cadastroTipoPerfil === 'empresa' ? nomeEmpresa : nome;
    const email = cadastroEmail.trim().toLowerCase();
    const telefone = telefoneE164(cadastroDdi, cadastroTelefone);
    const numero = cadastroTelefone.replace(/\D/g, '');
    const telefoneValido = cadastroDdi === '55'
      ? numero.length >= 10 && numero.length <= 11
      : numero.length >= 6 && numero.length <= 15;
    if (cadastroTipoPerfil === 'empresa' && !nomeEmpresa) {
      setErro('Informe o nome fantasia da empresa.');
      return;
    }
    if (!nome) {
      setErro(cadastroTipoPerfil === 'empresa' ? 'Informe o nome completo do responsável.' : 'Informe seu nome completo.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErro('Informe um email válido.');
      return;
    }
    if (!telefoneValido) {
      setErro(cadastroDdi === '55' ? 'Informe um celular válido com DDD.' : 'Informe um celular válido para o país selecionado.');
      return;
    }
    if (cadastroSenha.length < 8 || !/[A-Z]/.test(cadastroSenha) || !/[a-z]/.test(cadastroSenha) || !/\d/.test(cadastroSenha)) {
      setErro('A senha precisa ter 8 caracteres, letra maiúscula, minúscula e número.');
      return;
    }
    if (cadastroSenha !== cadastroConfirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    setProcessando(true);
    try {
      if (!cadastroSmsEnviado || cadastroTelefoneConfirmado !== telefone) {
        const resposta = await fetch('/api/sms/enviar-codigo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone }),
        });
        const resultado = await resposta.json().catch(() => ({}));
        if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível enviar o SMS.');
        setCadastroSmsEnviado(true);
        setCadastroTelefoneConfirmado(telefone);
        setMensagem('Digite o código enviado por SMS para criar sua conta.');
        return;
      }
      if (!cadastroCodigoSms.trim()) throw new Error('Digite o código recebido por SMS.');
      const verificacao = await fetch('/api/sms/verificar-codigo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, codigo: cadastroCodigoSms.trim() }),
      });
      const resultadoVerificacao = await verificacao.json().catch(() => ({}));
      if (!verificacao.ok || resultadoVerificacao.erro) {
        throw new Error(resultadoVerificacao.mensagem || 'Código inválido ou expirado.');
      }
      const agora = new Date().toISOString();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: cadastroSenha,
        options: {
          data: {
            nome,
            telefone,
            nome_perfil_inicial: nomePerfilInicial,
            tipo_perfil_inicial: cadastroTipoPerfil,
            cupom_perfil_inicial: cadastroCupom.trim().toUpperCase() || null,
            inicio_empresa_modo: 'trial',
            telefone_confirmado_em: agora,
            aceite_termos_versao: TERMOS_VERSAO,
            aceite_termos_em: agora,
            aceite_privacidade_versao: TERMOS_VERSAO,
            aceite_privacidade_em: agora,
            aceite_origem: 'portal_acesso',
          },
        },
      });
      if (error) throw error;
      if (data.session) await carregarDestinos();
      else {
        try { localStorage.removeItem(CHAVE_RASCUNHO_CADASTRO); } catch {}
        setModo('login');
        setLogin(email);
        setMensagem('Conta criada. Confirme o email recebido e depois entre para escolher a plataforma.');
      }
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const usarGestaoMobile = () => Capacitor.isNativePlatform()
    || window.matchMedia('(display-mode: standalone)').matches
    || window.innerWidth < 1024;

  const abrirGestao = (perfil: PerfilGestaoAcesso) => {
    try {
      localStorage.setItem('avantalab_mobile_ultimo_perfil_id', perfil.empresa_id);
      localStorage.setItem('avantalab_mobile_sistema_contexto', JSON.stringify({
        empresaId: perfil.empresa_id, sistema: 'gestao', atualizadoEm: new Date().toISOString(),
      }));
      sessionStorage.setItem(`avantalab_mobile_sistema_sessao_${perfil.empresa_id}`, 'gestao');
    } catch {}
    window.location.assign(usarGestaoMobile() ? '/mobile' : '/');
  };

  const abrirVendas = (acesso: AcessoVendasDestino) => {
    try {
      localStorage.setItem('avantalab_mobile_sistema_contexto', JSON.stringify({
        empresaId: acesso.empresa_id, sistema: 'vendas', atualizadoEm: new Date().toISOString(),
      }));
      sessionStorage.setItem(`avantalab_mobile_sistema_sessao_${acesso.empresa_id}`, 'vendas');
      sessionStorage.setItem('avantalab_vendas_entrada_gestao', '1');
    } catch {}
    window.location.assign('/mobile/vendas');
  };

  const criarGestao = async (evento: FormEvent) => {
    evento.preventDefault();
    limparAvisos();
    if (!perfilNome.trim()) {
      setErro(perfilTipo === 'empresa' ? 'Informe o nome da empresa.' : 'Informe o nome do perfil.');
      return;
    }
    setProcessando(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nome_perfil_inicial: perfilNome.trim(),
          tipo_perfil_inicial: perfilTipo,
          cupom_perfil_inicial: perfilCupom.trim().toUpperCase() || null,
          inicio_empresa_modo: 'trial',
        },
      });
      if (error) throw error;
      window.location.assign(usarGestaoMobile() ? '/mobile' : '/');
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const solicitarVendas = async (evento: FormEvent) => {
    evento.preventDefault();
    limparAvisos();
    const codigo = codigoEmpresa.trim().toUpperCase();
    if (!codigo) {
      setErro('Informe o código recebido da empresa.');
      return;
    }
    setProcessando(true);
    try {
      let telefone = String(usuario?.user_metadata?.telefone || usuario?.phone || '');
      if (!telefone) {
        telefone = telefoneE164(vendasDdi, vendasTelefone);
        const numero = vendasTelefone.replace(/\D/g, '');
        const telefoneValido = vendasDdi === '55'
          ? numero.length >= 10 && numero.length <= 11
          : numero.length >= 6 && numero.length <= 15;
        if (!telefoneValido) {
          throw new Error(vendasDdi === '55'
            ? 'Informe um celular válido com DDD.'
            : 'Informe um celular válido para o país selecionado.');
        }
        if (!vendasSmsEnviado || vendasTelefoneConfirmado !== telefone) {
          const resposta = await fetch('/api/sms/enviar-codigo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone }),
          });
          const resultado = await resposta.json().catch(() => ({}));
          if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível enviar o SMS.');
          setVendasSmsEnviado(true);
          setVendasTelefoneConfirmado(telefone);
          setMensagem('Digite o código enviado por SMS para concluir a solicitação.');
          return;
        }
        if (!vendasCodigoSms.trim()) throw new Error('Digite o código recebido por SMS.');
        const verificacao = await fetch('/api/sms/verificar-codigo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone, codigo: vendasCodigoSms.trim() }),
        });
        const resultado = await verificacao.json().catch(() => ({}));
        if (!verificacao.ok || resultado.erro) throw new Error(resultado.mensagem || 'Código inválido ou expirado.');
        const { error } = await supabase.auth.updateUser({ data: { telefone, telefone_confirmado_em: new Date().toISOString() } });
        if (error) throw error;
      }
      const nome = String(usuario?.user_metadata?.nome || usuario?.user_metadata?.full_name || usuario?.email || 'Usuário');
      const { error } = await supabase.rpc('solicitar_acesso_vendas_mobile_rpc', {
        p_codigo_empresa: codigo,
        p_nome: nome,
        p_telefone: telefone || null,
      });
      if (error) throw error;
      setMensagem('Solicitação enviada ao gestor. Você poderá acompanhar o status por esta conta.');
      await carregarDestinos();
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const enviarRecuperacao = async () => {
    limparAvisos();
    const identificador = login.trim().toLowerCase();
    if (!identificador) {
      setErro('Informe seu email ou login.');
      return;
    }
    setProcessando(true);
    try {
      let resposta = await fetch('/api/senha/enviar-codigo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: identificador }),
      });
      let resultado = await resposta.json().catch(() => ({}));
      let api: 'gestao' | 'vendas' = 'gestao';
      if (!resposta.ok && identificador.includes('@')) {
        resposta = await fetch('/api/vendas/senha/enviar-codigo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identificador }),
        });
        resultado = await resposta.json().catch(() => ({}));
        api = 'vendas';
      }
      if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível enviar o código.');
      setRecuperacaoApi(api);
      setRecuperacaoCodigoEnviado(true);
      setMensagem('Código enviado por SMS para o celular confirmado.');
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const redefinirSenha = async (evento: FormEvent) => {
    evento.preventDefault();
    limparAvisos();
    if (!recuperacaoCodigo || recuperacaoSenha.length < 8 || recuperacaoSenha !== recuperacaoConfirmar) {
      setErro('Informe o código e confirme uma senha com pelo menos 8 caracteres.');
      return;
    }
    setProcessando(true);
    try {
      const endpoint = recuperacaoApi === 'vendas' ? '/api/vendas/senha/redefinir' : '/api/senha/redefinir';
      const corpo = recuperacaoApi === 'vendas'
        ? { email: login.trim().toLowerCase(), codigo: recuperacaoCodigo, novaSenha: recuperacaoSenha }
        : { login: login.trim().toLowerCase(), codigo: recuperacaoCodigo, novaSenha: recuperacaoSenha };
      const resposta = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      const resultado = await resposta.json().catch(() => ({}));
      if (!resposta.ok || resultado.erro) throw new Error(resultado.mensagem || 'Não foi possível redefinir a senha.');
      setModo('login');
      setRecuperacaoCodigoEnviado(false);
      setSenha('');
      setMensagem('Senha redefinida. Entre com a nova senha.');
    } catch (falha) {
      setErro(mensagemAuth(falha));
    } finally {
      setProcessando(false);
    }
  };

  const sair = async () => {
    setProcessando(true);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    setUsuario(null);
    setDestinos(null);
    setModo('login');
    setProcessando(false);
  };

  const acessosVendasAtivos = (destinos?.vendas || []).filter(
    (acesso) => acesso.status === 'ativo' && acesso.moduloAtivo
  );
  const acessosVendasSemModulo = (destinos?.vendas || []).filter(
    (acesso) => acesso.status === 'ativo' && !acesso.moduloAtivo
  );
  const solicitacaoPendente = destinos?.solicitacaoVendas?.status === 'pendente';

  const titulo = modo === 'cadastro' ? 'Criar conta AvantaLab'
    : modo === 'recuperar' ? 'Recuperar senha'
      : modo === 'destinos' ? 'Escolha onde entrar'
        : modo === 'criar-gestao' ? 'Criar perfil Gestão'
          : modo === 'solicitar-vendas' ? 'Acessar o Vendas'
            : 'Acesse sua conta';

  if (carregandoInicial) {
    return <CascaPortal><div className="grid justify-items-center gap-3 py-8 text-center"><span className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-600/20 border-t-cyan-700"/><h1 className="text-xl font-bold text-slate-900">Preparando acesso</h1><p className="text-sm text-slate-600">Validando sua conta AvantaLab.</p></div></CascaPortal>;
  }

  return (
    <CascaPortal>
      <header className="mb-5">
        {modo !== 'login' && modo !== 'cadastro' && modo !== 'destinos' && (
          <button type="button" onClick={() => { limparAvisos(); setModo(usuario ? 'destinos' : 'login'); }} className="mb-3 text-sm font-bold text-sky-800 underline">← Voltar</button>
        )}
        <h1 className="text-2xl font-bold text-slate-950">{titulo}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {modo === 'destinos'
            ? 'Seu login é único. Selecione a plataforma e o perfil autorizados.'
            : modo === 'cadastro'
              ? 'Crie uma única conta; depois escolha Gestão ou Vendas.'
              : modo === 'login'
                ? 'Entre uma vez para acessar as plataformas disponíveis.'
                : modo === 'criar-gestao'
                  ? 'O perfil financeiro será vinculado à sua conta atual.'
                  : modo === 'solicitar-vendas'
                    ? 'Use o código fornecido pelo gestor da empresa.'
                    : 'A confirmação será enviada ao celular vinculado.'}
        </p>
      </header>

      {erro && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">{erro}</div>}
      {mensagem && <div role="status" className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-900">{mensagem}</div>}

      {modo === 'login' && (
        <form onSubmit={entrar} className="grid gap-4">
          <Campo label="Email, login ou celular" htmlFor="portal-login"><input id="portal-login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" className={campoClasse} placeholder="seuemail@exemplo.com" /></Campo>
          <Campo label="Senha" htmlFor="portal-senha"><div className="relative"><input id="portal-senha" value={senha} onChange={(e) => setSenha(e.target.value)} type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password" className={`${campoClasse} pr-14`} placeholder="Digite sua senha"/><button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="absolute inset-y-0 right-0 min-w-12 text-xs font-bold text-sky-800" aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? 'Ocultar' : 'Exibir'}</button></div></Campo>
          <button type="button" onClick={() => { limparAvisos(); setModo('recuperar'); }} className="-mt-2 justify-self-end text-sm font-bold text-sky-800 underline">Esqueci minha senha</button>
          <button type="submit" disabled={processando || googleCarregando} className={botaoPrimario}>{processando ? 'Entrando...' : 'Entrar'}</button>
          <button type="button" onClick={() => void entrarGoogle()} disabled={processando || googleCarregando} className={botaoSecundario}><span className="mr-2 text-lg font-bold text-[#4285F4]">G</span>{googleCarregando ? 'Conectando...' : 'Continuar com Google'}</button>
          <p className="text-center text-sm text-slate-600">Ainda não tem conta? <button type="button" onClick={() => { limparAvisos(); setModo('cadastro'); }} className="font-bold text-sky-800 underline">Criar cadastro</button></p>
        </form>
      )}

      {modo === 'cadastro' && (
        <form onSubmit={cadastrar} className="grid gap-3">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-slate-700">Tipo do perfil inicial</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" aria-pressed={cadastroTipoPerfil === 'empresa'} onClick={() => setCadastroTipoPerfil('empresa')} className={`min-h-11 rounded-lg px-3 text-sm font-bold transition ${cadastroTipoPerfil === 'empresa' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600'}`}>Empresa</button>
              <button type="button" aria-pressed={cadastroTipoPerfil === 'pessoal'} onClick={() => setCadastroTipoPerfil('pessoal')} className={`min-h-11 rounded-lg px-3 text-sm font-bold transition ${cadastroTipoPerfil === 'pessoal' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600'}`}>Pessoal</button>
            </div>
          </fieldset>
          {cadastroTipoPerfil === 'empresa' && <Campo label="Nome fantasia da empresa" htmlFor="cadastro-empresa"><input id="cadastro-empresa" value={cadastroNomeEmpresa} onChange={(e) => setCadastroNomeEmpresa(e.target.value)} autoComplete="organization" className={campoClasse} placeholder="Como sua empresa será identificada"/></Campo>}
          <Campo label={cadastroTipoPerfil === 'empresa' ? 'Nome completo do responsável' : 'Nome completo'} htmlFor="cadastro-nome"><input id="cadastro-nome" value={cadastroNome} onChange={(e) => setCadastroNome(e.target.value)} autoComplete="name" className={campoClasse}/></Campo>
          <Campo label="Email" htmlFor="cadastro-email"><input id="cadastro-email" value={cadastroEmail} onChange={(e) => setCadastroEmail(e.target.value)} type="email" autoComplete="email" className={campoClasse}/></Campo>
          <Campo label="Celular" htmlFor="cadastro-telefone"><div className="grid grid-cols-[104px_1fr] gap-2"><select aria-label="País (DDI)" value={cadastroDdi} onChange={(e) => { setCadastroDdi(e.target.value); setCadastroSmsEnviado(false); }} className={campoClasse}>{PAISES.map((pais) => <option key={`${pais.ddi}-${pais.nome}`} value={pais.ddi}>{pais.flag} +{pais.ddi}</option>)}</select><input id="cadastro-telefone" value={cadastroTelefone} onChange={(e) => { setCadastroTelefone(e.target.value.replace(/\D/g, '')); setCadastroSmsEnviado(false); }} inputMode="numeric" autoComplete="tel-national" className={campoClasse} placeholder="DDD + número"/></div></Campo>
          <Campo label="Senha" htmlFor="cadastro-senha"><input id="cadastro-senha" value={cadastroSenha} onChange={(e) => setCadastroSenha(e.target.value)} type="password" autoComplete="new-password" className={campoClasse}/><small className="mt-1 block text-xs text-slate-500">8+ caracteres, maiúscula, minúscula e número.</small></Campo>
          <Campo label="Confirmar senha" htmlFor="cadastro-confirmar"><input id="cadastro-confirmar" value={cadastroConfirmar} onChange={(e) => setCadastroConfirmar(e.target.value)} type="password" autoComplete="new-password" className={campoClasse}/></Campo>
          <Campo label="Cupom (opcional)" htmlFor="cadastro-cupom"><input id="cadastro-cupom" value={cadastroCupom} onChange={(e) => setCadastroCupom(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" className={campoClasse}/></Campo>
          {cadastroSmsEnviado && <Campo label="Código recebido por SMS" htmlFor="cadastro-sms"><input id="cadastro-sms" value={cadastroCodigoSms} onChange={(e) => setCadastroCodigoSms(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" className={campoClasse}/></Campo>}
          <p className="text-xs leading-relaxed text-slate-500">Ao criar a conta, você aceita os Termos de Uso e a Política de Privacidade vigentes.</p>
          <button type="submit" disabled={processando || googleCarregando} className={botaoPrimario}>{processando ? 'Processando...' : cadastroSmsEnviado ? 'Validar e criar conta' : 'Continuar por SMS'}</button>
          <button type="button" onClick={() => void entrarGoogle()} disabled={processando || googleCarregando} className={botaoSecundario}><span className="mr-2 text-lg font-bold text-[#4285F4]">G</span>{googleCarregando ? 'Conectando...' : 'Continuar com Google'}</button>
          <p className="text-center text-sm text-slate-600">Já possui conta? <button type="button" onClick={() => { limparAvisos(); setModo('login'); }} className="font-bold text-sky-800 underline">Entrar</button></p>
        </form>
      )}

      {modo === 'recuperar' && (
        <form onSubmit={redefinirSenha} className="grid gap-4">
          <Campo label="Email ou login" htmlFor="recuperar-login"><input id="recuperar-login" value={login} onChange={(e) => setLogin(e.target.value)} disabled={recuperacaoCodigoEnviado} autoComplete="username" className={campoClasse}/></Campo>
          {!recuperacaoCodigoEnviado ? <button type="button" onClick={() => void enviarRecuperacao()} disabled={processando} className={botaoPrimario}>{processando ? 'Enviando...' : 'Enviar código por SMS'}</button> : <><Campo label="Código recebido" htmlFor="recuperar-codigo"><input id="recuperar-codigo" value={recuperacaoCodigo} onChange={(e) => setRecuperacaoCodigo(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" className={campoClasse}/></Campo><Campo label="Nova senha" htmlFor="recuperar-senha"><input id="recuperar-senha" value={recuperacaoSenha} onChange={(e) => setRecuperacaoSenha(e.target.value)} type="password" autoComplete="new-password" className={campoClasse}/></Campo><Campo label="Confirmar nova senha" htmlFor="recuperar-confirmar"><input id="recuperar-confirmar" value={recuperacaoConfirmar} onChange={(e) => setRecuperacaoConfirmar(e.target.value)} type="password" autoComplete="new-password" className={campoClasse}/></Campo><button type="submit" disabled={processando} className={botaoPrimario}>{processando ? 'Salvando...' : 'Redefinir senha'}</button></>}
        </form>
      )}

      {modo === 'destinos' && destinos && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900/[0.06] px-3 py-2.5"><span className="portal-icon portal-icon-user"><Icone tipo="usuario"/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{String(usuario?.user_metadata?.nome || usuario?.user_metadata?.full_name || 'Conta AvantaLab')}</b><small className="block truncate text-xs text-slate-500">{usuario?.email || usuario?.phone}</small></span><button type="button" onClick={() => void sair()} disabled={processando} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-bold text-red-600"><span className="portal-icon-small"><Icone tipo="sair"/></span>Sair</button></div>

          <section className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3"><div className="mb-3 flex items-center gap-3"><span className="portal-icon bg-sky-700 text-white"><Icone tipo="gestao"/></span><div><h2 className="font-bold text-slate-950">Gestão</h2><p className="text-xs text-slate-600">Finanças, indicadores e administração.</p></div></div>{destinos.gestao.length ? <div className="grid gap-2">{destinos.gestao.map((perfil) => <button key={perfil.empresa_id} type="button" onClick={() => abrirGestao(perfil)} className="flex min-h-14 items-center justify-between rounded-xl border border-sky-200 bg-white px-3 text-left shadow-sm"><span><b className="block text-sm text-slate-900">{perfil.empresa_nome}</b><small className="text-xs text-slate-500">{papelGestao(perfil.perfil)}</small></span><span className="text-xl text-sky-700">›</span></button>)}</div> : <button type="button" onClick={() => { limparAvisos(); setModo('criar-gestao'); }} className={botaoSecundario}>Criar meu perfil Gestão</button>}</section>

          <section className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-3"><div className="mb-3 flex items-center gap-3"><span className="portal-icon bg-cyan-700 text-white"><Icone tipo="vendas"/></span><div><h2 className="font-bold text-slate-950">Vendas Mobile</h2><p className="text-xs text-slate-600">Clientes, produtos, pedidos e pagamentos.</p></div></div>{acessosVendasAtivos.length ? <div className="grid gap-2">{acessosVendasAtivos.map((acesso) => <button key={acesso.empresa_id} type="button" onClick={() => abrirVendas(acesso)} className="flex min-h-14 items-center justify-between rounded-xl border border-cyan-200 bg-white px-3 text-left shadow-sm"><span><b className="block text-sm text-slate-900">Abrir Vendas Mobile</b><small className="text-xs text-slate-500">{acesso.empresa_nome}</small></span><span className="text-xl text-cyan-700">›</span></button>)}</div> : acessosVendasSemModulo.length ? <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">O módulo Vendas Mobile não está ativo neste perfil. Peça ao gestor para ativá-lo.</div> : solicitacaoPendente ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900">Solicitação aguardando aprovação do gestor.</div> : <button type="button" onClick={() => { limparAvisos(); setModo('solicitar-vendas'); }} className={botaoSecundario}>Vincular ao Vendas com código</button>}</section>
        </div>
      )}

      {modo === 'criar-gestao' && (
        <form onSubmit={criarGestao} className="grid gap-4"><Campo label="Tipo do perfil" htmlFor="perfil-tipo"><select id="perfil-tipo" value={perfilTipo} onChange={(e) => setPerfilTipo(e.target.value === 'pessoal' ? 'pessoal' : 'empresa')} className={campoClasse}><option value="empresa">Empresa</option><option value="pessoal">Pessoal</option></select></Campo><Campo label={perfilTipo === 'empresa' ? 'Nome fantasia da empresa' : 'Nome do perfil pessoal'} htmlFor="perfil-nome"><input id="perfil-nome" value={perfilNome} onChange={(e) => setPerfilNome(e.target.value)} autoComplete={perfilTipo === 'empresa' ? 'organization' : 'name'} className={campoClasse}/></Campo><Campo label="Cupom (opcional)" htmlFor="perfil-cupom"><input id="perfil-cupom" value={perfilCupom} onChange={(e) => setPerfilCupom(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" className={campoClasse}/></Campo><p className="text-xs leading-relaxed text-slate-500">O perfil será preparado pela Gestão com as configurações e categorias correspondentes ao tipo escolhido.</p><button type="submit" disabled={processando} className={botaoPrimario}>{processando ? 'Preparando...' : 'Continuar para a Gestão'}</button></form>
      )}

      {modo === 'solicitar-vendas' && (
        <form onSubmit={solicitarVendas} className="grid gap-4"><Campo label="Código da empresa" htmlFor="codigo-empresa"><input id="codigo-empresa" value={codigoEmpresa} onChange={(e) => setCodigoEmpresa(e.target.value.toUpperCase())} autoCapitalize="characters" className={campoClasse} placeholder="AVA-XXXXXXXX"/></Campo>{!usuario?.user_metadata?.telefone && !usuario?.phone && <><Campo label="Celular" htmlFor="vendas-telefone"><div className="grid grid-cols-[104px_1fr] gap-2"><select aria-label="País (DDI)" value={vendasDdi} onChange={(e) => { setVendasDdi(e.target.value); setVendasSmsEnviado(false); }} className={campoClasse}>{PAISES.map((pais) => <option key={`${pais.ddi}-${pais.nome}`} value={pais.ddi}>{pais.flag} +{pais.ddi}</option>)}</select><input id="vendas-telefone" value={vendasTelefone} onChange={(e) => { setVendasTelefone(e.target.value.replace(/\D/g, '')); setVendasSmsEnviado(false); }} inputMode="numeric" className={campoClasse}/></div></Campo>{vendasSmsEnviado && <Campo label="Código recebido por SMS" htmlFor="vendas-sms"><input id="vendas-sms" value={vendasCodigoSms} onChange={(e) => setVendasCodigoSms(e.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" className={campoClasse}/></Campo>}</>}<button type="submit" disabled={processando} className={botaoPrimario}>{processando ? 'Processando...' : vendasSmsEnviado ? 'Confirmar e solicitar acesso' : 'Solicitar acesso'}</button></form>
      )}
    </CascaPortal>
  );
}

function Campo({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function CascaPortal({ children }: { children: ReactNode }) {
  return (
    <main data-native-status-bar="dark-content" className="relative h-[100dvh] overflow-hidden bg-[#eef6fb] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] font-sans">
      <div className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/bg-avantalab-mobile-1080x1920-sem-logo.webp')" }}/>
      <div className="relative z-10 mx-auto grid h-full w-full max-w-md grid-rows-[minmax(5rem,1fr)_minmax(0,auto)_minmax(5rem,1fr)]">
        <div className="flex min-h-0 items-center justify-center overflow-hidden"><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" width={1200} height={298} priority className="h-auto max-h-[calc(100%-0.5rem)] w-[min(76vw,22rem)] object-contain"/></div>
        <section
          className="overflow-y-auto overscroll-contain rounded-3xl border border-white/60 bg-white/[0.86] p-5 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-6"
          style={{ maxHeight: 'calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)) - 10rem)' }}
        >{children}</section>
        <div aria-hidden="true"/>
      </div>
      <style jsx global>{`.portal-icon{display:flex;width:2.75rem;height:2.75rem;flex:none;align-items:center;justify-content:center;border-radius:.9rem}.portal-icon svg{width:1.45rem;height:1.45rem;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.portal-icon-user{background:#e2e8f0;color:#334155}.portal-icon-small{display:inline-flex;width:1.15rem;height:1.15rem}.portal-icon-small svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`}</style>
    </main>
  );
}
