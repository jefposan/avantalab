/** Estado informativo do perfil atual; não é uma ação ou um botão. */
export default function SeloPerfilEmUso({ id }: { id?: string }) {
  return (
    <span id={id} className="avanta-perfil-em-uso" aria-label="Perfil em uso">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="currentColor" />
        <path d="m7 12 3 3 7-7" fill="none" stroke="var(--av-perfil-em-uso-superficie)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Em uso</span>
    </span>
  );
}
