import {unzipSync} from 'fflate';
const MAX_LABEL=8*1024*1024;
/** Extract only the single ZPL text label, never the PDF/control or any path on disk. */
export function thermalLabelText(archive:Uint8Array):Uint8Array{
 if(archive.length<22||archive.length>15*1024*1024||archive[0]!==0x50||archive[1]!==0x4b)throw Error('invalid_thermal_archive');
 let count=0;
 const files=unzipSync(archive,{filter:file=>{
  if(!/\.(txt|zpl)$/i.test(file.name)||file.name.endsWith('/'))return false;
  if(file.originalSize<1||file.originalSize>MAX_LABEL||++count>1)throw Error('invalid_thermal_label');
  return true;
 }});
 const labels=Object.values(files);if(labels.length!==1)throw Error('thermal_label_missing');
 const bytes=labels[0];if(!bytes.length||bytes.length>MAX_LABEL)throw Error('invalid_thermal_label');
 const text=new TextDecoder().decode(bytes).replace(/^\uFEFF/,'').trim();
 if(!text.startsWith('^XA')||!text.endsWith('^XZ')||text.includes('\0'))throw Error('invalid_zpl');
 return bytes; // Preserve the original bytes, encoding, line endings and all ZPL commands.
}
