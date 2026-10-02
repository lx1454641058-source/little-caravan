// Original packaged resource and settings boundary tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {resource,isEntry,isNotice,settings,windowSizing,FILES,ENTRY,NOTICE_ENTRY}=require('../desktop/policy.cjs');
test('desktop protocol serves only existing packaged game assets',()=>{
  for(const [url,[file]] of Object.entries(FILES)){assert.ok(resource('caravan://game'+url));assert.ok(fs.existsSync(path.join(__dirname,'..',file)));}
  for(const url of ['file:///C:/Windows/win.ini','https://example.com','caravan://other/app.js','caravan://game/package.json','caravan://game/desktop/main.cjs','caravan://game/../LICENSE','caravan://game/%2e%2e/%2e%2e/secret','caravan://game/app.js?file=x','caravan://user:pass@game/app.js'])assert.equal(resource(url),null,url);
  assert.equal(resource(ENTRY,'POST'),null);assert.ok(resource(ENTRY,'HEAD'));
});
test('desktop IPC trusts only the exact entry page and settings reject invalid dimensions',()=>{
  assert.ok(isEntry(ENTRY));assert.ok(isEntry(ENTRY+'#'));assert.equal(isEntry('caravan://game/app.js'),false);assert.equal(isEntry('caravan://game/index.html?spoof'),false);
  assert.deepEqual(settings({width:-1,height:Infinity,fullscreen:'yes'}),{width:1280,height:800,fullscreen:false});assert.deepEqual(settings({width:1920,height:1080,fullscreen:true}),{width:1920,height:1080,fullscreen:true});
});
test('license viewer has one fixed resource URL and cannot obtain the game bridge',()=>{
  assert.ok(isNotice(NOTICE_ENTRY));assert.ok(isNotice(NOTICE_ENTRY+'#ffmpeg','HEAD'));assert.equal(isEntry(NOTICE_ENTRY),false);
  for(const url of ['file:///C:/Windows/win.ini','caravan://other/third-party-notices.html','caravan://game/third-party-notices.html?path=secret','caravan://user:pass@game/third-party-notices.html','caravan://game/LICENSE','caravan://game/%2e%2e/secret'])assert.equal(isNotice(url),false);
  assert.equal(isNotice(NOTICE_ENTRY,'POST'),false);assert.equal(resource(NOTICE_ENTRY),null);
});
test('small work areas constrain both requested window size and native minimum',()=>{
  assert.deepEqual(windowSizing({width:1920,height:1080},{width:960,height:520}),{width:960,height:520,minWidth:960,minHeight:520});
  assert.deepEqual(windowSizing({}, {width:853,height:480}),{width:853,height:480,minWidth:853,minHeight:480});
  assert.deepEqual(windowSizing({width:1280,height:720},{width:1920,height:1040}),{width:1280,height:720,minWidth:960,minHeight:640});
});
test('unavailable display dimensions fall back without invalid native window options',()=>{
  assert.deepEqual(windowSizing({width:1920,height:1080},{width:NaN,height:0}),{width:1280,height:800,minWidth:960,minHeight:640});
  assert.deepEqual(windowSizing(null,null),{width:1280,height:800,minWidth:960,minHeight:640});
});
