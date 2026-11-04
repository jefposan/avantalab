import type {Metadata,Viewport} from 'next';
import Catalog from './Catalog';
import './viewport-shell.css';
import {readPublicOffers} from '@/app/modules/ofertas/server';
import {offerPermalink,offerMoney} from '@/app/modules/ofertas/catalog';
const shareImage={url:'https://avantalab.com.br/ofertas/ofertas-saldao-aline-compartilhar-v1.jpg',width:1200,height:630,alt:'Saldão Aline Ofertas'};
const catalogMetadata:Metadata={applicationName:'Saldão Aline',title:{absolute:'Saldão Aline'},description:'Encontre produtos disponíveis para comprar online ou fazer sua oferta pelo WhatsApp.',manifest:'/ofertas/saldao-aline/manifest.webmanifest',icons:{icon:'/ofertas/aline-192.png',apple:'/ofertas/aline-192.png'},appleWebApp:{capable:true,title:'Saldão Aline',statusBarStyle:'default'},openGraph:{title:'Ofertas Saldão Aline',description:'Compre online ou faça sua oferta pelo WhatsApp.',url:'https://avantalab.com.br/ofertas/saldao-aline',siteName:'Saldão Aline',type:'website',images:[shareImage]},twitter:{card:'summary_large_image',title:'Ofertas Saldão Aline',images:[shareImage.url]}};
export default function Page(){return <Catalog/>;}

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#ffffff',colorScheme:'light'};

export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}):Promise<Metadata>{
 const id=(await searchParams).oferta;
 if(typeof id!=='string'||!id)return catalogMetadata;
 try{
  const {offers}=await readPublicOffers(),offer=offers.find(o=>o.id===id);
  if(!offer)return catalogMetadata;
  const value=offer.online?Math.min(...offer.online.links.map(l=>l.priceCents)):offer.clearance?.priceCents;
  const description=[offer.description,value?`A partir de ${offerMoney(value)}`:'Consulte o valor',offer.condition,offer.details].filter(Boolean).join(' · ');
  const images=offer.image?[{url:offer.image,alt:offer.name}]:[shareImage];
  return {...catalogMetadata,description,openGraph:{title:offer.name,description,url:offerPermalink(offer.id),siteName:'Saldão Aline',images},twitter:{card:'summary_large_image',title:offer.name,description,images:offer.image?[offer.image]:[shareImage.url]}};
 }catch{return catalogMetadata;}
}
