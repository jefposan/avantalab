export function validOverviewPeriod(start,end){
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 return valid(start)&&valid(end)&&start<=end;
}
