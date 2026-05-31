interface ModalPrivacidadeProps {
  aberto: boolean;
  onClose: () => void;
  darkMode: boolean;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  bordaSobreCorPrimaria: string;
  textMuted: string;
  estiloTemaPrimario: React.CSSProperties;
}

export default function ModalPrivacidade({
  aberto,
  onClose,
  darkMode,
  corPrimaria,
  textoSobreCorPrimaria,
  bordaSobreCorPrimaria,
  textMuted,
  estiloTemaPrimario,
}: ModalPrivacidadeProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
            borderColor: bordaSobreCorPrimaria,
          }}
        >
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide">
              Política de Privacidade
            </h2>
            <p className="text-xs opacity-80 mt-1">AvantaLab Gestão</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg hover:bg-black/20 transition-colors cursor-pointer"
            aria-label="Fechar política de privacidade"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed">
          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              1. Objetivo desta política
            </h3>
            <p className={textMuted}>
              Esta Política de Privacidade tem como objetivo explicar, de forma clara e transparente, como o AvantaLab Gestão pode coletar, utilizar, armazenar e proteger informações fornecidas pelos usuários durante o uso do sistema.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              2. Informações coletadas
            </h3>
            <p className={textMuted}>
              O sistema pode coletar informações necessárias para cadastro, autenticação e funcionamento da plataforma, como nome, email, empresa vinculada, preferências de configuração, além dos dados financeiros e administrativos inseridos voluntariamente pelo usuário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              3. Uso das informações
            </h3>
            <p className={textMuted}>
              As informações são utilizadas para permitir o acesso ao sistema, salvar configurações, organizar lançamentos, gerar relatórios, exibir indicadores, manter a segurança da conta e melhorar a experiência de uso da plataforma.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              4. Armazenamento dos dados
            </h3>
            <p className={textMuted}>
              Os dados do sistema são armazenados em ambiente digital seguro, utilizando serviços de banco de dados e autenticação. O acesso às informações é controlado conforme o vínculo do usuário com sua respectiva empresa.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              5. Cookies e tecnologias semelhantes
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão pode utilizar cookies, armazenamento local ou tecnologias semelhantes necessários ao funcionamento da plataforma, como autenticação, segurança, manutenção da sessão, preferências de uso e configurações do sistema. Caso sejam utilizados cookies não essenciais, como ferramentas de análise, marketing ou rastreamento, o usuário será informado e poderá gerenciar suas preferências quando aplicável.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              6. Compartilhamento de informações
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão não vende informações dos usuários. Os dados poderão ser compartilhados apenas quando necessário para o funcionamento técnico da plataforma, cumprimento de obrigações legais ou mediante solicitação ou autorização do próprio usuário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              7. Segurança
            </h3>
            <p className={textMuted}>
              São adotadas medidas técnicas e organizacionais para proteger as informações contra acessos não autorizados, perda, alteração, divulgação indevida ou uso inadequado. Ainda assim, nenhum sistema digital é totalmente imune a riscos.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              8. Responsabilidade do usuário
            </h3>
            <p className={textMuted}>
              O usuário é responsável por manter seus dados de acesso em segurança, utilizar senhas fortes, não compartilhar credenciais e conferir as informações inseridas no sistema.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              9. Direitos do usuário
            </h3>
            <p className={textMuted}>
              O usuário poderá solicitar informações sobre seus dados, correções, atualizações ou exclusão, quando aplicável, respeitadas as obrigações legais, fiscais, contratuais e operacionais relacionadas ao uso da plataforma.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              10. Alterações nesta política
            </h3>
            <p className={textMuted}>
              Esta Política de Privacidade poderá ser atualizada periodicamente para refletir melhorias no sistema, mudanças operacionais, requisitos legais ou novas funcionalidades.
            </p>
          </section>
        </div>

        <div
          className={`px-6 py-4 border-t flex justify-end ${
            darkMode ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-bold text-sm transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
            style={estiloTemaPrimario}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}