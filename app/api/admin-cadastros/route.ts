import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { normalizarTexto } from '../../lib/formatters';

export const runtime = 'nodejs';

type PlataformaCadastro = 'todos' | 'avantalab' | 'avantavendas';
type OrigemCadastro = Exclude<PlataformaCadastro, 'todos'>;
type OrdemCadastro = 'nome_asc' | 'nome_desc' | 'criado_em_desc' | 'criado_em_asc';
type FiltroVinculo = 'todos' | 'somente_avantalab' | 'somente_avantavendas' | 'ambos';

type RegistroBase = {
  nome: string | null;
  email: string | null;
  plataformas: Set<OrigemCadastro>;
};

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

function plataformaValida(valor: string | null): valor is PlataformaCadastro {
  return valor === 'todos' || valor === 'avantalab' || valor === 'avantavendas';
}

function ordemValida(valor: string | null): valor is OrdemCadastro {
  return valor === 'nome_asc' || valor === 'nome_desc' || valor === 'criado_em_desc' || valor === 'criado_em_asc';
}

function vinculoValido(valor: string | null): valor is FiltroVinculo {
  return valor === 'todos' || valor === 'somente_avantalab' || valor === 'somente_avantavendas' || valor === 'ambos';
}

// Esta rota usa os vínculos operacionais, não o número de perfis. Uma mesma
// pessoa pode possuir vários perfis e/ou contas de vendas, mas aparece uma vez
// no consolidado "Todos".
export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const url = new URL(request.url);
    const q = normalizarTexto(url.searchParams.get('q') || '');
    const plataforma = plataformaValida(url.searchParams.get('plataforma'))
      ? url.searchParams.get('plataforma') as PlataformaCadastro
      : 'todos';
    const ordem = ordemValida(url.searchParams.get('ordem'))
      ? url.searchParams.get('ordem') as OrdemCadastro
      : 'nome_asc';
    const vinculo = vinculoValido(url.searchParams.get('vinculo'))
      ? url.searchParams.get('vinculo') as FiltroVinculo
      : 'todos';
    const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const porPagina = [10, 20, 50, 100].includes(Number(url.searchParams.get('porPagina')))
      ? Number(url.searchParams.get('porPagina'))
      : 10;

    const [gestaoResultado, membrosVendasResultado] = await Promise.all([
      db
        .from('usuarios_empresa')
        .select('user_id, nome, email')
        .eq('status', 'ativo')
        .neq('perfil', 'funcionario_ponto')
        .not('user_id', 'is', null),
      db
        .from('vendas_mobile_contas_usuarios')
        .select('conta_id, user_id')
        .eq('status', 'ativo'),
    ]);

    if (gestaoResultado.error) throw gestaoResultado.error;
    if (membrosVendasResultado.error) throw membrosVendasResultado.error;

    const membrosVendas = membrosVendasResultado.data || [];
    const contasIds = Array.from(new Set(membrosVendas.map((membro) => membro.conta_id).filter(Boolean)));
    const contasResultado = contasIds.length
      ? await db.from('vendas_mobile_contas').select('id').in('id', contasIds).is('arquivada_em', null)
      : { data: [] as Array<{ id: string }>, error: null };
    if (contasResultado.error) throw contasResultado.error;
    const contasAtivas = new Set((contasResultado.data || []).map((conta) => conta.id));

    const porUsuario = new Map<string, RegistroBase>();
    const incluir = (userId: string | null, origem: OrigemCadastro, nome?: string | null, email?: string | null) => {
      if (!userId) return;
      const atual = porUsuario.get(userId) || { nome: null, email: null, plataformas: new Set<OrigemCadastro>() };
      atual.nome ||= nome || null;
      atual.email ||= email || null;
      atual.plataformas.add(origem);
      porUsuario.set(userId, atual);
    };

    for (const vinculo of gestaoResultado.data || []) {
      incluir(vinculo.user_id, 'avantalab', vinculo.nome, vinculo.email);
    }
    for (const membro of membrosVendas) {
      if (contasAtivas.has(membro.conta_id)) incluir(membro.user_id, 'avantavendas');
    }

    const comparador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
    let candidatos = [...porUsuario.entries()]
      .filter(([, registro]) => plataforma === 'todos' || registro.plataformas.has(plataforma))
      .filter(([, registro]) => {
        if (vinculo === 'somente_avantalab') return registro.plataformas.size === 1 && registro.plataformas.has('avantalab');
        if (vinculo === 'somente_avantavendas') return registro.plataformas.size === 1 && registro.plataformas.has('avantavendas');
        if (vinculo === 'ambos') return registro.plataformas.size === 2;
        return true;
      });

    const usuariosPorId = new Map<string, Awaited<ReturnType<typeof db.auth.admin.getUserById>>['data']['user'] | null>();
    const buscarUsuario = async (userId: string) => {
      if (usuariosPorId.has(userId)) return usuariosPorId.get(userId) || null;
      const { data, error } = await db.auth.admin.getUserById(userId);
      const usuario = error ? null : data.user;
      usuariosPorId.set(userId, usuario);
      return usuario;
    };

    if (q || ordem === 'criado_em_desc' || ordem === 'criado_em_asc') {
      for (let inicio = 0; inicio < candidatos.length; inicio += 10) {
        await Promise.all(candidatos.slice(inicio, inicio + 10).map(([userId]) => buscarUsuario(userId)));
      }
    }

    if (q) {
      candidatos = candidatos.filter(([userId, registro]) => {
        const usuario = usuariosPorId.get(userId);
        const metadados = usuario?.user_metadata || {};
        const nomeAuth = typeof metadados.nome === 'string'
          ? metadados.nome
          : typeof metadados.full_name === 'string'
            ? metadados.full_name
            : '';
        return [registro.nome, registro.email, nomeAuth, usuario?.email]
          .filter(Boolean)
          .some((valor) => normalizarTexto(valor).includes(q));
      });
    }

    if (ordem === 'nome_asc' || ordem === 'nome_desc') {
      candidatos.sort(([, primeiro], [, segundo]) => {
        const comparacao = comparador.compare(primeiro.nome || primeiro.email || '', segundo.nome || segundo.email || '');
        return ordem === 'nome_desc' ? -comparacao : comparacao;
      });
    } else {
      // A fonte confiável da data de cadastro é o Auth. A ordenação por data é
      // menos frequente, por isso só consulta as pessoas pertencentes ao filtro.
      candidatos.sort(([primeiroId, primeiro], [segundoId, segundo]) => {
        const dataPrimeiro = buscarData(usuariosPorId.get(primeiroId)?.created_at);
        const dataSegundo = buscarData(usuariosPorId.get(segundoId)?.created_at);
        if (dataPrimeiro !== dataSegundo) {
          return ordem === 'criado_em_desc' ? dataSegundo - dataPrimeiro : dataPrimeiro - dataSegundo;
        }
        return comparador.compare(primeiro.nome || primeiro.email || '', segundo.nome || segundo.email || '');
      });
    }

    // O Auth é a fonte da data de cadastro e dos dados de uma conta que entrou
    // apenas pelo AvantaVendas. A paginação mantém a chamada limitada em contas
    // muito grandes, preservando a contagem baseada nos vínculos operacionais.
    const inicio = (pagina - 1) * porPagina;
    const paginaUsuarios = candidatos.slice(inicio, inicio + porPagina);
    const usuarios = await Promise.all(paginaUsuarios.map(async ([userId]) => ({ userId, usuario: await buscarUsuario(userId) })));

    const cadastros = usuarios.map(({ userId, usuario }) => {
      const registro = porUsuario.get(userId)!;
      const metadados = usuario?.user_metadata || {};
      const nomeAutenticacao = typeof metadados.nome === 'string'
        ? metadados.nome
        : typeof metadados.full_name === 'string'
          ? metadados.full_name
          : null;
      return {
        id: userId,
        nome: registro.nome || nomeAutenticacao || usuario?.email?.split('@')[0] || 'Usuário sem nome',
        email: registro.email || usuario?.email || null,
        criadoEm: usuario?.created_at || null,
        ultimoAcesso: usuario?.last_sign_in_at || null,
        plataformas: Array.from(registro.plataformas).sort(),
      };
    });

    return NextResponse.json({
      plataforma,
      vinculo,
      ordem,
      total: candidatos.length,
      pagina,
      porPagina,
      cadastros,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro ao buscar cadastros por plataforma:', error);
    return NextResponse.json(
      { erro: true, mensagem: 'Não foi possível carregar os cadastros por plataforma.' },
      { status: 500 },
    );
  }
}

function buscarData(valor: string | undefined) {
  const data = valor ? new Date(valor).getTime() : Number.NaN;
  return Number.isFinite(data) ? data : 0;
}
