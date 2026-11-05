'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AcessosUsuarioCampos from '../components/AcessosUsuarioCampos';
import { LIBERACOES_PADRAO, liberacoesDoVinculo, validarLiberacoes, type LiberacoesUsuario } from '../lib/acessos-usuario';

type Slot = { node: HTMLElement; contexto: string; empresaId: string; acessoId: string; perfil: string; disabled: boolean; value: LiberacoesUsuario };

export default function AcessosUsuarioMobileBridge() {
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    const contrato = { padrao: () => ({ dashboard: LIBERACOES_PADRAO.dashboard, modulos: [...LIBERACOES_PADRAO.modulos] }), doVinculo: liberacoesDoVinculo, validar: validarLiberacoes };
    const win = window as Window & { __avantaAcessosUsuario?: typeof contrato };
    win.__avantaAcessosUsuario = contrato;
    const sincronizar = () => {
      const encontrados: Slot[] = [];
      document.querySelectorAll<HTMLElement>('[data-mobile-acessos-usuario]').forEach(node => {
        try {
          const dados = JSON.parse(node.dataset.mobileAcessosUsuario || '');
          if (!dados.value || typeof dados.value.dashboard !== 'boolean' || !Array.isArray(dados.value.modulos)) return;
          encontrados.push({ ...dados, node });
        } catch { /* Um slot incompleto nunca recebe liberações padrão. */ }
      });
      setSlots(encontrados);
    };
    // O shell legado substitui o DOM a cada render e já anuncia este evento.
    window.addEventListener('avantalab:theme-changed', sincronizar);
    window.dispatchEvent(new Event('avantalab:acessos-usuario-prontos'));
    sincronizar();
    return () => {
      window.removeEventListener('avantalab:theme-changed', sincronizar);
      if (win.__avantaAcessosUsuario === contrato) delete win.__avantaAcessosUsuario;
    };
  }, []);

  return slots.map(slot => createPortal(
    <AcessosUsuarioCampos value={slot.value} perfil={slot.perfil} disabled={slot.disabled} onChange={value => {
      if (!slot.node.isConnected || slot.disabled) return;
      // Atualiza o controle sem substituir o DOM/foco do formulário mobile.
      slot.node.dataset.mobileAcessosUsuario = JSON.stringify({ ...slot, node: undefined, value });
      setSlots(atual => atual.map(item => item.node === slot.node ? { ...item, value } : item));
      window.dispatchEvent(new CustomEvent('avantalab:usuario-liberacoes', { detail: { contexto: slot.contexto, empresaId: slot.empresaId, acessoId: slot.acessoId, value } }));
    }} />,
    slot.node,
    `${slot.empresaId}:${slot.contexto}:${slot.acessoId}`,
  ));
}
