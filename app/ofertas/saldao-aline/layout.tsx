import type {Metadata} from 'next';
import type {ReactNode} from 'react';

// Identidade de instalação estática, independente da consulta de uma oferta.
// As tags essenciais são antecipadas pelo React ao head; generateMetadata é transmitido depois do corpo.
export const metadata:Metadata={applicationName:'Saldão Aline',title:{absolute:'Saldão Aline'},manifest:'/ofertas/saldao-aline/manifest.webmanifest',icons:{icon:'/ofertas/aline-192.png',apple:'/ofertas/aline-192.png'},appleWebApp:{capable:true,title:'Saldão Aline',statusBarStyle:'default'}};
export default function Layout({children}:{children:ReactNode}){return <><meta name="application-name" content="Saldão Aline"/><meta name="apple-mobile-web-app-title" content="Saldão Aline"/><link rel="manifest" href="/ofertas/saldao-aline/manifest.webmanifest"/>{children}</>;}
