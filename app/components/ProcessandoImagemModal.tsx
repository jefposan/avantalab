import ProcessandoModal from './ProcessandoModal';

type ProcessandoImagemModalProps = {
  aberto: boolean;
  darkMode: boolean;
  titulo?: string;
};

export default function ProcessandoImagemModal({ aberto, darkMode, titulo = 'Processando imagem' }: ProcessandoImagemModalProps) {
  return (
    <ProcessandoModal
      aberto={aberto}
      darkMode={darkMode}
      titulo={titulo}
      mensagem="Aguarde um instante."
    />
  );
}
