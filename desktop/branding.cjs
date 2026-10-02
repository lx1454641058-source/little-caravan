// Original Windows branding resource encoder. SPDX-License-Identifier: MIT.
// Format references: Microsoft VS_VERSIONINFO / VS_FIXEDFILEINFO and ICO layout.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const SIZES=[16,24,32,48,64,128,256];
function iconSvg(){
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../art.js'),'utf8'),context);
  // Embed the generated atlas so the standalone Windows emblem has no relative URLs.
  const cart=context.window.Art.icon('cart').replace('<svg ','<svg x="39" y="51" width="178" height="178" ').replace(/href="(assets\/paint-[a-z]+-024\.png)"/g,(_,file)=>'href="data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'..',file)).toString('base64')+'"');
  return `<!-- Original caravan emblem derived from this project's art.js. MIT. --><svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="forest" x2="1" y2="1"><stop stop-color="#55775b"/><stop offset="1" stop-color="#213f38"/></linearGradient></defs><rect x="8" y="8" width="240" height="240" rx="53" fill="url(#forest)"/><rect x="16" y="16" width="224" height="224" rx="46" fill="none" stroke="#d3b574" stroke-width="5"/><circle cx="183" cy="60" r="20" fill="#e9ca83"/><path d="m30 160 48-48 34 26 37-49 78 75" fill="#749273" opacity=".45"/>${cart}</svg>`;
}
function encodeIco(images){
  if(!Array.isArray(images)||images.length!==SIZES.length||images.some((image,i)=>image.size!==SIZES[i]||!Buffer.isBuffer(image.data)||!image.data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||image.data.readUInt32BE(16)!==image.size||image.data.readUInt32BE(20)!==image.size))throw Error('Expected seven correctly sized PNG icon frames.');
  const header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
  images.forEach(({size,data},i)=>{const n=6+i*16;header[n]=header[n+1]=size===256?0:size;header.writeUInt16LE(1,n+4);header.writeUInt16LE(32,n+6);header.writeUInt32LE(data.length,n+8);header.writeUInt32LE(offset,n+12);offset+=data.length;});return Buffer.concat([header,...images.map(i=>i.data)]);
}
function versionResource(version){
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Expected a numeric release version.');const numbers=version.split('.').map(Number).concat(0);if(numbers.some(n=>n>65535))throw Error('Windows version component overflow.');
  const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]),wide=s=>Buffer.from(s+'\0','utf16le');
  function block(key,type,value,valueLength,children=[]){const header=Buffer.alloc(6);header.writeUInt16LE(valueLength,2);header.writeUInt16LE(type,4);const body=Buffer.concat([pad(Buffer.concat([header,wide(key)])),pad(value),...children.map(pad)]);if(body.length>65535)throw Error('Version resource too large.');body.writeUInt16LE(body.length);return body;}
  const fixed=Buffer.alloc(52),ms=(numbers[0]*65536+numbers[1])>>>0,ls=(numbers[2]*65536+numbers[3])>>>0;
  [0xfeef04bd,0x10000,ms,ls,ms,ls,0x3f,0,0x40004,1,0,0,0].forEach((n,i)=>fixed.writeUInt32LE(n,i*4));
  const strings={FileDescription:'行囊与远方',FileVersion:version+'.0',InternalName:'LittleCaravan',OriginalFilename:'LittleCaravan.exe',ProductName:'行囊与远方 · A Little Caravan',ProductVersion:version+'.0',LegalCopyright:'Game code: MIT. Runtime notices included.',Comments:'Offline single-player caravan game'};
  const table=block('040904B0',1,Buffer.alloc(0),0,Object.entries(strings).map(([key,value])=>block(key,1,wide(value),value.length+1)));
  const translation=Buffer.from([9,4,176,4]);
  return block('VS_VERSION_INFO',0,fixed,fixed.length,[block('StringFileInfo',1,Buffer.alloc(0),0,[table]),block('VarFileInfo',1,Buffer.alloc(0),0,[block('Translation',0,translation,4)])]);
}
module.exports={SIZES,iconSvg,encodeIco,versionResource};
