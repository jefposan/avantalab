# Preferências

## Contrato recomendado

```ts
type AvantaPreferencias = {
  tema: 'claro' | 'escuro' | 'sistema';
  corPrimaria: string;
  valoresOcultos: boolean;
  densidade: 'confortavel' | 'compacta';
  ordemCards: string[];
  cardsOcultos: string[];
  filtrosPersistentes: boolean;
  versao: number;
};
```

## Regras

- Separar preferência pessoal, configuração da empresa e configuração do módulo.
- Uma única camada deve ler, validar, migrar e persistir preferências.
- Toda chave persistida possui namespace e versão; não criar nomes genéricos no
  `localStorage`.
- Preferência ausente ou inválida cai em padrão seguro e documentado.
- Mudança de esquema inclui migração e compatibilidade com dados anteriores.
- Preferência visual não pode contornar permissão, assinatura ou validação do
  servidor.
- Ordem e visibilidade de cards usam identificadores estáveis, não títulos.
- Tema e cor são recebidos pelo módulo; módulo plugado não cria tema paralelo.

## Persistência

- Local: somente conveniência não sensível e específica do dispositivo.
- Servidor: preferências que acompanham o usuário ou afetam múltiplos dispositivos.
- Empresa: somente usuários autorizados alteram; demais usuários apenas consomem.
