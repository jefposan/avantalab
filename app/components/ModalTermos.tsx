import DraggableModalCard from './DraggableModalCard';

interface ModalTermosProps {
  aberto: boolean;
  onClose: () => void;
  darkMode: boolean;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  bordaSobreCorPrimaria: string;
  textMuted: string;
  estiloTemaPrimario: React.CSSProperties;
}

export default function ModalTermos({
  aberto,
  onClose,
  darkMode,
  corPrimaria,
  textoSobreCorPrimaria,
  bordaSobreCorPrimaria,
  textMuted,
  estiloTemaPrimario,
}: ModalTermosProps) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <DraggableModalCard
        className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
            borderColor: bordaSobreCorPrimaria,
          }}
        >
          <div className="min-w-0">
            <h2 className="break-words text-base font-black uppercase tracking-wide sm:text-lg">
              Termos de Uso
            </h2>
            <p className="text-xs opacity-80 mt-1">AvantaLab Gestão</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg hover:bg-black/20 transition-colors cursor-pointer"
            aria-label="Fechar termos de uso"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4 text-sm leading-relaxed sm:p-6">
          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              1. Aceitação e versão vigente
            </h3>
            <p className={textMuted}>
              Ao criar conta, acessar ou utilizar o AvantaLab Gestão, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso e com a Política de Privacidade vigente. O aceite poderá ser registrado com data, hora, versão do documento e dados técnicos necessários para comprovação.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              2. Finalidade da plataforma
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão é uma ferramenta de apoio à organização, controle e análise de informações financeiras, administrativas e operacionais, incluindo lançamentos, receitas, despesas, relatórios, indicadores, agenda, notificações, backup, restauração, controle de ponto quando contratado ou habilitado, e recursos de apoio por automação ou inteligência artificial.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              3. Cadastro, conta e credenciais
            </h3>
            <p className={textMuted}>
              O usuário deve fornecer informações verdadeiras, atuais e completas no cadastro e manter a confidencialidade de suas credenciais. Cada acesso realizado com login e senha válidos poderá ser considerado como realizado pelo respectivo titular da conta, salvo prova de falha exclusiva da plataforma.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              4. Responsabilidade pelas informações inseridas
            </h3>
            <p className={textMuted}>
              O usuário e a empresa ou perfil financeiro vinculado são responsáveis pela veracidade, atualização, licitude, autorização de uso e conferência dos dados inseridos no sistema, incluindo dados financeiros, administrativos, de clientes, colaboradores, fornecedores, agenda, controle de ponto e demais registros. Relatórios, indicadores e análises dependem diretamente da qualidade dos dados cadastrados pelo próprio usuário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              5. Proteção de dados e LGPD
            </h3>
            <p className={textMuted}>
              O tratamento de dados pessoais observará a Lei Geral de Proteção de Dados Pessoais (LGPD) e demais normas aplicáveis. Para dados de conta, autenticação, cobrança, suporte, segurança e relacionamento, o AvantaLab poderá atuar como controlador. Para dados operacionais inseridos pelo usuário em nome de sua empresa ou perfil financeiro, o AvantaLab atuará, em regra, como operador, tratando os dados conforme as instruções do usuário ou da empresa responsável, salvo hipóteses legais ou tratamentos próprios descritos na Política de Privacidade.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              6. Uso adequado e condutas proibidas
            </h3>
            <p className={textMuted}>
              O usuário compromete-se a utilizar a plataforma de forma lícita, ética e adequada, não realizando ações que comprometam segurança, estabilidade, funcionamento, integridade, disponibilidade ou confidencialidade do sistema. É vedado inserir dados que o usuário não tenha autorização legal para tratar, tentar acessar dados de terceiros sem permissão, burlar controles de acesso, explorar falhas, praticar engenharia reversa indevida, sobrecarregar a infraestrutura ou utilizar o sistema para finalidade ilícita.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              7. Disponibilidade, integrações e serviços de terceiros
            </h3>
            <p className={textMuted}>
              Embora sejam adotados esforços para manter o sistema disponível e funcional, podem ocorrer interrupções por manutenção, atualizações, falhas técnicas, instabilidades de internet, provedores de nuvem, banco de dados, autenticação, pagamento, notificações, SMS, email, serviços de inteligência artificial ou outros serviços de terceiros necessários à operação.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              8. Backup, restauração e guarda dos dados
            </h3>
            <p className={textMuted}>
              A plataforma pode oferecer recursos de backup e restauração para apoio ao usuário, mas a conferência do arquivo gerado, a guarda de cópias próprias e a escolha correta do modo de restauração são de responsabilidade do usuário. A exclusão, substituição ou importação de dados poderá alterar registros existentes, conforme confirmação apresentada na interface.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              9. Planos, cobrança e acesso
            </h3>
            <p className={textMuted}>
              O acesso a determinados recursos poderá depender de plano, cortesia, cupom, período de teste ou pagamento vigente. A falta de pagamento, encerramento de cortesia, violação destes Termos ou uso indevido poderá resultar em limitação, suspensão ou bloqueio do acesso, preservadas as regras de guarda, exportação e retenção descritas na Política de Privacidade e nas telas do sistema.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              10. Segurança da conta
            </h3>
            <p className={textMuted}>
              O usuário deve proteger seus dispositivos, senhas, códigos de acesso e sessões autenticadas. O AvantaLab poderá adotar medidas de segurança, validação, bloqueio preventivo, logs técnicos e controles de acesso para reduzir riscos de fraude, acesso indevido, perda ou alteração não autorizada de dados.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              11. Limitação de responsabilidade
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão é uma ferramenta de apoio gerencial e não substitui contabilidade, auditoria, consultoria financeira, jurídica, trabalhista, fiscal ou previdenciária. Decisões tomadas com base nas informações exibidas são de responsabilidade do usuário. A plataforma não se responsabiliza por dados incorretos inseridos pelo usuário, decisões de negócio, perdas indiretas, lucros cessantes, falhas de terceiros, indisponibilidades inevitáveis ou uso indevido da conta.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              12. Propriedade intelectual
            </h3>
            <p className={textMuted}>
              O sistema, telas, layout, marca, textos, fluxos, componentes, códigos, identidade visual e demais elementos da plataforma pertencem ao AvantaLab ou a seus licenciantes. O uso da plataforma não transfere ao usuário qualquer direito de propriedade intelectual, sendo permitido apenas o uso regular conforme estes Termos.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              13. Encerramento, exclusão e retenção
            </h3>
            <p className={textMuted}>
              O usuário poderá solicitar encerramento de conta, exclusão de perfil ou eliminação de dados, quando aplicável. Algumas informações poderão ser mantidas pelo período necessário ao cumprimento de obrigações legais, regulatórias, contratuais, fiscais, auditoria, prevenção a fraudes, segurança, exercício regular de direitos ou preservação em backups técnicos por prazo limitado.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              14. Alterações dos termos
            </h3>
            <p className={textMuted}>
              Estes Termos de Uso poderão ser atualizados para refletir melhorias, mudanças operacionais, comerciais, legais, regulatórias ou funcionais. Mudanças relevantes poderão exigir novo aceite. O uso contínuo da plataforma após a atualização caracteriza ciência da versão vigente, respeitados os casos em que novo consentimento seja legalmente necessário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              15. Legislação aplicável e contato
            </h3>
            <p className={textMuted}>
              Estes Termos são regidos pela legislação brasileira. Dúvidas, solicitações ou comunicações relacionadas ao uso da plataforma, privacidade ou proteção de dados devem ser encaminhadas pelos canais oficiais de suporte ou contato disponibilizados pelo AvantaLab.
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
      </DraggableModalCard>
    </div>
  );
}
