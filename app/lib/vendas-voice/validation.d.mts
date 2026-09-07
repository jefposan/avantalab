import type { VoiceIntentPayload } from './types';

export function validateVoiceIntent(value: unknown): VoiceIntentPayload | null;
export function normalizeVoiceSearch(value: unknown): string;

