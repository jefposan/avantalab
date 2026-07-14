# AvantaLab Video Thumbnail Worker

Serviço do Cloud Run que gera capas JPEG para vídeos publicados em Divulgação.
O upload do celular termina antes desta etapa; a fila no Supabase chama este
serviço em segundo plano.

A capa usa sempre o primeiro frame decodificado do vídeo (`n=0`), permitindo
que a arte inicial do arquivo seja utilizada como miniatura.

## Variáveis obrigatórias

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_SECRET`

Variáveis opcionais: `STORAGE_BUCKET` (padrão `vendas-divulgacao`) e
`MAX_VIDEO_BYTES` (padrão 110 MB).

## Implantação

O `Dockerfile` instala FFmpeg e permite construir direto pelo Cloud Build:

```bash
gcloud run deploy avantalab-video-thumbnail \
  --project avantalab-media \
  --region southamerica-east1 \
  --source services/video-thumbnail-worker \
  --allow-unauthenticated \
  --service-account avantalab-thumbnail-worker@avantalab-media.iam.gserviceaccount.com \
  --min-instances 0 \
  --max-instances 3 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 600 \
  --concurrency 1 \
  --set-secrets SUPABASE_URL=avantalab-supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=avantalab-supabase-service-role:latest,WORKER_SECRET=avantalab-thumbnail-worker-secret:latest
```

O endpoint público continua protegido pelo `WORKER_SECRET`. O mesmo valor deve
ser salvo no Supabase Vault como `vendas_thumbnail_worker_secret`; a URL final
do Cloud Run deve ser salva como `vendas_thumbnail_worker_url`.
