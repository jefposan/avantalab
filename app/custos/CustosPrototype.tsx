"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import DraggableModalCard from "../components/DraggableModalCard";
import ModalConfirmacao from "../components/ModalConfirmacao";
import {
  formatarMoeda,
  formatarMoedaDigitada,
  moedaDigitadaParaNumero,
} from "../lib/formatters";

type View = "visao" | "composicao" | "insumos" | "simulador" | "meta";

type Insumo = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  custo: number;
};

type Componente = {
  id: string;
  insumoId: string;
  quantidade: number;
  perda: number;
};

type Produto = {
  id: string;
  nome: string;
  descricao: string;
  status: "Rascunho" | "Validado";
  componentes: Componente[];
  indiretos: number;
  impostos: number;
  taxas: number;
  margem: number;
};

type SavedState = {
  insumos: Insumo[];
  produtos: Produto[];
  produtoAtivoId: string;
  metaVendas: MetaVendas;
};

type MetaVendas = {
  despesasOperacionais: number;
  lucroDesejado: number;
  margemContribuicao: number;
  vendasRealizadas: number;
};

type NovoInsumo = {
  nome: string;
  categoria: string;
  unidade: string;
  custo: number | null;
};

type EdicaoInsumo = {
  nome: string;
  categoria: string;
  unidade: string;
  custo: number | null;
};

type MenuInsumo = {
  insumoId: string;
  top: number;
  left: number;
};

type NovoProduto = {
  nome: string;
  descricao: string;
  indiretos: number;
  impostos: number;
  taxas: number;
  margem: number;
};

type LegacyState = {
  insumos?: Insumo[];
  componentes?: Componente[];
  indiretos?: number;
  impostos?: number;
  taxas?: number;
  margem?: number;
};

const STORAGE_KEY = "avantalab:prototipo-custos:v2";
const LEGACY_STORAGE_KEY = "avantalab:prototipo-custos:v1";

const INSUMOS_INICIAIS: Insumo[] = [
  { id: "base", nome: "Base creme neutra", categoria: "Matéria-prima", unidade: "kg", custo: 42.9 },
  { id: "frasco", nome: "Frasco âmbar 150 ml", categoria: "Embalagem", unidade: "un", custo: 2.4 },
  { id: "rotulo", nome: "Rótulo adesivo", categoria: "Embalagem", unidade: "un", custo: 0.65 },
  { id: "mao-obra", nome: "Mão de obra de produção", categoria: "Mão de obra", unidade: "h", custo: 28 },
  { id: "energia", nome: "Energia elétrica", categoria: "Operação", unidade: "kWh", custo: 1.08 },
  { id: "base-sabonete", nome: "Base sabonete líquida", categoria: "Matéria-prima", unidade: "kg", custo: 18.7 },
  { id: "essencia-lavanda", nome: "Essência de lavanda", categoria: "Matéria-prima", unidade: "kg", custo: 186.5 },
  { id: "vitamina-c", nome: "Vitamina C estabilizada", categoria: "Matéria-prima", unidade: "kg", custo: 428.9 },
  { id: "acido-hialuronico", nome: "Ácido hialurônico", categoria: "Matéria-prima", unidade: "kg", custo: 685.4 },
  { id: "alcool-cereais", nome: "Álcool de cereais", categoria: "Matéria-prima", unidade: "l", custo: 18.9 },
  { id: "essencia-citrica", nome: "Essência cítrica", categoria: "Matéria-prima", unidade: "l", custo: 149.8 },
  { id: "frasco-pump", nome: "Frasco pump 250 ml", categoria: "Embalagem", unidade: "un", custo: 3.65 },
  { id: "frasco-conta-gotas", nome: "Frasco conta-gotas 30 ml", categoria: "Embalagem", unidade: "un", custo: 4.2 },
  { id: "frasco-spray", nome: "Frasco spray 200 ml", categoria: "Embalagem", unidade: "un", custo: 3.1 },
  { id: "cartucho", nome: "Cartucho individual", categoria: "Embalagem", unidade: "un", custo: 1.35 },
];

const PRODUTOS_INICIAIS: Produto[] = [
  {
    id: "creme-hidratante",
    nome: "Creme Hidratante Corporal",
    descricao: "150 ml",
    status: "Validado",
    componentes: [
      { id: "creme-base", insumoId: "base", quantidade: 0.15, perda: 3 },
      { id: "creme-frasco", insumoId: "frasco", quantidade: 1, perda: 0 },
      { id: "creme-rotulo", insumoId: "rotulo", quantidade: 1, perda: 2 },
      { id: "creme-mao", insumoId: "mao-obra", quantidade: 0.18, perda: 0 },
      { id: "creme-energia", insumoId: "energia", quantidade: 0.25, perda: 0 },
    ],
    indiretos: 12,
    impostos: 8,
    taxas: 4,
    margem: 30,
  },
  {
    id: "serum-vitamina-c",
    nome: "Sérum Facial Vitamina C",
    descricao: "30 ml",
    status: "Rascunho",
    componentes: [
      { id: "serum-base", insumoId: "base", quantidade: 0.022, perda: 4 },
      { id: "serum-vitamina", insumoId: "vitamina-c", quantidade: 0.0045, perda: 6 },
      { id: "serum-hialuronico", insumoId: "acido-hialuronico", quantidade: 0.0008, perda: 5 },
      { id: "serum-frasco", insumoId: "frasco-conta-gotas", quantidade: 1, perda: 1 },
      { id: "serum-cartucho", insumoId: "cartucho", quantidade: 1, perda: 1 },
      { id: "serum-mao", insumoId: "mao-obra", quantidade: 0.22, perda: 0 },
    ],
    indiretos: 15,
    impostos: 9,
    taxas: 5,
    margem: 38,
  },
  {
    id: "sabonete-lavanda",
    nome: "Sabonete Líquido Lavanda",
    descricao: "250 ml",
    status: "Validado",
    componentes: [
      { id: "sabonete-base", insumoId: "base-sabonete", quantidade: 0.24, perda: 3 },
      { id: "sabonete-essencia", insumoId: "essencia-lavanda", quantidade: 0.006, perda: 4 },
      { id: "sabonete-frasco", insumoId: "frasco-pump", quantidade: 1, perda: 1 },
      { id: "sabonete-rotulo", insumoId: "rotulo", quantidade: 1, perda: 2 },
      { id: "sabonete-mao", insumoId: "mao-obra", quantidade: 0.14, perda: 0 },
    ],
    indiretos: 11,
    impostos: 8,
    taxas: 4,
    margem: 32,
  },
  {
    id: "home-spray-citrico",
    nome: "Home Spray Cítrico",
    descricao: "200 ml",
    status: "Rascunho",
    componentes: [
      { id: "spray-alcool", insumoId: "alcool-cereais", quantidade: 0.16, perda: 2 },
      { id: "spray-essencia", insumoId: "essencia-citrica", quantidade: 0.024, perda: 5 },
      { id: "spray-frasco", insumoId: "frasco-spray", quantidade: 1, perda: 1 },
      { id: "spray-rotulo", insumoId: "rotulo", quantidade: 1, perda: 2 },
      { id: "spray-mao", insumoId: "mao-obra", quantidade: 0.12, perda: 0 },
    ],
    indiretos: 10,
    impostos: 10,
    taxas: 4,
    margem: 35,
  },
  {
    id: "oleo-corporal-lavanda",
    nome: "Óleo Corporal de Lavanda",
    descricao: "120 ml",
    status: "Validado",
    componentes: [
      { id: "oleo-base", insumoId: "base", quantidade: 0.1, perda: 3 },
      { id: "oleo-essencia", insumoId: "essencia-lavanda", quantidade: 0.004, perda: 4 },
      { id: "oleo-frasco", insumoId: "frasco-spray", quantidade: 1, perda: 1 },
      { id: "oleo-rotulo", insumoId: "rotulo", quantidade: 1, perda: 2 },
      { id: "oleo-mao", insumoId: "mao-obra", quantidade: 0.12, perda: 0 },
    ],
    indiretos: 12,
    impostos: 8,
    taxas: 4,
    margem: 34,
  },
  {
    id: "serum-hialuronico",
    nome: "Sérum Ácido Hialurônico",
    descricao: "30 ml",
    status: "Rascunho",
    componentes: [
      { id: "hialuronico-base", insumoId: "base", quantidade: 0.024, perda: 4 },
      { id: "hialuronico-ativo", insumoId: "acido-hialuronico", quantidade: 0.0012, perda: 6 },
      { id: "hialuronico-frasco", insumoId: "frasco-conta-gotas", quantidade: 1, perda: 1 },
      { id: "hialuronico-cartucho", insumoId: "cartucho", quantidade: 1, perda: 1 },
      { id: "hialuronico-mao", insumoId: "mao-obra", quantidade: 0.2, perda: 0 },
    ],
    indiretos: 15,
    impostos: 9,
    taxas: 5,
    margem: 40,
  },
  {
    id: "sabonete-citrico",
    nome: "Sabonete Líquido Cítrico",
    descricao: "250 ml",
    status: "Validado",
    componentes: [
      { id: "sabonete-citrico-base", insumoId: "base-sabonete", quantidade: 0.24, perda: 3 },
      { id: "sabonete-citrico-essencia", insumoId: "essencia-citrica", quantidade: 0.006, perda: 4 },
      { id: "sabonete-citrico-frasco", insumoId: "frasco-pump", quantidade: 1, perda: 1 },
      { id: "sabonete-citrico-rotulo", insumoId: "rotulo", quantidade: 1, perda: 2 },
      { id: "sabonete-citrico-mao", insumoId: "mao-obra", quantidade: 0.14, perda: 0 },
    ],
    indiretos: 11,
    impostos: 8,
    taxas: 4,
    margem: 32,
  },
];

const NUMERO = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const NOVO_PRODUTO_INICIAL: NovoProduto = {
  nome: "",
  descricao: "",
  indiretos: 12,
  impostos: 8,
  taxas: 4,
  margem: 30,
};

const META_VENDAS_INICIAL: MetaVendas = {
  despesasOperacionais: 30000,
  lucroDesejado: 10000,
  margemContribuicao: 45,
  vendasRealizadas: 25000,
};

function moeda(valor: number) {
  return formatarMoeda(Number.isFinite(valor) ? valor : 0);
}

function valorMonetarioParaTexto(valor: number | null) {
  if (valor === null) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function textoMonetarioParaNumero(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.max(0, numero) : null;
}

function estadoInicial(): SavedState {
  return {
    insumos: INSUMOS_INICIAIS,
    produtos: PRODUTOS_INICIAIS,
    produtoAtivoId: PRODUTOS_INICIAIS[0].id,
    metaVendas: META_VENDAS_INICIAL,
  };
}

function completarInsumos(insumos: Insumo[]) {
  const idsExistentes = new Set(insumos.map((insumo) => insumo.id));
  return [
    ...insumos,
    ...INSUMOS_INICIAIS.filter((insumo) => !idsExistentes.has(insumo.id)),
  ];
}

function completarProdutos(produtos: Produto[]) {
  const idsExistentes = new Set(produtos.map((produto) => produto.id));
  return [
    ...produtos,
    ...PRODUTOS_INICIAIS.filter((produto) => !idsExistentes.has(produto.id)),
  ];
}

function normalizarEstado(estado: SavedState): SavedState {
  const inicial = estadoInicial();
  const produtosSalvos = Array.isArray(estado.produtos) && estado.produtos.length
    ? estado.produtos
    : inicial.produtos;
  const produtos = completarProdutos(produtosSalvos);
  const produtoAtivoId = produtos.some((produto) => produto.id === estado.produtoAtivoId)
    ? estado.produtoAtivoId
    : produtos[0].id;
  return {
    insumos: completarInsumos(Array.isArray(estado.insumos) ? estado.insumos : []),
    produtos,
    produtoAtivoId,
    metaVendas: estado.metaVendas ?? inicial.metaVendas,
  };
}

function migrarEstadoLegado(legado: LegacyState): SavedState {
  const inicial = estadoInicial();
  const produtoPrincipal = inicial.produtos[0];
  return {
    insumos: completarInsumos(Array.isArray(legado.insumos) ? legado.insumos : []),
    produtos: [
      {
        ...produtoPrincipal,
        componentes: Array.isArray(legado.componentes)
          ? legado.componentes
          : produtoPrincipal.componentes,
        indiretos: legado.indiretos ?? produtoPrincipal.indiretos,
        impostos: legado.impostos ?? produtoPrincipal.impostos,
        taxas: legado.taxas ?? produtoPrincipal.taxas,
        margem: legado.margem ?? produtoPrincipal.margem,
      },
      ...inicial.produtos.slice(1),
    ],
    produtoAtivoId: produtoPrincipal.id,
    metaVendas: inicial.metaVendas,
  };
}

function calcularProduto(produto: Produto, insumos: Insumo[]) {
  const linhas = produto.componentes.map((componente) => {
    const insumo = insumos.find((item) => item.id === componente.insumoId);
    const custoBase = (insumo?.custo ?? 0) * componente.quantidade;
    const custoTotal = custoBase * (1 + componente.perda / 100);
    return { componente, insumo, custoBase, custoTotal };
  });
  const diretos = linhas.reduce((total, linha) => total + linha.custoTotal, 0);
  const indiretosValor = diretos * (produto.indiretos / 100);
  const custoTotal = diretos + indiretosValor;
  const descontos = (produto.impostos + produto.taxas + produto.margem) / 100;
  const precoSugerido = descontos < 1 ? custoTotal / (1 - descontos) : 0;
  const lucroUnitario = precoSugerido * (produto.margem / 100);
  return { linhas, diretos, indiretosValor, custoTotal, precoSugerido, lucroUnitario };
}

export default function CustosPrototype() {
  const [view, setView] = useState<View>("composicao");
  const [dados, setDados] = useState<SavedState>(estadoInicial);
  const [carregado, setCarregado] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [novoInsumo, setNovoInsumo] = useState<NovoInsumo>({
    nome: "",
    categoria: "Matéria-prima",
    unidade: "un",
    custo: null,
  });
  const [modalNovoProdutoAberto, setModalNovoProdutoAberto] = useState(false);
  const [novoProduto, setNovoProduto] = useState<NovoProduto>(NOVO_PRODUTO_INICIAL);
  const [erroNovoProduto, setErroNovoProduto] = useState("");
  const [insumoParaAdicionar, setInsumoParaAdicionar] = useState("");
  const [insumoExclusaoId, setInsumoExclusaoId] = useState("");
  const [insumoEdicaoId, setInsumoEdicaoId] = useState("");
  const [edicaoInsumo, setEdicaoInsumo] = useState<EdicaoInsumo | null>(null);
  const [menuInsumo, setMenuInsumo] = useState<MenuInsumo | null>(null);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY);
      const legado = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (salvo) {
        setDados(normalizarEstado(JSON.parse(salvo) as SavedState));
      } else if (legado) {
        setDados(migrarEstadoLegado(JSON.parse(legado) as LegacyState));
      }
      setTemaEscuro(
        window.localStorage.getItem(`${STORAGE_KEY}:tema`) === "escuro"
        || window.localStorage.getItem(`${LEGACY_STORAGE_KEY}:tema`) === "escuro",
      );
    } catch {
      setMensagem("Não foi possível recuperar os dados locais.");
    } finally {
      setCarregado(true);
    }
  }, []);

  useEffect(() => {
    if (!carregado) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [carregado, dados]);

  useEffect(() => {
    if (!carregado) return;
    window.localStorage.setItem(`${STORAGE_KEY}:tema`, temaEscuro ? "escuro" : "claro");
  }, [carregado, temaEscuro]);

  useEffect(() => {
    if (!mensagem) return;
    const timer = window.setTimeout(() => setMensagem(""), 2600);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  useEffect(() => {
    if (!menuInsumo) return;
    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuInsumo(null);
    };
    const fecharAoReposicionar = () => setMenuInsumo(null);
    document.addEventListener("keydown", fecharComEscape);
    window.addEventListener("resize", fecharAoReposicionar);
    window.addEventListener("scroll", fecharAoReposicionar, true);
    return () => {
      document.removeEventListener("keydown", fecharComEscape);
      window.removeEventListener("resize", fecharAoReposicionar);
      window.removeEventListener("scroll", fecharAoReposicionar, true);
    };
  }, [menuInsumo]);

  const produtoAtivo =
    dados.produtos.find((produto) => produto.id === dados.produtoAtivoId)
    ?? dados.produtos[0]
    ?? PRODUTOS_INICIAIS[0];

  const calculosProdutos = useMemo(() => {
    return dados.produtos.map((produto) => ({
      produto,
      calculo: calcularProduto(produto, dados.insumos),
    }));
  }, [dados]);

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return calculosProdutos;
    return calculosProdutos.filter(({ produto }) =>
      `${produto.nome} ${produto.descricao} ${produto.status}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo),
    );
  }, [buscaProduto, calculosProdutos]);

  const calculo = useMemo(
    () => calcularProduto(produtoAtivo, dados.insumos),
    [dados.insumos, produtoAtivo],
  );

  const resumoCarteira = useMemo(() => {
    const insumosUtilizados = new Set(
      dados.produtos.flatMap((produto) =>
        produto.componentes.map((componente) => componente.insumoId),
      ),
    );
    return {
      validados: dados.produtos.filter((produto) => produto.status === "Validado").length,
      rascunhos: dados.produtos.filter((produto) => produto.status === "Rascunho").length,
      insumosUtilizados: insumosUtilizados.size,
    };
  }, [dados.produtos]);

  const calculoMeta = useMemo(() => {
    const margemDecimal = Math.min(100, Math.max(0, dados.metaVendas.margemContribuicao)) / 100;
    const pontoEquilibrio = margemDecimal > 0
      ? dados.metaVendas.despesasOperacionais / margemDecimal
      : 0;
    const metaComLucro = margemDecimal > 0
      ? (dados.metaVendas.despesasOperacionais + dados.metaVendas.lucroDesejado) / margemDecimal
      : 0;
    const faltaVender = Math.max(0, metaComLucro - dados.metaVendas.vendasRealizadas);
    const progresso = metaComLucro > 0
      ? Math.min(100, (dados.metaVendas.vendasRealizadas / metaComLucro) * 100)
      : 0;
    return { pontoEquilibrio, metaComLucro, faltaVender, progresso };
  }, [dados.metaVendas]);

  function atualizarMeta<K extends keyof MetaVendas>(campo: K, valor: MetaVendas[K]) {
    setDados((atual) => ({
      ...atual,
      metaVendas: { ...atual.metaVendas, [campo]: Math.max(0, valor) },
    }));
  }

  function atualizarProduto(
    atualizador: (produto: Produto) => Produto,
    produtoId = produtoAtivo.id,
  ) {
    setDados((atual) => ({
      ...atual,
      produtos: atual.produtos.map((produto) =>
        produto.id === produtoId ? atualizador(produto) : produto,
      ),
    }));
  }

  function selecionarProduto(produtoId: string) {
    setDados((atual) => ({ ...atual, produtoAtivoId: produtoId }));
    setInsumoParaAdicionar("");
  }

  function cadastrarProduto(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nome = novoProduto.nome.trim();
    const descricao = novoProduto.descricao.trim();
    if (!nome || !descricao) {
      setErroNovoProduto("Informe o nome e a apresentação do produto.");
      return;
    }
    if (
      dados.produtos.some(
        (produto) => produto.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"),
      )
    ) {
      setErroNovoProduto("Já existe um produto com esse nome.");
      return;
    }
    const id = `produto-${Date.now()}`;
    const produto: Produto = {
      id,
      nome,
      descricao,
      status: "Rascunho",
      componentes: [],
      indiretos: Math.max(0, novoProduto.indiretos),
      impostos: Math.max(0, novoProduto.impostos),
      taxas: Math.max(0, novoProduto.taxas),
      margem: Math.max(0, novoProduto.margem),
    };
    setDados((atual) => ({
      ...atual,
      produtos: [...atual.produtos, produto],
      produtoAtivoId: id,
    }));
    setNovoProduto(NOVO_PRODUTO_INICIAL);
    setErroNovoProduto("");
    setModalNovoProdutoAberto(false);
    setInsumoParaAdicionar("");
    setView("composicao");
    setMensagem("Produto cadastrado. Adicione os componentes para formar o custo.");
  }

  function atualizarComponente(id: string, campo: "quantidade" | "perda", valor: number) {
    atualizarProduto((produto) => ({
      ...produto,
      componentes: produto.componentes.map((item) =>
        item.id === id ? { ...item, [campo]: Math.max(0, valor || 0) } : item,
      ),
    }));
  }

  function atualizarCustoInsumo(id: string, custo: number) {
    setDados((atual) => ({
      ...atual,
      insumos: atual.insumos.map((item) =>
        item.id === id ? { ...item, custo: Math.max(0, custo || 0) } : item,
      ),
    }));
  }

  function iniciarEdicaoInsumo(insumo: Insumo) {
    setMenuInsumo(null);
    setInsumoEdicaoId(insumo.id);
    setEdicaoInsumo({
      nome: insumo.nome,
      categoria: insumo.categoria,
      unidade: insumo.unidade,
      custo: insumo.custo,
    });
  }

  function abrirMenuInsumo(
    evento: React.MouseEvent<HTMLButtonElement>,
    insumoId: string,
  ) {
    const posicao = evento.currentTarget.getBoundingClientRect();
    const largura = 168;
    const alturaEstimada = 132;
    const margem = 12;
    const espacoDireita = window.innerWidth - posicao.right;
    const left = espacoDireita >= largura + margem
      ? posicao.right + 6
      : posicao.left - largura - 6;
    setMenuInsumo({
      insumoId,
      top: Math.max(
        margem,
        Math.min(window.innerHeight - alturaEstimada - margem, posicao.top),
      ),
      left: Math.max(margem, Math.min(window.innerWidth - largura - margem, left)),
    });
  }

  function cancelarEdicaoInsumo() {
    setInsumoEdicaoId("");
    setEdicaoInsumo(null);
  }

  function salvarEdicaoInsumo() {
    if (
      !insumoEdicaoId
      || !edicaoInsumo
      || !edicaoInsumo.nome.trim()
      || !edicaoInsumo.unidade.trim()
      || edicaoInsumo.custo === null
    ) {
      setMensagem("Informe nome, unidade e custo válidos.");
      return;
    }
    setDados((atual) => ({
      ...atual,
      insumos: atual.insumos.map((insumo) =>
        insumo.id === insumoEdicaoId
          ? {
              ...insumo,
              nome: edicaoInsumo.nome.trim(),
              categoria: edicaoInsumo.categoria,
              unidade: edicaoInsumo.unidade.trim(),
              custo: Math.max(0, edicaoInsumo.custo ?? 0),
            }
          : insumo,
      ),
    }));
    cancelarEdicaoInsumo();
    setMensagem("Insumo atualizado.");
  }

  function adicionarComponente() {
    if (!insumoParaAdicionar) {
      setMensagem("Escolha um insumo para adicionar.");
      return;
    }
    if (produtoAtivo.componentes.some((item) => item.insumoId === insumoParaAdicionar)) {
      setMensagem("Esse insumo já faz parte da composição.");
      return;
    }
    atualizarProduto((produto) => ({
      ...produto,
      componentes: [
        ...produto.componentes,
        {
          id: `componente-${Date.now()}`,
          insumoId: insumoParaAdicionar,
          quantidade: 1,
          perda: 0,
        },
      ],
    }));
    setInsumoParaAdicionar("");
    setMensagem("Componente adicionado.");
  }

  function removerComponente(id: string) {
    atualizarProduto((produto) => ({
      ...produto,
      componentes: produto.componentes.filter((item) => item.id !== id),
    }));
    setMensagem("Componente removido.");
  }

  function cadastrarInsumo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const custo = novoInsumo.custo;
    if (!novoInsumo.nome.trim() || custo === null || !Number.isFinite(custo) || custo < 0) {
      setMensagem("Informe o nome e um custo válido.");
      return;
    }
    const item: Insumo = {
      id: `insumo-${Date.now()}`,
      nome: novoInsumo.nome.trim(),
      categoria: novoInsumo.categoria,
      unidade: novoInsumo.unidade.trim() || "un",
      custo,
    };
    setDados((atual) => ({ ...atual, insumos: [...atual.insumos, item] }));
    setNovoInsumo({ nome: "", categoria: "Matéria-prima", unidade: "un", custo: null });
    setMensagem("Insumo cadastrado.");
  }

  function excluirInsumo(insumo: Insumo) {
    const estavaNaComposicao = dados.produtos.some(
      (produto) => produto.componentes.some(
        (componente) => componente.insumoId === insumo.id,
      ),
    );
    setDados((atual) => ({
      ...atual,
      insumos: atual.insumos.filter((item) => item.id !== insumo.id),
      produtos: atual.produtos.map((produto) => ({
        ...produto,
        componentes: produto.componentes.filter(
          (componente) => componente.insumoId !== insumo.id,
        ),
      })),
    }));
    if (insumoParaAdicionar === insumo.id) setInsumoParaAdicionar("");
    if (insumoEdicaoId === insumo.id) cancelarEdicaoInsumo();
    setInsumoExclusaoId("");
    setMensagem(
      estavaNaComposicao
        ? "Insumo excluído e removido das composições."
        : "Insumo excluído.",
    );
  }

  function restaurarExemplo() {
    setDados(estadoInicial());
    setInsumoExclusaoId("");
    setMensagem("Carteira de produtos de exemplo restaurada.");
  }

  const navegacao: Array<{ id: View; label: string; sinal: string }> = [
    { id: "visao", label: "Visão geral", sinal: "◫" },
    { id: "composicao", label: "Composição", sinal: "≡" },
    { id: "insumos", label: "Insumos", sinal: "□" },
    { id: "simulador", label: "Simulador", sinal: "%" },
    { id: "meta", label: "Meta de vendas", sinal: "◎" },
  ];
  const insumoEmExclusao =
    dados.insumos.find((insumo) => insumo.id === insumoExclusaoId) ?? null;
  const insumoNoMenu =
    dados.insumos.find((insumo) => insumo.id === menuInsumo?.insumoId) ?? null;
  const insumoEmExclusaoEstaEmUso = insumoEmExclusao
    ? dados.produtos.some(
        (produto) => produto.componentes.some(
          (componente) => componente.insumoId === insumoEmExclusao.id,
        ),
      )
    : false;

  return (
    <div className={temaEscuro ? "custos-app app-shell tema-escuro" : "custos-app app-shell"}>
      <header className="topbar">
        <div className="marca">
          <span className="marca-simbolo" aria-hidden="true">A</span>
          <div>
            <strong>AvantaLab</strong>
            <span>Custos e Precificação</span>
          </div>
        </div>
        <div className="topbar-acoes">
          <span className="selo-local"><i /> Protótipo local</span>
          <button
            className="botao-icone"
            type="button"
            aria-label={temaEscuro ? "Usar tema claro" : "Usar tema escuro"}
            onClick={() => setTemaEscuro((atual) => !atual)}
          >
            {temaEscuro ? "☀" : "☾"}
          </button>
          <button className="avatar" type="button" aria-label="Perfil de demonstração">JD</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav aria-label="Navegação do protótipo">
            {navegacao.map((item) => (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? "nav-item ativo" : "nav-item"}
                onClick={() => {
                  setMenuInsumo(null);
                  setView(item.id);
                }}
              >
                <span aria-hidden="true">{item.sinal}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-nota">
            <strong>Ambiente seguro</strong>
            <p>Os dados ficam somente neste navegador e não chegam ao ERP.</p>
          </div>
        </aside>

        <main className="conteudo">
          {view === "visao" && (
            <>
              <Cabecalho
                titulo="Visão geral"
                descricao="Acompanhe a situação das composições da carteira em teste."
                acao={
                  <div className="cabecalho-acoes">
                    <SeletorProduto
                      produtos={dados.produtos}
                      produtoAtivoId={produtoAtivo.id}
                      onChange={selecionarProduto}
                    />
                    <button
                      className="botao-primario"
                      type="button"
                      onClick={() => {
                        setErroNovoProduto("");
                        setModalNovoProdutoAberto(true);
                      }}
                    >
                      Novo produto
                    </button>
                  </div>
                }
              />
              <section className="metricas" aria-label="Situação da carteira de produtos">
                <Metrica rotulo="Produtos cadastrados" valor={String(dados.produtos.length)} detalhe="Carteira local em análise" destaque />
                <Metrica rotulo="Composições validadas" valor={String(resumoCarteira.validados)} detalhe="Prontas para utilização" />
                <Metrica rotulo="Composições em rascunho" valor={String(resumoCarteira.rascunhos)} detalhe="Precisam de revisão" />
                <Metrica rotulo="Insumos utilizados" valor={String(resumoCarteira.insumosUtilizados)} detalhe={`${dados.insumos.length} insumos cadastrados na base`} />
              </section>
              <section className="painel carteira-produtos" aria-label="Produtos cadastrados">
                <div className="painel-titulo">
                  <div><span>Carteira local</span><h2>Produtos cadastrados</h2></div>
                  <label className="busca-produto">
                    <span>Procurar produto</span>
                    <input
                      type="search"
                      value={buscaProduto}
                      onChange={(evento) => setBuscaProduto(evento.target.value)}
                      placeholder="Nome ou apresentação"
                    />
                  </label>
                </div>
                <div
                  className="produto-lista"
                  aria-label={`${produtosFiltrados.length} produtos encontrados`}
                  tabIndex={produtosFiltrados.length > 1 ? 0 : undefined}
                >
                  {produtosFiltrados.map(({ produto, calculo: calculoProduto }) => (
                    <button
                      className={produto.id === produtoAtivo.id ? "produto-card ativo" : "produto-card"}
                      type="button"
                      key={produto.id}
                      onClick={() => selecionarProduto(produto.id)}
                    >
                      <span className={`produto-status ${produto.status === "Validado" ? "validado" : ""}`}>
                        {produto.status}
                      </span>
                      <strong>{produto.nome}</strong>
                      <small>{produto.descricao} · {produto.componentes.length} componentes</small>
                      <span>Custo <b>{moeda(calculoProduto.custoTotal)}</b></span>
                      <span>Preço <b>{moeda(calculoProduto.precoSugerido)}</b></span>
                    </button>
                  ))}
                  {produtosFiltrados.length === 0 && (
                    <div className="produto-lista-vazia" role="status">
                      Nenhum produto encontrado para “{buscaProduto.trim()}”.
                    </div>
                  )}
                </div>
              </section>
              <section className="grade-2">
                <article className="painel">
                  <div className="painel-titulo">
                    <div><span>{produtoAtivo.nome}</span><h2>Onde o dinheiro está</h2></div>
                    <button className="link-botao" type="button" onClick={() => setView("composicao")}>Editar composição</button>
                  </div>
                  <div className="barras">
                    {calculo.linhas
                      .slice()
                      .sort((a, b) => b.custoTotal - a.custoTotal)
                      .map((linha) => {
                        const percentual = calculo.custoTotal ? (linha.custoTotal / calculo.custoTotal) * 100 : 0;
                        return (
                          <div className="barra-linha" key={linha.componente.id}>
                            <div><span>{linha.insumo?.nome}</span><strong>{moeda(linha.custoTotal)}</strong></div>
                            <div className="barra-trilho"><i style={{ width: `${Math.max(3, percentual)}%` }} /></div>
                          </div>
                        );
                      })}
                  </div>
                </article>
                <article className="painel painel-alerta">
                  <span className="tag">Leitura rápida</span>
                  <h2>{produtoAtivo.status === "Validado" ? "Composição validada" : "Composição em revisão"}</h2>
                  <p>Os custos diretos representam {calculo.custoTotal ? ((calculo.diretos / calculo.custoTotal) * 100).toFixed(0) : 0}% do custo unitário.</p>
                  <ul>
                    <li><span>✓</span> {produtoAtivo.componentes.length} componentes calculados</li>
                    <li><span>✓</span> Margem de {NUMERO.format(produtoAtivo.margem)}%</li>
                    <li><span>!</span> Confirme o percentual de custos indiretos</li>
                  </ul>
                </article>
              </section>
            </>
          )}

          {view === "composicao" && (
            <>
              <Cabecalho
                titulo="Composição de custo"
                descricao={`${produtoAtivo.nome} · ${produtoAtivo.descricao}`}
                acao={
                  <div className="cabecalho-acoes">
                    <SeletorProduto
                      produtos={dados.produtos}
                      produtoAtivoId={produtoAtivo.id}
                      onChange={selecionarProduto}
                    />
                    <button className="botao-secundario" type="button" onClick={restaurarExemplo}>Restaurar exemplos</button>
                  </div>
                }
              />
              <section className="metricas metricas-compactas" aria-label="Resumo da composição">
                <Metrica rotulo="Custos diretos" valor={moeda(calculo.diretos)} detalhe={`${produtoAtivo.componentes.length} componentes`} monetario />
                <Metrica rotulo="Custos indiretos" valor={moeda(calculo.indiretosValor)} detalhe={`${produtoAtivo.indiretos}% sobre os diretos`} monetario />
                <Metrica rotulo="Custo unitário" valor={moeda(calculo.custoTotal)} detalhe="Resultado calculado agora" monetario destaque />
              </section>

              <section className="painel painel-tabela">
                <div className="painel-titulo">
                  <div><span>Ficha técnica</span><h2>Componentes do produto</h2></div>
                  <span className={produtoAtivo.status === "Validado" ? "status-rascunho status-validado" : "status-rascunho"}>
                    {produtoAtivo.status}
                  </span>
                </div>
                <div className="tabela-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Componente</th>
                        <th>Quantidade</th>
                        <th>Perda</th>
                        <th className="valor-monetario">Custo unitário</th>
                        <th className="valor-monetario">Custo na composição</th>
                        <th><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculo.linhas.length === 0 ? (
                        <tr>
                          <td className="composicao-vazia" colSpan={6}>
                            Nenhum componente adicionado. Escolha um insumo abaixo para iniciar a composição.
                          </td>
                        </tr>
                      ) : calculo.linhas.map((linha) => (
                        <tr key={linha.componente.id}>
                          <td>
                            <strong>{linha.insumo?.nome ?? "Insumo removido"}</strong>
                            <span>{linha.insumo?.categoria}</span>
                          </td>
                          <td>
                            <div className="campo-unidade">
                              <input
                                aria-label={`Quantidade de ${linha.insumo?.nome}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={linha.componente.quantidade}
                                onChange={(evento) => atualizarComponente(linha.componente.id, "quantidade", Number(evento.target.value))}
                              />
                              <span>{linha.insumo?.unidade}</span>
                            </div>
                          </td>
                          <td>
                            <div className="campo-unidade campo-percentual">
                              <input
                                aria-label={`Perda de ${linha.insumo?.nome}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={linha.componente.perda}
                                onChange={(evento) => atualizarComponente(linha.componente.id, "perda", Number(evento.target.value))}
                              />
                              <span>%</span>
                            </div>
                          </td>
                          <td className="valor-monetario">{moeda(linha.insumo?.custo ?? 0)}</td>
                          <td className="valor-monetario"><strong>{moeda(linha.custoTotal)}</strong></td>
                          <td>
                            <button
                              className="remover"
                              type="button"
                              aria-label={`Remover ${linha.insumo?.nome}`}
                              onClick={() => removerComponente(linha.componente.id)}
                            >×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="adicionar-linha">
                  <label htmlFor="novo-componente">Adicionar componente</label>
                  <select
                    id="novo-componente"
                    value={insumoParaAdicionar}
                    onChange={(evento) => setInsumoParaAdicionar(evento.target.value)}
                  >
                    <option value="">Selecione um insumo</option>
                    {dados.insumos.map((insumo) => (
                      <option value={insumo.id} key={insumo.id}>{insumo.nome}</option>
                    ))}
                  </select>
                  <button className="botao-secundario" type="button" onClick={adicionarComponente}>Adicionar</button>
                </div>
              </section>

              <section className="grade-2 grade-ajustes">
                <article className="painel">
                  <label className="label-forte" htmlFor="custos-indiretos">Custos indiretos</label>
                  <p className="ajuda">Percentual para aluguel, administração, manutenção e outras despesas gerais.</p>
                  <div className="controle-percentual">
                    <input
                      id="custos-indiretos"
                      type="range"
                      min="0"
                      max="50"
                      step="0.5"
                      value={produtoAtivo.indiretos}
                      onChange={(evento) => atualizarProduto((produto) => ({ ...produto, indiretos: Number(evento.target.value) }))}
                    />
                    <div className="campo-unidade campo-percentual">
                      <input
                        aria-label="Percentual de custos indiretos"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={produtoAtivo.indiretos}
                        onChange={(evento) => atualizarProduto((produto) => ({ ...produto, indiretos: Math.max(0, Number(evento.target.value) || 0) }))}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </article>
                <article className="painel resumo-final">
                  <div><span>Subtotal direto</span><strong>{moeda(calculo.diretos)}</strong></div>
                  <div><span>Rateio de indiretos</span><strong>{moeda(calculo.indiretosValor)}</strong></div>
                  <div className="total"><span>Custo unitário calculado</span><strong>{moeda(calculo.custoTotal)}</strong></div>
                  <button className="botao-primario" type="button" onClick={() => { setView("simulador"); setMensagem("Composição pronta para simular."); }}>Simular preço de venda</button>
                </article>
              </section>
            </>
          )}

          {view === "insumos" && (
            <>
              <Cabecalho titulo="Insumos" descricao="Cadastre e atualize os custos usados nas composições." />
              <section className="grade-insumos">
                <article className="painel painel-tabela">
                  <div className="painel-titulo">
                    <div><span>Base local</span><h2>{dados.insumos.length} insumos cadastrados</h2></div>
                  </div>
                  <div className="tabela-scroll">
                    <table>
                      <thead><tr><th>Insumo</th><th>Categoria</th><th>Unidade</th><th className="valor-monetario">Custo atual</th><th><span className="sr-only">Ações</span></th></tr></thead>
                      <tbody>
                        {dados.insumos.length === 0 ? (
                          <tr>
                            <td className="insumos-vazio" colSpan={5}>Nenhum insumo cadastrado.</td>
                          </tr>
                        ) : dados.insumos.map((insumo) => {
                          const editando = insumoEdicaoId === insumo.id && edicaoInsumo;
                          return (
                            <tr className={editando ? "insumo-em-edicao" : undefined} key={insumo.id}>
                              <td>
                                {editando ? (
                                  <input
                                    className="campo-edicao-insumo campo-edicao-nome"
                                    aria-label={`Nome de ${insumo.nome}`}
                                    value={edicaoInsumo.nome}
                                    onChange={(evento) => setEdicaoInsumo((atual) => atual ? { ...atual, nome: evento.target.value } : atual)}
                                  />
                                ) : <strong>{insumo.nome}</strong>}
                              </td>
                              <td>
                                {editando ? (
                                  <select
                                    className="campo-edicao-insumo campo-edicao-categoria"
                                    aria-label={`Categoria de ${insumo.nome}`}
                                    value={edicaoInsumo.categoria}
                                    onChange={(evento) => setEdicaoInsumo((atual) => atual ? { ...atual, categoria: evento.target.value } : atual)}
                                  >
                                    <option>Matéria-prima</option>
                                    <option>Embalagem</option>
                                    <option>Mão de obra</option>
                                    <option>Operação</option>
                                    <option>Serviço</option>
                                  </select>
                                ) : <span className="categoria">{insumo.categoria}</span>}
                              </td>
                              <td>
                                {editando ? (
                                  <input
                                    className="campo-edicao-insumo campo-edicao-unidade"
                                    aria-label={`Unidade de ${insumo.nome}`}
                                    value={edicaoInsumo.unidade}
                                    onChange={(evento) => setEdicaoInsumo((atual) => atual ? { ...atual, unidade: evento.target.value } : atual)}
                                  />
                                ) : insumo.unidade}
                              </td>
                              <td className="valor-monetario">
                                <CampoMoeda
                                  ariaLabel={`Custo de ${insumo.nome}`}
                                  valor={editando ? edicaoInsumo.custo : insumo.custo}
                                  onChange={(valor) => {
                                    if (editando) {
                                      setEdicaoInsumo((atual) => atual ? { ...atual, custo: valor } : atual);
                                    } else {
                                      atualizarCustoInsumo(insumo.id, valor ?? 0);
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <div className="acoes-insumo">
                                  {editando ? (
                                    <>
                                      <button className="botao-salvar-insumo" type="button" onClick={salvarEdicaoInsumo}>Salvar</button>
                                      <button className="botao-cancelar-insumo" type="button" onClick={cancelarEdicaoInsumo}>Cancelar</button>
                                    </>
                                  ) : (
                                    <button
                                      className="botao-menu-insumo"
                                      type="button"
                                      aria-label={`Abrir opções de ${insumo.nome}`}
                                      aria-haspopup="menu"
                                      aria-expanded={menuInsumo?.insumoId === insumo.id}
                                      onClick={(evento) => abrirMenuInsumo(evento, insumo.id)}
                                    >
                                      ⋯
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
                <form className="painel formulario-insumo" onSubmit={cadastrarInsumo}>
                  <span className="tag">Novo cadastro</span>
                  <h2>Adicionar insumo</h2>
                  <label>Nome<input value={novoInsumo.nome} onChange={(e) => setNovoInsumo((atual) => ({ ...atual, nome: e.target.value }))} placeholder="Ex.: Essência floral" /></label>
                  <label>Categoria
                    <select value={novoInsumo.categoria} onChange={(e) => setNovoInsumo((atual) => ({ ...atual, categoria: e.target.value }))}>
                      <option>Matéria-prima</option><option>Embalagem</option><option>Mão de obra</option><option>Operação</option><option>Serviço</option>
                    </select>
                  </label>
                  <div className="campos-lado">
                    <label>Unidade<input value={novoInsumo.unidade} onChange={(e) => setNovoInsumo((atual) => ({ ...atual, unidade: e.target.value }))} placeholder="un" /></label>
                    <label>
                      Custo
                      <CampoMoeda
                        ariaLabel="Custo do novo insumo"
                        valor={novoInsumo.custo}
                        onChange={(valor) => setNovoInsumo((atual) => ({ ...atual, custo: valor }))}
                        className="campo-moeda-formulario"
                      />
                    </label>
                  </div>
                  <button className="botao-primario" type="submit">Cadastrar insumo</button>
                </form>
              </section>
            </>
          )}

          {view === "simulador" && (
            <>
              <Cabecalho
                titulo="Simulador de preço"
                descricao={`${produtoAtivo.nome} · ajuste os percentuais e compare o resultado.`}
                acao={
                  <SeletorProduto
                    produtos={dados.produtos}
                    produtoAtivoId={produtoAtivo.id}
                    onChange={selecionarProduto}
                  />
                }
              />
              <section className="simulador-grid">
                <article className="painel parametros">
                  <div className="painel-titulo"><div><span>Parâmetros</span><h2>Formação do preço</h2></div></div>
                  <CampoPercentual label="Impostos sobre a venda" valor={produtoAtivo.impostos} onChange={(valor) => atualizarProduto((produto) => ({ ...produto, impostos: valor }))} />
                  <CampoPercentual label="Comissões e taxas" valor={produtoAtivo.taxas} onChange={(valor) => atualizarProduto((produto) => ({ ...produto, taxas: valor }))} />
                  <CampoPercentual label="Margem desejada" valor={produtoAtivo.margem} onChange={(valor) => atualizarProduto((produto) => ({ ...produto, margem: valor }))} />
                  {produtoAtivo.impostos + produtoAtivo.taxas + produtoAtivo.margem >= 100 && (
                    <p className="erro-campo">A soma dos percentuais precisa ser menor que 100%.</p>
                  )}
                </article>
                <article className="resultado-preco">
                  <span>Preço de venda sugerido</span>
                  <strong>{moeda(calculo.precoSugerido)}</strong>
                  <p>por unidade</p>
                  <div className="preco-detalhes">
                    <div><span>Custo</span><b>{moeda(calculo.custoTotal)}</b></div>
                    <div><span>Impostos</span><b>{moeda(calculo.precoSugerido * produtoAtivo.impostos / 100)}</b></div>
                    <div><span>Taxas</span><b>{moeda(calculo.precoSugerido * produtoAtivo.taxas / 100)}</b></div>
                    <div><span>Lucro</span><b>{moeda(calculo.lucroUnitario)}</b></div>
                  </div>
                  <button className="botao-claro" type="button" onClick={() => setMensagem("Cenário salvo neste navegador.")}>Salvar cenário</button>
                </article>
              </section>
              <section className="painel tabela-cenarios">
                <div className="painel-titulo"><div><span>Comparação</span><h2>Três faixas de margem</h2></div></div>
                <div className="cenario-lista">
                  {[20, produtoAtivo.margem, 40].map((margem, indice) => {
                    const divisor = 1 - (produtoAtivo.impostos + produtoAtivo.taxas + margem) / 100;
                    const preco = divisor > 0 ? calculo.custoTotal / divisor : 0;
                    return (
                      <div className={indice === 1 ? "cenario atual" : "cenario"} key={`${margem}-${indice}`}>
                        <span>{indice === 1 ? "Cenário atual" : margem < produtoAtivo.margem ? "Mais competitivo" : "Maior rentabilidade"}</span>
                        <strong>{moeda(preco)}</strong>
                        <small>Margem de {NUMERO.format(margem)}%</small>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {view === "meta" && (
            <>
              <Cabecalho
                titulo="Meta de vendas"
                descricao="Defina o lucro mensal desejado e acompanhe o faturamento necessário para sustentar a operação."
              />
              <section className="meta-vendas-grid">
                <article className="painel meta-configuracao">
                  <div className="painel-titulo">
                    <div><span>Referência mensal</span><h2>Base para o cálculo</h2></div>
                    <span className="status-rascunho">Simulação local</span>
                  </div>
                  <p className="meta-introducao">
                    Após a integração, despesas, margem realizada e vendas virão dos lançamentos do AvantaLab.
                  </p>
                  <div className="meta-campos">
                    <label>
                      Despesas operacionais
                      <small>Média mensal das despesas que a operação precisa cobrir.</small>
                      <CampoMoeda
                        ariaLabel="Despesas operacionais mensais"
                        valor={dados.metaVendas.despesasOperacionais}
                        onChange={(valor) => atualizarMeta("despesasOperacionais", valor ?? 0)}
                        className="campo-moeda-meta"
                      />
                    </label>
                    <label>
                      Lucro mensal desejado
                      <small>Valor que deve sobrar depois de todas as despesas.</small>
                      <CampoMoeda
                        ariaLabel="Lucro mensal desejado"
                        valor={dados.metaVendas.lucroDesejado}
                        onChange={(valor) => atualizarMeta("lucroDesejado", valor ?? 0)}
                        className="campo-moeda-meta"
                      />
                    </label>
                    <label>
                      Margem de contribuição de referência
                      <small>Percentual médio que sobra das vendas após custos e despesas variáveis.</small>
                      <div className="campo-unidade campo-percentual campo-percentual-meta">
                        <input
                          aria-label="Margem de contribuição de referência"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={dados.metaVendas.margemContribuicao}
                          onChange={(evento) => atualizarMeta("margemContribuicao", Math.min(100, Number(evento.target.value) || 0))}
                        />
                        <span>%</span>
                      </div>
                    </label>
                    <label>
                      Vendas realizadas no mês
                      <small>Faturamento acumulado usado para acompanhar o progresso.</small>
                      <CampoMoeda
                        ariaLabel="Vendas realizadas no mês"
                        valor={dados.metaVendas.vendasRealizadas}
                        onChange={(valor) => atualizarMeta("vendasRealizadas", valor ?? 0)}
                        className="campo-moeda-meta"
                      />
                    </label>
                  </div>
                  {dados.metaVendas.margemContribuicao <= 0 && (
                    <p className="erro-campo">Informe uma margem de contribuição maior que zero para calcular a meta.</p>
                  )}
                </article>

                <article className="meta-resultado">
                  <span>Meta mensal com lucro</span>
                  <strong>{moeda(calculoMeta.metaComLucro)}</strong>
                  <p>
                    Despesas operacionais mais {moeda(dados.metaVendas.lucroDesejado)} de lucro desejado.
                  </p>
                  <div className="meta-progresso-texto">
                    <span>Progresso do mês</span>
                    <b>{NUMERO.format(calculoMeta.progresso)}%</b>
                  </div>
                  <div
                    className="meta-progresso"
                    role="progressbar"
                    aria-label="Progresso da meta mensal"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(calculoMeta.progresso)}
                  >
                    <i style={{ width: `${calculoMeta.progresso}%` }} />
                  </div>
                  <div className="meta-detalhes">
                    <div><span>Ponto de equilíbrio</span><b>{moeda(calculoMeta.pontoEquilibrio)}</b></div>
                    <div><span>Vendas realizadas</span><b>{moeda(dados.metaVendas.vendasRealizadas)}</b></div>
                    <div className="meta-falta"><span>Falta vender</span><b>{moeda(calculoMeta.faltaVender)}</b></div>
                  </div>
                  <small>
                    Fórmula: (despesas operacionais + lucro desejado) ÷ margem de contribuição.
                  </small>
                </article>
              </section>
            </>
          )}
        </main>
      </div>

      {menuInsumo && insumoNoMenu && (
        <>
          <div className="menu-insumo-fundo" aria-hidden="true" onClick={() => setMenuInsumo(null)} />
          <div
            className="menu-insumo-flutuante"
            role="menu"
            aria-label={`Opções de ${insumoNoMenu.nome}`}
            style={{ top: menuInsumo.top, left: menuInsumo.left }}
          >
            <strong>{insumoNoMenu.nome}</strong>
            <button
              type="button"
              role="menuitem"
              autoFocus
              onClick={() => iniciarEdicaoInsumo(insumoNoMenu)}
            >
              Editar
            </button>
            <button
              className="menu-insumo-excluir"
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuInsumo(null);
                setInsumoExclusaoId(insumoNoMenu.id);
              }}
            >
              Excluir
            </button>
          </div>
        </>
      )}

      <ModalNovoProduto
        aberto={modalNovoProdutoAberto}
        valor={novoProduto}
        erro={erroNovoProduto}
        aoAlterar={(campo, valor) => {
          setNovoProduto((atual) => ({ ...atual, [campo]: valor }));
          if (erroNovoProduto) setErroNovoProduto("");
        }}
        aoFechar={() => {
          setModalNovoProdutoAberto(false);
          setErroNovoProduto("");
        }}
        aoEnviar={cadastrarProduto}
      />

      <ModalConfirmacao
        aberto={Boolean(insumoEmExclusao)}
        titulo="Excluir insumo?"
        mensagem={
          insumoEmExclusao
            ? insumoEmExclusaoEstaEmUso
              ? `O insumo “${insumoEmExclusao.nome}” está sendo usado e também será removido de todas as composições em que aparece. Esta ação não pode ser desfeita.`
              : `O insumo “${insumoEmExclusao.nome}” será excluído. Esta ação não pode ser desfeita.`
            : ""
        }
        textoCancelar="Cancelar"
        textoConfirmar="Excluir insumo"
        darkMode={temaEscuro}
        variante="destrutiva"
        aoCancelar={() => setInsumoExclusaoId("")}
        aoConfirmar={() => {
          if (insumoEmExclusao) excluirInsumo(insumoEmExclusao);
        }}
      />

      {mensagem && <div className="toast" role="status">{mensagem}</div>}
    </div>
  );
}

function ModalNovoProduto({
  aberto,
  valor,
  erro,
  aoAlterar,
  aoFechar,
  aoEnviar,
}: {
  aberto: boolean;
  valor: NovoProduto;
  erro: string;
  aoAlterar: <K extends keyof NovoProduto>(campo: K, valor: NovoProduto[K]) => void;
  aoFechar: () => void;
  aoEnviar: (evento: React.FormEvent<HTMLFormElement>) => void;
}) {
  const tituloId = useId();
  const erroId = useId();
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const nomeRef = useRef<HTMLInputElement | null>(null);
  const aoFecharRef = useRef(aoFechar);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    if (!aberto) return;
    const elementoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const foco = window.requestAnimationFrame(() => nomeRef.current?.focus());
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        aoFecharRef.current();
        return;
      }
      if (evento.key !== "Tab" || !dialogoRef.current) return;
      const focaveis = Array.from(
        dialogoRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      window.cancelAnimationFrame(foco);
      document.removeEventListener("keydown", aoPressionarTecla);
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  const atualizarPercentual = (
    campo: "indiretos" | "impostos" | "taxas" | "margem",
    texto: string,
  ) => {
    aoAlterar(campo, Math.max(0, Number(texto) || 0));
  };

  return (
    <div
      ref={dialogoRef}
      className="modal-produto-overlay"
      onClick={(evento) => {
        evento.stopPropagation();
        aoFechar();
      }}
    >
      <DraggableModalCard
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="modal-produto-card"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="modal-produto-cabecalho" data-modal-drag-handle>
          <span>Novo cadastro</span>
          <h2 id={tituloId}>Cadastrar produto</h2>
          <p>Crie o produto e, na próxima etapa, adicione os componentes do custo.</p>
        </div>
        <form className="modal-produto-formulario" onSubmit={aoEnviar}>
          <label>
            Nome do produto
            <input
              ref={nomeRef}
              required
              value={valor.nome}
              onChange={(evento) => aoAlterar("nome", evento.target.value)}
              placeholder="Ex.: Shampoo Hidratante"
              aria-describedby={erro ? erroId : undefined}
            />
          </label>
          <label>
            Apresentação ou volume
            <input
              required
              value={valor.descricao}
              onChange={(evento) => aoAlterar("descricao", evento.target.value)}
              placeholder="Ex.: 300 ml"
              aria-describedby={erro ? erroId : undefined}
            />
          </label>
          <fieldset>
            <legend>Parâmetros iniciais</legend>
            <div className="modal-produto-percentuais">
              <label>Custos indiretos
                <span><input type="number" min="0" max="99" step="0.5" value={valor.indiretos} onChange={(evento) => atualizarPercentual("indiretos", evento.target.value)} />%</span>
              </label>
              <label>Impostos
                <span><input type="number" min="0" max="99" step="0.5" value={valor.impostos} onChange={(evento) => atualizarPercentual("impostos", evento.target.value)} />%</span>
              </label>
              <label>Taxas
                <span><input type="number" min="0" max="99" step="0.5" value={valor.taxas} onChange={(evento) => atualizarPercentual("taxas", evento.target.value)} />%</span>
              </label>
              <label>Margem desejada
                <span><input type="number" min="0" max="99" step="0.5" value={valor.margem} onChange={(evento) => atualizarPercentual("margem", evento.target.value)} />%</span>
              </label>
            </div>
          </fieldset>
          {erro && <p className="modal-produto-erro" id={erroId} role="alert">{erro}</p>}
          <div className="modal-produto-acoes">
            <button className="botao-secundario" type="button" onClick={aoFechar}>Cancelar</button>
            <button className="botao-primario" type="submit">Criar e montar composição</button>
          </div>
        </form>
      </DraggableModalCard>
    </div>
  );
}

function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="cabecalho-pagina">
      <div><span>Protótipo independente</span><h1>{titulo}</h1><p>{descricao}</p></div>
      {acao}
    </div>
  );
}

function SeletorProduto({
  produtos,
  produtoAtivoId,
  onChange,
}: {
  produtos: Produto[];
  produtoAtivoId: string;
  onChange: (produtoId: string) => void;
}) {
  return (
    <label className="seletor-produto">
      <span>Produto em análise</span>
      <select
        aria-label="Produto em análise"
        value={produtoAtivoId}
        onChange={(evento) => onChange(evento.target.value)}
      >
        {produtos.map((produto) => (
          <option value={produto.id} key={produto.id}>
            {produto.nome} · {produto.descricao}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metrica({
  rotulo,
  valor,
  detalhe,
  destaque = false,
  monetario = false,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  destaque?: boolean;
  monetario?: boolean;
}) {
  return (
    <article className={destaque ? "metrica destaque" : "metrica"}>
      <span>{rotulo}</span><strong className={monetario ? "valor-monetario" : undefined}>{valor}</strong><small>{detalhe}</small>
    </article>
  );
}

function CampoPercentual({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number;
  onChange: (valor: number) => void;
}) {
  return (
    <label className="parametro">
      <span>{label}</span>
      <div className="campo-unidade campo-percentual">
        <input type="number" min="0" max="99" step="0.5" value={valor} onChange={(evento) => onChange(Math.max(0, Number(evento.target.value) || 0))} />
        <span>%</span>
      </div>
    </label>
  );
}

function CampoMoeda({
  ariaLabel,
  valor,
  onChange,
  className = "",
}: {
  ariaLabel: string;
  valor: number | null;
  onChange: (valor: number | null) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(() => valorMonetarioParaTexto(valor));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setTexto(valorMonetarioParaTexto(valor));
  }, [editando, valor]);

  function ajustarValor(incremento: number) {
    const valorAtual = textoMonetarioParaNumero(texto) ?? valor ?? 0;
    const proximoValor = Math.max(
      0,
      Math.round((valorAtual + incremento) * 100) / 100,
    );
    setTexto(valorMonetarioParaTexto(proximoValor));
    onChange(proximoValor);
  }

  return (
    <div className={`campo-moeda ${className}`.trim()}>
      <span aria-hidden="true">R$</span>
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        type="text"
        value={texto}
        placeholder="0,00"
        onFocus={(evento) => {
          setEditando(true);
          evento.currentTarget.select();
        }}
        onChange={(evento) => {
          const numero = moedaDigitadaParaNumero(evento.target.value);
          setTexto(formatarMoedaDigitada(evento.target.value) || valorMonetarioParaTexto(0));
          onChange(numero);
        }}
        onBlur={() => {
          const numero = textoMonetarioParaNumero(texto);
          onChange(numero);
          setTexto(valorMonetarioParaTexto(numero));
          setEditando(false);
        }}
      />
      <span className="campo-moeda-stepper">
        <button
          type="button"
          aria-label={`Aumentar ${ariaLabel} em um centavo`}
          onClick={() => ajustarValor(0.01)}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label={`Diminuir ${ariaLabel} em um centavo`}
          onClick={() => ajustarValor(-0.01)}
        >
          ▼
        </button>
      </span>
    </div>
  );
}
