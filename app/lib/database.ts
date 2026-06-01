import { supabase } from './supabase';

function tratarErroSupabase(error: any) {
  if (!error?.message) {
    return 'Não foi possível concluir a ação.';
  }

  if (
    error.message.includes('row-level security') ||
    error.message.includes('violates row-level security policy') ||
    error.code === '42501'
  ) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  if (
    error.message.includes('duplicate key') ||
    error.code === '23505'
  ) {
    return 'Este registro já existe.';
  }

  return error.message;
}



export async function buscarEmpresaDoUsuario(usuarioId: string) {
  const { data: usuarioAtual } = await supabase.auth.getUser();

  const emailUsuario = usuarioAtual.user?.email?.toLowerCase() || '';

  let { data: vinculo, error: erroVinculo } = await supabase
    .from('usuarios_empresa')
    .select('id, empresa_id, user_id, nome, email, perfil, status')
    .eq('user_id', usuarioId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();

  if (erroVinculo) {
    console.error('Erro ao buscar vínculo do usuário com empresa:', erroVinculo);
    alert(`Erro ao buscar vínculo do usuário: ${erroVinculo.message}`);
    return null;
  }

  if (!vinculo && emailUsuario) {
    const { data: convitePendente, error: erroConvite } = await supabase
      .from('usuarios_empresa')
      .select('id, empresa_id, user_id, nome, email, perfil, status')
      .eq('email', emailUsuario)
      .is('user_id', null)
      .in('status', ['pendente', 'ativo'])
      .limit(1)
      .maybeSingle();

    if (erroConvite) {
      console.error('Erro ao buscar convite pendente:', erroConvite);
      alert(`Erro ao buscar convite pendente: ${erroConvite.message}`);
      return null;
    }

    if (convitePendente) {
      const { data: vinculoAtualizado, error: erroAtualizarConvite } = await supabase
        .from('usuarios_empresa')
        .update({
          user_id: usuarioId,
          status: 'ativo',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', convitePendente.id)
        .select('id, empresa_id, user_id, nome, email, perfil, status')
        .single();

      if (erroAtualizarConvite) {
        console.error('Erro ao vincular convite ao usuário:', erroAtualizarConvite);
        alert(`Erro ao vincular convite ao usuário: ${erroAtualizarConvite.message}`);
        return null;
      }

      vinculo = vinculoAtualizado;
    }
  }

  if (!vinculo || !vinculo.empresa_id) {
  console.warn('Usuário sem empresa vinculada.');
  return null;
}

  const { data: empresa, error: erroEmpresa } = await supabase
    .from('empresas')
    .select('id, nome')
    .eq('id', vinculo.empresa_id)
    .maybeSingle();

  if (erroEmpresa) {
    console.error('Erro ao buscar empresa vinculada:', erroEmpresa);
    alert(`Erro ao buscar empresa vinculada: ${erroEmpresa.message}`);
    return null;
  }

  if (!empresa) {
    console.warn('Empresa vinculada não encontrada.');
    alert('A empresa vinculada ao usuário não foi encontrada.');
    return null;
  }

  return {
    ...empresa,
    perfil: vinculo.perfil,
    acessoId: vinculo.id,
  };
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
  return {
    erro: true,
    mensagem: tratarErroSupabase(error),
  };
}

  return {
    erro: false,
    data,
  };
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
  alert(`Erro ao salvar configurações: ${tratarErroSupabase(error)}`);
  return null;
}

  return data;
}
export async function atualizarLancamento({
  id,
  empresaId,
  ano,
  mes,
  dia,
  despesaNome,
  descricao,
  valor,
}: {
  id: string | number;
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
    .update({
      empresa_id: empresaId,
      ano,
      mes,
      dia,
      despesa_nome: despesaNome,
      descricao,
      valor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar lançamento:', error);

    return {
  erro: true,
  mensagem: tratarErroSupabase(error),
  data: null,
};
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}
export async function buscarMeuAcessoEmpresa(empresaId: string, usuarioId: string) {
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .select('id, empresa_id, user_id, nome, email, perfil, status')
    .eq('empresa_id', empresaId)
    .eq('user_id', usuarioId)
    .eq('status', 'ativo')
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    return null;
  }

  return data;
}

export async function buscarUsuariosEmpresa(empresaId: string) {
  const { data, error } = await supabase.rpc('listar_usuarios_empresa_rpc', {
    p_empresa_id: empresaId,
  });

  if (error) {
    console.error('Erro ao buscar usuários da empresa:', error);
    return [];
  }

  return data || [];
}

export async function criarUsuarioEmpresa({
  empresaId,
  nome,
  email,
  perfil,
}: {
  empresaId: string;
  nome: string;
  email: string;
  perfil: 'administrador' | 'operador_completo' | 'operador_simples';
}) {
  const emailLimpo = email.trim().toLowerCase();

  const { data, error } = await supabase.rpc('criar_usuario_empresa_rpc', {
    p_empresa_id: empresaId,
    p_nome: nome.trim(),
    p_email: emailLimpo,
    p_perfil: perfil,
  });

  if (error) {
    console.error('Erro ao criar usuário da empresa:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}

export async function atualizarUsuarioEmpresa({
  acessoId,
  nome,
  email,
  perfil,
}: {
  acessoId: string;
  nome: string;
  email: string;
  perfil: 'administrador' | 'operador_completo' | 'operador_simples';
}) {
  const { data, error } = await supabase.rpc('atualizar_usuario_empresa_rpc', {
    p_acesso_id: acessoId,
    p_nome: nome.trim(),
    p_email: email.trim().toLowerCase(),
    p_perfil: perfil,
  });

  if (error) {
    console.error('Erro ao atualizar usuário da empresa:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}

export async function bloquearUsuarioEmpresa(acessoId: string) {
  const { data, error } = await supabase
    .from('usuarios_empresa')
    .update({
      status: 'bloqueado',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', acessoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao bloquear usuário:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}
export async function excluirUsuarioEmpresa(acessoId: string) {
  const { data, error } = await supabase.rpc('excluir_usuario_empresa_rpc', {
    p_acesso_id: acessoId,
  });

  if (error) {
    console.error('Erro ao excluir usuário da empresa:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}
export async function criarEmpresaInicial(nomeEmpresa: string) {
  const { data, error } = await supabase.rpc('criar_empresa_inicial_rpc', {
    p_nome_empresa: nomeEmpresa,
  });

  if (error) {
    console.error('Erro ao criar empresa inicial:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data,
  };
}

export async function buscarEmailPorLogin(login: string) {
  const { data, error } = await supabase.rpc('buscar_email_por_login_rpc', {
    p_login: login.trim(),
  });

  if (error) {
    console.error('Erro ao buscar email por login:', error);
    return null;
  }

  return data || null;
}