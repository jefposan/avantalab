import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatarE164 } from '../../../../lib/telefone';

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !accountSid || !authToken || !verifyServiceSid) {
      return erro('Não foi possível confirmar o celular neste momento.', 500);
    }

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return erro('Sua sessão expirou. Entre novamente.', 401);

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: erroUsuario } = await supabaseUsuario.auth.getUser();
    if (erroUsuario || !user) return erro('Sua sessão expirou. Entre novamente.', 401);

    const corpo = await request.json();
    const codigo = String(corpo.codigo || '').trim();
    if (!codigo) return erro('Informe o código recebido por SMS.');

    let telefone: string;
    try {
      telefone = formatarE164(String(corpo.telefone || ''));
    } catch {
      return erro('Informe um celular válido.');
    }
    const digitosTelefone = telefone.replace(/\D/g, '');
    if (digitosTelefone.length < 8 || digitosTelefone.length > 15) return erro('Informe um celular válido.');

    const respostaTwilio = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: telefone, Code: codigo }),
        signal: AbortSignal.timeout(15000),
      }
    );
    const resultadoTwilio = await respostaTwilio.json().catch(() => ({}));
    if (!respostaTwilio.ok || resultadoTwilio.status !== 'approved') {
      return erro('Código inválido ou expirado.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: erroAtualizacao } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), telefone },
    });
    if (erroAtualizacao) {
      console.error('Erro ao salvar celular confirmado no Vendas:', erroAtualizacao);
      return erro('O código foi validado, mas não foi possível salvar o celular. Solicite um novo código.', 500);
    }

    return NextResponse.json({ erro: false, telefone });
  } catch (error) {
    console.error('Erro ao confirmar celular do Vendas:', error);
    return erro('Não foi possível confirmar o celular. Tente novamente.', 500);
  }
}
