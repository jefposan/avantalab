import { flushSync } from 'react-dom';

type ViewTransitionAvanta = {
  finished: Promise<void>;
};

type DocumentoComViewTransition = Document & {
  startViewTransition?: (atualizar: () => void) => ViewTransitionAvanta;
};

type AlvoTransicaoCard = 'despesas' | 'receitas';
type DirecaoTransicaoCard = 'expandir' | 'recolher';

export function executarTransicaoCard(
  atualizar: () => void,
  alvo: AlvoTransicaoCard,
  direcao: DirecaoTransicaoCard
) {
  if (
    typeof document === 'undefined'
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    atualizar();
    return;
  }

  const documento = document as DocumentoComViewTransition;
  if (!documento.startViewTransition) {
    atualizar();
    return;
  }

  let atualizacaoExecutada = false;
  const classeAlvo = `av-card-transicao-${alvo}`;
  const classeDirecao = `av-card-transicao-${direcao}`;
  const limparClasses = () => {
    document.documentElement.classList.remove(
      'av-card-view-transition',
      classeAlvo,
      classeDirecao
    );
  };
  document.documentElement.classList.add(
    'av-card-view-transition',
    classeAlvo,
    classeDirecao
  );
  // Garante que o card já esteja nomeado antes da captura do primeiro quadro.
  // Sem esta leitura, o navegador pode agrupar a classe e a troca de estado no
  // mesmo ciclo de renderização e pular a interpolação entre os dois tamanhos.
  void document.documentElement.offsetWidth;

  try {
    const transicao = documento.startViewTransition(() => {
      atualizacaoExecutada = true;
      flushSync(atualizar);
    });
    void transicao.finished.finally(() => {
      limparClasses();
    });
  } catch {
    limparClasses();
    if (!atualizacaoExecutada) atualizar();
  }
}
