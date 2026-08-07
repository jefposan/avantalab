import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function limparSecret(valor: string | undefined) {
  return (valor || '').trim().replace(/^["']|["']$/g, '').replace(/\s/g, '');
}

async function cancelarAssinaturaAsaas(id: string) {
  const chave = limparSecret(Deno.env.get('ASAAS_API_KEY'));
  if (!chave) return { ok: false, erro: 'ASAAS_API_KEY não configurada' };
  const base = (Deno.env.get('ASAAS_BASE_URL') || (chave.startsWith('$aact_prod_')
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3')).replace(/\/$/, '');
  try {
    const resposta = await fetch(`${base}/subscriptions/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'AvantaLab', access_token: chave },
    });
    if (resposta.ok || resposta.status === 404) return { ok: true };
    const corpo = await resposta.text();
    return { ok: false, erro: `Asaas ${resposta.status}: ${corpo.slice(0, 250)}` };
  } catch (erro) {
    return { ok: false, erro: String(erro) };
  }
}

Deno.serve(async () => {
  try {
    const db = createClient(url, service);
    const agora = new Date().toISOString();
    const { data: perfis, error } = await db
      .from('perfis_excluidos')
      .select('empresa_id, nome_perfil')
      .is('restaurado_em', null)
      .lte('restaurar_ate', agora)
      .eq('retencao_legal', false);
    if (error) throw error;

    let removidos = 0;
    let retidosLegalmente = 0;
    const falhas: string[] = [];
    for (const perfil of perfis || []) {
      const [base, modulos, pontoFacial] = await Promise.all([
        db.from('assinaturas').select('gateway_subscription_id').eq('empresa_id', perfil.empresa_id).not('gateway_subscription_id', 'is', null),
        db.from('assinaturas_modulos').select('gateway_subscription_id').eq('empresa_id', perfil.empresa_id).not('gateway_subscription_id', 'is', null),
        db.from('ponto_facial_assinaturas').select('gateway_subscription_id').eq('empresa_id', perfil.empresa_id).not('gateway_subscription_id', 'is', null),
      ]);
      const consultaComErro = [base, modulos, pontoFacial].find((resultado) => resultado.error);
      if (consultaComErro?.error) {
        falhas.push(`${perfil.empresa_id}: ${consultaComErro.error.message}`);
        continue;
      }

      const assinaturas = Array.from(new Set([
        ...(base.data || []), ...(modulos.data || []), ...(pontoFacial.data || []),
      ].map((item) => item.gateway_subscription_id).filter(Boolean))) as string[];
      let podePurgar = true;
      for (const assinaturaId of assinaturas) {
        const cancelamento = await cancelarAssinaturaAsaas(assinaturaId);
        if (!cancelamento.ok) {
          podePurgar = false;
          falhas.push(`${perfil.empresa_id}: ${cancelamento.erro}`);
          break;
        }
      }
      if (!podePurgar) continue;

      const { data: apagado, error: erroPurga } = await db.rpc('purgar_perfil_excluido', {
        p_empresa_id: perfil.empresa_id,
      });
      if (erroPurga) {
        falhas.push(`${perfil.empresa_id}: ${erroPurga.message}`);
      } else if (apagado) {
        removidos++;
      } else {
        retidosLegalmente++;
      }
    }
    return Response.json({ ok: true, removidos, retidosLegalmente, falhas });
  } catch (erro) {
    return Response.json({ ok: false, erro: String(erro) }, { status: 500 });
  }
});
