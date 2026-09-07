type VoiceLabLog = {
  event: string;
  userId?: string;
  accountId?: string;
  transcription?: string;
  intent?: string;
  interpretationMs?: number;
  disambiguation?: boolean;
  confirmed?: boolean;
  success?: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  error?: string;
};

export function logVoiceLab(entry: VoiceLabLog) {
  if (process.env.NODE_ENV !== 'development') return;
  const safeEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
    transcription: entry.transcription?.slice(0, 500),
    error: entry.error?.slice(0, 300),
  };
  console.info('[voice-command-lab]', JSON.stringify(safeEntry));
}

