'use client';
import { useState } from 'react';

type TourPrimeiroAcessoProps = {
  aberto: boolean;
  aoFinalizar: () => void;
  aoPular: () => void;
  corPrimaria: string;
  darkMode: boolean;
};

type Passo = {
  icone: string;
  localizacao: string;
  titulo: string;
  descricao: string;
  destaque?: boolean;
};

const PASSOS: Passo[] = [
  {
    icone: '👋',
    localizacao: '',
    titulo: 'Bem-vindo ao AvantaLab Gestão!',
    descricao:
      'Este tour apresenta os recursos atuais da versão web. Você pode pular quando quiser e revê-lo em Menu → Tutorial. Sempre que surgir uma dúvida, pergunte à Ava.',
  },
  {
    icone: '🤖',
    localizacao: 'Botão no canto inferior direito',
    titulo: 'Converse com a Ava',
    descricao:
      'A Ava explica como usar o sistema e analisa os dados financeiros disponíveis. Ela orienta, mas não altera registros por você. Use Nova conversa quando quiser limpar o histórico atual.',
    destaque: true,
  },
  {
    icone: '🏢',
    localizacao: 'Menu → Configurações → Perfil',
    titulo: 'Perfis financeiros',
    descricao:
      'Use perfis Empresa ou Pessoal e alterne entre os perfis vinculados ao seu login. No card de Perfil você pode editar o perfil atual, criar outro, trocar e, quando autorizado, excluir.',
  },
  {
    icone: '✅',
    localizacao: 'Menu → Cadastrar despesas',
    titulo: 'Cadastre suas despesas',
    descricao:
      'Revise a lista inicial e cadastre os tipos de despesa que utiliza, vinculando cada item à categoria correta. Esses cadastros alimentam lançamentos, gráficos e relatórios.',
  },
  {
    icone: '💰',
    localizacao: 'Início → clique em um mês',
    titulo: 'Receitas e despesas',
    descricao:
      'Abra um mês para registrar receitas, total mensal e despesas. Você pode editar ou excluir lançamentos e pesquisar itens. Web e mobile compartilham os mesmos dados.',
  },
  {
    icone: '🔁',
    localizacao: 'Menu → Despesas fixas / lançamento mensal',
    titulo: 'Fixas, parcelas e previsões',
    descricao:
      'Crie despesas futuras, parcelamentos e recorrências fixas com projeção para os próximos meses. A edição pela linha altera somente o mês; em Despesas fixas você administra toda a recorrência.',
  },
  {
    icone: '🧩',
    localizacao: 'Dashboard → lápis / menu de cada card',
    titulo: 'Organize o dashboard',
    descricao:
      'Arraste os cards entre as colunas. Pelo lápis, escolha os blocos visíveis; no menu de cada card, use Expandir, Reduzir ou Remover bloco. É possível manter todos em uma única coluna.',
  },
  {
    icone: '📈',
    localizacao: 'Balanço Geral, Gráficos, Por Categoria e Relatório',
    titulo: 'Análises detalhadas',
    descricao:
      'Acompanhe saldo, evolução, categorias e relatórios. Os gráficos também podem ser reorganizados e expandidos. Clique em uma despesa nos gráficos para consultar os lançamentos que formam o total.',
  },
  {
    icone: '📅',
    localizacao: 'Agenda e sininho',
    titulo: 'Agenda e notificações',
    descricao:
      'A agenda reúne lembretes e despesas futuras. Os marcadores distinguem cada tipo. Ative as notificações no aparelho para receber lembretes e avisos de pagamentos agendados.',
  },
  {
    icone: '👥',
    localizacao: 'Menu → Configurações → Usuários',
    titulo: 'Usuários e permissões',
    descricao:
      'Gestor Master e Administrador podem criar ou vincular usuários. Os níveis Gestor Master, Administrador, Operador Completo e Operador Simples determinam o que cada pessoa pode fazer.',
  },
  {
    icone: '⏱️',
    localizacao: 'Menu → Módulos / Ponto',
    titulo: 'Controle de Ponto',
    descricao:
      'Quando o módulo estiver instalado, gestores podem cadastrar funcionários, horários, local e raio, além de consultar relatórios. Funcionários registram Entrada, Saída almoço, Retorno almoço e Saída em /ponto.',
  },
  {
    icone: '💾',
    localizacao: 'Menu → Configurações → Backup e Restauração',
    titulo: 'Proteja seus dados',
    descricao:
      'Gere backups do perfil e use Restauração para importar um arquivo compatível. Confira o modo escolhido antes de substituir dados existentes.',
  },
  {
    icone: '🎨',
    localizacao: 'Menu → Visual e Configurações',
    titulo: 'Personalização e ferramentas',
    descricao:
      'Personalize logo, cor principal e modo escuro. Em Configurações também ficam usuários, perfil, backup, restauração e outras preferências disponíveis para sua permissão.',
  },
  {
    icone: '🚀',
    localizacao: '',
    titulo: 'Tudo pronto!',
    descricao:
      'Você já conhece os recursos principais. Explore o sistema e chame a Ava quando precisar. Este tutorial permanece disponível em Menu → Tutorial.',
  },
];

function corEhClara(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function TourPrimeiroAcesso({
  aberto,
  aoFinalizar,
  aoPular,
  corPrimaria,
  darkMode,
}: TourPrimeiroAcessoProps) {
  const [passo, setPasso] = useState(0);

  if (!aberto) return null;

  const total = PASSOS.length;
  const atual = PASSOS[passo];
  const ehPrimeiro = passo === 0;
  const ehUltimo = passo === total - 1;
  const textoPrimario = corEhClara(corPrimaria) ? '#1e293b' : '#ffffff';
  const textoPrimarioSuave = corEhClara(corPrimaria) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)';

  const bgCard = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800';
  const bgSecundario = darkMode ? 'bg-slate-800' : 'bg-slate-50';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';

  const irPara = (i: number) => setPasso(Math.max(0, Math.min(total - 1, i)));

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={aoPular}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border ${bgCard} ${borderColor} flex flex-col overflow-hidden`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header colorido */}
        <div className="px-6 pt-5 pb-4" style={{ backgroundColor: corPrimaria }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl leading-none shrink-0">{atual.icone}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: textoPrimarioSuave }}>
                  Passo {passo + 1} de {total}
                </p>
                <h2 className="text-base font-black leading-tight" style={{ color: textoPrimario }}>
                  {atual.titulo}
                </h2>
              </div>
            </div>
            <button
              onClick={aoPular}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold hover:bg-black/20 transition-colors cursor-pointer whitespace-nowrap"
              style={{ color: textoPrimario }}
              title="Pular tour"
            >
              Pular ✕
            </button>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4 h-1.5 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((passo + 1) / total) * 100}%`,
                backgroundColor: textoPrimario,
                opacity: 0.75,
              }}
            />
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Localização */}
          {atual.localizacao && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${bgSecundario} ${borderColor} border`}>
              <span className="shrink-0">📍</span>
              <span className={textMuted}>{atual.localizacao}</span>
            </div>
          )}

          {/* Descrição */}
          {atual.destaque ? (
            <div
              className="rounded-xl border-2 p-3"
              style={{ borderColor: corPrimaria, backgroundColor: corPrimaria + '14' }}
            >
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {atual.descricao}
              </p>
            </div>
          ) : (
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {atual.descricao}
            </p>
          )}

          {/* Dots de progresso — clicáveis */}
          <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
            {PASSOS.map((_, i) => (
              <button
                key={i}
                onClick={() => irPara(i)}
                className="rounded-full transition-all duration-300 cursor-pointer hover:opacity-80"
                style={{
                  width: i === passo ? 20 : 8,
                  height: 8,
                  backgroundColor: i === passo ? corPrimaria : darkMode ? '#334155' : '#cbd5e1',
                }}
                aria-label={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer de navegação */}
        <div className={`px-6 py-4 border-t ${borderColor} flex items-center gap-3`}>
          <button
            onClick={() => irPara(passo - 1)}
            disabled={ehPrimeiro}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              darkMode
                ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ← Anterior
          </button>

          {ehUltimo ? (
            <button
              onClick={aoFinalizar}
              className="flex-1 py-2 rounded-xl text-sm font-black shadow hover:brightness-110 transition-all cursor-pointer"
              style={{ backgroundColor: corPrimaria, color: textoPrimario }}
            >
              Concluir 🎉
            </button>
          ) : (
            <button
              onClick={() => irPara(passo + 1)}
              className="flex-1 py-2 rounded-xl text-sm font-black shadow hover:brightness-110 transition-all cursor-pointer"
              style={{ backgroundColor: corPrimaria, color: textoPrimario }}
            >
              {ehPrimeiro ? 'Começar →' : 'Próximo →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
