'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { ComprovanteRecebimento } from '../data/repo';
import type { Colaborador, Empresa, Servico, Subempresa } from './types';
import { formatarDataHora, limitesDoMes } from './helpers';
import BotaoComprovante from './BotaoComprovante';
import SeletorDataAgendamento from './SeletorDataAgendamento';

type Props = {
  aberto: boolean;
  referenciaInicial: { ano: number; mes: number };
  servicos: Servico[];
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  nomePerfil: string;
  onFechar: () => void;
  onObterAssinatura: (id: string) => Promise<ComprovanteRecebimento>;
  darkMode?: boolean;
};

type LinhaRelatorio = {
  servico: Servico;
  empresa: string;
  local: string;
  colaborador: string;
  dataLocal: string;
  comprovante: string;
};

type ImagemAssinatura = {
  bytes: ArrayBuffer;
  extensao: 'png' | 'jpeg';
};

const rotuloTipo = (tipo: Servico['tipoServico']) => ({ rotina: 'Externa', interna: 'Interna', revisao: 'Revisão', extra: 'Extra' })[tipo];

function dataLocalDoRegistro(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

export default function RelatorioServicosModal({ aberto, referenciaInicial, servicos, empresas, subempresas, colaboradores, nomePerfil, onFechar, onObterAssinatura, darkMode = false }: Props) {
  const limitesIniciais = limitesDoMes(`${referenciaInicial.ano}-${String(referenciaInicial.mes + 1).padStart(2, '0')}`);
  const [dataInicio, setDataInicio] = useState(limitesIniciais.inicio);
  const [dataFim, setDataFim] = useState(limitesIniciais.fim);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [seletorClientesAberto, setSeletorClientesAberto] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [erro, setErro] = useState('');
  const [relatorioConsultado, setRelatorioConsultado] = useState(false);
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);
  const botaoFechar = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const limites = limitesDoMes(`${referenciaInicial.ano}-${String(referenciaInicial.mes + 1).padStart(2, '0')}`);
    setDataInicio(limites.inicio);
    setDataFim(limites.fim);
    setClienteSelecionado('');
    setSeletorClientesAberto(false);
    setBuscaCliente('');
    setErro('');
    setRelatorioConsultado(false);
  }, [aberto, referenciaInicial.ano, referenciaInicial.mes]);

  useEffect(() => {
    if (!aberto) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botaoFechar.current?.focus();
    const fecharComEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [aberto, onFechar]);

  const clientesPorEmpresa = useMemo(() => new Map(empresas.map((empresa) => [empresa.id, subempresas.filter((subempresa) => subempresa.empresaId === empresa.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))])), [empresas, subempresas]);
  const empresasVisiveis = useMemo(() => {
    const termo = buscaCliente.trim().toLocaleLowerCase('pt-BR');
    return [...empresas]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
      .map((empresa) => {
        const locais = clientesPorEmpresa.get(empresa.id) ?? [];
        const empresaCombina = !termo || empresa.nome.toLocaleLowerCase('pt-BR').includes(termo);
        const locaisVisiveis = empresaCombina ? locais : locais.filter((local) => local.nome.toLocaleLowerCase('pt-BR').includes(termo));
        return { empresa, locais: locaisVisiveis, exibir: empresaCombina || locaisVisiveis.length > 0 };
      })
      .filter((item) => item.exibir);
  }, [buscaCliente, clientesPorEmpresa, empresas]);
  const nomeClienteSelecionado = useMemo(() => {
    if (!clienteSelecionado) return 'Todos os locais';
    const [tipo, id] = clienteSelecionado.split(':');
    if (tipo === 'grupo') return empresas.find((empresa) => empresa.id === id)?.nome ?? 'Cliente selecionado';
    if (tipo === 'direto') return empresas.find((empresa) => empresa.id === id)?.nome ?? 'Cliente selecionado';
    const subempresa = subempresas.find((item) => item.id === id);
    const empresa = subempresa ? empresas.find((item) => item.id === subempresa.empresaId) : null;
    return subempresa ? `${empresa?.nome ?? '—'} / ${subempresa.nome}` : 'Cliente selecionado';
  }, [clienteSelecionado, empresas, subempresas]);
  const linhas = useMemo<LinhaRelatorio[]>(() => servicos
    .filter((servico) => {
      const data = dataLocalDoRegistro(servico.realizadoEm);
      const [tipoCliente, clienteId] = clienteSelecionado.split(':');
      const correspondeCliente = !clienteSelecionado
        || (tipoCliente === 'grupo' && servico.empresaId === clienteId)
        || (tipoCliente === 'direto' && servico.empresaId === clienteId && !servico.subempresaId)
        || (tipoCliente === 'local' && servico.subempresaId === clienteId);
      return servico.situacao === 'realizado' && correspondeCliente && Boolean(data) && data >= dataInicio && data <= dataFim;
    })
    .sort((a, b) => (b.realizadoEm ?? '').localeCompare(a.realizadoEm ?? ''))
    .map((servico) => {
      const empresa = empresas.find((item) => item.id === servico.empresaId)?.nome ?? '—';
      const local = servico.subempresaId ? subempresas.find((item) => item.id === servico.subempresaId)?.nome ?? '—' : empresa;
      const colaborador = servico.colaboradorId ? colaboradores.find((item) => item.id === servico.colaboradorId)?.nome ?? '—' : 'Gestão';
      const comprovante = servico.assinaturaArquivoPath || servico.assinatura
        ? 'Disponível no AvantaLab'
        : servico.clienteNome ? 'Não disponível' : 'Dispensada pela gestão';
      return { servico, empresa, local, colaborador, dataLocal: dataLocalDoRegistro(servico.realizadoEm), comprovante };
    }), [clienteSelecionado, colaboradores, dataFim, dataInicio, empresas, servicos, subempresas]);

  const periodoValido = Boolean(dataInicio && dataFim && dataInicio <= dataFim);
  const periodoLegivel = `${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`;
  function validarPeriodo() {
    if (!periodoValido) {
      setErro('Informe um período válido: a data inicial deve ser igual ou anterior à data final.');
      return false;
    }
    setErro('');
    return true;
  }

  function selecionarCliente(valor: string) {
    setClienteSelecionado((atual) => atual === valor ? '' : valor);
    setSeletorClientesAberto(false);
    setErro('');
    setRelatorioConsultado(false);
  }

  function consultarRelatorio() {
    if (!validarPeriodo()) return;
    setRelatorioConsultado(true);
  }

  async function obterImagemAssinatura(servico: Servico): Promise<ImagemAssinatura | null> {
    if (!servico.assinaturaArquivoPath && !servico.assinatura) return null;
    const comprovante = await onObterAssinatura(servico.id);
    const resposta = await fetch(comprovante.url, { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Não foi possível carregar uma assinatura para a exportação.');
    const tipo = (comprovante.mimeType || resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipo.includes('png') && !tipo.includes('jpeg') && !tipo.includes('jpg')) return null;
    return { bytes: await resposta.arrayBuffer(), extensao: tipo.includes('png') ? 'png' : 'jpeg' };
  }

  function converterEmBase64(bytes: ArrayBuffer) {
    const dados = new Uint8Array(bytes);
    let texto = '';
    for (let indice = 0; indice < dados.length; indice += 0x8000) texto += String.fromCharCode(...dados.subarray(indice, indice + 0x8000));
    return window.btoa(texto);
  }

  async function exportarExcel() {
    if (!relatorioConsultado) {
      setErro('Clique em “Consultar relatório” antes de exportar.');
      return;
    }
    if (!validarPeriodo()) return;
    setExportando('excel');
    try {
      const ExcelJS = (await import('exceljs/dist/exceljs.min.js')) as unknown as typeof import('exceljs');
      const livro = new ExcelJS.Workbook();
      const planilha = livro.addWorksheet('Serviços executados', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
      planilha.columns = [
        { header: 'Empresa', key: 'empresa', width: 28 }, { header: 'Local / vínculo', key: 'local', width: 28 }, { header: 'Data e hora', key: 'data', width: 19 },
        { header: 'Colaborador', key: 'colaborador', width: 24 }, { header: 'Assinado por', key: 'assinante', width: 24 }, { header: 'Avaliação', key: 'avaliacao', width: 13 },
        { header: 'Observação', key: 'observacao', width: 42 }, { header: 'Tipo de serviço', key: 'tipo', width: 18 }, { header: 'Comprovante', key: 'comprovante', width: 25 }, { header: 'Assinatura', key: 'assinatura', width: 18 },
      ];
      const cabecalho = planilha.getRow(1);
      cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cabecalho.alignment = { vertical: 'middle', horizontal: 'center' };
      cabecalho.height = 24;
      planilha.autoFilter = `A1:J${Math.max(2, linhas.length + 1)}`;

      for (const { servico, empresa, local, colaborador, comprovante } of linhas) {
        const linha = planilha.addRow({
          empresa,
          local,
          data: formatarDataHora(servico.realizadoEm),
          colaborador,
          assinante: servico.clienteNome || '—',
          avaliacao: servico.avaliacao === 'bom' ? 'Bom' : servico.avaliacao === 'regular' ? 'Regular' : 'Não registrada',
          observacao: servico.observacaoCliente || '—',
          tipo: rotuloTipo(servico.tipoServico),
          comprovante,
          assinatura: servico.assinaturaArquivoPath || servico.assinatura ? 'Imagem incluída' : '—',
        });
        linha.height = 48;
        linha.alignment = { vertical: 'middle', wrapText: true };
        try {
          const imagem = await obterImagemAssinatura(servico);
          if (imagem) {
            const imagemId = livro.addImage({ base64: `data:image/${imagem.extensao};base64,${converterEmBase64(imagem.bytes)}`, extension: imagem.extensao });
            planilha.addImage(imagemId, { tl: { col: 9, row: linha.number - 1 }, ext: { width: 96, height: 42 } });
          }
        } catch {
          linha.getCell('assinatura').value = 'Indisponível';
        }
      }
      planilha.eachRow((linha, numero) => {
        if (numero === 1) return;
        linha.eachCell((celula) => { celula.border = { bottom: { style: 'thin', color: { argb: 'FFDCE5E3' } } }; });
      });
      const arquivo = await livro.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([arquivo as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `avantalab-servicos-executados-${dataInicio}-a-${dataFim}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar a planilha.');
    } finally {
      setExportando(null);
    }
  }

  async function gerarPdf() {
    if (!relatorioConsultado) {
      setErro('Clique em “Consultar relatório” antes de exportar.');
      return;
    }
    if (!validarPeriodo()) return;
    setExportando('pdf');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      const fonte = await pdf.embedFont(StandardFonts.Helvetica);
      const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
      const largura = 841.89;
      const altura = 595.28;
      const margem = 34;
      const corPrimaria = rgb(15 / 255, 118 / 255, 110 / 255);
      const corTexto = rgb(23 / 255, 32 / 255, 51 / 255);
      const corAuxiliar = rgb(82 / 255, 100 / 255, 119 / 255);
      const corBorda = rgb(203 / 255, 213 / 255, 225 / 255);
      const corCabecalho = rgb(241 / 255, 245 / 255, 249 / 255);

      const reduzir = (valor: string, tamanho: number, limite: number) => {
        const texto = String(valor || '—').replace(/\s+/g, ' ').trim();
        if (fonte.widthOfTextAtSize(texto, tamanho) <= limite) return texto;
        let fim = texto.length;
        while (fim > 1 && fonte.widthOfTextAtSize(`${texto.slice(0, fim)}…`, tamanho) > limite) fim -= 1;
        return `${texto.slice(0, fim).trimEnd()}…`;
      };
      const colunas = [
        { titulo: 'EMPRESA / LOCAL', largura: 170 }, { titulo: 'EXECUTADO EM', largura: 92 }, { titulo: 'REGISTRADO POR', largura: 100 },
        { titulo: 'ASSINADO POR', largura: 100 }, { titulo: 'AVALIAÇÃO', largura: 70 }, { titulo: 'TIPO', largura: 62 }, { titulo: 'ASSINATURA', largura: 145 },
      ];
      const assinaturasPorServico = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
      const resultadosAssinatura = await Promise.all(linhas.map(async (linha) => {
        try {
          const imagem = await obterImagemAssinatura(linha.servico);
          if (!imagem) return null;
          return [linha.servico.id, imagem.extensao === 'png' ? await pdf.embedPng(imagem.bytes) : await pdf.embedJpg(imagem.bytes)] as const;
        } catch {
          return null;
        }
      }));
      resultadosAssinatura.forEach((resultado) => { if (resultado) assinaturasPorServico.set(resultado[0], resultado[1]); });
      let pagina = pdf.addPage([largura, altura]);
      let y = 0;

      const desenharCabecalho = () => {
        pagina.drawRectangle({ x: 0, y: altura - 84, width: largura, height: 84, color: corPrimaria });
        pagina.drawText(reduzir(nomePerfil, 17, largura - margem * 2), { x: margem, y: altura - 37, size: 17, font: fonteNegrito, color: rgb(1, 1, 1) });
        pagina.drawText('RELATÓRIO DE SERVIÇOS EXECUTADOS', { x: margem, y: altura - 57, size: 9, font: fonteNegrito, color: rgb(226 / 255, 232 / 255, 240 / 255) });
        pagina.drawText(`Período: ${periodoLegivel}  •  ${linhas.length} serviço(s)`, { x: margem, y: altura - 106, size: 9, font: fonte, color: corAuxiliar });
        pagina.drawText(`Cliente/local: ${reduzir(nomeClienteSelecionado, 9, 420)}`, { x: margem, y: altura - 121, size: 9, font: fonte, color: corAuxiliar });
        return altura - 145;
      };
      const desenharTitulos = (posicaoY: number) => {
        pagina.drawRectangle({ x: margem, y: posicaoY - 20, width: largura - margem * 2, height: 20, color: corCabecalho });
        let x = margem + 7;
        colunas.forEach((coluna) => {
          pagina.drawText(coluna.titulo, { x, y: posicaoY - 13, size: 6.8, font: fonteNegrito, color: corAuxiliar });
          x += coluna.largura;
        });
        return posicaoY - 20;
      };
      const novaPagina = () => {
        pagina = pdf.addPage([largura, altura]);
        y = desenharTitulos(desenharCabecalho());
      };
      y = desenharTitulos(desenharCabecalho());

      if (linhas.length === 0) {
        pagina.drawText('Nenhum serviço executado no período selecionado.', { x: margem, y: y - 26, size: 10, font: fonte, color: corTexto });
      }
      const alturaLinha = 64;
      linhas.forEach(({ servico, empresa, local, colaborador, comprovante }, indice) => {
        if (y < 72 + alturaLinha) novaPagina();
        const valores = [
          `${empresa} / ${local}`, formatarDataHora(servico.realizadoEm), colaborador, servico.clienteNome || '—',
          servico.avaliacao === 'bom' ? 'Bom' : servico.avaliacao === 'regular' ? 'Regular' : 'Não registrada',
          rotuloTipo(servico.tipoServico), comprovante,
        ];
        const assinatura = assinaturasPorServico.get(servico.id);
        if (indice % 2 === 1) pagina.drawRectangle({ x: margem, y: y - alturaLinha, width: largura - margem * 2, height: alturaLinha, color: rgb(248 / 255, 250 / 255, 252 / 255) });
        let x = margem + 7;
        valores.forEach((valor, posicao) => {
          if (posicao === colunas.length - 1 && assinatura) {
            const escala = Math.min(116 / assinatura.width, 40 / assinatura.height);
            const dimensoes = assinatura.scale(escala);
            const posicaoX = x + (colunas[posicao].largura - dimensoes.width) / 2 - 7;
            const posicaoY = y - (alturaLinha + dimensoes.height) / 2;
            pagina.drawRectangle({ x: posicaoX - 4, y: posicaoY - 4, width: dimensoes.width + 8, height: dimensoes.height + 8, color: rgb(1, 1, 1), borderColor: corBorda, borderWidth: .5 });
            pagina.drawImage(assinatura, { x: posicaoX, y: posicaoY, width: dimensoes.width, height: dimensoes.height });
          } else {
            pagina.drawText(reduzir(valor, 7.4, colunas[posicao].largura - 10), { x, y: y - 23, size: 7.4, font: posicao === 0 ? fonteNegrito : fonte, color: corTexto });
          }
          x += colunas[posicao].largura;
        });
        pagina.drawLine({ start: { x: margem, y: y - alturaLinha }, end: { x: largura - margem, y: y - alturaLinha }, thickness: .5, color: corBorda });
        y -= alturaLinha;
      });

      const paginas = pdf.getPages();
      paginas.forEach((item, indice) => {
        item.drawText(`Gerado em ${new Date().toLocaleString('pt-BR')}  •  Página ${indice + 1} de ${paginas.length}`, { x: margem, y: 18, size: 7, font: fonte, color: corAuxiliar });
      });
      const bytes = await pdf.save();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `avantalab-servicos-executados-${dataInicio}-a-${dataFim}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar o PDF.');
    } finally {
      setExportando(null);
    }
  }

  if (!aberto || typeof document === 'undefined') return null;
  return createPortal(<div className={`${styles.modalAgendamentoOverlay} ${styles.modalRelatorioServicosOverlay}`} role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
    <section className={`${styles.modalAgendamento} ${styles.modalRelatorioServicos} ${darkMode ? styles.darkScope : ''}`} role="dialog" aria-modal="true" aria-labelledby="relatorio-servicos-titulo">
      <header className={styles.relatorioServicosCabecalho}>
        <div><h2 id="relatorio-servicos-titulo">Relatório de serviços executados</h2><p>Consulte o período e exporte as execuções com assinatura, avaliação e atendimento responsável.</p></div>
        <button ref={botaoFechar} type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onFechar}>Fechar</button>
      </header>
      <div className={styles.relatorioServicosFiltros}>
        <div className={styles.relatorioPeriodo} role="group" aria-label="Período do relatório">
          <strong>Período</strong>
          <div className={styles.relatorioCampoData}><span>De</span><SeletorDataAgendamento id="relatorio-data-inicio" value={dataInicio} min="" onChange={(valor) => { setDataInicio(valor); setRelatorioConsultado(false); }} ariaLabel="Data inicial do relatório" camada="acima-modal" temaEscuro={darkMode} /></div>
          <div className={styles.relatorioCampoData}><span>Até</span><SeletorDataAgendamento id="relatorio-data-fim" value={dataFim} min="" onChange={(valor) => { setDataFim(valor); setRelatorioConsultado(false); }} ariaLabel="Data final do relatório" camada="acima-modal" temaEscuro={darkMode} /></div>
        </div>
        <div className={styles.relatorioServicosAcoes}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={exportando !== null} onClick={consultarRelatorio}>Consultar relatório</button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={exportando !== null || !relatorioConsultado} onClick={() => void gerarPdf()}>{exportando === 'pdf' ? 'Gerando…' : 'Gerar PDF'}</button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={exportando !== null || !relatorioConsultado} onClick={() => void exportarExcel()}>{exportando === 'excel' ? 'Gerando…' : 'Exportar Excel'}</button>
        </div>
      </div>
      <section className={styles.relatorioClientes} aria-labelledby="relatorio-clientes-titulo">
        <header className={styles.relatorioClientesTopo}>
          <div><h3 id="relatorio-clientes-titulo">Cliente / local</h3><p>{clienteSelecionado ? `Exibindo: ${nomeClienteSelecionado}` : 'Exibindo todos os locais.'}</p></div>
          <div className={styles.relatorioClientesAcoes}>
            <div className={styles.relatorioClientesBusca} role="search"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg><input id="relatorio-busca-cliente" className={styles.buscaFixaInput} type="text" value={buscaCliente} onFocus={() => setSeletorClientesAberto(true)} onChange={(evento) => { setBuscaCliente(evento.target.value); setSeletorClientesAberto(true); }} placeholder="Buscar" aria-label="Buscar cliente ou local" autoComplete="off" />{buscaCliente && <button type="button" className={styles.buscaLimpar} onClick={() => setBuscaCliente('')} aria-label="Limpar pesquisa">×</button>}</div>
            {clienteSelecionado && <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => { setClienteSelecionado(''); setErro(''); setRelatorioConsultado(false); }}>Limpar</button>}
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.relatorioClienteTrigger}`} aria-expanded={seletorClientesAberto} aria-controls="relatorio-lista-clientes" onClick={() => setSeletorClientesAberto((atual) => !atual)}>{seletorClientesAberto ? 'Fechar seleção' : 'Selecionar cliente ou local'}<span aria-hidden="true">{seletorClientesAberto ? '⌃' : '⌄'}</span></button>
          </div>
        </header>
        {seletorClientesAberto && <div id="relatorio-lista-clientes" className={styles.relatorioClientesConteudo}>
          <div className={styles.relatorioClientesItens} role="group" aria-label="Lista de clientes e locais">
            {empresasVisiveis.map(({ empresa, locais }) => empresa.tipoCadastro === 'local_agrupador' ? <article className={styles.relatorioEmpresaAgrupada} key={empresa.id}>
              <div className={styles.relatorioEmpresaCabecalho}><strong>{empresa.nome}</strong>{locais.length > 0 && <button type="button" className={`${styles.relatorioClientePill} ${clienteSelecionado === `grupo:${empresa.id}` ? styles.relatorioClienteAtivo : ''}`} aria-pressed={clienteSelecionado === `grupo:${empresa.id}`} onClick={() => selecionarCliente(`grupo:${empresa.id}`)}>Todos deste agrupado</button>}</div>
              {locais.length > 0 ? <div className={styles.relatorioSubempresas}>{locais.map((local) => <button type="button" key={local.id} className={`${styles.relatorioSubempresa} ${clienteSelecionado === `local:${local.id}` ? styles.relatorioClienteAtivo : ''}`} aria-pressed={clienteSelecionado === `local:${local.id}`} onClick={() => selecionarCliente(`local:${local.id}`)}><span>{local.nome}</span><small>Local</small></button>)}</div> : <p className={styles.relatorioClientesVazio}>Nenhum local corresponde à busca.</p>}
            </article> : <button type="button" key={empresa.id} className={`${styles.relatorioClienteDireto} ${clienteSelecionado === `direto:${empresa.id}` ? styles.relatorioClienteAtivo : ''}`} aria-pressed={clienteSelecionado === `direto:${empresa.id}`} onClick={() => selecionarCliente(`direto:${empresa.id}`)}><span>{empresa.nome}</span><small>Cliente direto</small></button>)}
            {empresasVisiveis.length === 0 && <p className={styles.relatorioClientesVazio}>Nenhuma empresa ou local encontrado.</p>}
          </div>
        </div>}
      </section>
      {erro && <p className={styles.relatorioServicosErro} role="alert">{erro}</p>}
      {!relatorioConsultado ? <div className={styles.relatorioServicosInicial} role="status">Defina o período, escolha um cliente ou local se necessário e clique em <b>Consultar relatório</b>.</div> : <>
        <div className={styles.relatorioServicosResumo}><strong>{linhas.length}</strong><span>serviço(s) executado(s) para {nomeClienteSelecionado.toLocaleLowerCase('pt-BR')} entre {periodoLegivel}</span></div>
        <div className={styles.relatorioServicosLista}>
          {linhas.length === 0 ? <p className={styles.muted}>Nenhum serviço executado neste período.</p> : linhas.map(({ servico, empresa, local, colaborador, comprovante }) => {
            const possuiAssinatura = Boolean(servico.assinaturaArquivoPath || servico.assinatura);
            return <article className={styles.relatorioServicosItem} key={servico.id}>
              <div><small>Empresa</small><strong>{empresa}</strong><span>{local}</span></div>
              <div><small>Executado em</small><strong>{formatarDataHora(servico.realizadoEm)}</strong><span>{rotuloTipo(servico.tipoServico)}</span></div>
              <div><small>Registrado por</small><strong>{colaborador}</strong><span>Assinado por {servico.clienteNome || '—'}</span></div>
              <div><small>Avaliação</small><strong>{servico.avaliacao === 'bom' ? 'Bom' : servico.avaliacao === 'regular' ? 'Regular' : 'Não registrada'}</strong>{servico.observacaoCliente && <span>{servico.observacaoCliente}</span>}</div>
              <div><small>Comprovante</small>{possuiAssinatura ? <BotaoComprovante lancamentoId={servico.id} onObter={onObterAssinatura} compacto darkMode={darkMode} titulo="Assinatura do serviço" rotulo="Visualizar assinatura" descricaoImagem={`Assinatura de ${servico.clienteNome || 'quem recebeu o atendimento'}`} /> : <span>{comprovante}</span>}</div>
            </article>;
          })}
        </div>
      </>}
    </section>
  </div>, document.body);
}
