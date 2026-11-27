/** Date-only values stay literal; timestamps follow the company's Brazilian business day. */
export function matchesCommercialListPeriod(value,period){
 const raw=String(value||'');
 let date=raw;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)){
  const parsed=new Date(raw);if(!Number.isFinite(parsed.getTime()))return false;
  date=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(parsed);
 }
 return (!period.start||date>=period.start)&&(!period.end||date<=period.end);
}
