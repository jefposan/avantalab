import { supabase } from './supabase';
import { normalizarTipoPerfil, type TipoPerfil } from './perfis';

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
      .select('id, empresa_id, user_id, nome, email, login, perfil, status, telefone, telefone_confirmado, telefone_confirmado_em')
      .eq('user_id', usuarioId)
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();

    if (erroVinculo) {
    console.error('Erro ao buscar vínculo do usuário com empresa:', erroVinculo);
    return null;
  }

    if (!vinculo && emailUsuario) {
      const { data: convitePendente, error: erroConvite } = await supabase
        .from('usuarios_empresa')
        .select('id, empresa_id, user_id, nome, email, login, perfil, status, telefone, telefone_confirmado, telefone_confirmado_em')
        .eq('email', emailUsuario)
        .is('user_id', null)
        .in('status', ['pendente', 'ativo'])
        .limit(1)
        .maybeSingle();

      if (erroConvite) {
    console.error('Erro ao buscar convite pendente:', erroConvite);
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
          .select('id, empresa_id, user_id, nome, email, login, perfil, status, telefone, telefone_confirmado, telefone_confirmado_em')
          .single();

        if (erroAtualizarConvite) {
    console.error('Erro ao vincular convite ao usuário:', erroAtualizarConvite);
    return null;
  }

        vinculo = vinculoAtualizado;
      }
    }

    if (!vinculo || !vinculo.empresa_id) {
    console.warn('Usuário sem empresa vinculada.');
    return null;
  }

  if (vinculo.user_id) {
    const acessoComTelefone = vinculo.telefone_confirmado === true && vinculo.telefone
      ? vinculo
      : (await supabase
          .from('usuarios_empresa')
          .select('telefone, telefone_confirmado_em')
          .eq('user_id', vinculo.user_id)
          .eq('telefone_confirmado', true)
          .not('telefone', 'is', null)
          .limit(1)
          .maybeSingle()).data;

    if (acessoComTelefone?.telefone) {
      const agora = new Date().toISOString();

      const { error: erroSincronizarTelefone } = await supabase
        .from('usuarios_empresa')
        .update({
          telefone: acessoComTelefone.telefone,
          telefone_confirmado: true,
          telefone_confirmado_em: acessoComTelefone.telefone_confirmado_em || agora,
          atualizado_em: agora,
        })
        .eq('user_id', vinculo.user_id);

      if (erroSincronizarTelefone) {
        console.error('Erro ao sincronizar telefone confirmado do usuario:', erroSincronizarTelefone);
      } else {
        vinculo = {
          ...vinculo,
          telefone: acessoComTelefone.telefone,
          telefone_confirmado: true,
          telefone_confirmado_em: acessoComTelefone.telefone_confirmado_em || agora,
        };
      }
    }
  }

  const { data: empresa, error: erroEmpresa } = await supabase
    .from('empresas')
    .select('id, nome, tipo_perfil')
    .eq('id', vinculo.empresa_id)
    .maybeSingle();

  if (erroEmpresa) {
  console.error('Erro ao buscar empresa vinculada:', erroEmpresa);
  return null;
}

  if (!empresa) {
  console.warn('Empresa vinculada não encontrada.');
  return null;
}

  return {
  ...empresa,
  tipo_perfil: normalizarTipoPerfil(empresa.tipo_perfil),
  perfil: vinculo.perfil,
  acessoId: vinculo.id,
  telefone: vinculo.telefone,
  telefone_confirmado: vinculo.telefone_confirmado,
  telefone_confirmado_em: vinculo.telefone_confirmado_em,
};
}

export async function buscarEmpresasDoUsuario(usuarioId: string) {
  const { data: usuarioAtual } = await supabase.auth.getUser();

  const emailUsuario = usuarioAtual.user?.email?.toLowerCase() || '';

  // 1. Primeiro, vincula todos os convites pendentes pelo email do usuário logado
  if (emailUsuario) {
    const { data: convitesPendentes, error: erroConvites } = await supabase
      .from('usuarios_empresa')
      .select('id')
      .eq('email', emailUsuario)
      .is('user_id', null)
      .in('status', ['pendente', 'ativo']);

    if (erroConvites) {
      console.error('Erro ao buscar convites pendentes:', erroConvites);
      return [];
    }

    if (convitesPendentes && convitesPendentes.length > 0) {
      const idsConvites = convitesPendentes.map((convite) => convite.id);

      const { error: erroAtualizarConvites } = await supabase
        .from('usuarios_empresa')
        .update({
          user_id: usuarioId,
          status: 'ativo',
          atualizado_em: new Date().toISOString(),
        })
        .in('id', idsConvites);

      if (erroAtualizarConvites) {
        console.error('Erro ao vincular convites ao usuário:', erroAtualizarConvites);
        return [];
      }
    }
  }

  // 2. Busca todos os vínculos ativos do usuário
  const { data: vinculos, error: erroVinculos } = await supabase
    .from('usuarios_empresa')
    .select('id, empresa_id, user_id, nome, email, login, perfil, status, telefone, telefone_confirmado, telefone_confirmado_em')
    .eq('user_id', usuarioId)
    .eq('status', 'ativo')
    .order('nome', { ascending: true });

  if (erroVinculos) {
    console.error('Erro ao buscar empresas do usuário:', erroVinculos);
    return [];
  }

  if (!vinculos || vinculos.length === 0) {
    return [];
  }

  const acessoComTelefone = vinculos.find(
    (vinculo) => vinculo.telefone_confirmado === true && vinculo.telefone
  );

  const vinculosSincronizados = acessoComTelefone
    ? vinculos.map((vinculo) => ({
        ...vinculo,
        telefone: acessoComTelefone.telefone,
        telefone_confirmado: true,
        telefone_confirmado_em:
          acessoComTelefone.telefone_confirmado_em || vinculo.telefone_confirmado_em,
      }))
    : vinculos;

  if (acessoComTelefone?.telefone) {
    const agora = new Date().toISOString();
    const { error: erroSincronizarTelefone } = await supabase
      .from('usuarios_empresa')
      .update({
        telefone: acessoComTelefone.telefone,
        telefone_confirmado: true,
        telefone_confirmado_em: acessoComTelefone.telefone_confirmado_em || agora,
        atualizado_em: agora,
      })
      .eq('user_id', usuarioId);

    if (erroSincronizarTelefone) {
      console.error('Erro ao sincronizar telefone confirmado do usuario:', erroSincronizarTelefone);
    }
  }

  const empresasIds = vinculosSincronizados
    .map((vinculo) => vinculo.empresa_id)
    .filter(Boolean);

  // 3. Busca os dados das empresas vinculadas
  const { data: empresas, error: erroEmpresas } = await supabase
    .from('empresas')
    .select('id, nome, tipo_perfil')
    .in('id', empresasIds);

  if (erroEmpresas) {
    console.error('Erro ao buscar dados das empresas:', erroEmpresas);
    return [];
  }

  // 4. Une vínculo + dados da empresa
  return vinculosSincronizados
    .map((vinculo) => {
      const empresa = empresas?.find((item) => item.id === vinculo.empresa_id);

      if (!empresa) return null;

      return {
  id: empresa.id,
  nome: empresa.nome,
  tipo_perfil: normalizarTipoPerfil(empresa.tipo_perfil),
  empresa_id: empresa.id,
  empresa_nome: empresa.nome,
  perfil: vinculo.perfil,
  status: vinculo.status,
  acessoId: vinculo.id,
  usuario_nome: vinculo.nome,
  usuario_email: vinculo.email,
  usuario_login: vinculo.login,
  telefone: vinculo.telefone,
  telefone_confirmado: vinculo.telefone_confirmado,
  telefone_confirmado_em: vinculo.telefone_confirmado_em,
};
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
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
export async function buscarFaturamentosEntradas(
  empresaId: string,
  ano: number
) {
  const { data, error } = await supabase
    .from('faturamentos_entradas')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ano', ano)
    .order('dia', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar entradas de faturamento:', error);
    return [];
  }

  return data || [];
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

export async function salvarFaturamentoEntrada({
  empresaId,
  ano,
  mes,
  dia,
  origem,
  valor,
}: {
  empresaId: string;
  ano: number;
  mes: string;
  dia: number;
  origem: string;
  valor: number;
}) {
  const { data: usuarioLogado } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('faturamentos_entradas')
    .insert({
      empresa_id: empresaId,
      ano,
      mes,
      dia,
      origem,
      valor,
      criado_por: usuarioLogado.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar entrada de faturamento:', error);

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

export async function atualizarFaturamentoEntrada({
  id,
  empresaId,
  ano,
  mes,
  dia,
  origem,
  valor,
}: {
  id: string;
  empresaId: string;
  ano: number;
  mes: string;
  dia: number;
  origem: string;
  valor: number;
}) {
  const { data, error } = await supabase
    .from('faturamentos_entradas')
    .update({
      dia,
      origem,
      valor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', empresaId)
    .eq('ano', ano)
    .eq('mes', mes)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar entrada de faturamento:', error);

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

export async function apagarFaturamentoEntrada(id: string) {
  const { error } = await supabase
    .from('faturamentos_entradas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao apagar entrada de faturamento:', error);

    return {
      erro: true,
      mensagem: tratarErroSupabase(error),
    };
  }

  return {
    erro: false,
    mensagem: '',
  };
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
    .select('id, empresa_id, user_id, nome, email, login, perfil, status, telefone, telefone_confirmado, telefone_confirmado_em')
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
  login,
  senha,
  perfil,
}: {
  empresaId: string;
  nome: string;
  login: string;
  senha: string;
  perfil: 'administrador' | 'operador_completo' | 'operador_simples';
}) {
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'Sessão não encontrada. Faça login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/criar-usuario-interno', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      empresaId,
      nome,
      login,
      senha,
      perfil,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
  const mensagemErro = String(resultado.mensagem || '').toLowerCase();

  if (
    mensagemErro.includes('usuarios_empresa_login_unico_idx') ||
    mensagemErro.includes('duplicate key') ||
    mensagemErro.includes('unique constraint') ||
    mensagemErro.includes('violates unique constraint') ||
    mensagemErro.includes('23505')
  ) {
    return {
      erro: true,
      mensagem: 'Login indisponível. Este login já está em uso no sistema. Escolha outro login.',
      data: null,
    };
  }

  return {
    erro: true,
    mensagem: resultado.mensagem || 'Não foi possível criar o usuário.',
    data: null,
  };
}

  return {
    erro: false,
    mensagem: '',
    data: resultado.usuario,
  };
}

export async function buscarUsuarioExistenteEmpresa({
  empresaId,
  termo,
}: {
  empresaId: string;
  termo: string;
}) {
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'SessÃ£o nÃ£o encontrada. FaÃ§a login novamente.',
      encontrado: false,
      jaVinculado: false,
      usuario: null,
    };
  }

  const resposta = await fetch('/api/vincular-usuario-existente', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      acao: 'buscar',
      empresaId,
      termo,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    return {
      erro: true,
      mensagem: resultado.mensagem || 'NÃ£o foi possÃ­vel pesquisar o usuÃ¡rio.',
      encontrado: false,
      jaVinculado: false,
      usuario: null,
    };
  }

  return {
    erro: false,
    mensagem: resultado.mensagem || '',
    encontrado: Boolean(resultado.encontrado),
    jaVinculado: Boolean(resultado.jaVinculado),
    usuario: resultado.usuario || null,
  };
}

export async function vincularUsuarioExistenteEmpresa({
  empresaId,
  userId,
  perfil,
}: {
  empresaId: string;
  userId: string;
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
}) {
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'SessÃ£o nÃ£o encontrada. FaÃ§a login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/vincular-usuario-existente', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      acao: 'vincular',
      empresaId,
      userId,
      perfil,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    return {
      erro: true,
      mensagem: resultado.mensagem || 'NÃ£o foi possÃ­vel vincular o usuÃ¡rio.',
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: resultado.mensagem || 'UsuÃ¡rio vinculado com sucesso.',
    data: resultado.usuario,
  };
}

export async function atualizarEmpresa({
  empresaId,
  nome,
  tipoPerfil,
}: {
  empresaId: string;
  nome: string;
  tipoPerfil?: TipoPerfil;
}) {
  const { data: sessao } = await supabase.auth.getSession();
  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'Sessao nao encontrada. Faca login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/atualizar-empresa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      empresaId,
      nome: nome.trim(),
      tipoPerfil: tipoPerfil ? normalizarTipoPerfil(tipoPerfil) : undefined,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    return {
      erro: true,
      mensagem: resultado.mensagem || 'Nao foi possivel atualizar a empresa.',
      data: null,
    };
  }

  return { erro: false, mensagem: '', data: resultado.empresa };
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
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
}) {
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'Sessao nao encontrada. Faca login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/atualizar-usuario-empresa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      acessoId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    const mensagemErro = String(resultado.mensagem || '').toLowerCase();

    if (
      mensagemErro.includes('duplicate key') ||
      mensagemErro.includes('unique constraint') ||
      mensagemErro.includes('23505')
    ) {
      return {
        erro: true,
        mensagem: 'Login/email indisponivel. Escolha outro.',
        data: null,
      };
    }

    return {
      erro: true,
      mensagem: resultado.mensagem || 'Nao foi possivel atualizar o usuario.',
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data: resultado.usuario,
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
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'Sessão não encontrada. Faça login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/excluir-usuario-interno', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      acessoId,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    return {
      erro: true,
      mensagem: resultado.mensagem || 'Não foi possível excluir o usuário.',
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: '',
    data: true,
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

  if (!data) {
    console.error('Empresa inicial criada sem retorno de dados — possível problema de sessão ou permissão RLS.');
    return {
      erro: true,
      mensagem: 'O servidor não retornou os dados do perfil criado. Verifique sua conexão, faça login novamente e tente de novo.',
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
export async function redefinirSenhaUsuarioEmpresa({
  acessoId,
  novaSenha,
}: {
  acessoId: string;
  novaSenha: string;
}) {
  const { data: sessao } = await supabase.auth.getSession();

  const token = sessao.session?.access_token;

  if (!token) {
    return {
      erro: true,
      mensagem: 'Sessão não encontrada. Faça login novamente.',
      data: null,
    };
  }

  const resposta = await fetch('/api/redefinir-senha-usuario', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      acessoId,
      novaSenha,
    }),
  });

  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    return {
      erro: true,
      mensagem: resultado.mensagem || 'Não foi possível redefinir a senha.',
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: resultado.mensagem || 'Senha redefinida com sucesso.',
    data: true,
  };
}
export async function atualizarTelefoneUsuarioEmpresa({
  acessoId,
  telefone,
}: {
  acessoId: string;
  telefone: string;
}) {
  const { data: acesso, error: erroAcesso } = await supabase
    .from('usuarios_empresa')
    .select('id, user_id')
    .eq('id', acessoId)
    .maybeSingle();

  if (erroAcesso || !acesso) {
    console.error('Erro ao buscar acesso para atualizar telefone:', erroAcesso);

    return {
      erro: true,
      mensagem: erroAcesso ? tratarErroSupabase(erroAcesso) : 'Acesso nao encontrado.',
      data: null,
    };
  }

  const atualizacao = {
    telefone,
    telefone_confirmado: true,
    telefone_confirmado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  const consulta = supabase
    .from('usuarios_empresa')
    .update(atualizacao);

  const { data, error } = acesso.user_id
    ? await consulta.eq('user_id', acesso.user_id).select()
    : await consulta.eq('id', acessoId).select();

  if (error) {
    console.error('Erro ao atualizar telefone do usuário:', error);

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
export async function salvarFeedback({
  empresaId,
  usuarioId,
  acessoId,
  nomeEmpresa,
  nomeUsuario,
  emailUsuario,
  tipo,
  mensagem,
}: {
  empresaId: string;
  usuarioId?: string | null;
  acessoId?: string | null;
  nomeEmpresa?: string;
  nomeUsuario?: string;
  emailUsuario?: string;
  tipo: 'sugestao' | 'duvida' | 'reclamacao' | 'avaliacao';
  mensagem: string;
}) {
  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      empresa_id: empresaId,
      usuario_id: usuarioId || null,
      acesso_id: acessoId || null,
      nome_empresa: nomeEmpresa || null,
      nome_usuario: nomeUsuario || null,
      email_usuario: emailUsuario || null,
      tipo,
      mensagem,
      status: 'novo',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar feedback:', error);

    return {
      erro: true,
      mensagem:
        'Não foi possível registrar sua mensagem neste momento. Tente novamente em alguns minutos.',
      data: null,
    };
  }

  return {
    erro: false,
    mensagem: 'Feedback registrado com sucesso.',
    data,
  };
}

const DESPESAS_PADRAO_PESSOAL = [
  { nome: 'Aluguel',             categoria: 'Moradia' },
  { nome: 'Parcela casa',        categoria: 'Moradia' },
  { nome: 'Condomínio',          categoria: 'Moradia' },
  { nome: 'Água',                categoria: 'Moradia' },
  { nome: 'Energia',             categoria: 'Moradia' },
  { nome: 'Gás',                 categoria: 'Moradia' },
  { nome: 'Internet',            categoria: 'Moradia' },
  { nome: 'Itens para casa',     categoria: 'Moradia' },
  { nome: 'Manutenção casa',     categoria: 'Moradia' },
  { nome: 'Mercado',             categoria: 'Custos de Vida' },
  { nome: 'Saúde',               categoria: 'Custos de Vida' },
  { nome: 'Farmácia',            categoria: 'Custos de Vida' },
  { nome: 'Educação',            categoria: 'Custos de Vida' },
  { nome: 'Celular',             categoria: 'Custos de Vida' },
  { nome: 'Combustível',         categoria: 'Custos de Vida' },
  { nome: 'Transporte',          categoria: 'Custos de Vida' },
  { nome: 'Gastos com veículo',  categoria: 'Custos de Vida' },
  { nome: 'Parcela veículo',     categoria: 'Custos de Vida' },
  { nome: 'Alimentação',         categoria: 'Lazer e Consumo' },
  { nome: 'Passeios',            categoria: 'Lazer e Consumo' },
  { nome: 'Assinaturas',         categoria: 'Lazer e Consumo' },
  { nome: 'Vestuário',           categoria: 'Lazer e Consumo' },
  { nome: 'Viagem',              categoria: 'Lazer e Consumo' },
  { nome: 'Taxas bancárias',     categoria: 'Financeiro e Impostos' },
  { nome: 'Cartão de crédito',   categoria: 'Financeiro e Impostos' },
  { nome: 'Seguro',              categoria: 'Financeiro e Impostos' },
  { nome: 'IPVA',                categoria: 'Financeiro e Impostos' },
  { nome: 'IPTU',                categoria: 'Financeiro e Impostos' },
  { nome: 'Investimento',        categoria: 'Investimentos' },
];

export async function inserirDespesasPadraoPersonal(empresaId: string): Promise<void> {
  const rows = DESPESAS_PADRAO_PESSOAL.map((d) => ({
    empresa_id: empresaId,
    nome: d.nome,
    categoria: d.categoria,
  }));
  const { error } = await supabase.from('despesas_cadastradas').insert(rows);
  if (error) {
    console.error('Erro ao inserir despesas padrão pessoal:', error);
  }
}

export async function excluirFaturamentoBanco({
  empresaId,
  ano,
  mes,
}: {
  empresaId: string;
  ano: number;
  mes: string;
}) {
  const { error } = await supabase
    .from('faturamentos')
    .delete()
    .match({ empresa_id: empresaId, ano, mes });

  if (error) {
    console.error('Erro ao excluir faturamento:', error);
    return { erro: true, mensagem: 'Não foi possível excluir o total do mês.' };
  }

  return { erro: false, mensagem: '' };
}
