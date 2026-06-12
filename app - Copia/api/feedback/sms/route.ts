import { NextResponse } from 'next/server';
import twilio from 'twilio';

function limitarTexto(texto: string, limite = 140) {
  const textoLimpo = String(texto || '').replace(/\s+/g, ' ').trim();

  if (textoLimpo.length <= limite) {
    return textoLimpo;
  }

  return `${textoLimpo.slice(0, limite - 3)}...`;
}

function formatarTipo(tipo: string) {
  if (tipo === 'sugestao') return 'Sugestão';
  if (tipo === 'duvida') return 'Dúvida';
  if (tipo === 'reclamacao') return 'Reclamação';
  if (tipo === 'avaliacao') return 'Avaliação';

  return 'Feedback';
}

export async function POST(request: Request) {
  try {
    const {
      tipo,
      mensagem,
      nomeEmpresa,
      nomeUsuario,
      emailUsuario,
    } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const telefoneOrigem = process.env.TWILIO_PHONE_NUMBER;
    const telefoneDestino = process.env.FEEDBACK_SMS_TO;

    if (!accountSid || !authToken || !telefoneOrigem || !telefoneDestino) {
      console.error('Configuração do SMS de feedback incompleta.');

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Configuração do SMS incompleta.',
        },
        { status: 500 }
      );
    }

    if (!tipo || !mensagem) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Dados obrigatórios não informados.',
        },
        { status: 400 }
      );
    }

    const client = twilio(accountSid, authToken);

    const tipoFormatado = formatarTipo(tipo);
    const empresaResumo = limitarTexto(nomeEmpresa || 'Não informada', 35);
    const usuarioResumo = limitarTexto(
      nomeUsuario || emailUsuario || 'Não informado',
      35
    );
    const mensagemResumo = limitarTexto(mensagem, 140);

    const textoSms =
`AvantaLab: novo feedback
Tipo: ${tipoFormatado}
Empresa: ${empresaResumo}
Usuario: ${usuarioResumo}
Msg: ${mensagemResumo}`;

    await client.messages.create({
      body: textoSms,
      from: telefoneOrigem,
      to: telefoneDestino,
    });

    return NextResponse.json({
      erro: false,
      mensagem: 'SMS de feedback enviado.',
    });
  } catch (error) {
    console.error('Erro ao enviar SMS de feedback:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Não foi possível enviar o SMS de feedback.',
      },
      { status: 500 }
    );
  }
}