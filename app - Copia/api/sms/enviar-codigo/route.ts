import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { telefone } = await request.json();

    if (!telefone) {
      return NextResponse.json(
        { erro: true, mensagem: 'Informe o número de celular.' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      return NextResponse.json(
        { erro: true, mensagem: 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos ou entre em contato com o suporte.' },
        { status: 500 }
      );
    }

    const telefoneLimpo = String(telefone).replace(/\D/g, '');

    const telefoneFormatado = telefoneLimpo.startsWith('55')
      ? `+${telefoneLimpo}`
      : `+55${telefoneLimpo}`;

    const resposta = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: telefoneFormatado,
          Channel: 'sms',
        }),
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.error('Erro Twilio Verify:', resultado);

      return NextResponse.json(
        {
          erro: true,
          mensagem:
            resultado?.message ||
            'Não foi possível enviar o código por SMS.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Código enviado por SMS.',
      telefone: telefoneFormatado,
    });
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);

    return NextResponse.json(
      { erro: true, mensagem: 'Erro inesperado ao enviar SMS.' },
      { status: 500 }
    );
  }
}