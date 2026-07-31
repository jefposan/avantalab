export type EmployeeStatus = 'Ativo' | 'Em férias' | 'Afastado' | 'Desligado' | 'Em experiência';

export type Employee = {
  id: string; name: string; email: string; phone: string; role: string;
  department: string; admission: string; contract: string; status: EmployeeStatus;
  manager: string; initials: string;
};

export const employees: Employee[] = [
  { id: 'ana-souza', name: 'Ana Souza', email: 'ana.souza@avantalab.com.br', phone: '(11) 98821-4401', role: 'Analista Financeira', department: 'Financeiro', admission: '12/01/2026', contract: 'CLT', status: 'Em experiência', manager: 'Marcos Lima', initials: 'AS' },
  { id: 'carlos-mendes', name: 'Carlos Mendes', email: 'carlos.mendes@avantalab.com.br', phone: '(11) 97734-2280', role: 'Supervisor de Produção', department: 'Produção', admission: '18/03/2022', contract: 'CLT', status: 'Ativo', manager: 'Helena Prado', initials: 'CM' },
  { id: 'maria-oliveira', name: 'Maria Oliveira', email: 'maria.oliveira@avantalab.com.br', phone: '(11) 99105-7732', role: 'Executiva Comercial', department: 'Comercial', admission: '03/08/2023', contract: 'CLT', status: 'Em férias', manager: 'Rafael Nunes', initials: 'MO' },
  { id: 'lucas-rocha', name: 'Lucas Rocha', email: 'lucas.rocha@avantalab.com.br', phone: '(11) 98412-0907', role: 'Designer', department: 'Marketing', admission: '21/06/2024', contract: 'PJ', status: 'Ativo', manager: 'Bianca Alves', initials: 'LR' },
  { id: 'juliana-costa', name: 'Juliana Costa', email: 'juliana.costa@avantalab.com.br', phone: '(11) 97641-8350', role: 'Assistente de RH', department: 'Recursos Humanos', admission: '05/02/2026', contract: 'CLT', status: 'Ativo', manager: 'Patrícia Reis', initials: 'JC' },
  { id: 'pedro-santos', name: 'Pedro Santos', email: 'pedro.santos@avantalab.com.br', phone: '(11) 99500-1842', role: 'Auxiliar Administrativo', department: 'Administrativo', admission: '14/11/2021', contract: 'CLT', status: 'Afastado', manager: 'Cláudia Ramos', initials: 'PS' },
];

export const stats = [
  ['Total de colaboradores', '42', 'Base atual'], ['Colaboradores ativos', '38', '90% da equipe'],
  ['Em férias', '2', 'Neste período'], ['Afastados', '2', 'Acompanhamento'],
  ['Admissões no mês', '3', 'Julho'], ['Aniversariantes', '4', 'Neste mês'],
  ['Documentos vencendo', '6', 'Próximos 30 dias'], ['Treinamentos pendentes', '9', 'Ação necessária'],
];

export const alerts = [
  ['urgente', 'Contrato de experiência de Ana termina em 7 dias.'],
  ['atenção', 'ASO de Carlos vence em 20 dias.'],
  ['atenção', 'Treinamento obrigatório pendente para 5 colaboradores.'],
  ['info', 'Maria iniciará férias no próximo mês.'],
  ['urgente', 'Existem 3 documentos sem assinatura.'],
];

export const departmentDistribution = [
  ['Administrativo', 7], ['Financeiro', 6], ['Comercial', 10], ['Produção', 11], ['Marketing', 5], ['Recursos Humanos', 3],
];

export const events = [
  ['15 JUL', 'Aniversário de Juliana Costa', 'Aniversário'], ['18 JUL', 'Início das férias de Maria Oliveira', 'Férias'],
  ['21 JUL', 'Fim do contrato de experiência de Ana', 'Contrato'], ['24 JUL', 'NR-10 — turma operacional', 'Treinamento'],
  ['29 JUL', 'Exame periódico — Produção', 'Saúde ocupacional'],
];

export const documents = [
  ['Contrato de trabalho', 'Ana Souza', 'Contratos', '12/01/2026', '21/07/2026', 'Próximo do vencimento'],
  ['ASO periódico', 'Carlos Mendes', 'Exames ocupacionais', '10/08/2025', '31/07/2026', 'Próximo do vencimento'],
  ['Termo de confidencialidade', 'Juliana Costa', 'Termos', '05/02/2026', '—', 'Sem assinatura'],
  ['Documento de identidade', 'Maria Oliveira', 'Documentos pessoais', '03/08/2023', '—', 'Válido'],
  ['Certificado NR-10', 'Pedro Santos', 'Certificados', '18/05/2024', '18/05/2026', 'Vencido'],
];

export const trainings = [
  ['Integração AvantaLab', 'Integração', '4h', 'Online', '16/07/2026', '12 meses', '8', '6', 'Ativo'],
  ['NR-10 Segurança', 'Obrigatório', '8h', 'Presencial', '24/07/2026', '24 meses', '12', '7', 'Ativo'],
  ['Liderança prática', 'Liderança', '6h', 'Híbrido', '05/08/2026', '—', '6', '0', 'Planejado'],
  ['Atendimento consultivo', 'Atendimento', '3h', 'Online', '12/06/2026', '12 meses', '10', '10', 'Concluído'],
];

export const departments = [
  ['Administrativo', 'Cláudia Ramos', '7', 'CC-100', 'Ativo'], ['Financeiro', 'Marcos Lima', '6', 'CC-110', 'Ativo'],
  ['Comercial', 'Rafael Nunes', '10', 'CC-200', 'Ativo'], ['Produção', 'Helena Prado', '11', 'CC-300', 'Ativo'],
  ['Marketing', 'Bianca Alves', '5', 'CC-210', 'Ativo'], ['Recursos Humanos', 'Patrícia Reis', '3', 'CC-120', 'Ativo'],
];

export const roles = [
  ['Analista Financeiro', 'Financeiro', '3', 'Análises e rotinas financeiras', 'Ativo'],
  ['Executivo Comercial', 'Comercial', '6', 'Relacionamento e vendas', 'Ativo'],
  ['Supervisor de Produção', 'Produção', '2', 'Gestão da operação', 'Ativo'],
  ['Assistente de RH', 'Recursos Humanos', '1', 'Apoio às rotinas de pessoas', 'Ativo'],
];
