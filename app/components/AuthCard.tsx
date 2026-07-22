'use client';
import React from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { normalizarTipoPerfil, rotuloTipoPerfil, type TipoPerfil } from '../lib/perfis';
import { PAISES } from '../lib/paises';
import DraggableModalCard from './DraggableModalCard';
import LandingPage from './LandingPage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const subscreverPlataformaNativa = () => () => undefined;
const obterPlataformaNativa = () => Capacitor.isNativePlatform();
const obterPlataformaNativaNoServidor = () => false;

function formatarTelefoneCadastro(valor: string, ddi: string) {
  const digitos = valor.replace(/\D/g, '');

  if (ddi !== '55') return digitos.slice(0, 15);

  const telefone = digitos.slice(0, 11);
  if (telefone.length <= 2) return telefone ? `(${telefone}` : '';

  const ddd = telefone.slice(0, 2);
  const numero = telefone.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;

  const tamanhoPrefixo = numero.length <= 8 ? 4 : 5;
  return `(${ddd}) ${numero.slice(0, tamanhoPrefixo)}-${numero.slice(tamanhoPrefixo)}`;
}

interface AuthCardProps {
  // Modal Aviso
  modalAvisoAberto: boolean;
  tituloAviso: string;
  mensagemAviso: string;
  tipoAviso: 'alerta' | 'erro' | 'sucesso';
  fecharAviso: () => void;

  // Auth state
  modoAuth: 'login' | 'cadastro';
  setModoAuth: React.Dispatch<React.SetStateAction<'login' | 'cadastro'>>;
  mostrarLandingPreLogin: boolean;
  setMostrarLandingPreLogin: React.Dispatch<React.SetStateAction<boolean>>;
  loginEmail: string;
  setLoginEmail: React.Dispatch<React.SetStateAction<string>>;
  loginSenha: string;
  setLoginSenha: React.Dispatch<React.SetStateAction<string>>;
  mostrarSenhaLogin: boolean;
  setMostrarSenhaLogin: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarSenhaCadastro: boolean;
  setMostrarSenhaCadastro: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarConfirmarSenhaCadastro: boolean;
  setMostrarConfirmarSenhaCadastro: React.Dispatch<React.SetStateAction<boolean>>;
  cadastroNome: string;
  setCadastroNome: React.Dispatch<React.SetStateAction<string>>;
  cadastroNomeEmpresa: string;
  setCadastroNomeEmpresa: React.Dispatch<React.SetStateAction<string>>;
  cadastroEmail: string;
  setCadastroEmail: React.Dispatch<React.SetStateAction<string>>;
  cadastroTelefone: string;
  setCadastroTelefone: React.Dispatch<React.SetStateAction<string>>;
  cadastroSenha: string;
  setCadastroSenha: React.Dispatch<React.SetStateAction<string>>;
  cadastroConfirmarSenha: string;
  setCadastroConfirmarSenha: React.Dispatch<React.SetStateAction<string>>;
  cadastroCupom: string;
  setCadastroCupom: React.Dispatch<React.SetStateAction<string>>;
  codigoSmsCadastro: string;
  setCodigoSmsCadastro: React.Dispatch<React.SetStateAction<string>>;
  smsCadastroEnviado: boolean;
  segundosReenvioSms: number;
  reenviandoSmsCadastro: boolean;
  authErro: string;
  authMensagem: string;
  authLoading: boolean;
  googleLoading: boolean;
  modoRedefinirSenha: boolean;
  novaSenha: string;
  setNovaSenha: React.Dispatch<React.SetStateAction<string>>;
  confirmarNovaSenha: string;
  setConfirmarNovaSenha: React.Dispatch<React.SetStateAction<string>>;
  mostrarNovaSenha: boolean;
  setMostrarNovaSenha: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarConfirmarNovaSenha: boolean;
  setMostrarConfirmarNovaSenha: React.Dispatch<React.SetStateAction<boolean>>;
  codigoSmsRedefinirSenha: string;
  setCodigoSmsRedefinirSenha: React.Dispatch<React.SetStateAction<string>>;
  smsRedefinirSenhaEnviado: boolean;
  segundosReenvioRedefinirSenha: number;
  reenviandoSmsRedefinirSenha: boolean;
  tipoPerfilInicial: TipoPerfil;
  setTipoPerfilInicial: React.Dispatch<React.SetStateAction<TipoPerfil>>;
  onAbrirTermos: () => void;
  onAbrirPrivacidade: () => void;
  cadastroDdi: string;
  setCadastroDdi: React.Dispatch<React.SetStateAction<string>>;

  // Auth handlers
  handleLogin: () => Promise<void>;
  handleCadastroTeste: () => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handleRecuperarSenha: () => Promise<void>;
  handleAtualizarSenha: () => Promise<void>;
  reenviarCodigoSmsCadastro: () => Promise<void>;
  reenviarCodigoRedefinirSenha: () => Promise<void>;
}

export default function AuthCard({
  modalAvisoAberto, tituloAviso, mensagemAviso, tipoAviso, fecharAviso,
  modoAuth, setModoAuth,
  mostrarLandingPreLogin, setMostrarLandingPreLogin,
  loginEmail, setLoginEmail,
  loginSenha, setLoginSenha,
  mostrarSenhaLogin, setMostrarSenhaLogin,
  mostrarSenhaCadastro, setMostrarSenhaCadastro,
  mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro,
  cadastroNome, setCadastroNome,
  cadastroNomeEmpresa, setCadastroNomeEmpresa,
  cadastroEmail, setCadastroEmail,
  cadastroTelefone, setCadastroTelefone,
  cadastroSenha, setCadastroSenha,
  cadastroConfirmarSenha, setCadastroConfirmarSenha,
  cadastroCupom, setCadastroCupom,
  codigoSmsCadastro, setCodigoSmsCadastro,
  smsCadastroEnviado, segundosReenvioSms, reenviandoSmsCadastro,
  authErro, authMensagem, authLoading, googleLoading,
  modoRedefinirSenha,
  novaSenha, setNovaSenha,
  confirmarNovaSenha, setConfirmarNovaSenha,
  mostrarNovaSenha, setMostrarNovaSenha,
  mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha,
  codigoSmsRedefinirSenha, setCodigoSmsRedefinirSenha,
  smsRedefinirSenhaEnviado, segundosReenvioRedefinirSenha, reenviandoSmsRedefinirSenha,
  tipoPerfilInicial, setTipoPerfilInicial,
  onAbrirTermos, onAbrirPrivacidade,
  cadastroDdi, setCadastroDdi,
  handleLogin, handleCadastroTeste, handleGoogleLogin,
  handleRecuperarSenha, handleAtualizarSenha,
  reenviarCodigoSmsCadastro, reenviarCodigoRedefinirSenha,
}: AuthCardProps) {
  const [promptInstalacao, setPromptInstalacao] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [instaladoComoApp, setInstaladoComoApp] = React.useState(false);
  const aplicativoNativo = React.useSyncExternalStore(
    subscreverPlataformaNativa,
    obterPlataformaNativa,
    obterPlataformaNativaNoServidor,
  );
  const [mostrarInstrucaoInstalacao, setMostrarInstrucaoInstalacao] = React.useState(false);
  const [qrMobileAberto, setQrMobileAberto] = React.useState(false);
  const [qrMobileDataUrl, setQrMobileDataUrl] = React.useState('');
  const [qrMobileLink, setQrMobileLink] = React.useState('');
  const [qrMobileErro, setQrMobileErro] = React.useState('');

  React.useEffect(() => {
    const navegadorStandalone = navigator as Navigator & { standalone?: boolean };
    const nativo = Capacitor.isNativePlatform();
    const atualizarEstadoInstalacao = () => {
      setInstaladoComoApp(
        nativo ||
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean(navegadorStandalone.standalone),
      );
    };
    const capturarPrompt = (evento: Event) => {
      evento.preventDefault();
      setPromptInstalacao(evento as BeforeInstallPromptEvent);
      setMostrarInstrucaoInstalacao(false);
    };
    const concluirInstalacao = () => {
      setInstaladoComoApp(true);
      setPromptInstalacao(null);
      setMostrarInstrucaoInstalacao(false);
    };

    atualizarEstadoInstalacao();
    window.addEventListener('beforeinstallprompt', capturarPrompt);
    window.addEventListener('appinstalled', concluirInstalacao);
    if (!nativo) {
      navigator.serviceWorker?.register('/sw.js?v=1', { scope: '/' }).catch(() => undefined);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', capturarPrompt);
      window.removeEventListener('appinstalled', concluirInstalacao);
    };
  }, []);

  const instalarAplicativo = async () => {
    if (!promptInstalacao) {
      setMostrarInstrucaoInstalacao(true);
      return;
    }

    await promptInstalacao.prompt();
    const escolha = await promptInstalacao.userChoice;
    setPromptInstalacao(null);
    if (escolha.outcome === 'accepted') setInstaladoComoApp(true);
  };

  const abrirQrMobile = async () => {
    const link = `${window.location.origin}/mobile`;
    setQrMobileAberto(true);
    setQrMobileLink(link);
    setQrMobileDataUrl('');
    setQrMobileErro('');
    try {
      const dataUrl = await QRCode.toDataURL(link, {
        width: 288,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#003E73', light: '#FFFFFF' },
      });
      setQrMobileDataUrl(dataUrl);
    } catch {
      setQrMobileErro('Não foi possível gerar o QR Code agora.');
    }
  };

  const mostrarLandingPreLoginAtiva =
    mostrarLandingPreLogin &&
    !modoRedefinirSenha &&
    modoAuth === 'login' &&
    !authErro &&
    !authMensagem;

  const tipoPerfilInicialNormalizado = normalizarTipoPerfil(tipoPerfilInicial);

  if (mostrarLandingPreLoginAtiva && !modalAvisoAberto) {
    return (
      <LandingPage
        onCriarConta={() => {
          if (aplicativoNativo) {
            window.location.assign('/acesso?modo=cadastro&origem=gestao');
            return;
          }
          setMostrarLandingPreLogin(false);
          setModoAuth('cadastro');
        }}
        onEntrar={() => {
          if (aplicativoNativo) {
            window.location.assign('/acesso?modo=login&origem=gestao');
            return;
          }
          setMostrarLandingPreLogin(false);
          setModoAuth('login');
        }}
      />
    );
  }

  return (
    <main className={`relative overflow-x-hidden font-sans ${aplicativoNativo ? 'h-[100dvh] min-h-0 overflow-y-hidden' : 'min-h-screen'}`}>
      {qrMobileAberto && (
        <div className="fixed inset-0 z-[8100] flex items-center justify-center bg-black/60 px-4" onClick={() => setQrMobileAberto(false)}>
          <DraggableModalCard
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div data-modal-drag-handle className="flex cursor-grab items-center justify-between bg-cyan-600 px-5 py-4 text-white active:cursor-grabbing">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">AvantaLab Mobile</p>
                <h2 className="mt-0.5 text-base font-black">Acessar pelo celular</h2>
              </div>
              <button type="button" onClick={() => setQrMobileAberto(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-black hover:bg-white/25" aria-label="Fechar">×</button>
            </div>
            <div className="p-5 text-center">
              {qrMobileDataUrl ? (
                <div className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                  <Image src={qrMobileDataUrl} alt="QR Code para acessar o AvantaLab Mobile" width={240} height={240} unoptimized className="h-60 w-60" />
                </div>
              ) : qrMobileErro ? (
                <p className="rounded-lg bg-red-50 px-3 py-4 text-sm font-bold text-red-700">{qrMobileErro}</p>
              ) : (
                <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-xl bg-slate-50">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-700" />
                </div>
              )}
              <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">Aponte a câmera do celular para abrir a versão mobile.</p>
              <p className="mt-1 truncate text-[10px] font-medium text-slate-400" title={qrMobileLink}>{qrMobileLink}</p>
            </div>
          </DraggableModalCard>
        </div>
      )}
      {modalAvisoAberto && (
  <div
    className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharAviso}
  >
    <DraggableModalCard
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle className="mb-4 flex cursor-grab items-center gap-3 active:cursor-grabbing">
        <div
  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
    tipoAviso === 'sucesso'
      ? 'bg-emerald-100 text-emerald-700'
      : tipoAviso === 'erro'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700'
  }`}
>
  {tipoAviso === 'sucesso' ? (
    <span className="text-2xl font-black leading-none">✓</span>
  ) : (
    <span className="text-2xl font-black leading-none">!</span>
  )}
</div>

        <div>
          <h2 className="text-lg font-black text-slate-900">
            {tituloAviso}
          </h2>

          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {mensagemAviso}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={fecharAviso}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98] cursor-pointer"
        >
          Entendi
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))" }}
      />

      <div
        className="absolute inset-0 bg-no-repeat lg:hidden"
        style={{
          backgroundImage: aplicativoNativo
            ? "image-set(url('/images/bg-avantalab-mobile-1080x1920-sem-logo.webp') type('image/webp'), url('/images/bg-avantalab-mobile-1080x1920-sem-logo.png') type('image/png'))"
            : "image-set(url('/images/bg-avantalab-mobile-1080x1920.webp') type('image/webp'), url('/images/bg-avantalab-mobile-1080x1920.png') type('image/png'))",
          backgroundSize: aplicativoNativo ? 'cover' : 'auto 108%',
          backgroundPosition: 'center bottom',
        }}
      />

      <div className="pointer-events-none absolute inset-0 hidden bg-white/10 lg:block" />

      <section className={aplicativoNativo
        ? 'relative z-10 grid h-[100dvh] min-h-0 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'
        : 'relative z-10 flex min-h-[100dvh] items-start px-4 pb-8 pt-[clamp(8.25rem,18dvh,10rem)] lg:min-h-screen lg:items-center lg:px-20 lg:py-10'}>
        {aplicativoNativo && (
          <div className="row-start-1 flex min-h-0 items-center justify-center overflow-hidden px-4 py-2" aria-hidden="true">
            <Image
              src="/images/logo-avantalab-oficial.png"
              alt=""
              width={1200}
              height={298}
              priority
              className="h-auto max-h-full w-[min(78vw,23rem)] object-contain"
            />
          </div>
        )}
        <div className={aplicativoNativo ? 'row-start-2 w-full min-w-0' : 'w-full lg:max-w-7xl'}>
          <div className={`relative z-20 w-full rounded-3xl border p-4 shadow-2xl ${
            aplicativoNativo
              ? 'mx-auto max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] max-w-md overflow-y-auto overscroll-contain border-white/45 bg-white/[0.82] backdrop-blur-xl'
              : 'border-white/20 bg-white/10 lg:border-white/30 lg:bg-white/70 lg:p-8 lg:backdrop-blur-xl'
          } ${
            mostrarLandingPreLoginAtiva ? 'lg:max-w-2xl' : 'lg:max-w-md'
          }`}>
            {mostrarLandingPreLoginAtiva ? (
              <div className="grid gap-6">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-sky-700">
                    AvantaLab Gestão
                  </p>

                  <h1 className="max-w-xl text-3xl font-black leading-tight text-slate-900 lg:text-4xl">
                    Gestão empresarial integrada, segura e simples de operar.
                  </h1>

                  <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-slate-600">
                    O AvantaLab Gestão centraliza rotinas financeiras e operacionais em uma plataforma prática, moderna e fácil de usar, com estrutura segura para organizar informações, acompanhar indicadores e apoiar decisões do dia a dia empresarial.
                  </p>
                </div>

                <div className="grid gap-2 rounded-2xl border border-white/35 bg-white/35 p-4 text-sm font-bold leading-snug text-slate-700 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-800">Principais benefícios</p>
                  <p>✓ Controle receitas, despesas e pagamentos programados.</p>
                  <p>✓ Acompanhe gráficos e comparativos mês a mês.</p>
                  <p>✓ Receba avisos e notificações sobre compromissos financeiros.</p>
                  <p>✓ Use IA para entender seus números e tirar dúvidas do sistema.</p>
                  <p>✓ Gerencie ponto e rotinas operacionais.</p>
                  <p>✓ Acesse pelo computador ou celular.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarLandingPreLogin(false);
                      setModoAuth('cadastro');
                    }}
                    className="h-12 rounded-xl px-5 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg,#003E73,#00A6C8)',
                    }}
                  >
                    Criar conta grátis
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMostrarLandingPreLogin(false);
                      setModoAuth('login');
                    }}
                    className="h-12 rounded-xl border border-slate-300 bg-white/85 px-5 text-sm font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="mb-3 lg:mb-5">
              <h1 className="text-2xl font-black leading-tight text-slate-900">
  {modoRedefinirSenha
    ? 'Criar nova senha'
    : modoAuth === 'login'
      ? 'Acesse sua conta'
      : 'Criar cadastro'}
</h1>

              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
  {modoRedefinirSenha
    ? 'Digite e confirme sua nova senha para recuperar o acesso ao sistema.'
    : modoAuth === 'login'
      ? 'Entre para acompanhar sua gestão financeira, lançamentos, relatórios e evolução operacional.'
      : 'Preencha seus dados para criar acesso ao sistema.'}
</p>
            </div>

          {modoRedefinirSenha ? (
  <div className="space-y-4">
    <div>

{smsRedefinirSenhaEnviado && (
  <div>
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      Código recebido por SMS
    </label>

    <input
      type="text"
      inputMode="numeric"
      value={codigoSmsRedefinirSenha}
      onChange={(e) => setCodigoSmsRedefinirSenha(e.target.value)}
      placeholder="Digite o código recebido"
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={reenviarCodigoRedefinirSenha}
      disabled={
        reenviandoSmsRedefinirSenha ||
        segundosReenvioRedefinirSenha > 0
      }
      className="mt-2 text-xs font-bold text-sky-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
    >
      {segundosReenvioRedefinirSenha > 0
        ? `Reenviar código em ${segundosReenvioRedefinirSenha}s`
        : reenviandoSmsRedefinirSenha
          ? 'Reenviando código...'
          : 'Reenviar código'}
    </button>
  </div>
)}

      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Nova senha
      </label>

      <div className="relative">
        <input
          type={mostrarNovaSenha ? 'text' : 'password'}
          placeholder="Digite a nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
        />

        <button
  type="button"
  onClick={() => setMostrarNovaSenha((mostrar) => !mostrar)}
  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
  title={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
>
  {mostrarNovaSenha ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91" />
    </svg>
  )}
</button>
      </div>
    </div>

    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Confirmar nova senha
      </label>

      <div className="relative">
        <input
          type={mostrarConfirmarNovaSenha ? 'text' : 'password'}
          placeholder="Repita a nova senha"
          value={confirmarNovaSenha}
          onChange={(e) => setConfirmarNovaSenha(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
        />

        <button
  type="button"
  onClick={() => setMostrarConfirmarNovaSenha((mostrar) => !mostrar)}
  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
  title={mostrarConfirmarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
>
  {mostrarConfirmarNovaSenha ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91" />
    </svg>
  )}
</button>
      </div>
    </div>

    {authErro && (
      <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
        {authErro}
      </div>
    )}

    {authMensagem && (
      <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
        {authMensagem}
      </div>
    )}

    <button
      type="button"
      onClick={handleAtualizarSenha}
      disabled={authLoading}
      className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {authLoading
  ? smsRedefinirSenhaEnviado
    ? 'Redefinindo...'
    : 'Enviando...'
  : smsRedefinirSenhaEnviado
    ? 'Redefinir senha'
    : 'Enviar código por SMS'}
    </button>
  </div>
) : modoAuth === 'login' ? (
  <div className="space-y-3">

        {/* ================= INÍCIO DO FORMULÁRIO DE LOGIN ================= */}

<form
  onSubmit={(e) => {
    e.preventDefault();
    void handleLogin();
  }}
  className="space-y-3"
>
  <div>
    <label className="mb-1 block text-xs font-semibold text-slate-700">
      Email ou login
    </label>

    <input
      type="text"
      placeholder="seuemail@exemplo.com ou seu login"
      value={loginEmail}
      onChange={(e) => setLoginEmail(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />
  </div>

  <div>
    <label className="mb-1 block text-xs font-semibold text-slate-700">
      Senha
    </label>

    <div className="relative">
  <input
    type={mostrarSenhaLogin ? 'text' : 'password'}
    placeholder="Digite sua senha"
    value={loginSenha}
    onChange={(e) => setLoginSenha(e.target.value)}
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
  />

  <button
    type="button"
    onClick={() => setMostrarSenhaLogin((mostrar) => !mostrar)}
    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
    title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
  >
    {mostrarSenhaLogin ? (
      // Olho aberto
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth="2" />
      </svg>
    ) : (
      // Olho cortado
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3l18 18"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
        />
      </svg>
    )}
  </button>
</div>
  </div>

  <div className="text-right">
    <button
      type="button"
      onClick={handleRecuperarSenha}
      className="text-xs font-bold text-sky-700 hover:underline"
    >
      Esqueci minha senha
    </button>
  </div>

  {authErro && (
    <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
      {authErro}
    </div>
  )}

  {authMensagem && (
    <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
      {authMensagem}
    </div>
  )}

  <div className="grid grid-cols-2 gap-2">
    <button
      type="submit"
      disabled={authLoading}
      className="h-10 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {authLoading ? 'Entrando...' : 'Entrar'}
    </button>

    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={googleLoading}
      className="flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white/90 px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {googleLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-700" />
      ) : (
        <img src="/images/google-logo.svg" alt="" className="h-4 w-4" />
      )}
      <span>{googleLoading ? 'Conectando...' : 'Conectar com Google'}</span>
    </button>
  </div>
</form>

<p className="text-center text-[10px] leading-snug text-slate-500">
  Se este for seu primeiro acesso com este email, uma nova conta será criada automaticamente.
</p>

<div className="text-center text-xs text-slate-600">
  Ainda não tem conta?{' '}
  <button
    type="button"
    onClick={() => setModoAuth('cadastro')}
    className="font-bold text-sky-700 hover:underline"
  >
    Criar cadastro
  </button>
</div>

{!instaladoComoApp && (
  <div>
    <button
      type="button"
      onClick={() => void instalarAplicativo()}
      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50/90 px-3 text-xs font-bold text-sky-800 shadow-sm transition hover:bg-sky-100"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
      </svg>
      Instalar AvantaLab
    </button>
    {mostrarInstrucaoInstalacao && (
      <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-center text-xs font-medium leading-relaxed text-slate-600">
        No iPhone, use Compartilhar e Adicionar à Tela de Início. No Android, abra o menu do navegador e escolha Instalar app.
      </p>
    )}
  </div>
)}

<button
  type="button"
  onClick={() => void abrirQrMobile()}
  className="hidden h-9 w-full items-center justify-center gap-2 rounded-full border border-cyan-400 bg-cyan-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-cyan-700 lg:flex"
>
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" />
    <path d="M15 15h2v2h-2zM19 15h2v2M15 19v2h2M19 19h2v2" />
  </svg>
  Acessar pelo celular
</button>

{/* ================= FIM DO FORMULÁRIO DE CADASTRO ================= */}

              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(['empresa', 'pessoal'] as TipoPerfil[]).map((tipo) => {
                    const ativo = tipoPerfilInicialNormalizado === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoPerfilInicial(tipo)}
                        className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wide transition ${
                          ativo
                            ? 'bg-slate-900 text-white shadow'
                            : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        }`}
                      >
                        {rotuloTipoPerfil(tipo)}
                      </button>
                    );
                  })}
                </div>

                {tipoPerfilInicialNormalizado === 'empresa' && (
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-black uppercase text-slate-600">Empresa</span>
                    <input
                      type="text"
                      autoComplete="organization"
                      placeholder="Nome fantasia"
                      value={cadastroNomeEmpresa}
                      onChange={(e) => setCadastroNomeEmpresa(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-black uppercase text-slate-600">
                    {tipoPerfilInicialNormalizado === 'empresa' ? 'Responsável' : 'Nome completo'}
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Nome completo"
                    value={cadastroNome}
                    onChange={(e) => setCadastroNome(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                  />
                </label>

                <input
  type="email"
  autoComplete="off"
  placeholder="Email"
  value={cadastroEmail}
  onChange={(e) => setCadastroEmail(e.target.value)}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>

                <div className="flex gap-2">
  <select
    value={cadastroDdi}
    onChange={(e) => {
      const novoDdi = e.target.value;
      setCadastroDdi(novoDdi);
      setCadastroTelefone((telefone) => formatarTelefoneCadastro(telefone, novoDdi));
    }}
    aria-label="País (DDI)"
    className="w-28 shrink-0 rounded-xl border border-slate-300 bg-white/90 px-2 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  >
    {PAISES.map((p) => (
      <option key={`${p.ddi}-${p.nome}`} value={p.ddi}>{p.flag} +{p.ddi}</option>
    ))}
  </select>
  <input
    type="tel"
    autoComplete="tel-national"
    inputMode="numeric"
    placeholder="Celular (DDD + número)"
    value={cadastroTelefone}
    onChange={(e) => setCadastroTelefone(formatarTelefoneCadastro(e.target.value, cadastroDdi))}
    className="w-full min-w-0 rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />
</div>

                <div className="relative">
    <input
      type={mostrarSenhaCadastro ? 'text' : 'password'}
      autoComplete="new-password"
      placeholder="Crie uma senha"
      value={cadastroSenha}
      onChange={(e) => setCadastroSenha(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={() => setMostrarSenhaCadastro((mostrar) => !mostrar)}
      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      title={mostrarSenhaCadastro ? 'Ocultar senha' : 'Ver senha'}
    >
      {mostrarSenhaCadastro ? (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
          />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 3l18 18"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
          />
        </svg>
      )}
    </button>
  </div>

                <div className="relative">
    <input
      type={mostrarConfirmarSenhaCadastro ? 'text' : 'password'}
      autoComplete="new-password"
      placeholder="Confirmar senha"
      value={cadastroConfirmarSenha}
      onChange={(e) => setCadastroConfirmarSenha(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={() =>
        setMostrarConfirmarSenhaCadastro((mostrar) => !mostrar)
      }
      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      title={mostrarConfirmarSenhaCadastro ? 'Ocultar senha' : 'Ver senha'}
    >
      {mostrarConfirmarSenhaCadastro ? (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
          />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 3l18 18"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
          />
        </svg>
      )}
    </button>
  </div>

                {smsCadastroEnviado && (
  <div className="rounded-xl border-2 border-sky-400 bg-sky-50 px-3 py-2.5 shadow-sm">
    <p className="mb-1 text-xs font-black uppercase tracking-wide text-sky-700">Digite o código recebido</p>
    <input
      type="text"
      inputMode="numeric"
      autoFocus
      placeholder="Código recebido por SMS"
      value={codigoSmsCadastro}
      onChange={(e) => setCodigoSmsCadastro(e.target.value)}
      className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-semibold tracking-widest text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <p className="mt-1 text-[11px] text-sky-800">
      Enviamos o código para o celular informado.
    </p>
<button
  type="button"
  onClick={reenviarCodigoSmsCadastro}
  disabled={reenviandoSmsCadastro || segundosReenvioSms > 0}
  className="mt-1 text-[11px] font-bold text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:no-underline"
>
  {reenviandoSmsCadastro
    ? 'Reenviando código...'
    : segundosReenvioSms > 0
      ? `Reenviar código em ${segundosReenvioSms}s`
      : 'Reenviar código'}
</button>
  </div>
)}

{authErro && (
  <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
    {authErro}
  </div>
)}

{authMensagem && (
  <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
    {authMensagem}
  </div>
)}

{!smsCadastroEnviado && (
  <p className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-center leading-tight text-slate-600">
      <span className="block whitespace-nowrap text-[10px] sm:text-[11px]">
        Ao se cadastrar, você declara aceitar nossos termos.
      </span>
      <span className="mt-0.5 block text-[11px]">
        <button type="button" onClick={onAbrirTermos} className="mr-2 font-bold text-sky-700 underline">Termos de Uso</button>
        <button type="button" onClick={onAbrirPrivacidade} className="font-bold text-sky-700 underline">Política de Privacidade</button>
      </span>
  </p>
)}

                <input
  type="text"
  autoComplete="off"
  placeholder="Cupom (opcional)"
  value={cadastroCupom}
  onChange={(e) => setCadastroCupom(e.target.value.toUpperCase())}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-sm uppercase tracking-wide text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>

                <button
  type="button"
  onClick={handleCadastroTeste}
  disabled={authLoading}
  className="w-full rounded-xl bg-slate-900 px-4 py-1.5 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {authLoading
  ? smsCadastroEnviado
    ? 'Validando código...'
    : 'Enviando código...'
  : smsCadastroEnviado
    ? 'Concluir cadastro'
    : 'Enviar código por SMS'}
</button>

                <div className="text-center text-sm text-slate-600">
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setModoAuth('login')}
                    className="font-bold text-sky-700 hover:underline"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        </div>
        {aplicativoNativo && <div className="row-start-3 min-h-0" aria-hidden="true" />}
      </section>
    </main>
  );
}
