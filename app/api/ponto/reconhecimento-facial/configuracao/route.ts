import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';

const VERSAO_ACEITE = 'facial-v1';
const PRECO_CENTAVOS = 1490;
const FRANQUIA_MENSAL = 120;

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

function idsValidos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return Array.from(new Set(valor.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = url.searchParams.get('empresaId')?.trim() || '';
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return respostaErro('Acesso não autorizado.', 403);

  const { data, error } = await acesso.db
    .from('ponto_facial_funcionarios')
    .select('funcionario_user_id, status')
    .eq('empresa_id', empresaId)
    .neq('status', 'removido');
  if (error) return respostaErro('Não foi possível carregar a preparação facial.', 500);
  return NextResponse.json({ erro: false, funcionarios: data || [] });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const funcionariosIds = idsValidos(corpo.funcionariosIds);
  const aceite = corpo.aceite === true;
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return respostaErro('Acesso não autorizado.', 403);
  if (!aceite) return respostaErro('Confirme que a empresa possui base legal, aviso de privacidade e alternativa de marcação antes de preparar o reconhecimento facial.');

  const { data: funcionarios, error: erroFuncionarios } = await acesso.db
    .from('ponto_funcionarios')
    .select('user_id')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .in('user_id', funcionariosIds);
  if (erroFuncionarios) return respostaErro('Não foi possível validar os funcionários selecionados.', 500);
  if ((funcionarios || []).length !== funcionariosIds.length) return respostaErro('Selecione apenas funcionários ativos da empresa.');

  const agora = new Date().toISOString();
  const { error: erroConfig } = await acesso.db.from('ponto_config').upsert({
    empresa_id: empresaId,
    reconhecimento_facial_status: funcionariosIds.length ? 'preparacao' : 'desativado',
    reconhecimento_facial_valor_centavos: PRECO_CENTAVOS,
    reconhecimento_facial_franquia_mensal: FRANQUIA_MENSAL,
    reconhecimento_facial_aceite_versao: VERSAO_ACEITE,
    reconhecimento_facial_aceite_em: agora,
    reconhecimento_facial_aceite_por: acesso.usuario.id,
    atualizado_em: agora,
  }, { onConflict: 'empresa_id' });
  if (erroConfig) return respostaErro('Não foi possível salvar a configuração facial.', 500);

  const { error: erroRemover } = await acesso.db
    .from('ponto_facial_funcionarios')
    .update({ status: 'removido', removido_em: agora, atualizado_em: agora })
    .eq('empresa_id', empresaId)
    .neq('status', 'removido')
    .not('funcionario_user_id', 'in', `(${funcionariosIds.length ? funcionariosIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
  if (erroRemover) return respostaErro('Não foi possível atualizar a seleção de funcionários.', 500);

  if (funcionariosIds.length) {
    const { error: erroSelecionados } = await acesso.db.from('ponto_facial_funcionarios').upsert(
      funcionariosIds.map((funcionarioUserId) => ({
        empresa_id: empresaId,
        funcionario_user_id: funcionarioUserId,
        status: 'pendente_cadastro',
        removido_em: null,
        atualizado_em: agora,
      })),
      { onConflict: 'empresa_id,funcionario_user_id' },
    );
    if (erroSelecionados) return respostaErro('Não foi possível preparar os funcionários selecionados.', 500);
  }

  await acesso.db.from('ponto_auditoria').insert({
    empresa_id: empresaId,
    ator_user_id: acesso.usuario.id,
    evento: 'reconhecimento_facial_preparado',
    origem: 'gestao_web',
    motivo: 'Preparação do adicional facial.',
    dados: { funcionarios: funcionariosIds.length, valor_centavos: PRECO_CENTAVOS, franquia_mensal: FRANQUIA_MENSAL, aceite_versao: VERSAO_ACEITE },
  });

  return NextResponse.json({ erro: false, status: funcionariosIds.length ? 'preparacao' : 'desativado' });
}
