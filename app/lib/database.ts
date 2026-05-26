import { supabase } from './supabase';

export async function buscarEmpresaPrincipal() {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('nome', 'Empresa Principal')
    .single();

  if (error) {
    console.error('Erro ao buscar empresa principal:', error);
    return null;
  }

  return data;
}

export async function buscarConfiguracoes(empresaId: string) {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('empresa_id', empresaId)
    .single();

  if (error) {
    console.error('Erro ao buscar configurações:', error);
    return null;
  }

  return data;
}

export async function buscarDespesasCadastradas(empresaId: string) {
  const { data, error } = await supabase
    .from('despesas_cadastradas')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar despesas cadastradas:', error);
    return [];
  }

  return data;
}

export async function buscarLancamentos(empresaId: string, ano: number) {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ano', ano)
    .order('dia', { ascending: true });

  if (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return [];
  }

  return data;
}

export async function buscarFaturamentos(empresaId: string, ano: number) {
  const { data, error } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ano', ano);

  if (error) {
    console.error('Erro ao buscar faturamentos:', error);
    return [];
  }

  return data;
}

export async function salvarDespesaCadastrada(
  empresaId: string,
  nome: string,
  categoria: string
) {
  const { data, error } = await supabase
    .from('despesas_cadastradas')
    .insert({
      empresa_id: empresaId,
      nome,
      categoria,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar despesa cadastrada:', error);
    return null;
  }

  return data;
}

export async function apagarDespesaCadastrada(
  empresaId: string,
  nome: string
) {
  const { error } = await supabase
    .from('despesas_cadastradas')
    .delete()
    .eq('empresa_id', empresaId)
    .eq('nome', nome);

  if (error) {
    console.error('Erro ao apagar despesa cadastrada:', error);
    return false;
  }

  return true;
}

export async function salvarLancamento({
  empresaId,
  ano,
  mes,
  dia,
  despesaNome,
  descricao,
  valor,
}: {
  empresaId: string;
  ano: number;
  mes: string;
  dia: number;
  despesaNome: string;
  descricao: string;
  valor: number;
}) {
  const { data, error } = await supabase
    .from('lancamentos')
    .insert({
      empresa_id: empresaId,
      ano,
      mes,
      dia,
      despesa_nome: despesaNome,
      descricao,
      valor,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar lançamento:', error);
    return null;
  }

  return data;
}

export async function apagarLancamento(id: string) {
  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao apagar lançamento:', error);
    return false;
  }

  return true;
}

export async function salvarFaturamentoBanco({
  empresaId,
  ano,
  mes,
  valor,
}: {
  empresaId: string;
  ano: number;
  mes: string;
  valor: number;
}) {
  const { data, error } = await supabase
    .from('faturamentos')
    .upsert(
      {
        empresa_id: empresaId,
        ano,
        mes,
        valor,
      },
      {
        onConflict: 'empresa_id,ano,mes',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar faturamento:', error);
    return null;
  }

  return data;
}

export async function salvarConfiguracoesBanco({
  empresaId,
  corPrimaria,
  darkMode,
  duplicadosAtivo,
  logoUrl,
  logoSettings,
}: {
  empresaId: string;
  corPrimaria: string;
  darkMode: boolean;
  duplicadosAtivo: boolean;
  logoUrl: string;
  logoSettings: any;
}) {
  const { data, error } = await supabase
    .from('configuracoes')
    .upsert(
      {
        empresa_id: empresaId,
        cor_primaria: corPrimaria,
        dark_mode: darkMode,
        duplicados_ativo: duplicadosAtivo,
        logo_url: logoUrl,
        logo_settings: logoSettings,
      },
      {
        onConflict: 'empresa_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar configurações:', error);
    return null;
  }

  return data;
}