export type AejEmpregador = {
  tipoDocumento: 'cpf' | 'cnpj';
  documento: string;
  razaoSocial: string;
  caepf?: string;
  cno?: string;
};

export type AejRep = { id: number; tipo: 1 | 2 | 3; numero: string };
export type AejVinculo = { id: number; cpf: string; nome: string; matriculaEsocial?: string };
export type AejHorario = {
  codigo: string;
  duracaoMinutos: number;
  pares: Array<{ entrada: string; saida: string }>;
};
export type AejMarcacao = {
  vinculoId: number;
  dataHora: string;
  repId?: number;
  tipo: 'E' | 'S' | 'D';
  sequencia: number;
  fonte: 'O' | 'I' | 'P' | 'X' | 'T';
  codigoHorario?: string;
  motivo?: string;
};
export type AejMovimento = {
  vinculoId: number;
  tipo: 1 | 2 | 3 | 4;
  data: string;
  minutos?: number;
  movimentoBanco?: 1 | 2;
};
export type AejPtrp = {
  nome: string;
  versao: string;
  tipoDocumentoDesenvolvedor: 'cpf' | 'cnpj';
  documentoDesenvolvedor: string;
  nomeDesenvolvedor: string;
  emailDesenvolvedor: string;
};

export type DadosAej = {
  empregador: AejEmpregador;
  inicio: string;
  fim: string;
  geradoEm: string;
  reps: AejRep[];
  vinculos: AejVinculo[];
  horarios: AejHorario[];
  marcacoes: AejMarcacao[];
  movimentos: AejMovimento[];
  ptrp: AejPtrp;
};

function somenteDigitos(valor: string) { return valor.replace(/\D/g, ''); }
function texto(valor: string, maximo: number) {
  return Array.from(valor.normalize('NFC'))
    .map((caractere) => caractere.charCodeAt(0) <= 255 && caractere !== '|' && caractere !== '\r' && caractere !== '\n' ? caractere : ' ')
    .join('').trim().slice(0, maximo);
}
function horario(valor: string) {
  const limpo = valor.replace(':', '').slice(0, 4);
  if (!/^([01]\d|2[0-3])[0-5]\d$/.test(limpo)) throw new Error(`Horário inválido no AEJ: ${valor}.`);
  return limpo;
}
function dataValida(valor: string) { return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)); }
function numeroNatural(valor: number, nome: string, maximo = 999_999_999) {
  if (!Number.isInteger(valor) || valor < 1 || valor > maximo) throw new Error(`${nome} inválido no AEJ.`);
  return String(valor);
}

export function dataHoraAej(valor: string | Date) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) throw new Error('Data e hora inválidas no AEJ.');
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
  }).formatToParts(data);
  const obter = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value || '00';
  const offset = obter('timeZoneName').replace('GMT', '').replace(':', '') || '-0300';
  return `${obter('year')}-${obter('month')}-${obter('day')}T${obter('hour')}:${obter('minute')}:00${offset}`;
}

/** Gera o leiaute AEJ v001 oficial em ISO-8859-1, com CRLF e assinatura destacada. */
export function gerarAej(dados: DadosAej) {
  if (!dataValida(dados.inicio) || !dataValida(dados.fim) || dados.inicio > dados.fim) throw new Error('Período inválido para o AEJ.');
  const documento = somenteDigitos(dados.empregador.documento);
  if (documento.length !== (dados.empregador.tipoDocumento === 'cnpj' ? 14 : 11)) throw new Error('CPF ou CNPJ do empregador inválido para o AEJ.');
  const documentoDesenvolvedor = somenteDigitos(dados.ptrp.documentoDesenvolvedor);
  if (![11, 14].includes(documentoDesenvolvedor.length)) throw new Error('CPF ou CNPJ do desenvolvedor inválido para o AEJ.');
  if (!dados.reps.length || !dados.vinculos.length) throw new Error('Informe ao menos um REP e um vínculo utilizado no AEJ.');
  if (!texto(dados.empregador.razaoSocial, 150) || !texto(dados.ptrp.nome, 150) || !texto(dados.ptrp.nomeDesenvolvedor, 150) || !texto(dados.ptrp.emailDesenvolvedor, 50)) throw new Error('Há identificação obrigatória vazia no AEJ.');

  const linhas: string[] = [];
  linhas.push(['01', dados.empregador.tipoDocumento === 'cnpj' ? '1' : '2', documento, somenteDigitos(dados.empregador.caepf || ''), somenteDigitos(dados.empregador.cno || ''), texto(dados.empregador.razaoSocial, 150), dados.inicio, dados.fim, dataHoraAej(dados.geradoEm), '001'].join('|'));
  for (const rep of dados.reps) { const numero = somenteDigitos(rep.numero); if (!numero || numero.length > 17) throw new Error('Número do REP inválido no AEJ.'); linhas.push(['02', numeroNatural(rep.id, 'Identificador do REP'), String(rep.tipo), numero].join('|')); }
  for (const vinculo of dados.vinculos) {
    const cpf = somenteDigitos(vinculo.cpf);
    if (cpf.length !== 11) throw new Error(`CPF inválido para o vínculo ${vinculo.nome}.`);
    linhas.push(['03', numeroNatural(vinculo.id, 'Identificador do vínculo'), cpf, texto(vinculo.nome, 150)].join('|'));
  }
  for (const item of dados.horarios) {
    if (!item.pares.length) throw new Error(`O horário ${item.codigo} não possui entradas e saídas.`);
    const pares = item.pares.flatMap((par) => [horario(par.entrada), horario(par.saida)]);
    linhas.push(['04', texto(item.codigo, 30), numeroNatural(item.duracaoMinutos, 'Duração da jornada', 999_999_999_999), ...pares].join('|'));
  }
  let anterior = '';
  for (const marcacao of dados.marcacoes) {
    const motivoObrigatorio = marcacao.tipo === 'D' || marcacao.fonte === 'I';
    if (motivoObrigatorio && !marcacao.motivo?.trim()) throw new Error('Marcações incluídas ou desconsideradas precisam de motivo no AEJ.');
    if (!Number.isInteger(marcacao.sequencia) || marcacao.sequencia < 1 || marcacao.sequencia > 999) throw new Error('Sequência de marcação inválida no AEJ.');
    const dataHora = dataHoraAej(marcacao.dataHora); if (anterior && dataHora < anterior) throw new Error('As marcações do AEJ devem estar em ordem cronológica.'); anterior = dataHora;
    linhas.push(['05', numeroNatural(marcacao.vinculoId, 'Identificador do vínculo'), dataHora, marcacao.repId ? numeroNatural(marcacao.repId, 'Identificador do REP') : '', marcacao.tipo, String(marcacao.sequencia).padStart(3, '0'), marcacao.fonte, texto(marcacao.codigoHorario || '', 30), texto(marcacao.motivo || '', 150)].join('|'));
  }
  for (const vinculo of dados.vinculos.filter((item) => item.matriculaEsocial?.trim())) linhas.push(['06', numeroNatural(vinculo.id, 'Identificador do vínculo'), texto(vinculo.matriculaEsocial || '', 30)].join('|'));
  for (const movimento of dados.movimentos) {
    if (!dataValida(movimento.data)) throw new Error('Data inválida em ausência ou banco de horas do AEJ.');
    if (movimento.tipo === 3 && (!movimento.minutos || !movimento.movimentoBanco)) throw new Error('Movimento de banco de horas incompleto no AEJ.');
    linhas.push(['07', numeroNatural(movimento.vinculoId, 'Identificador do vínculo'), String(movimento.tipo), movimento.data, movimento.minutos ? String(Math.abs(Math.trunc(movimento.minutos))) : '', movimento.movimentoBanco ? String(movimento.movimentoBanco) : ''].join('|'));
  }
  linhas.push(['08', texto(dados.ptrp.nome, 150), texto(dados.ptrp.versao, 8), documentoDesenvolvedor.length === 14 ? '1' : '2', documentoDesenvolvedor, texto(dados.ptrp.nomeDesenvolvedor, 150), texto(dados.ptrp.emailDesenvolvedor, 50)].join('|'));
  const quantidades = Array.from({ length: 8 }, (_, indice) => linhas.filter((linha) => linha.startsWith(`${String(indice + 1).padStart(2, '0')}|`)).length);
  linhas.push(['99', ...quantidades.map(String)].join('|'));
  linhas.push('ASSINATURA_DIGITAL_EM_ARQUIVO_P7S'.padEnd(100, ' '));
  return Buffer.from(`${linhas.join('\r\n')}\r\n`, 'latin1');
}
