'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './marketplaces.module.css';

export default function ProductThumbnail({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.localProductPhoto}>{url && !failed ? <Image src={url} alt={`Foto de ${name}`} width={56} height={56} unoptimized onError={() => setFailed(true)} /> : <span>Sem foto</span>}</div>;
}
