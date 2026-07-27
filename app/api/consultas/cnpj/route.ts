import { NextResponse } from 'next/server';
import { normalizarCnpjWs } from '@/lib/consultas/normalizers/cnpj';
import {
  CnpjWsProviderError,
  consultarCnpjWs,
} from '@/lib/consultas/providers/cnpjws';
import type {
  ConsultaCnpjErrorCode,
  ConsultaCnpjErrorResponse,
  ConsultaCnpjSuccessResponse,
} from '@/lib/consultas/types';
import {
  CNPJ_ENTRADA_MAXIMA,
  validarCnpj,
} from '@/lib/consultas/validators/cnpj';

export const runtime = 'nodejs';

const CORPO_MAXIMO_BYTES = 1_024;

const MENSAGENS: Record<ConsultaCnpjErrorCode, string> = {
  INVALID_DOCUMENT: 'Informe um CNPJ válido para continuar.',
  NOT_FOUND:
    'Não encontramos uma empresa para o CNPJ informado. Confira os dados e tente novamente.',
  RATE_LIMITED:
    'O serviço de consulta atingiu temporariamente o limite de solicitações. Aguarde um momento e tente novamente.',
  TIMEOUT: 'O serviço demorou mais que o esperado para responder. Tente novamente.',
  PROVIDER_UNAVAILABLE:
    'O serviço de consulta está temporariamente indisponível.',
  INTERNAL_ERROR: 'O serviço de consulta está temporariamente indisponível.',
};

const CABECALHOS_SEGUROS = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

function respostaErro(code: ConsultaCnpjErrorCode, status: number) {
  const corpo: ConsultaCnpjErrorResponse = {
    success: false,
    error: { code, message: MENSAGENS[code] },
  };
  return NextResponse.json(corpo, {
    status,
    headers: CABECALHOS_SEGUROS,
  });
}

function statusDoErro(code: ConsultaCnpjErrorCode): number {
  if (code === 'NOT_FOUND') return 404;
  if (code === 'RATE_LIMITED') return 429;
  if (code === 'TIMEOUT') return 504;
  return 503;
}

export async function POST(request: Request) {
  const tipoConteudo = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  if (tipoConteudo !== 'application/json') {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  const tamanhoDeclarado = Number(request.headers.get('content-length') ?? 0);
  if (
    Number.isFinite(tamanhoDeclarado) &&
    tamanhoDeclarado > CORPO_MAXIMO_BYTES
  ) {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  let corpo: unknown;

  try {
    const texto = await request.text();
    if (!texto || new TextEncoder().encode(texto).length > CORPO_MAXIMO_BYTES) {
      return respostaErro('INVALID_DOCUMENT', 400);
    }
    corpo = JSON.parse(texto);
  } catch {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  if (
    corpo === null ||
    typeof corpo !== 'object' ||
    Array.isArray(corpo) ||
    Object.keys(corpo).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(corpo, 'cnpj') ||
    typeof (corpo as { cnpj?: unknown }).cnpj !== 'string'
  ) {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  const entrada = (corpo as { cnpj: string }).cnpj;
  if (entrada.length > CNPJ_ENTRADA_MAXIMA) {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  const validacao = validarCnpj(entrada);
  if (!validacao.valido) {
    return respostaErro('INVALID_DOCUMENT', 400);
  }

  try {
    const respostaProvedor = await consultarCnpjWs(validacao.documento);
    const data = normalizarCnpjWs(
      respostaProvedor,
      new Date().toISOString(),
      validacao.documento,
    );
    const corpoSucesso: ConsultaCnpjSuccessResponse = {
      success: true,
      data,
    };

    return NextResponse.json(corpoSucesso, {
      status: 200,
      headers: CABECALHOS_SEGUROS,
    });
  } catch (error) {
    if (error instanceof CnpjWsProviderError) {
      return respostaErro(error.code, statusDoErro(error.code));
    }
    return respostaErro('INTERNAL_ERROR', 500);
  }
}
