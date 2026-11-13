import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const EXPORTER=join(dirname(fileURLToPath(import.meta.url)),'export-godot-plan.mjs');

const exportPlan=(script,aspect='9:16')=>JSON.parse(execFileSync(process.execPath,[EXPORTER,script,aspect],{encoding:'utf8'}));
test('German story maps to distinct native 2D actions',()=>{
  const plan=exportPlan('Er wacht auf. Er putzt die Zähne. Er nimmt einen Apfel.');
  assert.equal(plan.scenes.length,3);
  assert.deepEqual(plan.scenes.map(s=>s.action),['wake','brush','pick']);
  assert.equal(plan.scenes[1].place,'bathroom');
  assert.equal(plan.scenes[2].place,'supermarket');
  assert.equal(plan.scenes.at(-1).endFrame,plan.totalFrames);
});
test('English narration and landscape mode are accepted',()=>{
  const plan=exportPlan('She wakes up. She brushes her teeth. She takes a bus.','16:9');
  assert.equal(plan.aspectRatio,'16:9');
  assert.deepEqual(plan.scenes.map(s=>s.action),['wake','brush','travel']);
});
test('Unknown actions degrade to talk without losing sentences',()=>{
  const plan=exportPlan('The galaxy contains billions of stars. A scientist examines an atom.');
  assert.equal(plan.scenes.length,2);
  assert.ok(plan.scenes.every(s=>s.action==='talk'));
  assert.ok(plan.scenes.every(s=>s.frames>0));
});

test('Narration frame durations control scene boundaries',()=>{
  const dir=mkdtempSync(join(tmpdir(),'godot-plan-'));
  try {
    const durations=join(dir,'durations.json');
    writeFileSync(durations,JSON.stringify([48,96]));
    const plan=JSON.parse(execFileSync(process.execPath,
      [EXPORTER,'Er wacht auf. Er putzt die Zähne.','9:16',durations],
      {encoding:'utf8'}));
    assert.deepEqual(plan.scenes.map(s=>s.frames),[48,96]);
    assert.equal(plan.totalFrames,144);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('Long scripts are rejected rather than silently truncated',()=>{
  const script=Array.from({length:181},(_,i)=>'Scene '+i+'.').join(' ');
  assert.throws(()=>exportPlan(script),/Command failed/);
});


test('Hospital and school environments survive the native Godot exporter',()=>{
  const plan=exportPlan('Der Patient ist im Krankenhaus. Danach geht er in die Schule.');
  assert.deepEqual(plan.scenes.map(s=>s.place),['hospital','school']);
  assert.ok(plan.scenes.every(s=>s.frames>0));
});


test('Documentary topics remain distinct in native 2D exports',()=>{
  const examples=[
    ['Die Erde dreht sich um die Sonne.','space'],
    ['Das Experiment erklärt die Physik.','science'],
    ['Im Wald steht ein Baum.','nature'],
    ['Ein Computer verarbeitet die Daten.','technology'],
    ['Die Karte zeigt Europa.','map'],
    ['Die Geschichte beginnt im Jahr 1900.','history'],
    ['Eine Nachricht erscheint auf dem Smartphone.','phone'],
    ['Die Uhr zeigt Mitternacht.','clock'],
    ['Eine Warnmeldung erscheint auf dem Bildschirm.','alert'],
    ['Die Kosten steigen um 25%.','infographic']
  ];
  for(const [script,place] of examples){
    const plan=exportPlan(script);
    assert.equal(plan.scenes[0].place,place,script);
    assert.ok(plan.scenes[0].frames>0);
  }
});


test('Walking running and sitting are preserved as native character motions',()=>{
  const examples=[['She walks through the city.','walk'],['Er rennt nach Hause.','run'],['Die Frau sitzt auf einem Stuhl.','sit']];
  for(const [script,action] of examples){
    const plan=exportPlan(script);
    assert.equal(plan.scenes[0].action,action,script);
  }
});


test('Godot exports preserve distinct text-derived visual objects',()=>{
  const plan=exportPlan('A scientist examines an atom. A gardener waters a flower.');
  assert.equal(plan.scenes.length,2);
  assert.ok(plan.scenes.every(s=>Array.isArray(s.props)&&Array.isArray(s.keywords)));
  assert.notDeepEqual(plan.scenes[0].keywords,plan.scenes[1].keywords);
});

test('Radio and metro have distinct native documentary scenes',()=>{
  const plan=exportPlan('The radio broadcasts a warning. Die U-Bahn fährt in die Station. Eine Nachricht erscheint auf dem Smartphone.');
  assert.deepEqual(plan.scenes.map(s=>s.place),['radio','metro','phone']);
  assert.ok(plan.scenes.every(s=>s.frames>0));
});
