// Original desktop asset integrity and metadata regression tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {SIZES,iconSvg,encodeIco,versionResource}=require('../desktop/branding.cjs');
test('checked-in icon is reproducible from original art and contains all Windows sizes',()=>{
  const root=path.join(__dirname,'../assets'),ico=fs.readFileSync(path.join(root,'caravan-icon.ico'));assert.equal(fs.readFileSync(path.join(root,'caravan-icon.svg'),'utf8'),iconSvg());assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),7);
  const frames=[];let previousEnd=6+7*16;
  for(let i=0;i<7;i++){const start=6+i*16,size=ico[start]||256,length=ico.readUInt32LE(start+8),offset=ico.readUInt32LE(start+12);assert.equal(size,SIZES[i]);assert.equal(ico[start+1]||256,size);assert.equal(offset,previousEnd);const data=ico.subarray(offset,offset+length);assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);frames.push({size,data});previousEnd=offset+length;}
  assert.equal(previousEnd,ico.length);assert.deepEqual(encodeIco(frames),ico);assert.deepEqual(frames.at(-1).data,fs.readFileSync(path.join(root,'caravan-icon.png')));
  assert.throws(()=>encodeIco(frames.slice(1)));const corrupt=frames.map(f=>({...f}));corrupt[0].size=256;assert.throws(()=>encodeIco(corrupt));
});
test('version metadata preserves Chinese titles and rejects ambiguous or overflowing versions',()=>{
  for(const input of ['1.2','-1.2.3','0.13.1-beta','65536.1.0','1.2.3.4','1.2.3\0'])assert.throws(()=>versionResource(input));
  const data=versionResource('0.13.1');assert.equal(data.readUInt16LE(0),data.length);assert.equal(data.readUInt16LE(2),52);assert.match(data.toString('utf16le'),/行囊与远方/);assert.match(data.toString('utf16le'),/LittleCaravan.exe/);assert.match(data.toString('utf16le'),/0.13.1.0/);
  assert.equal(data.readUInt32LE(40),0xfeef04bd);assert.equal(data.readUInt32LE(48),13);assert.equal(data.readUInt32LE(52),65536);
});
