import DraggableModalCard from './DraggableModalCard';

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

        <div className="space-y-5 overflow-y-auto p-4 text-sm leading-relaxed sm:p-6">
          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              1. Objetivo desta política
            </h3>
            <p className={textMuted}>
              Esta Política de Privacidade explica, de forma clara e transparente, como o AvantaLab Gestão coleta, utiliza, armazena, compartilha, protege e elimina dados pessoais e informações fornecidas pelos usuários durante o uso da plataforma, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD).
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              2. Agentes de tratamento
            </h3>
            <p className={textMuted}>
              Para dados de conta, autenticação, cobrança, suporte, segurança, comunicação e relacionamento, o AvantaLab poderá atuar como controlador. Para dados financeiros, administrativos, operacionais e de colaboradores inseridos pelo usuário em nome de empresa ou perfil financeiro, o AvantaLab atuará, em regra, como operador, tratando os dados conforme instruções do usuário ou da empresa responsável. Provedores de infraestrutura, banco de dados, hospedagem, autenticação, pagamento, mensagens, notificações e recursos de IA poderão atuar como suboperadores ou operadores necessários à prestação do serviço.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              3. Informações coletadas
            </h3>
            <p className={textMuted}>
              Poderemos tratar dados de cadastro e autenticação, como nome, email, telefone, senha criptografada ou credenciais de autenticação, versão e data do aceite dos termos, perfil financeiro vinculado, empresa, preferências de configuração e identificadores técnicos. Também poderemos tratar dados inseridos voluntariamente no sistema, como receitas, despesas, valores, descrições, categorias, agenda, relatórios, documentos de backup, usuários vinculados, dados de cobrança e, quando usado o módulo de ponto, informações como nome, CPF, cargo, horários, registros de ponto e localização configurada.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              4. Finalidades de uso
            </h3>
            <p className={textMuted}>
              Os dados são utilizados para criar e proteger contas, autenticar usuários, permitir o uso da plataforma, salvar configurações, organizar lançamentos, gerar relatórios e indicadores, executar backups e restaurações, viabilizar recursos contratados, enviar avisos e notificações, prestar suporte, processar cobranças, cumprir obrigações legais, prevenir fraudes, investigar incidentes, melhorar a experiência e manter a segurança e estabilidade do sistema.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              5. Bases legais
            </h3>
            <p className={textMuted}>
              O tratamento de dados poderá se apoiar, conforme o caso, na execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse, prevenção a fraudes e segurança, proteção do crédito, consentimento do titular quando exigido e demais hipóteses permitidas pela LGPD.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              6. Dados financeiros, administrativos e de terceiros
            </h3>
            <p className={textMuted}>
              Os dados financeiros, administrativos, de colaboradores, clientes, fornecedores ou terceiros são inseridos pelo usuário sob sua responsabilidade. Ao inserir dados de outras pessoas, o usuário declara possuir base legal, autorização ou legitimidade para esse tratamento e compromete-se a prestar as informações necessárias aos respectivos titulares quando aplicável. A plataforma não deve ser utilizada para inserir dados sensíveis desnecessários, como informações de saúde, religião, opinião política, biometria ou outros dados não relacionados à finalidade contratada.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              7. Compartilhamento e suboperadores
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão não vende dados pessoais. Os dados poderão ser compartilhados apenas quando necessário para operar a plataforma, hospedar dados, autenticar usuários, processar pagamentos, enviar comunicações, notificações, SMS ou emails, prestar suporte, acionar recursos de IA quando solicitados, cumprir obrigações legais, proteger direitos ou atender solicitação do próprio usuário. Sempre que possível, são utilizados fornecedores com controles de segurança, contratos e práticas compatíveis com a proteção de dados.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              8. Armazenamento e transferência internacional
            </h3>
            <p className={textMuted}>
              Os dados são armazenados em ambiente digital com serviços de banco de dados, autenticação, hospedagem e infraestrutura em nuvem. Alguns fornecedores podem manter infraestrutura no Brasil ou no exterior, o que pode envolver transferência internacional de dados, sempre vinculada à prestação do serviço, segurança, disponibilidade, backup, suporte ou obrigações legais.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              9. Retenção, exclusão e backups
            </h3>
            <p className={textMuted}>
              Os dados serão mantidos enquanto a conta, perfil, contrato, cortesia, cupom ou relação operacional estiver ativo e pelo tempo necessário para cumprir finalidades legítimas, obrigações legais, fiscais, contábeis, regulatórias, auditoria, prevenção a fraudes, segurança, suporte, cobrança, exercício regular de direitos ou preservação de registros técnicos. Após solicitação válida de exclusão, os dados poderão ser removidos da base ativa, ressalvadas retenções obrigatórias e cópias residuais em backups técnicos até sua rotação ou eliminação segura.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              10. Segurança da informação
            </h3>
            <p className={textMuted}>
              São adotadas medidas técnicas e organizacionais proporcionais para proteger informações contra acessos não autorizados, perda, alteração, divulgação indevida, destruição, uso inadequado ou incidentes. Essas medidas podem incluir controle de acesso, autenticação, políticas de permissão, registros técnicos, backups, criptografia de tráfego, segregação por perfil e práticas de desenvolvimento seguro. Ainda assim, nenhum sistema digital é totalmente imune a riscos.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              11. Cookies e tecnologias semelhantes
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão pode utilizar cookies, armazenamento local e tecnologias semelhantes necessários ao funcionamento da plataforma, autenticação, segurança, manutenção de sessão, preferências de uso, modo escuro, configurações e experiência do usuário. Caso sejam utilizados cookies não essenciais, como ferramentas de análise, marketing ou rastreamento, o usuário será informado e poderá gerenciar suas preferências quando aplicável.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              12. Inteligência artificial, notificações e suporte
            </h3>
            <p className={textMuted}>
              Quando o usuário acionar recursos como assistente de IA, análises automáticas, notificações ou suporte, dados necessários ao contexto da solicitação poderão ser processados para gerar resposta, orientação, aviso ou atendimento. O usuário deve evitar enviar dados pessoais excessivos, sensíveis ou de terceiros quando não forem necessários à finalidade pretendida.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              13. Direitos dos titulares
            </h3>
            <p className={textMuted}>
              O titular poderá solicitar, conforme a LGPD, confirmação de tratamento, acesso, correção, atualização, portabilidade, anonimização, bloqueio, eliminação, informação sobre compartilhamento, revogação de consentimento e oposição a tratamento irregular, respeitadas obrigações legais, contratuais, fiscais, segurança, prevenção a fraudes, sigilo comercial e demais hipóteses que autorizem retenção ou restrição de atendimento.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              14. Incidentes de segurança
            </h3>
            <p className={textMuted}>
              Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, o AvantaLab adotará medidas de apuração, contenção e comunicação cabíveis, incluindo comunicação aos titulares afetados e à Autoridade Nacional de Proteção de Dados (ANPD), quando exigido pela legislação ou regulamentação aplicável.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              15. Responsabilidade do usuário
            </h3>
            <p className={textMuted}>
              O usuário é responsável por manter seus dados de acesso em segurança, utilizar senhas fortes, proteger seus dispositivos, não compartilhar credenciais, revisar permissões de usuários vinculados, conferir informações inseridas e garantir que possui autorização para tratar dados pessoais de terceiros dentro da plataforma.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              16. Alterações e contato
            </h3>
            <p className={textMuted}>
              Esta Política poderá ser atualizada para refletir melhorias, novas funcionalidades, mudanças operacionais, comerciais, legais ou regulatórias. Mudanças relevantes poderão exigir novo aceite. Solicitações sobre privacidade, proteção de dados ou exercício de direitos devem ser encaminhadas pelos canais oficiais de suporte ou contato disponibilizados pelo AvantaLab.
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
