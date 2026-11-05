// Páginas simuladas somente nos testes. A produção sempre usa a leitura HTTPS independente.
export const mockOriginModule=`export async function readPublicPricePage(url){
 const product=globalThis.priceOriginFixtures?.get(url);
 return product?{url,html:'<script type="application/ld+json">'+JSON.stringify(product)+'</script>'}:null;
}`;
export function originFixture(offer,overrides={}){
 return {'@type':'Product',name:offer.title,url:offer.url,offers:{'@type':'Offer',url:offer.url,price:offer.price,priceCurrency:'BRL',availability:'https://schema.org/InStock',...overrides}};
}
