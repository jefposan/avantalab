export const formatarMoeda = (valor: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

export const calcularLucro = (fat: number, despesas: number) => fat - despesas;

// Aqui guardamos as regras de negócio que não mudam

export const despesasPadrao: { nome: string; categoria: string }[] = [];