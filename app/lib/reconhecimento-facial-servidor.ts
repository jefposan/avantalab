import {
  CompareFacesCommand,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
  type Image,
} from '@aws-sdk/client-rekognition';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const REGIAO = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.AWS_FACIAL_EVIDENCE_BUCKET || '';

function configurado() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && BUCKET);
}

function clientes() {
  if (!configurado()) throw new Error('Infraestrutura facial ainda não está configurada.');
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };
  return {
    rekognition: new RekognitionClient({ region: REGIAO, credentials }),
    s3: new S3Client({ region: REGIAO, credentials }),
  };
}

export function infraestruturaFacialDisponivel() {
  return configurado();
}

export async function criarSessaoProvaDeVida() {
  const { rekognition } = clientes();
  const resultado = await rekognition.send(new CreateFaceLivenessSessionCommand({ Settings: { AuditImagesLimit: 2 } }));
  if (!resultado.SessionId) throw new Error('Não foi possível iniciar a prova de vida.');
  return resultado.SessionId;
}

export async function obterResultadoProvaDeVida(sessionId: string) {
  const { rekognition } = clientes();
  return rekognition.send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
}

export async function guardarEvidenciaFacial(chave: string, bytes: Uint8Array) {
  const { s3 } = clientes();
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: chave,
    Body: bytes,
    ContentType: 'image/jpeg',
    ServerSideEncryption: 'AES256',
    Metadata: { classificacao: 'biometria-sensivel', retencao: '5-anos' },
  }));
  return chave;
}

export async function compararComReferencia(origem: Image, chaveReferencia: string) {
  const { rekognition } = clientes();
  return rekognition.send(new CompareFacesCommand({
    SourceImage: origem,
    TargetImage: { S3Object: { Bucket: BUCKET, Name: chaveReferencia } },
    SimilarityThreshold: 90,
    QualityFilter: 'AUTO',
  }));
}

export const LIMIAR_PROVA_DE_VIDA = 70;
export const LIMIAR_SIMILARIDADE = 90;
