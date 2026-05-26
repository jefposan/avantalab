'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Calculadora from './components/Calculadora';
import Dashboard from './components/Dashboard';
import BalancoGeral from './components/BalancoGeral';
import Graficos from './components/Graficos';
import PorCategoria from './components/PorCategoria';
import Relatorio from './components/Relatorio';
import {
  buscarEmpresaPrincipal,
  buscarConfiguracoes,
  buscarDespesasCadastradas,
  buscarLancamentos,
  buscarFaturamentos,
  salvarDespesaCadastrada,
  apagarDespesaCadastrada,
  salvarLancamento,
  apagarLancamento,
  salvarFaturamentoBanco,
  salvarConfiguracoesBanco,
} from './lib/database';

export default function AppGestao() {
  // --- ESTADOS PRINCIPAIS ---
  const [mounted, setMounted] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState('Dashboard');
  const [ajustesAberto, setAjustesAberto] = useState(false);
  const [duplicadosAtivo, setDuplicadosAtivo] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [corPrimaria, setCorPrimaria] = useState('#2563eb');
  const [mesAtivo, setMesAtivo] = useState<string | null>(null);
  

  // NOVO: Estado do Ano Selecionado
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSettings, setLogoSettings] = useState({ scale: 100, x: 0, y: 0 });
  const [modalLogo, setModalLogo] = useState(false);
  const [painelAjusteLogo, setPainelAjusteLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modais e Calc
  const [modalInstrucoes, setModalInstrucoes] = useState(false);
  const [modalDespesasBase, setModalDespesasBase] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);

  // Dados Financeiros
  const [mesFaturamento, setMesFaturamento] = useState('JANEIRO');
  const [faturamentos, setFaturamentos] = useState<Record<string, number>>({});
  const [inputFaturamento, setInputFaturamento] = useState('');
  const [mesResumoDash, setMesResumoDash] = useState('JANEIRO');

  const [despesasCadastradas, setDespesasCadastradas] = useState([
    { nome: 'Energia Elétrica', categoria: 'Despesas Operacionais' },
    { nome: 'Tráfego Pago (Ads)', categoria: 'Custos Variáveis' },
  ]);
  const [novaBaseNome, setNovaBaseNome] = useState('');
  const [novaBaseCat, setNovaBaseCat] = useState('');

  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [formDia, setFormDia] = useState('');
  const [formDespesa, setFormDespesa] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [valorNumericoRaw, setValorNumericoRaw] = useState(0);

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  // --- LOCAL STORAGE (LÓGICA SEPARADA POR ANO E CONFIGURAÇÕES) ---
  
  // 1. Carrega Configurações Globais
  // 1. Carrega Configurações Globais do Supabase
useEffect(() => {
  const carregarConfiguracoesIniciais = async () => {
    const empresa = await buscarEmpresaPrincipal();

    if (empresa) {
      setEmpresaId(empresa.id);

      const config = await buscarConfiguracoes(empresa.id);
      const despesas = await buscarDespesasCadastradas(empresa.id);

      if (config) {
        if (config.cor_primaria) setCorPrimaria(config.cor_primaria);
        if (config.dark_mode !== undefined) setDarkMode(config.dark_mode);
        if (config.duplicados_ativo !== undefined) setDuplicadosAtivo(config.duplicados_ativo);
        if (config.logo_url) setLogoUrl(config.logo_url);
        if (config.logo_settings) setLogoSettings(config.logo_settings);
      }

      if (despesas && despesas.length > 0) {
        setDespesasCadastradas(
          despesas.map((d: any) => ({
            nome: d.nome,
            categoria: d.categoria,
          }))
        );
      }
    }

    const mesAtual = meses[new Date().getMonth()];
    setMesResumoDash(mesAtual);
    setMesFaturamento(mesAtual);

    setMounted(true);
  };

  carregarConfiguracoesIniciais();
}, []);

  // 2. Carrega Dados Financeiros do Ano
  // 2. Carrega Dados Financeiros do Ano pelo Supabase
useEffect(() => {
  if (!mounted || !empresaId) return;

  const carregarDadosFinanceiros = async () => {
    const ano = Number(anoSelecionado);

    const lancamentosBanco = await buscarLancamentos(empresaId, ano);
    const faturamentosBanco = await buscarFaturamentos(empresaId, ano);

    setLancamentos(
      lancamentosBanco.map((l: any) => ({
        id: l.id,
        mes: l.mes,
        dia: l.dia,
        despesa: l.despesa_nome,
        descricao: l.descricao || '',
        valor: Number(l.valor),
      }))
    );

    const faturamentosFormatados: Record<string, number> = {};

    faturamentosBanco.forEach((f: any) => {
      faturamentosFormatados[f.mes] = Number(f.valor);
    });

    setFaturamentos(faturamentosFormatados);
  };

  carregarDadosFinanceiros();
}, [anoSelecionado, mounted, empresaId]);

  // 3. Salva Configurações Globais
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('appGestaoSettings', JSON.stringify({
        despesasCadastradas, logoUrl, logoSettings, corPrimaria, darkMode, duplicadosAtivo
      }));
    }
  }, [despesasCadastradas, logoUrl, logoSettings, corPrimaria, darkMode, duplicadosAtivo, mounted]);

  // 4. Salva Dados Financeiros do Ano Atual
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(`appGestaoData_${anoSelecionado}`, JSON.stringify({
        lancamentos, faturamentos
      }));
    }
  }, [lancamentos, faturamentos, anoSelecionado, mounted]);

// 5. Auto-fechar o Menu de Ajustes após tempo inativo
  useEffect(() => {
    // Se o menu estiver aberto, inicia o cronômetro
    if (ajustesAberto) {
      const tempo = setTimeout(() => {
        setAjustesAberto(false);
      }, 10000); // <-- 10000 milissegundos = 10 segundos. Altere este valor como preferir!

      // Limpa o cronômetro se o utilizador fechar o menu manualmente antes do tempo
      return () => clearTimeout(tempo);
    }
  }, [ajustesAberto]);

  // --- CÁLCULOS E FUNÇÕES ---
  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const mesParaAnalise = mesAtivo || mesResumoDash;
  const lancamentosDoMes = lancamentos.filter(l => l.mes === mesParaAnalise);
  const totalDespesasMes = lancamentosDoMes.reduce((acc, lanc) => acc + lanc.valor, 0);
  const faturamentoDoMesAtual = faturamentos[mesParaAnalise] || 0;
  const lucroOperacional = faturamentoDoMesAtual - totalDespesasMes;
  const lancamentosOrdenados = [...lancamentos].sort((a, b) => a.dia - b.dia);
  const maiorGasto = lancamentosDoMes.length > 0 ? lancamentosDoMes.reduce((prev, curr) => (curr.valor > prev.valor ? curr : prev), { despesa: '', valor: 0 }) : { despesa: 'Nenhuma despesa', valor: 0 };
  const receitasTotais = Object.values(faturamentos).reduce((a, b) => a + b, 0);
  const despesasTotais = lancamentos.reduce((a, b) => a + b.valor, 0);
  const lucroTotalAnual = receitasTotais - despesasTotais;

  const salvarFaturamento = async () => {
  if (!empresaId) {
    alert("Empresa não carregada. Tente atualizar a página.");
    return;
  }

  const valorLimpo = parseInt(inputFaturamento.replace(/\D/g, '') || '0', 10) / 100;

  if (valorLimpo > 0) {
    const salvo = await salvarFaturamentoBanco({
      empresaId,
      ano: Number(anoSelecionado),
      mes: mesFaturamento,
      valor: valorLimpo,
    });

    if (salvo) {
      setFaturamentos(prev => ({
        ...prev,
        [mesFaturamento]: valorLimpo,
      }));

      setInputFaturamento('');
    } else {
      alert("Erro ao salvar faturamento no banco.");
    }
  }
};
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => { let value = e.target.value.replace(/\D/g, ""); if (!value) { setFormValor(""); setValorNumericoRaw(0); return; } const numericValue = parseInt(value, 10) / 100; setValorNumericoRaw(numericValue); setFormValor(formatarMoeda(numericValue)); };
  const getMaxDias = (mes: string | null) => { if (!mes) return 31; if (['ABRIL', 'JUNHO', 'SETEMBRO', 'NOVEMBRO'].includes(mes)) return 30; if (mes === 'FEVEREIRO') return (parseInt(anoSelecionado) % 4 === 0) ? 29 : 28; return 31; };
  const adicionarDespesaBase = () => { if (!novaBaseNome || !novaBaseCat) return alert("Preencha o Nome e a Categoria!"); setDespesasCadastradas([...despesasCadastradas, { nome: novaBaseNome, categoria: novaBaseCat }]); setNovaBaseNome(''); setNovaBaseCat(''); };
  const apagarDespesaBase = (nome: string) => { setDespesasCadastradas(despesasCadastradas.filter(d => d.nome !== nome)); };
  
  const adicionarDespesa = async () => {
  if (!empresaId) {
    alert("Empresa não carregada. Tente atualizar a página.");
    return;
  }

  if (!mesAtivo) {
    alert("Selecione um mês antes de lançar a despesa.");
    return;
  }

  if (!formDia || !formDespesa || valorNumericoRaw <= 0) {
    alert("Preencha Dia, Despesa e Valor!");
    return;
  }

  if (duplicadosAtivo) {
    const existeIgual = lancamentosDoMes.some(
      l => l.despesa === formDespesa && l.valor === valorNumericoRaw
    );

    if (
      existeIgual &&
      !window.confirm("Aviso: Valor e despesa duplicados. Deseja adicionar mesmo assim?")
    ) {
      return;
    }
  }

  const salvo = await salvarLancamento({
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesAtivo,
    dia: parseInt(formDia),
    despesaNome: formDespesa,
    descricao: formDescricao,
    valor: valorNumericoRaw,
  });

  if (!salvo.erro && salvo.data) {
  const novoLancamento = {
    id: salvo.data.id,
    mes: salvo.data.mes,
    dia: salvo.data.dia,
    despesa: salvo.data.despesa_nome,
    descricao: salvo.data.descricao || '',
    valor: Number(salvo.data.valor),
  };

    setLancamentos(prev => [...prev, novoLancamento]);

    setFormDia('');
    setFormDespesa('');
    setFormDescricao('');
    setFormValor('');
    setValorNumericoRaw(0);
  } else {
  alert(`Erro ao salvar lançamento: ${salvo.mensagem}`);
}
};
  
 const apagarDespesa = async (id: string) => {
  const apagou = await apagarLancamento(id);

  if (apagou) {
    setLancamentos(prev => prev.filter(l => l.id !== id));
  } else {
    alert("Erro ao apagar lançamento no banco.");
  }
};
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setLogoUrl(reader.result as string); reader.readAsDataURL(file); setModalLogo(false); } };

  // ================= FUNÇÃO DE BACKUP EXCEL =================
  const gerarBackupExcel = () => {
    const dadosResumo: any[] = [];
    const dadosLancamentos: any[] = [];
    const anosNoBanco: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('appGestaoData_')) {
        anosNoBanco.push(key.replace('appGestaoData_', ''));
      }
    }
    anosNoBanco.sort(); 

    anosNoBanco.forEach(ano => {
      const savedData = JSON.parse(localStorage.getItem(`appGestaoData_${ano}`) || '{}');
      const lancsAno = savedData.lancamentos || [];
      const fatsAno = savedData.faturamentos || {};

      let totalFatAno = 0, totalDespAno = 0, totalLucroAno = 0, totalEbitdaAno = 0;

      lancsAno.forEach((l: any) => {
        dadosLancamentos.push({
          Ano: ano, Mês: l.mes, Dia: l.dia, Despesa: l.despesa,
          Descrição: l.descricao || '-', 'Valor (R$)': l.valor
        });
      });

      meses.forEach(mes => {
        const faturamento = fatsAno[mes] || 0;
        let despesas = 0;
        let exclusoesEbitda = 0;

        lancsAno.filter((l: any) => l.mes === mes).forEach((l: any) => {
          despesas += l.valor;
          const despesaCat = despesasCadastradas.find(d => d.nome === l.despesa)?.categoria || 'Outros';
          if (['Amortização', 'Depreciação', 'Despesas Financeiras', 'Imposto sobre Lucro'].includes(despesaCat)) {
            exclusoesEbitda += l.valor;
          }
        });

        const lucro = faturamento - despesas;
        const ebitda = lucro + exclusoesEbitda;

        if (faturamento > 0 || despesas > 0) {
          dadosResumo.push({ Ano: ano, Mês: mes, 'Faturamento (R$)': faturamento, 'Despesas (R$)': despesas, 'Lucro (R$)': lucro, 'EBITDA (R$)': ebitda });
          totalFatAno += faturamento; totalDespAno += despesas; totalLucroAno += lucro; totalEbitdaAno += ebitda;
        }
      });

      if (totalFatAno > 0 || totalDespAno > 0) {
        dadosResumo.push({ Ano: ano, Mês: 'TOTAL ANUAL', 'Faturamento (R$)': totalFatAno, 'Despesas (R$)': totalDespAno, 'Lucro (R$)': totalLucroAno, 'EBITDA (R$)': totalEbitdaAno });
        dadosResumo.push({ Ano: '', Mês: '', 'Faturamento (R$)': null, 'Despesas (R$)': null, 'Lucro (R$)': null, 'EBITDA (R$)': null }); 
      }
    });

    if (dadosResumo.length === 0) return alert("Nenhum dado encontrado para backup.");

    const wb = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Financeiro");

    if (dadosLancamentos.length > 0) {
      const wsLancs = XLSX.utils.json_to_sheet(dadosLancamentos);
      XLSX.utils.book_append_sheet(wb, wsLancs, "Lançamentos Detalhados");
    }

    const dataHoje = new Date().toISOString().split('T')[0]; 
    XLSX.writeFile(wb, `backup_${dataHoje}.xlsx`);
  };

  const analiseDespesas = useMemo(() => { 
    const totais: Record<string, number> = {}; 
    lancamentosDoMes.forEach(l => { totais[l.despesa] = (totais[l.despesa] || 0) + l.valor; }); 
    const cores = [corPrimaria, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']; 
    const dadosGrafico = Object.entries(totais).sort((a, b) => b[1] - a[1]).map(([nome, valor], index) => ({ nome, valor, percentual: totalDespesasMes > 0 ? (valor / totalDespesasMes) * 100 : 0, cor: cores[index % cores.length] })); 
    let anguloAtual = 0; 
    const conicParts = dadosGrafico.map(item => { const inicio = anguloAtual; anguloAtual += item.percentual; return `${item.cor} ${inicio}% ${anguloAtual}%`; }); 
    return { dados: dadosGrafico, gradiente: `conic-gradient(${conicParts.join(', ')})` }; 
  }, [lancamentosDoMes, totalDespesasMes, corPrimaria]);

  const bgMain = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';

  if (!mounted) return null; 

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${bgMain}`}>
      
      {/* ================= MODAIS ================= */}
      {modalInstrucoes && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 flex flex-col`} style={{ borderColor: corPrimaria }}>
            <div className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center shadow-md z-10" style={{ backgroundColor: corPrimaria }}>
              <h2 className="text-lg font-bold text-white uppercase">Instruções sobre Categorias</h2>
              <button onClick={() => setModalInstrucoes(false)} className="text-white hover:bg-white/20 px-3 py-1 rounded-lg font-bold">X</button>
            </div>
            <div className={`p-8 space-y-6 text-sm ${textMuted} leading-relaxed overflow-y-auto`}>
              <div><strong className={textStrong}>AMORTIZAÇÃO:</strong><br/>- Gastos para dividir o custo de coisas que não são físicas...<br/>- Exemplos: softwares comprados, valor pago por patente.</div>
              <div><strong className={textStrong}>CUSTOS VARIÁVEIS:</strong><br/>- Gastos que aumentam ou diminuem conforme a quantidade produzida/vendida.<br/>- Exemplos: embalagens, matéria-prima, frete, comissões.</div>
              <div><strong className={textStrong}>DEPRECIAÇÃO:</strong><br/>- Gastos para dividir o custo de coisas físicas que a empresa usa.<br/>- Exemplos: desgaste de máquinas, veículos.</div>
              <div><strong className={textStrong}>DESPESAS FINANCEIRAS:</strong><br/>- Gastos relacionados a dinheiro e bancos.<br/>- Exemplos: juros, tarifas, variações de câmbio.</div>
              <div><strong className={textStrong}>DESPESAS OPERACIONAIS:</strong><br/>- Gastos para manter a empresa funcionando.<br/>- Exemplos: aluguel, água, luz, salários, manutenção, pro labore, publicidade.</div>
              <div><strong className={textStrong}>IMPOSTOS SOBRE LUCRO:</strong><br/>- Tributos que a empresa paga sobre o dinheiro que ela ganha.<br/>- Exemplos: imposto de renda, CSLL.</div>
              <div className="p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-xl text-yellow-700 dark:text-yellow-400 mt-6">
                <strong>Observações:</strong> Se tiver dúvida sobre onde colocar algum gasto, pergunte ao contador. Estes são exemplos gerais.
              </div>
            </div>
          </div>
        </div>
      )}

      {modalDespesasBase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 overflow-hidden`} style={{ borderColor: corPrimaria }}>
            <div className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center z-10" style={{ backgroundColor: corPrimaria }}>
              <h2 className="text-lg font-bold text-white uppercase">Gerenciar Despesas</h2>
              <button onClick={() => setModalDespesasBase(false)} className="text-white hover:bg-white/20 px-3 py-1 rounded-lg font-bold">X</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className={`p-5 rounded-xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`font-bold mb-4 ${textStrong}`}>Nova Despesa</h3>
                <div className="flex flex-wrap gap-3">
                  <input type="text" placeholder="Nome (Ex: Aluguel)" value={novaBaseNome} onChange={e => setNovaBaseNome(e.target.value)} className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} style={{ outlineColor: corPrimaria }} />
                  <select value={novaBaseCat} onChange={e => setNovaBaseCat(e.target.value)} className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} style={{ outlineColor: corPrimaria }}>
                    <option value="">Categoria (Obrigatória)</option>
                    <option value="Amortização">Amortização</option>
                    <option value="Custos Variáveis">Custos Variáveis</option>
                    <option value="Depreciação">Depreciação</option>
                    <option value="Despesas Financeiras">Despesas Financeiras</option>
                    <option value="Despesas Operacionais">Despesas Operacionais</option>
                    <option value="Imposto sobre Lucro">Imposto sobre Lucro</option>
                  </select>
                  <button onClick={adicionarDespesaBase} style={{ backgroundColor: corPrimaria }} className="text-white px-6 py-2.5 rounded-lg font-bold hover:brightness-110 w-full sm:w-auto shadow">Salvar</button>
                </div>
              </div>
              <div className="space-y-2 pr-2">
                {despesasCadastradas.map(d => (
                  <div key={d.nome} className={`flex justify-between items-center p-3 rounded-lg border border-slate-200/10 ${darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}>
                    <div><span className={`font-bold ${textStrong}`}>{d.nome}</span> <span className={`text-xs ml-2 px-2 py-1 rounded-md bg-slate-500/20 ${textMuted}`}>{d.categoria}</span></div>
                    <button onClick={() => apagarDespesaBase(d.nome)} className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg font-bold px-3 py-1 text-lg transition-colors">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalLogo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${bgCard} rounded-2xl shadow-2xl max-w-sm w-full border-2 p-6`} style={{ borderColor: corPrimaria }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-bold ${textStrong}`}>Adicionar Logo</h2>
              <button onClick={() => setModalLogo(false)} className={textMuted}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 rounded-lg border border-dashed hover:bg-slate-500/10 transition-colors ${textStrong} border-slate-400 font-medium`}>⬆ Upload do Computador</button>
              </div>
              <div className="text-center text-sm font-bold text-slate-400">OU</div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${textMuted} uppercase`}>URL da Imagem</label>
                <input type="text" placeholder="https://..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={`w-full p-2.5 rounded-lg border focus:outline-none focus:ring-1 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`} style={{ outlineColor: corPrimaria }} />
              </div>
              <button onClick={() => setModalLogo(false)} style={{ backgroundColor: corPrimaria }} className="w-full text-white py-2.5 rounded-lg font-bold hover:brightness-110 mt-2 shadow-md">Salvar Logo</button>
            </div>
          </div>
        </div>
      )}

      {calcAberta && (
        <Calculadora onClose={() => setCalcAberta(false)} corPrimaria={corPrimaria} darkMode={darkMode} />
      )}

      {/* ================= HEADER GLOBAL ================= */}
      <header className={`print-ocultar ${bgCard} shadow-sm border-b px-8 py-4 flex justify-between items-center z-30 relative`} style={{ borderBottomColor: darkMode ? '' : corPrimaria, borderBottomWidth: darkMode ? '1px' : '10px' }}>
        
        <div className="w-56 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => {setAbaAtiva('Dashboard'); setMesAtivo(null);}} style={!logoUrl ? { border: `2px dashed ${darkMode ? '#475569' : '#cbd5e1'}`, borderRadius: '0.5rem' } : {}}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="absolute" style={{ transform: `translate(${logoSettings.x}px, ${logoSettings.y}px) scale(${logoSettings.scale / 100})`, objectFit: 'contain', width: '100%', height: '100%', background: 'transparent' }} />
          ) : <span className="text-slate-400 text-sm font-bold">LOGOMARCA</span>}
        </div>

        {painelAjusteLogo && (
          <div className={`absolute top-24 left-8 ${bgCard} p-5 rounded-2xl shadow-2xl border-2 z-50 w-64`} style={{ borderColor: corPrimaria }}>
            <h4 className={`font-bold text-sm mb-4 ${textStrong} border-b border-slate-200/20 pb-2`}>Ajustar Posição da Logo</h4>
            <div className="space-y-3 text-xs">
              <label className={`block font-semibold ${textMuted}`}>Zoom ({logoSettings.scale}%)</label>
              <input type="range" min="10" max="300" value={logoSettings.scale} onChange={e => setLogoSettings({...logoSettings, scale: parseInt(e.target.value)})} className="w-full" style={{ accentColor: corPrimaria }} />
              <label className={`block font-semibold ${textMuted}`}>Eixo X</label>
              <input type="range" min="-100" max="100" value={logoSettings.x} onChange={e => setLogoSettings({...logoSettings, x: parseInt(e.target.value)})} className="w-full" style={{ accentColor: corPrimaria }} />
              <label className={`block font-semibold ${textMuted}`}>Eixo Y</label>
              <input type="range" min="-100" max="100" value={logoSettings.y} onChange={e => setLogoSettings({...logoSettings, y: parseInt(e.target.value)})} className="w-full" style={{ accentColor: corPrimaria }} />
            </div>
            <button onClick={() => setPainelAjusteLogo(false)} style={{ backgroundColor: corPrimaria }} className="w-full text-white py-2 mt-5 rounded-lg font-bold shadow hover:brightness-110">Concluir</button>
          </div>
        )}

        <nav className="flex space-x-3">
          {['Balanço Geral', 'Gráficos', 'Por Categoria', 'Relatório'].map((item) => (
            <button 
              key={item} 
              onClick={() => { setAbaAtiva(item); setMesAtivo(null); }}
              className={`font-bold py-2.5 px-6 rounded-full transition-all text-sm uppercase tracking-wide border-2 ${
                abaAtiva === item 
                  ? 'text-white shadow-md transform scale-105' 
                  : darkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 shadow' 
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow hover:shadow-md'
              }`} 
              style={{ 
                backgroundColor: abaAtiva === item ? corPrimaria : '',
                borderColor: abaAtiva === item ? corPrimaria : ''
              }} 
              onMouseOver={e => { if(abaAtiva !== item) e.currentTarget.style.borderColor = corPrimaria }} 
              onMouseOut={e => { if(abaAtiva !== item) e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0' }}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-6 relative">

          {/* SELETOR DE ANO */}
          <div className="flex flex-col items-center border-l border-slate-200/20 pl-6 pr-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Ano</span>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="bg-transparent font-black text-sm outline-none cursor-pointer text-center"
              style={{ color: corPrimaria }}
            >
              {Array.from(
                { length: (new Date().getFullYear() + 5) - 2024 + 1 }, 
                (_, i) => (2024 + i).toString()
              ).map(ano => (
                <option key={ano} value={ano} className="text-slate-800 bg-white">{ano}</option>
              ))}
            </select>
          </div>

          {!mesAtivo && (
            <button onClick={() => setCalcAberta(!calcAberta)} className={`p-2 rounded-lg transition-colors border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title="Calculadora">
              <svg className="w-5 h-5" style={{ color: corPrimaria }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </button>
          )}

          <div className="flex items-center cursor-pointer group px-4 border-l border-slate-200/20 gap-2" onClick={() => setAjustesAberto(!ajustesAberto)}>
            <div className="flex flex-col items-center">
              <div className="w-full flex flex-col gap-[3px] mb-1.5">
                <div className="h-[2px] rounded-full transition-colors" style={{ backgroundColor: ajustesAberto ? corPrimaria : '#94a3b8' }}></div>
                <div className="h-[2px] rounded-full transition-colors" style={{ backgroundColor: ajustesAberto ? corPrimaria : '#94a3b8' }}></div>
                <div className="h-[2px] rounded-full transition-colors" style={{ backgroundColor: ajustesAberto ? corPrimaria : '#94a3b8' }}></div>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${ajustesAberto ? '' : textMuted}`} style={{ color: ajustesAberto ? corPrimaria : '' }}>
                Ajustes
              </span>
            </div>
            <svg className={`w-3.5 h-3.5 mt-2.5 transition-transform duration-300 ${ajustesAberto ? 'rotate-180' : 'rotate-0'}`} style={{ color: ajustesAberto ? corPrimaria : '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </header>

      {/* ================= MENU DE AJUSTES GERAL ================= */}
      {ajustesAberto && (
        <div className="print-ocultar bg-slate-900 text-white p-4 shadow-inner border-t border-slate-700 transition-all z-20" style={{ borderTopColor: corPrimaria, borderTopWidth: '2px' }}>
          
          {/* Adicionado overflow-x-auto e removido flex-wrap para forçar 1 linha */}
          <div className="flex justify-between items-center max-w-7xl mx-auto gap-4 overflow-x-auto custom-scroll pb-1">
            
            {/* GRUPO DA ESQUERDA (Botões menores: text-xs, py-1.5) */}
            <div className="flex items-center gap-3">
              <button onClick={() => setModalDespesasBase(true)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border transition-colors font-bold shadow flex items-center gap-1.5 text-xs" style={{ borderColor: corPrimaria }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke={corPrimaria} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Cadastrar Despesas
              </button>
              
              <button onClick={() => setModalInstrucoes(true)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-bold shadow flex items-center gap-1.5 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke={corPrimaria} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Instruções categorias
              </button>
            </div>
            
            {/* GRUPO DA DIREITA (Removido flex-wrap, botões menores) */}
            <div className="flex items-center gap-2">
              <button onClick={() => setModalLogo(true)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Adicionar Logo</button>
              <button onClick={() => setPainelAjusteLogo(!painelAjusteLogo)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Ajustar Logo</button>
              
              <div className="whitespace-nowrap relative overflow-hidden bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: corPrimaria }}></span> Cor Tema
                <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              
              <div className="whitespace-nowrap flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded shadow border border-slate-700 cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
                <span className="text-xs">Modo Escuro</span>
                <div className={`w-7 h-3.5 rounded-full relative transition-colors ${darkMode ? '' : 'bg-slate-600'}`} style={{ backgroundColor: darkMode ? corPrimaria : '' }}>
                  <span className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-3.5' : ''}`}></span>
                </div>
              </div>
              
              <div className="whitespace-nowrap flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded shadow border border-slate-700 cursor-pointer" onClick={() => setDuplicadosAtivo(!duplicadosAtivo)}>
                <span className="text-xs">Duplicados</span>
                <div className={`w-7 h-3.5 rounded-full relative transition-colors ${duplicadosAtivo ? '' : 'bg-slate-600'}`} style={{ backgroundColor: duplicadosAtivo ? corPrimaria : '' }}>
                  <span className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${duplicadosAtivo ? 'translate-x-3.5' : ''}`}></span>
                </div>
              </div>

              {/* BOTÃO DE BACKUP EXCEL */}
              <button 
                onClick={gerarBackupExcel} 
                className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded shadow border border-emerald-700 transition-colors font-bold flex items-center gap-1.5 text-xs text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO CONDICIONAL DAS TELAS */}
      {mesAtivo ? (
        <>
          <div className="print-ocultar shadow-md px-8 py-3 flex justify-between items-center text-white z-0" style={{ backgroundColor: corPrimaria }}>
            <div className="flex items-center gap-4">
              <button onClick={() => setMesAtivo(null)} className="flex items-center gap-2 hover:bg-white/20 transition-colors bg-black/10 px-4 py-2 rounded-lg border border-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <span className="font-bold uppercase text-sm">Início</span>
              </button>
              <button onClick={() => setCalcAberta(!calcAberta)} className="bg-black/10 hover:bg-black/20 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 border border-white/10">
                <span className="text-sm">Calculadora</span>
              </button>
            </div>

            <div className="flex items-center gap-8 w-1/3 justify-center">
              {meses.indexOf(mesAtivo) > 0 ? (
                <button onClick={() => setMesAtivo(meses[meses.indexOf(mesAtivo) - 1])} className="hover:bg-black/20 p-2 rounded-full transition-colors flex items-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
              ) : <div className="w-10"></div>}
              <h1 className="text-3xl font-black uppercase tracking-widest w-48 text-center">{mesAtivo}</h1>
              {meses.indexOf(mesAtivo) < 11 ? (
                <button onClick={() => setMesAtivo(meses[meses.indexOf(mesAtivo) + 1])} className="hover:bg-black/20 p-2 rounded-full transition-colors flex items-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                </button>
              ) : <div className="w-10"></div>}
            </div>

            <div className="flex gap-4">
              <div className={`${bgCard} rounded-lg shadow px-4 py-1.5 flex flex-col items-center min-w-[120px]`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Despesas</span>
                <span className="font-black text-lg text-red-500">{formatarMoeda(totalDespesasMes)}</span>
              </div>
              <div className={`${bgCard} rounded-lg shadow px-4 py-1.5 flex flex-col items-center min-w-[120px]`}>
                <span className="text-[10px] font-bold uppercase" style={{ color: corPrimaria }}>Saldo do Mês</span>
                <span className={`font-black text-lg ${lucroOperacional >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroOperacional)}</span>
              </div>
            </div>
          </div>

          <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
            <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6`} style={{ borderTopColor: corPrimaria }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'} ${textMuted} uppercase text-xs tracking-wider border-b-2 border-slate-200/10`}>
                    <th className="p-4 w-24 text-center">Dia</th>
                    <th className="p-4 w-1/4">Tipo de Despesa</th>
                    <th className="p-4 w-1/3">Descrição</th>
                    <th className="p-4 w-40 text-right">Valor</th>
                    <th className="p-4 w-28 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/80 border-slate-200'} border-b-2`}>
                    <td className="p-3">
                      <input type="number" min="1" max={getMaxDias(mesAtivo)} value={formDia} onChange={(e) => { const val = parseInt(e.target.value); if (val > getMaxDias(mesAtivo)) setFormDia(getMaxDias(mesAtivo).toString()); else setFormDia(e.target.value); }} placeholder="Dia" className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 text-center font-bold shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-700'}`} style={{ outlineColor: corPrimaria }} />
                    </td>
                    <td className="p-3">
                      <select value={formDespesa} onChange={(e) => setFormDespesa(e.target.value)} className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 font-semibold shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`} style={{ outlineColor: corPrimaria }}>
                        <option value="">Selecionar...</option>
                        {despesasCadastradas.map((d) => <option key={d.nome} value={d.nome}>{d.nome}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <input type="text" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Descrição..." className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'}`} style={{ outlineColor: corPrimaria }} />
                    </td>
                    <td className="p-3">
                      <input type="text" value={formValor} onChange={handleValorChange} placeholder="R$ 0,00" className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 text-right font-bold shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'}`} style={{ outlineColor: corPrimaria }} />
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={adicionarDespesa} style={{ backgroundColor: corPrimaria }} className="w-full text-white font-bold py-2.5 rounded-lg shadow hover:brightness-110 transition-colors text-sm">Adicionar</button>
                    </td>
                  </tr>
                  
                  {lancamentosOrdenados.filter(l => l.mes === mesAtivo).length > 0 ? (
                    lancamentosOrdenados.filter(l => l.mes === mesAtivo).map((lanc) => (
                      <tr key={lanc.id} className={`border-b border-slate-200/10 transition-colors ${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                        <td className={`py-1.5 px-4 text-center font-bold text-sm ${textStrong}`}>{lanc.dia.toString().padStart(2, '0')}</td>
                        <td className={`py-1.5 px-4 font-bold text-sm ${textStrong}`}>{lanc.despesa}</td>
                        <td className={`py-1.5 px-4 text-xs ${textMuted}`}>{lanc.descricao || '-'}</td>
                        <td className={`py-1.5 px-4 text-right font-black text-sm text-red-500`}>- {formatarMoeda(lanc.valor)}</td>
                        <td className="py-1.5 px-4 text-center">
                          <button onClick={() => apagarDespesa(lanc.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all" title="Apagar">
                            <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center p-4 text-sm text-slate-400 italic border-t border-slate-200/10">Nenhuma despesa lançada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6 flex flex-col items-center justify-center`} style={{ borderTopColor: corPrimaria }}>
                <h3 className={`text-lg font-bold ${textStrong} border-b border-slate-200/10 pb-3 mb-4 uppercase tracking-wider`}>Total por Tipo de Despesa</h3>
                <div className="space-y-4 w-full">
                  {analiseDespesas.dados.map((item) => (
                    <div key={item.nome} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.cor }}></span>
                        <span className={`font-semibold truncate max-w-[150px] ${textStrong}`}>{item.nome}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className={`text-sm font-bold w-12 text-right`} style={{ color: corPrimaria }}>{item.percentual.toFixed(1)}%</span>
                        <span className="font-bold text-red-500 w-24 text-right">{formatarMoeda(item.valor)}</span>
                      </div>
                    </div>
                  ))}
                  {analiseDespesas.dados.length === 0 && <span className={textMuted}>Sem dados.</span>}
                </div>
              </div>

              <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6 flex flex-col items-center justify-center`} style={{ borderTopColor: corPrimaria }}>
                <h3 className={`text-lg font-bold ${textStrong} mb-6 uppercase tracking-wider w-full text-left`}>Composição de Gastos</h3>
                {lancamentosDoMes.length > 0 ? (
                  <div className="relative flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full shadow-inner transform transition-transform hover:scale-105" style={{ background: analiseDespesas.gradiente }}></div>
                    <div className={`absolute w-24 h-24 ${bgCard} rounded-full shadow-lg flex items-center justify-center`}>
                      <div className="text-center">
                        <span className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest`}>Total</span>
                        <span className={`block text-sm font-black ${textStrong}`}>{formatarMoeda(totalDespesasMes).replace('R$', '')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-sm py-10">Nenhum dado para exibir.</div>
                )}
              </div>
            </div>
          </main>
        </>
      ) : abaAtiva === 'Balanço Geral' ? (
        <BalancoGeral 
          meses={meses} lancamentos={lancamentos} faturamentos={faturamentos} setFaturamentos={setFaturamentos}
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
        />
      ) : abaAtiva === 'Gráficos' ? (
        <Graficos
          meses={meses} lancamentos={lancamentos} faturamentos={faturamentos} 
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
        />
      ) : abaAtiva === 'Por Categoria' ? (
        <PorCategoria 
          meses={meses} lancamentos={lancamentos} despesasCadastradas={despesasCadastradas} 
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
        />
      ) : abaAtiva === 'Relatório' ? (
        <Relatorio 
          meses={meses} lancamentos={lancamentos} faturamentos={faturamentos} despesasCadastradas={despesasCadastradas} 
          corPrimaria={corPrimaria} darkMode={darkMode} anoSelecionado={anoSelecionado}
        />
      ) : (
        <Dashboard 
          meses={meses} setMesAtivo={setMesAtivo} bgCard={bgCard} corPrimaria={corPrimaria} textStrong={textStrong} textMuted={textMuted} darkMode={darkMode} mesResumoDash={mesResumoDash} setMesResumoDash={setMesResumoDash} totalDespesasMes={totalDespesasMes} maiorGasto={maiorGasto} lucroOperacional={lucroOperacional} mesFaturamento={mesFaturamento} setMesFaturamento={setMesFaturamento} inputFaturamento={inputFaturamento} setInputFaturamento={setInputFaturamento} salvarFaturamento={salvarFaturamento} receitasTotais={receitasTotais} despesasTotais={despesasTotais} lucroTotalAnual={lucroTotalAnual} formatarMoeda={formatarMoeda}
        />
      )}
    </div>
  );
}