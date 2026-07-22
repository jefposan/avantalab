import { supabase } from './supabase';

export type PerfilGestaoAcesso = {
  empresa_id: string;
  empresa_nome: string;
  tipo_perfil: 'empresa' | 'pessoal';
  perfil: string;
};

export type AcessoVendasDestino = {
  empresa_id: string;
  empresa_nome: string;
  papel: string;
  status: string;
  moduloAtivo: boolean;
};

export type SolicitacaoVendasDestino = {
  id: string;
  empresa_id: string;
  status: string;
  atualizado_em?: string | null;
};

export type DestinosContaAvanta = {
  gestao: PerfilGestaoAcesso[];
  vendas: AcessoVendasDestino[];
  solicitacaoVendas: SolicitacaoVendasDestino | null;
};

export async function buscarDestinosContaAvanta(): Promise<DestinosContaAvanta> {
  const { data: usuarioAtual, error: erroUsuario } = await supabase.auth.getUser();
  if (erroUsuario || !usuarioAtual.user) {
    throw erroUsuario || new Error('Sessão não encontrada. Entre novamente.');
  }

  // Mantém a regra já usada pelo Vendas: gestores de um perfil com o módulo
  // instalado recebem o vínculo operacional correspondente. Operadores não são
  // promovidos nem recebem permissões adicionais.
  const { error: erroReparoGestor } = await supabase.rpc(
    'garantir_acessos_gestor_vendas_mobile_rpc'
  );
  if (erroReparoGestor) throw erroReparoGestor;

  const [perfisResposta, acessosResposta, solicitacaoResposta] = await Promise.all([
    supabase.rpc('meus_perfis_gestao_para_troca_rpc'),
    supabase.rpc('meus_acessos_vendas_mobile_rpc'),
    supabase
      .from('vendas_mobile_solicitacoes_acesso')
      .select('id, empresa_id, status, atualizado_em')
      .eq('user_id', usuarioAtual.user.id)
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (perfisResposta.error) throw perfisResposta.error;
  if (acessosResposta.error) throw acessosResposta.error;
  if (solicitacaoResposta.error) throw solicitacaoResposta.error;

  const gestao: PerfilGestaoAcesso[] = ((perfisResposta.data || []) as Array<Record<string, unknown>>).map(
    (perfil) => ({
      empresa_id: String(perfil.empresa_id || ''),
      empresa_nome: String(perfil.empresa_nome || 'Perfil'),
      tipo_perfil: perfil.tipo_perfil === 'pessoal' ? 'pessoal' as const : 'empresa' as const,
      perfil: String(perfil.perfil || ''),
    })
  ).filter((perfil) => Boolean(perfil.empresa_id));

  const acessosBase = ((acessosResposta.data || []) as Array<Record<string, unknown>>)
    .map((acesso) => ({
      empresa_id: String(acesso.empresa_id || ''),
      empresa_nome: String(acesso.empresa_nome || 'Perfil'),
      papel: String(acesso.papel || ''),
      status: String(acesso.status || ''),
    }))
    .filter((acesso) => Boolean(acesso.empresa_id));

  const modulos = await Promise.all(
    acessosBase.map((acesso) =>
      supabase.rpc('modulo_vendas_mobile_ativo_rpc', {
        p_empresa_id: acesso.empresa_id,
      })
    )
  );

  const vendas = acessosBase.map((acesso, indice) => ({
    ...acesso,
    moduloAtivo: !modulos[indice].error && modulos[indice].data === true,
  }));

  return {
    gestao,
    vendas,
    solicitacaoVendas: solicitacaoResposta.data
      ? {
          id: String(solicitacaoResposta.data.id),
          empresa_id: String(solicitacaoResposta.data.empresa_id),
          status: String(solicitacaoResposta.data.status),
          atualizado_em: solicitacaoResposta.data.atualizado_em,
        }
      : null,
  };
}
