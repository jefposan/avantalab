'use client';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Tipos exportados (usados em outros hooks via injeção de deps)
// ---------------------------------------------------------------------------

export type AbrirAvisoFn = (
  titulo: string,
  mensagem: string,
  acaoDepois?: () => void,
  tipo?: 'alerta' | 'erro' | 'sucesso'
) => void;

export type AbrirConfirmacaoFn = (params: {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  acao: () => Promise<void> | void;
}) => void;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUI() {
  // --- Modal Aviso ---
  const [modalAvisoAberto, setModalAvisoAberto] = useState(false);
  const [tituloAviso, setTituloAviso] = useState('');
  const [mensagemAviso, setMensagemAviso] = useState('');
  const [tipoAviso, setTipoAviso] = useState<'alerta' | 'erro' | 'sucesso'>('alerta');
  const [acaoDepoisDoAviso, setAcaoDepoisDoAviso] = useState<(() => void) | null>(null);

  // --- Modal Confirmação ---
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [tituloConfirmacao, setTituloConfirmacao] = useState('');
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState('');
  const [textoConfirmarConfirmacao, setTextoConfirmarConfirmacao] = useState('Confirmar');
  const [acaoConfirmacao, setAcaoConfirmacao] = useState<
    (() => Promise<void> | void) | null
  >(null);
  const [confirmacaoCarregando, setConfirmacaoCarregando] = useState(false);

  // --- Chat Feedback ---
  const [chatFeedbackAberto, setChatFeedbackAberto] = useState(false);
  const [chatFeedbackEtapa, setChatFeedbackEtapa] = useState<
    'inicio' | 'formulario' | 'confirmacao'
  >('inicio');
  const [feedbackTipo, setFeedbackTipo] = useState<'sugestao' | 'duvida' | null>(null);
  const [feedbackMensagem, setFeedbackMensagem] = useState('');
  const [feedbackEnviando, setFeedbackEnviando] = useState(false);

  // --- Outros estados de UI ---
  const [painelAvisosAberto, setPainelAvisosAberto] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);

  // ---------------------------------------------------------------------------
  // Funções — Modal Aviso
  // ---------------------------------------------------------------------------

  const abrirAviso: AbrirAvisoFn = (
    titulo,
    mensagem,
    acaoDepois,
    tipo = 'alerta'
  ) => {
    setTituloAviso(titulo);
    setMensagemAviso(mensagem);
    setTipoAviso(tipo);
    setAcaoDepoisDoAviso(() => acaoDepois || null);
    setModalAvisoAberto(true);
  };

  const fecharAviso = () => {
    setModalAvisoAberto(false);
    const acao = acaoDepoisDoAviso;
    setAcaoDepoisDoAviso(null);
    if (acao) {
      setTimeout(() => {
        acao();
      }, 150);
    }
  };

  // ---------------------------------------------------------------------------
  // Funções — Modal Confirmação
  // ---------------------------------------------------------------------------

  const abrirConfirmacao: AbrirConfirmacaoFn = ({
    titulo,
    mensagem,
    textoConfirmar = 'Confirmar',
    acao,
  }) => {
    setTituloConfirmacao(titulo);
    setMensagemConfirmacao(mensagem);
    setTextoConfirmarConfirmacao(textoConfirmar);
    setAcaoConfirmacao(() => acao);
    setModalConfirmacaoAberto(true);
  };

  const fecharConfirmacao = () => {
    if (confirmacaoCarregando) return;
    setModalConfirmacaoAberto(false);
    setTituloConfirmacao('');
    setMensagemConfirmacao('');
    setAcaoConfirmacao(null);
  };

  const confirmarAcao = async () => {
    if (!acaoConfirmacao) return;
    try {
      setConfirmacaoCarregando(true);
      await acaoConfirmacao();
      setModalConfirmacaoAberto(false);
      setTituloConfirmacao('');
      setMensagemConfirmacao('');
      setAcaoConfirmacao(null);
    } catch (error) {
      console.error('Erro ao confirmar ação:', error);
      abrirAviso(
        'Erro ao concluir ação',
        'Não foi possível concluir a ação. Tente novamente.'
      );
    } finally {
      setConfirmacaoCarregando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Funções — Chat Feedback
  // ---------------------------------------------------------------------------

  const abrirFormularioFeedback = (tipo: 'sugestao' | 'duvida') => {
    setFeedbackTipo(tipo);
    setFeedbackMensagem('');
    setChatFeedbackEtapa('formulario');
  };

  const voltarInicioChatFeedback = () => {
    setFeedbackTipo(null);
    setFeedbackMensagem('');
    setChatFeedbackEtapa('inicio');
  };

  const fecharChatFeedback = () => {
    setChatFeedbackAberto(false);
    setFeedbackTipo(null);
    setFeedbackMensagem('');
    setFeedbackEnviando(false);
    setChatFeedbackEtapa('inicio');
  };

  // ---------------------------------------------------------------------------
  // Funções — Tour
  // ---------------------------------------------------------------------------

  const finalizarTour = () => {
    localStorage.setItem('avantalab_tour_concluido', 'true');
    setTourAberto(false);
  };

  const pularTour = () => {
    localStorage.setItem('avantalab_tour_concluido', 'true');
    setTourAberto(false);
  };

  // ---------------------------------------------------------------------------
  // Retorno
  // ---------------------------------------------------------------------------

  return {
    // Aviso
    modalAvisoAberto,
    setModalAvisoAberto,
    tituloAviso,
    mensagemAviso,
    tipoAviso,
    acaoDepoisDoAviso,
    abrirAviso,
    fecharAviso,

    // Confirmação
    modalConfirmacaoAberto,
    setModalConfirmacaoAberto,
    tituloConfirmacao,
    mensagemConfirmacao,
    textoConfirmarConfirmacao,
    acaoConfirmacao,
    confirmacaoCarregando,
    abrirConfirmacao,
    fecharConfirmacao,
    confirmarAcao,

    // Chat Feedback
    chatFeedbackAberto,
    setChatFeedbackAberto,
    chatFeedbackEtapa,
    setChatFeedbackEtapa,
    feedbackTipo,
    setFeedbackTipo,
    feedbackMensagem,
    setFeedbackMensagem,
    feedbackEnviando,
    setFeedbackEnviando,
    abrirFormularioFeedback,
    voltarInicioChatFeedback,
    fecharChatFeedback,

    // Outros
    painelAvisosAberto,
    setPainelAvisosAberto,
    tourAberto,
    setTourAberto,
    finalizarTour,
    pularTour,
  };
}
