/** Isola somente a ficha expandida; sem mover, remontar ou salvar seu conteúdo. */
type FocoProduto = {ficha:HTMLElement;recolher:()=>boolean;restaurar:()=>void};
const focos = new WeakMap<Document, FocoProduto>();
/** Navegação explícita descarta só o rascunho da ficha; escrita em andamento pode recusar. */
export function recolherProdutoEmFoco(doc: Document = document) {
  return focos.get(doc)?.recolher() ?? true;
}
export function ativarFocoProduto(ficha: HTMLElement, aoRecolher?: () => boolean | void, aoRecusar?:()=>void) {
  const doc = ficha.ownerDocument;
  const anterior=focos.get(doc);
  if(anterior){
    if(anterior.ficha===ficha||!anterior.ficha.isConnected)anterior.restaurar();
    else if(!anterior.recolher()){
      // Não sobrepor locks nem descartar uma gravação em andamento.
      aoRecusar?.();
      return ()=>{};
    }
  }
  const restaurar: Array<() => void> = [];
  let encerrado = false;
  const gutter = doc.documentElement.style.getPropertyValue('scrollbar-gutter');
  const gutterPriority = doc.documentElement.style.getPropertyPriority('scrollbar-gutter');
  doc.documentElement.style.setProperty('scrollbar-gutter', 'stable');
  restaurar.push(() => {
    if (gutter) doc.documentElement.style.setProperty('scrollbar-gutter', gutter, gutterPriority);
    else doc.documentElement.style.removeProperty('scrollbar-gutter');
  });
  const bloquear = (elemento: HTMLElement) => {
    const valor = elemento.style.getPropertyValue('overflow');
    const prioridade = elemento.style.getPropertyPriority('overflow');
    elemento.style.setProperty('overflow', 'hidden');
    restaurar.push(() => {
      if (valor) elemento.style.setProperty('overflow', valor, prioridade);
      else elemento.style.removeProperty('overflow');
    });
  };
  // Sobe pela árvore sem tirar a ficha de sua largura/posição original.
  // Portais de confirmação criados depois continuam disponíveis.
  const isolar = (elemento: HTMLElement) => {
    if (elemento.hasAttribute('data-product-focus-navigation')) return;
    // Um menu pode estar dentro de um wrapper irmão da ficha. Não tornar
    // esse ancestral inert: isolar apenas os demais ramos dentro dele.
    if (elemento.querySelector('[data-product-focus-navigation]')) {
      for (const filho of Array.from(elemento.children)) if (filho instanceof HTMLElement) isolar(filho);
      return;
    }
    const anterior = elemento.inert;
    elemento.inert = true;
    restaurar.push(() => { elemento.inert = anterior; });
  };
  for (let atual: HTMLElement | null = ficha; atual?.parentElement; atual = atual.parentElement) {
    const pai: HTMLElement = atual.parentElement;
    for (const irmao of Array.from(pai.children)) {
      if (irmao === atual || !(irmao instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'LINK'].includes(irmao.tagName) || irmao.hasAttribute('data-product-focus-navigation')) continue;
      isolar(irmao);
    }
    // Não criar novos scroll containers: isso mudaria o comportamento dos
    // cabeçalhos sticky existentes no módulo.
    const overflow = doc.defaultView?.getComputedStyle(pai).overflowY || pai.style.getPropertyValue('overflow');
    if (pai === doc.documentElement || pai === doc.body || /auto|scroll/.test(overflow)) bloquear(pai);
    if (pai === doc.documentElement) break;
  }
  const impedirRolagemExterna = (evento: Event) => {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;
    if (alvo.closest('[role="dialog"],[role="alertdialog"]')) return;
    if (alvo.closest('[data-product-focus-navigation]')) return;
    const regiao = alvo.closest('[data-product-scroll]');
    if (!regiao || !ficha.contains(regiao)) evento.preventDefault();
  };
  doc.addEventListener('wheel', impedirRolagemExterna, { passive: false });
  doc.addEventListener('touchmove', impedirRolagemExterna, { passive: false });
  const restaurarFoco = () => {
    if (encerrado) return;
    encerrado = true;
    if (focos.get(doc) === foco) focos.delete(doc);
    doc.removeEventListener('wheel', impedirRolagemExterna);
    doc.removeEventListener('touchmove', impedirRolagemExterna);
    for (const restauracao of restaurar.reverse()) restauracao();
    if (ficha.isConnected) ficha.querySelector<HTMLButtonElement>('button[aria-controls]')?.focus({ preventScroll: true });
  };
  const recolher = () => {
    if (!aoRecolher || aoRecolher() === false) return false;
    restaurarFoco();
    return true;
  };
  const foco:FocoProduto={ficha,recolher,restaurar:restaurarFoco};
  focos.set(doc, foco);
  return restaurarFoco;
}
