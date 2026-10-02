// Original camp draft lifecycle regression. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),G=require('../engine.js');
function mount(){const state=G.fresh(13),context={window:{Caravan:G,Art:{}},clearTimeout(){}};vm.runInNewContext(fs.readFileSync(require.resolve('../home.js'),'utf8'),context);const ui=context.window.CaravanHome.create({state:()=>state,render(){},saveLayout(value){G.arrangeHome(state,value);return true;}});return {ui,state};}
test('temporarily hidden camp controls preserve a draft until the player saves',()=>{
 const {ui,state}=mount();ui.handle('home-layout-edit');ui.handle('home-layout-select','tent');ui.handle('home-layout-nudge','right');ui.bind(false);assert.equal(ui.editing(),true);assert.deepEqual(state.collection.home.layout,G.freshLayout());ui.handle('home-layout-save');assert.equal(state.collection.home.layout.positions.tent.x,105);assert.equal(ui.editing(),false);
});
test('leaving the camp discards draft controls without changing saved layout',()=>{
 const {ui,state}=mount(),before=JSON.stringify(state);ui.handle('home-layout-edit');ui.handle('home-layout-select','tent');ui.handle('home-layout-nudge','right');ui.discard();assert.equal(ui.editing(),false);ui.handle('home-layout-save');assert.equal(JSON.stringify(state),before);ui.handle('home-layout-edit');ui.handle('home-layout-save');assert.deepEqual(state.collection.home.layout,G.freshLayout());
});

test('selling a displayed collectible prunes only that item from a pending layout, preserving furniture edits',()=>{
 const {ui,state}=mount();state.collection.treasures=['leafSeal'];G.arrangeHome(state,{positions:{},treasures:['leafSeal']});ui.handle('home-layout-edit');ui.handle('home-layout-select','tent');ui.handle('home-layout-nudge','right');G.sellTreasure(state,'leafSeal');ui.reconcileTreasures();assert.equal(ui.editing(),true);ui.handle('home-layout-save');assert.deepEqual(state.collection.home.layout.treasures,[]);assert.equal(state.collection.home.layout.positions.tent.x,105);assert.ok(G.restore(state));
});
