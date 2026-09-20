import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

type AplicativoDisparo = 'gestao' | 'avantavendas';
type TipoDestinoDisparo = 'todos' | 'usuario' | 'perfil';
type UsuarioDestino = { id: string; nome: string | null; email: string | null };
type PerfilDestino = { id: string; nome: string; usuarios: number };

const UUID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POR_PAGINA_HISTORICO = 10;

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

async function completarUsuarios(
  db: Awaited<ReturnType<typeof exigirAdmin>>['db'],
  usuarios: Map<string, UsuarioDestino>,
) {
  const entradas = [...usuarios.entries()];
  for (let inicio = 0; inicio < entradas.length; inicio += 10) {
    await Promise.all(entradas.slice(inicio, inicio + 10).map(async ([userId, registro]) => {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error || !data.user) return;
      const metadados = data.user.user_metadata || {};
      const nomeAuth = typeof metadados.nome === 'string'
        ? metadados.nome
        : typeof metadados.full_name === 'string'
          ? metadados.full_name
          : null;
      registro.nome ||= nomeAuth || data.user.email?.split('@')[0] || null;
      registro.email ||= data.user.email || null;
    }));
  }
}

async function listarDestinos(
  db: Awaited<ReturnType<typeof exigirAdmin>>['db'],
  aplicativo: AplicativoDisparo,
) {
  const usuarios = new Map<string, UsuarioDestino>();
  const perfis: PerfilDestino[] = [];

  if (aplicativo === 'gestao') {
    const { data: vinculos, error } = await db
      .from('usuarios_empresa')
      .select('empresa_id, user_id, nome, email')
      .eq('status', 'ativo')
      .neq('perfil', 'funcionario_ponto')
      .not('user_id', 'is', null);
    if (error) throw error;
    const idsPerfis = Array.from(new Set((vinculos || []).map((item) => item.empresa_id).filter(Boolean)));
    const { data: empresas, error: erroEmpresas } = idsPerfis.length
      ? await db.from('empresas').select('id, nome').in('id', idsPerfis)
      : { data: [] as Array<{ id: string; nome: string }>, error: null };
    if (erroEmpresas) throw erroEmpresas;
    const usuariosPorPerfil = new Map<string, Set<string>>();
    for (const vinculo of vinculos || []) {
      if (!vinculo.user_id || !vinculo.empresa_id) continue;
      const atual = usuarios.get(vinculo.user_id) || { id: vinculo.user_id, nome: null, email: null };
      atual.nome ||= vinculo.nome || null;
      atual.email ||= vinculo.email || null;
      usuarios.set(vinculo.user_id, atual);
      const membros = usuariosPorPerfil.get(vinculo.empresa_id) || new Set<string>();
      membros.add(vinculo.user_id);
      usuariosPorPerfil.set(vinculo.empresa_id, membros);
    }
    for (const empresa of empresas || []) {
      const quantidade = usuariosPorPerfil.get(empresa.id)?.size || 0;
      if (quantidade) perfis.push({ id: empresa.id, nome: empresa.nome || 'Perfil sem nome', usuarios: quantidade });
    }
  } else {
    const { data: membros, error } = await db
      .from('vendas_mobile_contas_usuarios')
      .select('conta_id, user_id')
      .eq('status', 'ativo');
    if (error) throw error;
    const idsContas = Array.from(new Set((membros || []).map((item) => item.conta_id).filter(Boolean)));
    const { data: contas, error: erroContas } = idsContas.length
      ? await db.from('vendas_mobile_contas').select('id, nome').in('id', idsContas).is('arquivada_em', null)
      : { data: [] as Array<{ id: string; nome: string }>, error: null };
    if (erroContas) throw erroContas;
    const contasAtivas = new Set((contas || []).map((conta) => conta.id));
    const usuariosPorConta = new Map<string, Set<string>>();
    for (const membro of membros || []) {
      if (!membro.user_id || !contasAtivas.has(membro.conta_id)) continue;
      if (!usuarios.has(membro.user_id)) usuarios.set(membro.user_id, { id: membro.user_id, nome: null, email: null });
      const participantes = usuariosPorConta.get(membro.conta_id) || new Set<string>();
      participantes.add(membro.user_id);
      usuariosPorConta.set(membro.conta_id, participantes);
    }
    for (const conta of contas || []) {
      const quantidade = usuariosPorConta.get(conta.id)?.size || 0;
      if (quantidade) perfis.push({ id: conta.id, nome: conta.nome || 'Conta sem nome', usuarios: quantidade });
    }
  }

  await completarUsuarios(db, usuarios);
  const comparador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  const listaUsuarios = [...usuarios.values()]
    .map((usuario) => ({ ...usuario, nome: usuario.nome || usuario.email || 'Usuário sem nome' }))
    .sort((a, b) => comparador.compare(a.nome, b.nome));
  perfis.sort((a, b) => comparador.compare(a.nome, b.nome));
  return { usuarios: listaUsuarios, perfis };
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const url = new URL(request.url);
    const destinos = url.searchParams.get('destinos');
    if (destinos === 'gestao' || destinos === 'avantavendas') {
      const resultado = await listarDestinos(db, destinos);
      return NextResponse.json({ erro: false, aplicativo: destinos, ...resultado }, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const paginaRecebida = Number.parseInt(url.searchParams.get('pagina') || '1', 10);
    const pagina = Number.isFinite(paginaRecebida) && paginaRecebida > 0 ? paginaRecebida : 1;
    const inicio = (pagina - 1) * POR_PAGINA_HISTORICO;
    const fim = inicio + POR_PAGINA_HISTORICO - 1;
    const { data, error, count } = await db
      .from('admin_disparos')
      .select('id, titulo, mensagem, usuarios, pushes_enviados, total_inscricoes, status, erro, aplicativo, origem, programacao_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(inicio, fim);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ erro: false, disparos: [], pagina: 1, porPagina: POR_PAGINA_HISTORICO, total: 0, totalPaginas: 1, configuracaoPendente: true });
      }
      throw error;
    }

    const total = Number(count || 0);
    return NextResponse.json({
      erro: false,
      disparos: data || [],
      pagina,
      porPagina: POR_PAGINA_HISTORICO,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_HISTORICO)),
    });
  } catch (error) {
    console.error('Erro ao carregar histórico de disparos:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar o histórico.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const body = await request.json();
    const {
      titulo: tituloRecebido,
      mensagem: mensagemRecebida,
      aplicativo: aplicativoRecebido,
    } = body;
    const titulo = String(tituloRecebido || '').trim() || 'Novidade no AvantaLab';
    const mensagem = String(mensagemRecebida || '').trim();
    const aplicativo: AplicativoDisparo = aplicativoRecebido === 'avantavendas' ? 'avantavendas' : 'gestao';
    const tipoDestino: TipoDestinoDisparo = body.tipoDestino === 'perfil'
      ? 'perfil'
      : body.tipoDestino === 'usuario' || body.usuarioId
        ? 'usuario'
        : 'todos';
    const destinoId = String(body.destinoId || body.usuarioId || '').trim();
    if (!mensagem) return NextResponse.json({ erro: true, mensagem: 'Digite a mensagem.' }, { status: 400 });
    if (tipoDestino !== 'todos' && !UUID_VALIDO.test(destinoId)) {
      return NextResponse.json({ erro: true, mensagem: `O ${tipoDestino === 'usuario' ? 'usuário' : 'perfil'} selecionado é inválido.` }, { status: 400 });
    }

    let usuariosIds: string[] | null = tipoDestino === 'usuario' ? [destinoId] : null;
    let empresaIdNotificacao: string | null = null;
    if (tipoDestino === 'perfil' && aplicativo === 'gestao') {
      const [{ data: empresa }, { data: vinculos, error: erroVinculos }] = await Promise.all([
        db.from('empresas').select('id').eq('id', destinoId).maybeSingle(),
        db.from('usuarios_empresa').select('user_id').eq('empresa_id', destinoId).eq('status', 'ativo').neq('perfil', 'funcionario_ponto').not('user_id', 'is', null),
      ]);
      if (erroVinculos) throw erroVinculos;
      usuariosIds = Array.from(new Set((vinculos || []).map((item) => item.user_id).filter(Boolean))) as string[];
      if (!empresa || !usuariosIds.length) {
        return NextResponse.json({ erro: true, mensagem: 'O perfil selecionado não possui usuários ativos.' }, { status: 404 });
      }
      empresaIdNotificacao = destinoId;
    }
    if (tipoDestino === 'perfil' && aplicativo === 'avantavendas') {
      const [{ data: conta }, { data: membros, error: erroMembros }] = await Promise.all([
        db.from('vendas_mobile_contas').select('id').eq('id', destinoId).is('arquivada_em', null).maybeSingle(),
        db.from('vendas_mobile_contas_usuarios').select('user_id').eq('conta_id', destinoId).eq('status', 'ativo'),
      ]);
      if (erroMembros) throw erroMembros;
      usuariosIds = Array.from(new Set((membros || []).map((item) => item.user_id).filter(Boolean))) as string[];
      if (!conta || !usuariosIds.length) {
        return NextResponse.json({ erro: true, mensagem: 'A conta selecionada não possui usuários ativos.' }, { status: 404 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const internalToken = process.env.ADMIN_FEEDBACKS_TOKEN || '';
    if (!supabaseUrl || !anon || !internalToken) {
      return NextResponse.json({ erro: true, mensagem: 'Configuração de disparos incompleta.' }, { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({
        token: internalToken,
        titulo,
        corpo: mensagem,
        aplicativo,
        ...(usuariosIds ? { usuariosIds } : {}),
        ...(empresaIdNotificacao ? { empresaId: empresaIdNotificacao } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));
    const destinatarioEncontrado = tipoDestino === 'todos'
      || (tipoDestino === 'usuario' && Number(result.usuarios || 0) === 1)
      || (tipoDestino === 'perfil' && Number(result.usuarios || 0) > 0);
    const success = response.ok && result.ok && destinatarioEncontrado;

    const history = {
      titulo,
      mensagem,
      usuarios: Number(result.usuarios || 0),
      pushes_enviados: Number(result.enviados || 0),
      total_inscricoes: Number(result.total || 0),
      status: success ? 'enviado' : 'erro',
      erro: success ? null : String(result.erro || (tipoDestino !== 'todos' && !destinatarioEncontrado ? 'O destino não possui acesso ativo ao aplicativo selecionado.' : 'Falha no disparo.')),
      aplicativo,
      origem: 'manual',
    };
    const historyResult = await db.from('admin_disparos').insert(history).select().single();

    if (!success) {
      return NextResponse.json({ erro: true, mensagem: history.erro }, { status: tipoDestino !== 'todos' && !destinatarioEncontrado ? 404 : response.status || 500 });
    }

    return NextResponse.json({ erro: false, resultado: result, disparo: historyResult.data || history });
  } catch (error) {
    console.error('Erro ao disparar aviso administrativo:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível realizar o disparo.' }, { status: 500 });
  }
}
