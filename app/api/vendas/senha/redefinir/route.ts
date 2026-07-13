import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function localizarAcesso(email: string) {
  const { data, error } = await supabaseAdmin
    .from('vendas_mobile_solicitacoes_acesso')
    .select('user_id, telefone, status')
    .eq('email', email)
    .in('status', ['pendente', 'aprovada'])
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const { email, codigo, novaSenha } = await request.json();
    const emailLimpo = String(email || '').trim().toLowerCase();
    const codigoLimpo = String(codigo || '').trim();
    const senhaLimpa = String(novaSenha || '');
    if (!emailLimpo || !codigoLimpo || senhaLimpa.length < 8) {
      return NextResponse.json({ erro: true, mensagem: 'Informe o e-mail, o código e uma senha de ao menos 8 caracteres.' }, { status: 400 });
    }

    const acesso = await localizarAcesso(emailLimpo);
    const telefone = String(acesso?.telefone || '').trim();
    if (!acesso?.user_id || !telefone) {
      return NextResponse.json({ erro: true, mensagem: 'Não encontramos um celular confirmado para este acesso.' }, { status: 404 });
    }
    const destino = telefone.startsWith('+') ? telefone : `+55${telefone.replace(/\D/g, '')}`;
    const respostaTwilio = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: destino, Code: codigoLimpo }),
      }
    );
    const resultadoTwilio = await respostaTwilio.json().catch(() => ({}));
    if (!respostaTwilio.ok || resultadoTwilio.status !== 'approved') {
      return NextResponse.json({ erro: true, mensagem: 'Código inválido ou expirado.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(acesso.user_id, { password: senhaLimpa });
    if (error) {
      console.error('Erro ao atualizar senha do Vendas:', error);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível atualizar a senha.' }, { status: 500 });
    }
    return NextResponse.json({ erro: false, mensagem: 'Senha redefinida com sucesso.' });
  } catch (error) {
    console.error('Erro redefinição senha Vendas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível processar a solicitação.' }, { status: 500 });
  }
}
