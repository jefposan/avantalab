import {pictureId,pictureUrl} from './listing-content.ts';
export type CatalogPhoto={id?:string;url:string;receipt?:string};
export function catalogPhotoFromUrl(url:string):CatalogPhoto{
 const normalized=pictureUrl(url),match=normalized&&new URL(normalized).pathname.match(/\/(?:D_NQ_NP_|D_)([A-Za-z0-9_-]+)-[A-Z]\.(?:jpe?g|webp|png)$/i);
 return {url,...(match&&pictureId(match[1])?{id:match[1]}:{})};
}
export function uniqueCatalogPhotos(photos:CatalogPhoto[],max=12){
 const result:CatalogPhoto[]=[];
 for(const photo of photos)if(!result.some(p=>p.id&&p.id===photo.id||p.url===photo.url)){result.push(photo);if(result.length===max)break;}
 return result;
}
