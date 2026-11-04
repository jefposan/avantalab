import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

const WIDTH = 100 / 25.4 * 72;
const HEIGHT = 150 / 25.4 * 72;
/** Recognizes the ML bordered two-document layout; unknown layouts fail closed. */
export async function thermalLabelPdf(bytes: Uint8Array): Promise<Uint8Array> {
  if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new Error('invalid_pdf_size');
  const source = await PDFDocument.load(bytes);
  if (source.getPageCount() < 1 || source.getPageCount() > 3) throw new Error('unsupported_pdf_pages');
  const page = source.getPage(0);
  const { width, height } = page.getSize();
  if (page.getRotation().angle !== 0 || Math.abs(width - 841.89) > 2 || Math.abs(height - 595.276) > 2) throw new Error('unsupported_pdf_layout');
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray().map(ref => source.context.lookup(ref)) : [contents];
  let commands = '';
  for (const stream of streams) {
    if (!(stream instanceof PDFRawStream)) throw new Error('unsupported_pdf_stream');
    const decoded = decodePDFRawStream(stream).decode();
    if (decoded.length > 8 * 1024 * 1024) throw new Error('invalid_pdf_stream_size');
    commands += Buffer.from(decoded).toString('latin1') + '\n';
  }
  // Outer frames are about 90 × 149 mm in the landscape A4 supplied by ML.
  const frames = [...commands.matchAll(/(?:^|\n)(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) re\s/g)]
    .map(match => match.slice(1).map(Number))
    .filter(([x,y,w,h]) => x >= 0 && y >= 0 && w >= 254 && w <= 258 && h >= 420 && h <= 424 && x+w <= width && y+h <= height)
    .sort((a,b) => a[0]-b[0] || b[2]*b[3]-a[2]*a[3]);
  const groups: number[][] = [];
  for (const frame of frames) {
    const index = groups.findIndex(other => Math.abs(other[0]-frame[0]) < 3);
    if (index < 0) groups.push(frame);
    else if (frame[2]*frame[3] > groups[index][2]*groups[index][3]) groups[index]=frame;
  }
  if (groups.length !== 2 || Math.abs(groups[0][1]-groups[1][1]) > 3 || groups[1][0] < groups[0][0]+groups[0][2]) throw new Error('unsupported_pdf_frames');
  const output = await PDFDocument.create();
  for (const [x,y,w,h] of groups) {
    const margin = 0.8;
    const embedded = await output.embedPage(page, {left:x-margin,bottom:y-margin,right:x+w+margin,top:y+h+margin});
    const target = output.addPage([WIDTH, HEIGHT]);
    const scale = Math.min((WIDTH-8)/embedded.width,(HEIGHT-8)/embedded.height);
    target.drawPage(embedded,{x:(WIDTH-embedded.width*scale)/2,y:(HEIGHT-embedded.height*scale)/2,width:embedded.width*scale,height:embedded.height*scale});
  }
  return output.save();
}
