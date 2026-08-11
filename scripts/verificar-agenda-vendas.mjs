import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [aplicacao, estilos, versao] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

exigir(
  aplicacao.includes('function formatarDataCurtaAgendaVendas(data)')
    && aplicacao.includes("return `${dia}/${mes}/${ano.slice(-2)}`"),
  'O agendamento precisa apresentar a data no formato dd/mm/aa.',
);
exigir(
  aplicacao.includes('id="agendaDataVendas" type="date"')
    && aplicacao.includes('id="agendaDataVisualVendas"'),
  'O seletor nativo deve permanecer operável sob a apresentação curta.',
);
exigir(
  aplicacao.includes('onclick="ajustarDiaAgendaVendas(-1)"')
    && aplicacao.includes('onclick="ajustarDiaAgendaVendas(1)"')
    && aplicacao.includes('aria-label="Dia anterior"')
    && aplicacao.includes('aria-label="Próximo dia"'),
  'Os controles acessíveis de dia anterior e próximo dia são obrigatórios.',
);
exigir(
  estilos.includes('.agenda-form-fields > .agenda-date-row')
    && estilos.includes('grid-template-columns: minmax(0,1fr) auto')
    && estilos.includes('grid-template-columns: repeat(2,44px)'),
  'Campo e setas devem caber na mesma largura dos demais controles.',
);
exigir(
  aplicacao.includes('function agendamentosHojeVendas()')
    && aplicacao.includes('const itensHoje = itensAgendaDoDiaVendas(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())')
    && aplicacao.includes('new Map(itensHoje.map((item) => [String(item.id), item]))')
    && aplicacao.includes('function abrirAgendaHojeVendas()')
    && aplicacao.includes('state.agendaDiaSelecionado = hoje.getDate()')
    && aplicacao.includes('agendaHoje: agendamentosHojeVendas().map((item) => String(item.id)).sort()'),
  'O sininho deve contar todos os itens de hoje, inclusive aniversários, e abrir o dia atual.',
);
exigir(
  aplicacao.includes('class="agenda-header-button"')
    && aplicacao.includes('onclick="abrirAgendaHojeVendas()"')
    && aplicacao.includes("svgIconEstavel('bell')")
    && estilos.includes('.agenda-header-button'),
  'O cabeçalho precisa exibir o sininho acessível com o contador da agenda de hoje.',
);
exigir(
  versao.includes("AVANTAVENDAS_ASSET_REVISION = '46'"),
  'A revisão dos arquivos estáticos do AvantaVendas precisa invalidar o cache anterior.',
);

if (falhas.length) {
  throw new Error(`Agendamento do AvantaVendas inválido:\n- ${falhas.join('\n- ')}`);
}

console.log('Agendamento do AvantaVendas validado.');
