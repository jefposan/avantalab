import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { login } = await request.json();

    const loginLimpo = String(login || '').trim().toLowerCase();

    if (!loginLimpo) {
      return NextResponse.json(
        { erro: true, mensagem: 'Informe seu email ou login.' },
        { status: 400 }
      );
    }

    const colunaBusca = loginLimpo.includes('@') ? 'email' : 'login';

    const { data: usuario, error } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, user_id, nome, email, login, telefone, telefone_confirmado, status')
      .eq(colunaBusca, loginLimpo)
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar usuário para recuperação:', error);

      return NextResponse.json(
        { erro: true, mensagem: 'Não foi possível localizar o acesso.' },
        { status: 500 }
      );
    }

    if (!usuario || !usuario.user_id) {
      return NextResponse.json(
        {
          erro: true,
          mensagem:
            'Não encontramos um acesso ativo com esses dados.',
        },
        { status: 404 }
      );
    }

    if (!usuario.telefone || usuario.telefone_confirmado !== true) {
      return NextResponse.json(
        {
          erro: true,
          mensagem:
            'Este acesso ainda não possui celular confirmado. Entre em contato com o gestor da conta.',
        },
        { status: 400 }
      );
    }

    const respostaTwilio = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+55${usuario.telefone.replace(/\D/g, '')}`,
          Channel: 'sms',
        }),
      }
    );

    const resultadoTwilio = await respostaTwilio.json();

    if (!respostaTwilio.ok) {
      console.error('Erro Twilio recuperação senha:', resultadoTwilio);

      return NextResponse.json(
        {
          erro: true,
          mensagem:
            'Não foi possível enviar o código por SMS. Tente novamente.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Código enviado por SMS.',
    });
  } catch (error) {
    console.error('Erro geral ao enviar código de recuperação:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Não foi possível processar a solicitação.',
      },
      { status: 500 }
    );
  }
}