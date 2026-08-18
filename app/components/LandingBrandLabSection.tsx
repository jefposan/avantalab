import styles from '../styles/landing/landing-brand-lab.module.css';

const etapas = [
  ['01', 'Ideia', 'Entendemos o que a sua empresa quer construir e para quem ela existe.'],
  ['02', 'Direção', 'Transformamos intenção em um caminho claro para a marca avançar.'],
  ['03', 'Identidade', 'A empresa ganha forma, linguagem e presença para ser reconhecida.'],
  ['04', 'Operação', 'A marca chega ao mercado pronta para se apresentar e funcionar.'],
] as const;

const marcos = [
  ['01', 'Ideia', 'O ponto de partida'],
  ['02', 'Direção', 'Clareza para escolher o caminho'],
  ['03', 'Identidade', 'A forma de se apresentar'],
  ['04', 'Operação', 'Pronta para avançar'],
] as const;

export default function LandingBrandLabSection() {
  return (
    <section className={styles.section} id="laboratorio-de-marcas" aria-labelledby="titulo-laboratorio">
      <div className={styles.wrap} data-scroll-target>
        <div className={styles.copy}>
          <p className={styles.kicker}>Laboratório de marcas</p>
          <h2 id="titulo-laboratorio">Do zero ao <em>operacional.</em></h2>
          <p className={styles.lead}>O AvantaLab transforma ideias em marcas com direção, identidade, presença e estrutura para começar a operar.</p>
          <p className={styles.support}>Você traz a visão. Nós ajudamos a construir o caminho para ela ganhar forma e entrar no mercado.</p>
        </div>

        <ol className={styles.steps} aria-label="Como uma ideia se transforma em marca">
          {etapas.map(([numero, titulo, texto]) => (
            <li key={numero}>
              <span>{numero}</span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </li>
          ))}
        </ol>

        <div className={styles.canvas}>
          <svg className={styles.trajectory} viewBox="0 0 1000 110" preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.trajectoryPath} d="M 125 43 Q 250 3 375 43 Q 500 3 625 43 Q 750 3 875 43" />
            <g className={styles.trajectoryArrow}>
              <circle cx="250" cy="23" r="11" />
              <text x="250" y="23">→</text>
            </g>
            <g className={styles.trajectoryArrow}>
              <circle cx="500" cy="23" r="11" />
              <text x="500" y="23">→</text>
            </g>
            <g className={styles.trajectoryArrow}>
              <circle cx="750" cy="23" r="11" />
              <text x="750" y="23">→</text>
            </g>
          </svg>
          <ol className={styles.timeline} aria-label="Evolução de uma marca">
            {marcos.map(([numero, titulo, texto]) => (
              <li key={numero}>
                <span>{numero}</span>
                <div>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
