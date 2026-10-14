// O pacote Android antigo expõe PushNotifications, mas não tem Firebase.
// Só uma confirmação nativa positiva permite chamar register()/unregister().
export async function pushNativoDisponivel(
  plataforma: string,
  temVerificadorAndroid: boolean,
  verificarAndroid: () => Promise<{ ready: boolean }>,
): Promise<boolean> {
  if (plataforma !== 'android') return true;
  if (!temVerificadorAndroid) return false;
  try {
    return (await verificarAndroid()).ready === true;
  } catch {
    return false;
  }
}
