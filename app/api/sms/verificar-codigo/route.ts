import { NextResponse } from 'next/server';
import { formatarE164 } from '../../../lib/telefone';

export async function POST(request: Request) {
  try {
    const { telefone, codigo } = await request.json();

    if (!telefone) {
      return NextResponse.json(
        { erro: true, mensagem: 'Informe o número de celular.' },
        { status: 400 }
      );
    }

    if (!codigo) {
      return NextResponse.json(
        { erro: true, mensagem: 'Informe o código recebido por SMS.' },
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

    const telefoneFormatado = formatarE164(String(telefone));

    const resposta = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
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
          Code: String(codigo).trim(),
        }),
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok || resultado.status !== 'approved') {
      console.error('Erro ao verificar código Twilio:', resultado);

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Código inválido ou expirado.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Código validado com sucesso.',
      telefone: telefoneFormatado,
    });
  } catch (error) {
    console.error('Erro ao verificar SMS:', error);

    return NextResponse.json(
      { erro: true, mensagem: 'Erro inesperado ao verificar código.' },
      { status: 500 }
    );
  }
}