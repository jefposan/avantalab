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
};

const PASSOS: Passo[] = [
  {
    icone: '👋',
    localizacao: '',
    titulo: 'Bem-vindo ao AvantaLab Gestão!',
    descricao:
      'Este passo a passo vai te guiar pelos principais recursos do sistema. Você pode pular a qualquer momento e acessar novamente pelo menu Ajustes → Tutorial.',
  },
  {
    icone: '⚙️',
    localizacao: 'Barra superior → botão Ajustes',
    titulo: 'Menu Ajustes',
    descricao:
      'Clique em "Ajustes" na barra superior para acessar todas as configurações do sistema: logo, cor, usuários, empresas, backup e muito mais. O menu se expande logo abaixo da barra.',
  },
  {
    icone: '🎨',
    localizacao: 'Ajustes → Logo / Cor',
    titulo: 'Logo e cor da empresa',
    descricao:
      'Personalize a identidade visual da empresa. Adicione a logomarca (PNG, JPG ou SVG) e escolha a cor principal que será aplicada em todos os elementos visuais do sistema.',
  },
  {
    icone: '📋',
    localizacao: 'Ajustes → Instruções categorias',
    titulo: 'Despesas base e categorias',
    descricao:
      'Cadastre as despesas fixas e recorrentes da empresa. Use "Instruções de categorias" para entender como classificar cada tipo de gasto e garantir relatórios precisos.',
  },
  {
    icone: '👥',
    localizacao: 'Ajustes → Usuários',
    titulo: 'Usuários e permissões',
    descricao:
      'Adicione colaboradores com diferentes níveis de acesso: Gestor Master, Administrador, Operador Completo e Operador Simples. Cada perfil tem permissões específicas para manter a segurança dos dados.',
  },
  {
    icone: '🏢',
    localizacao: 'Ajustes → Empresa',
    titulo: 'Empresas',
    descricao:
      'Gerencie os dados da empresa atual, crie novas empresas e alterne entre elas. Com múltiplos acessos, o seletor de empresa aparece na tela de login automaticamente.',
  },
  {
    icone: '💾',
    localizacao: 'Ajustes → Backup',
    titulo: 'Backup dos dados',
    descricao:
      'Gere um arquivo Excel com todos os dados da empresa a qualquer momento. O sininho no topo da tela envia uma notificação mensal lembrando você de realizar o backup — não ignore esse aviso!',
  },
  {
    icone: '🧮',
    localizacao: 'Barra superior → ícone de calculadora',
    titulo: 'Calculadora rápida',
    descricao:
      'Acesse a calculadora flutuante pelo ícone na barra superior. Ela suporta operações básicas, porcentagem e inversão de sinal. Pode ser arrastada pela tela e responde ao teclado.',
  },
  {
    icone: '💰',
    localizacao: 'Menu Início → clique em um mês',
    titulo: 'Faturamento mensal',
    descricao:
      'No Dashboard, clique em qualquer mês para abrir a visão de lançamentos. Na parte superior, registre o faturamento bruto e as entradas do período. Esses valores alimentam o balanço automaticamente.',
  },
  {
    icone: '📊',
    localizacao: 'Menu Início → mês selecionado → tabela de despesas',
    titulo: 'Lançamento de despesas',
    descricao:
      'Dentro da visão mensal, registre cada despesa por categoria. O sistema detecta lançamentos duplicados e exibe o total por categoria para fácil acompanhamento.',
  },
  {
    icone: '📈',
    localizacao: 'Menu → Balanço / Gráficos / Categorias / Relatório',
    titulo: 'Dashboard, gráficos e relatórios',
    descricao:
      'Todos os dados lançados alimentam automaticamente as análises. Acesse Balanço Geral, Gráficos de evolução, visão Por Categoria e Relatório completo pelos itens do menu superior.',
  },
  {
    icone: '💬',
    localizacao: 'Canto inferior direito da tela',
    titulo: 'Suporte e feedback',
    descricao:
      'O botão flutuante no canto inferior direito abre o canal de comunicação com a AvantaLab. Envie sugestões, tire dúvidas ou reporte problemas diretamente pelo sistema.',
  },
  {
    icone: '✅',
    localizacao: 'Ajustes → Instruções categorias',
    titulo: 'Por onde começar?',
    descricao:
      'O primeiro passo é cadastrar as despesas base da empresa. Acesse o menu Ajustes e clique em "Despesas base". Lá você define todas as categorias e gastos recorrentes que serão usados nos lançamentos mensais. Com isso feito, o sistema estará pronto para uso completo.',
  },
  {
    icone: '🚀',
    localizacao: '',
    titulo: 'Tudo pronto!',
    descricao:
      'Você conheceu os principais recursos do AvantaLab Gestão. Explore à vontade! Este tutorial estará sempre disponível em Ajustes → Tutorial.',
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
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {atual.descricao}
          </p>

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
