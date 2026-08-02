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
  versao.includes("AVANTAVENDAS_ASSET_REVISION = '12'"),
  'A revisão dos arquivos estáticos do AvantaVendas precisa invalidar o cache anterior.',
);

if (falhas.length) {
  throw new Error(`Agendamento do AvantaVendas inválido:\n- ${falhas.join('\n- ')}`);
}

console.log('Agendamento do AvantaVendas validado.');
