import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async () => {
  try {
    const db = createClient(url, service);
    const { data: estados, error } = await db.from('pontos_restauracao_estado').select('empresa_id,alterado_em,ultimo_diario_em').or('ultimo_diario_em.is.null,alterado_em.gt.ultimo_diario_em');
    if (error) throw error;
    let criados = 0;
    for (const estado of estados || []) {
      const { error: erroPonto } = await db.rpc('criar_ponto_restauracao', { p_empresa_id: estado.empresa_id, p_origem: 'automatico_diario', p_criado_por: null, p_nome: null });
      if (erroPonto) throw erroPonto;
      criados++;
    }
    const { data: estadosVendas, error: erroEstadosVendas } = await db
      .from('vendas_mobile_pontos_restauracao_estado')
      .select('conta_id,alterado_em,ultimo_diario_em')
      .or('ultimo_diario_em.is.null,alterado_em.gt.ultimo_diario_em');
    if (erroEstadosVendas) throw erroEstadosVendas;

    let criadosVendas = 0;
    for (const estado of estadosVendas || []) {
      const { error: erroPontoVendas } = await db.rpc('criar_ponto_restauracao_vendas_mobile', {
        p_conta_id: estado.conta_id,
        p_origem: 'automatico_diario',
        p_criado_por: null,
        p_nome: null,
      });
      if (erroPontoVendas) throw erroPontoVendas;
      criadosVendas++;
    }
    return Response.json({ ok: true, criadosGestao: criados, criadosVendas });
  } catch (error) { return Response.json({ ok: false, erro: String(error) }, { status: 500 }); }
});
