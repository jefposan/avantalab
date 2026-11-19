import { useId } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import AvisoFormulario from '@/app/components/AvisoFormulario';
import { agruparColunasRevisao } from './excel-seletivo';
import type { ResumoImportacaoCadastro } from './types';
import styles from './RevisaoImportacao.module.css';

type Props = {
  colunas: string[];
  resumo: ResumoImportacaoCadastro;
  processando: boolean;
  erro: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export default function RevisaoImportacao({ colunas, resumo, processando, erro, onCancelar, onConfirmar }: Props) {
  const erroId = useId();
  const grupos = agruparColunasRevisao(colunas);
  const camposComValorObrigatorio = ['Custo', 'Alíquota ISS', 'Ativo', 'Disponível no catálogo', 'Tipo'];
  const temTexto = grupos.cadastro.some((titulo) => !camposComValorObrigatorio.includes(titulo));
  return <div className={styles.flow}>
    <p className={styles.hint}>Somente as colunas abaixo poderão ser alteradas. Os demais dados serão preservados.</p>
    {[{ titulo: 'Dados do cadastro', itens: grupos.cadastro }, { titulo: 'Tabelas de preços', itens: grupos.precos }].filter((grupo) => grupo.itens.length).map((grupo) => <section key={grupo.titulo} aria-label={grupo.titulo}>
      <div className={styles.sectionTitle}><h3>{grupo.titulo}</h3><span>{grupo.itens.length} selecionada(s)</span></div>
      <ul className={styles.tags} tabIndex={grupo.itens.length > 12 ? 0 : undefined} aria-label={`Colunas de ${grupo.titulo.toLocaleLowerCase('pt-BR')}`}>
        {grupo.itens.map((titulo) => <li key={titulo}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg><span>{titulo}</span></li>)}
      </ul>
    </section>)}
    <section className={styles.totals} aria-label="Resumo das alterações">
      <div><strong>{resumo.produtos_atualizados.toLocaleString('pt-BR')}</strong><span>cadastros a atualizar<small>dados e preço padrão</small></span></div>
      <div><strong>{resumo.precos_atualizados.toLocaleString('pt-BR')}</strong><span>preços a atualizar<small>tabelas adicionais</small></span></div>
    </section>
    <aside className={styles.rules} aria-label="Regras de importação"><strong>Como os valores serão tratados</strong>
      {grupos.precos.length > 0 && <p>Preço vazio mantém o valor atual. Zero substitui o preço por R$ 0,00.</p>}
      {temTexto && <p>Texto vazio limpa somente o campo selecionado.</p>}
      {grupos.cadastro.some((titulo) => camposComValorObrigatorio.includes(titulo)) && <p>Custo, alíquota, tipo e situação exigem valores válidos quando selecionados.</p>}
    </aside>
    <footer className={styles.footer}>
      {erro && <AvisoFormulario titulo="Não foi possível aplicar a importação" mensagem={erro} idMensagem={erroId} />}
      <div className={styles.actions}><p>Nenhuma alteração foi aplicada.<br />Revise os totais antes de confirmar.</p><div>
        <BotaoAcaoCompacto disabled={processando} onClick={onCancelar}>Cancelar</BotaoAcaoCompacto>
        <BotaoAcaoCompacto variante="primario" disabled={processando} onClick={onConfirmar}>{processando ? 'Aplicando…' : 'Confirmar importação'}</BotaoAcaoCompacto>
      </div></div>
    </footer>
  </div>;
}
