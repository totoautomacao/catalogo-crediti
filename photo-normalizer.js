/* Photo inputs are decoded by content, then resized and stored as JPEG. */
(()=>{
 const loads=new Map();
 function load(src){if(!loads.has(src))loads.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{loads.delete(src);s.remove();reject(new Error('Não foi possível carregar o conversor. Tente novamente.'))};document.head.appendChild(s)}));return loads.get(src)}
 function decode(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Imagem não reconhecida'))};img.src=url})}
 function dimensions(w,h){if(!w||!h||w*h>80000000)throw new Error('A imagem precisa ter até 80 megapixels.');}
 async function normalize(file){
  if(!file.size)throw new Error(`${file.name}: arquivo vazio.`);
  if(file.size>40*1024*1024)throw new Error(`${file.name}: o arquivo ultrapassa 40 MB.`);
  const head=new Uint8Array(await file.slice(0,64).arrayBuffer());
  const text=String.fromCharCode(...head);
  const heic=text.slice(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(text.slice(8));
  const tiff=(head[0]===73&&head[1]===73&&head[2]===42&&head[3]===0)||(head[0]===77&&head[1]===77&&head[2]===0&&head[3]===42);
  let source;
  try{source=await decode(file)}catch(original){
   if(heic||/\.hei[cf]$/i.test(file.name)){
    if(typeof window.heic2any!=='function')throw new Error('Conversor de fotos do iPhone indisponível. Atualize o catálogo.');
    try{let converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:.92});if(Array.isArray(converted))converted=converted[0];source=await decode(converted)}catch(e){throw new Error(`${file.name}: não foi possível converter esta foto HEIC/HEIF. O arquivo pode estar danificado ou usar uma variante não compatível.`)}
   }else if(tiff||/\.tiff?$/i.test(file.name)){
    await load('/photo-inflate-v1.js');await load('/photo-tiff-v1.js');
    const buffer=await file.arrayBuffer(),frames=window.UTIF.decode(buffer),frame=frames.find(f=>f.t256?.[0]&&f.t257?.[0]);
    if(!frame)throw new Error(`${file.name}: TIFF sem imagem legível.`);
    dimensions(frame.t256[0],frame.t257[0]);window.UTIF.decodeImage(buffer,frame);
    const rgba=window.UTIF.toRGBA8(frame);source=document.createElement('canvas');source.width=frame.width;source.height=frame.height;
    source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),frame.width,frame.height),0,0);
   }else throw new Error(`${file.name}: imagem inválida ou formato não compatível. Use JPG, JPEG, JFIF, PNG, WebP, GIF, BMP, AVIF, HEIC, HEIF ou TIFF.`);
  }
  const width=source.naturalWidth||source.width,height=source.naturalHeight||source.height;dimensions(width,height);
  const scale=Math.min(1,1800/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
  if(!blob||blob.type!=='image/jpeg')throw new Error('Não foi possível preparar a foto. Tente novamente.');
  return new File([blob],`${file.name.replace(/\.[^.]+$/,'')||'foto'}.jpg`,{type:'image/jpeg'});
 }
 window.CreditiPhoto={normalize};
})();
