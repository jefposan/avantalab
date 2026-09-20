import { createClient } from 'jsr:@supabase/supabase-js@2';
import { enviarPush } from '../_shared/push.ts';
import { referenciaDisparo, usuarioElegivelParaDisparo } from '../_shared/disparos.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Aplicativo = 'gestao' | 'avantavendas';
type Programacao = {
  id: string;
  nome: string;
  aplicativo: Aplicativo;
  gatilho: 'data_programada' | 'apos_cadastro' | 'sem_acesso';
  titulo: string;
  mensagem: string;
  data_programada: string | null;
  intervalo_valor: number | null;
  intervalo_unidade: 'horas' | 'dias' | 'semanas' | null;
};

async function usuariosAtivosDoAplicativo(db: any, aplicativo: Aplicativo) {
  if (aplicativo === 'gestao') {
    const { data, error } = await db.from('usuarios_empresa').select('user_id').eq('status', 'ativo').neq('perfil', 'funcionario_ponto');
    if (error) throw error;
    return Array.from(new Set((data || []).map((item: any) => item.user_id).filter(Boolean))) as string[];
  }
  const { data: membros, error: erroMembros } = await db.from('vendas_mobile_contas_usuarios').select('conta_id, user_id').eq('status', 'ativo');
  if (erroMembros) throw erroMembros;
  const contasIds = Array.from(new Set((membros || []).map((item: any) => item.conta_id).filter(Boolean))) as string[];
  if (!contasIds.length) return [];
  const { data: contas, error: erroContas } = await db.from('vendas_mobile_contas').select('id').in('id', contasIds).is('arquivada_em', null);
  if (erroContas) throw erroContas;
  const contasAtivas = new Set((contas || []).map((item: any) => item.id));
  return Array.from(new Set((membros || []).filter((item: any) => contasAtivas.has(item.conta_id)).map((item: any) => item.user_id).filter(Boolean))) as string[];
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return resposta({ ok: false, erro: 'Metodo nao permitido.' }, 405);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const corpo = await request.json().catch(() => ({}));
    const agora = typeof corpo?.agora === 'string' && !Number.isNaN(Date.parse(corpo.agora))
      ? new Date(corpo.agora)
      : new Date();
    const { data: programacoes, error } = await db
      .from('admin_disparos_programados')
      .select('id, nome, aplicativo, gatilho, titulo, mensagem, data_programada, intervalo_valor, intervalo_unidade')
      .eq('ativo', true)
      .order('criado_em', { ascending: true });
    if (error) throw error;

    const resultados = [];
    for (const programacao of (programacoes || []) as Programacao[]) {
      const usuariosAtivos = await usuariosAtivosDoAplicativo(db, programacao.aplicativo);
      if (!usuariosAtivos.length) {
        if (programacao.gatilho === 'data_programada' && programacao.data_programada && new Date(programacao.data_programada) <= agora) {
          await db.from('admin_disparos_programados').update({ ativo: false, ultima_execucao_em: agora.toISOString(), atualizado_em: agora.toISOString() }).eq('id', programacao.id);
        }
        continue;
      }
      const { data: atividades, error: erroAtividades } = await db
        .from('app_atividade_usuarios')
        .select('user_id, primeiro_acesso_em, ultimo_acesso_em')
        .eq('aplicativo', programacao.aplicativo)
        .in('user_id', usuariosAtivos);
      if (erroAtividades) throw erroAtividades;

      const elegiveis = (atividades || []).filter((atividade) => usuarioElegivelParaDisparo(programacao, atividade, agora));
      if (!elegiveis.length) {
        if (programacao.gatilho === 'data_programada' && programacao.data_programada && new Date(programacao.data_programada) <= agora) {
          await db.from('admin_disparos_programados').update({ ativo: false, ultima_execucao_em: agora.toISOString(), atualizado_em: agora.toISOString() }).eq('id', programacao.id);
        }
        continue;
      }

      const { data: entregasExistentes, error: erroEntregas } = await db
        .from('admin_disparos_entregas')
        .select('user_id, referencia')
        .eq('programacao_id', programacao.id)
        .in('user_id', elegiveis.map((item) => item.user_id));
      if (erroEntregas) throw erroEntregas;
      const jaEntregues = new Set((entregasExistentes || []).map((item) => `${item.user_id}:${item.referencia}`));
      const pendentes = elegiveis.filter((atividade) => (
        !jaEntregues.has(`${atividade.user_id}:${referenciaDisparo(programacao, atividade)}`)
      ));
      if (!pendentes.length) {
        if (programacao.gatilho === 'data_programada') {
          await db.from('admin_disparos_programados').update({ ativo: false, ultima_execucao_em: agora.toISOString(), atualizado_em: agora.toISOString() }).eq('id', programacao.id);
        }
        continue;
      }

      const usuarios = pendentes.map((item) => item.user_id);
      const origemPush = programacao.aplicativo === 'gestao' ? 'mobile' : 'avantavendas';
      const destino = programacao.aplicativo === 'gestao' ? '/mobile' : '/avantavendas';
      if (programacao.aplicativo === 'gestao') {
        await db.from('notificacoes').insert(usuarios.map((userId) => ({
          empresa_id: null,
          user_id: userId,
          titulo: programacao.titulo,
          corpo: programacao.mensagem,
          url: destino,
          tipo: 'novidade',
        })));
      }

      const { data: inscricoes, error: erroInscricoes } = await db
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth, canal, apns_token, fcm_token, app_origem')
        .in('user_id', usuarios)
        .eq('app_origem', origemPush);
      if (erroInscricoes) throw erroInscricoes;

      let pushesEnviados = 0;
      const enviosPorUsuario = new Map<string, number>();
      const cacheBadges = new Map<string, number | null>();
      for (const inscricao of inscricoes || []) {
        const entregue = await enviarPush(db, inscricao, {
          titulo: programacao.titulo,
          corpo: programacao.mensagem,
          url: destino,
          appOrigem: origemPush,
        }, cacheBadges);
        if (!entregue || !inscricao.user_id) continue;
        pushesEnviados += 1;
        enviosPorUsuario.set(inscricao.user_id, (enviosPorUsuario.get(inscricao.user_id) || 0) + 1);
      }

      const entregas = pendentes.map((atividade) => {
        const quantidade = enviosPorUsuario.get(atividade.user_id) || 0;
        const possuiInscricao = (inscricoes || []).some((item) => item.user_id === atividade.user_id);
        return {
          programacao_id: programacao.id,
          user_id: atividade.user_id,
          referencia: referenciaDisparo(programacao, atividade),
          status: quantidade > 0 ? 'enviado' : possuiInscricao ? 'erro' : 'sem_inscricao',
          pushes_enviados: quantidade,
          erro: quantidade > 0 || !possuiInscricao ? null : 'Nenhuma inscricao recebeu o push.',
        };
      });
      await db.from('admin_disparos_entregas').upsert(entregas, {
        onConflict: 'programacao_id,user_id,referencia',
        ignoreDuplicates: true,
      });
      await db.from('admin_disparos').insert({
        titulo: programacao.titulo,
        mensagem: programacao.mensagem,
        usuarios: usuarios.length,
        pushes_enviados: pushesEnviados,
        total_inscricoes: (inscricoes || []).length,
        status: 'enviado',
        erro: null,
        aplicativo: programacao.aplicativo,
        origem: 'automatico',
        programacao_id: programacao.id,
      });
      await db.from('admin_disparos_programados').update({
        ativo: programacao.gatilho === 'data_programada' ? false : true,
        ultima_execucao_em: agora.toISOString(),
        atualizado_em: agora.toISOString(),
      }).eq('id', programacao.id);

      resultados.push({ id: programacao.id, usuarios: usuarios.length, pushesEnviados });
    }

    return resposta({ ok: true, processadas: resultados.length, resultados });
  } catch (error) {
    return resposta({ ok: false, erro: String(error) }, 500);
  }
});

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
