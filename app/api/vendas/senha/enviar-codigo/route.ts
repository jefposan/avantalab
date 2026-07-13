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

function mascararTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, '');
  const brasileiro = numeros.startsWith('55') && numeros.length >= 12 ? numeros.slice(2) : numeros;
  if (brasileiro.length >= 10 && numeros.startsWith('55')) {
    return `(${brasileiro.slice(0, 2)}) ${brasileiro[2] || ''}****-${brasileiro.slice(-4)}`;
  }
  return `${numeros.slice(0, Math.min(3, numeros.length))}••••${numeros.slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const emailLimpo = String(email || '').trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      return NextResponse.json({ erro: true, mensagem: 'Informe um e-mail válido.' }, { status: 400 });
    }

    const acesso = await localizarAcesso(emailLimpo);
    if (!acesso?.user_id) {
      return NextResponse.json({ erro: true, mensagem: 'Não encontramos um acesso do Vendas com este e-mail.' }, { status: 404 });
    }
    const telefone = String(acesso.telefone || '').trim();
    if (!telefone) {
      return NextResponse.json({ erro: true, mensagem: 'Este acesso não possui celular confirmado. Entre com Google e crie uma senha em Configurações.' }, { status: 400 });
    }

    const destino = telefone.startsWith('+') ? telefone : `+55${telefone.replace(/\D/g, '')}`;
    const respostaTwilio = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: destino, Channel: 'sms' }),
      }
    );
    if (!respostaTwilio.ok) {
      console.error('Erro Twilio recuperação senha Vendas:', await respostaTwilio.text());
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível enviar o código por SMS.' }, { status: 500 });
    }
    return NextResponse.json({ erro: false, mensagem: 'Código enviado por SMS.', telefoneMascarado: mascararTelefone(destino) });
  } catch (error) {
    console.error('Erro recuperação senha Vendas:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível processar a solicitação.' }, { status: 500 });
  }
}
