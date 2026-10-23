const assert = require('node:assert/strict');
const { SAMPLE, LIMITS, parseCSV, normalizeName, inspectCSV } = require('./project-data.js');
let count = 0;
function test(name, run) { run(); count++; console.log('PASS ' + name); }
test('Fictional sample totals and expected unflagged records', () => {
  const r = inspectCSV(SAMPLE);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.summary, { records: 10, affectedRecords: 8, unflaggedRecords: 2, issues: 8, missingCells: 2, duplicateRows: 1, nameGroups: 1 });
  assert.deepEqual(r.records.filter(row => !r.issues.some(i => i.record === row.record)).map(r => r.record), [7, 10]);
  assert.equal(r.records[9].values[3], 'Two-line note:\n"quoted text" is supported');
});
test('CSV roundtrip preserves commas, quotes, empties and newlines', () => {
  const data = [['name','age','score','note'], ['A, B','0','100','A "quoted"\nsecond line'], ['', '', '', ''], ['last', '120', '0', '']];
  const encoded = data.map(row => row.map(s => '"' + s.replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
  assert.deepEqual(parseCSV(encoded).rows, data);
  assert.deepEqual(parseCSV(encoded).lines, [1,2,4,5]);
});
test('BOM, CR, CRLF, LF and final empty cells', () => {
  assert.deepEqual(parseCSV('\ufeffa,b\rc,d\r\ne,f\ng,').rows, [['a','b'],['c','d'],['e','f'],['g','']]);
  assert.deepEqual(parseCSV('""').rows, [['']]);
  assert.deepEqual(parseCSV('a,b\n\n').rows, [['a','b'], ['']]);
});
test('Malformed CSV never generates a partial report', () => {
  for (const bad of ['name,age,score\n"A,2,3', 'name,age,score\nA"B,2,3', 'name,age,score\n"A"x,2,3']) {
    const r = inspectCSV(bad); assert.ok(r.errors.length); assert.equal(r.summary, null); assert.deepEqual(r.records, []);
  }
});
test('Valid reordered and case-insensitive schema with numeric boundaries', () => {
  const r = inspectCSV(' Score ,NAME,Age\n0,A,0\n100,B,120');
  assert.deepEqual(r.errors, []); assert.equal(r.summary.issues, 0); assert.equal(r.summary.records, 2);
});
test('Reject absent, repeated and empty headers and header-only inputs', () => {
  for (const csv of ['', 'name,age,score', 'name,age\nA,1', 'name,age,score,NAME\nA,1,2,B', 'name,age,score,\nA,1,2,x']) assert.ok(inspectCSV(csv).errors.length);
});
test('Counts missing required cells but not optional cells', () => {
  const r = inspectCSV('name,age,score,optional\n , , ,\nA,2,3,');
  assert.equal(r.summary.missingCells, 3); assert.equal(r.summary.affectedRecords, 1); assert.equal(r.summary.issues, 3);
});
test('Numeric syntax, integer age and range checks remain distinct', () => {
  const r = inspectCSV('name,age,score\nA,2.5,1e2\nB,-1,Infinity\nC,0x10,NaN\nD,121,-1\nE,+0,.5');
  assert.deepEqual(r.issues.map(i => i.code), ['integer','number','range','number','number','number','range','range']);
  assert.equal(r.summary.unflaggedRecords, 1);
});
test('Width mismatch reports absent required fields and preserves extra cells', () => {
  const r = inspectCSV('name,age,score\nA,2\nB,3,4,extra');
  assert.equal(r.summary.missingCells, 1); assert.equal(r.summary.issues, 3); assert.equal(r.records[1].values[3], 'extra');
});
test('Duplicates compare all exact parsed cells and count only later copies', () => {
  const r = inspectCSV('name,age,score,note\nA,2,3,a\nA,2,3,a\nA,2,3,b\nA,2,3,a\nA,2,3, a');
  assert.equal(r.summary.duplicateRows, 2); assert.equal(r.summary.nameGroups, 0);
  assert.deepEqual(r.issues.filter(i => i.code === 'duplicate').map(i => i.record), [2,4]);
});
test('Normalisation candidates require distinct original forms; never modify input', () => {
  const r = inspectCSV('name,age,score\nＡlice Smith,20,80\n alice   smith ,21,81\nBob,22,82\nBob,23,83');
  assert.equal(normalizeName(' Ａlice   SMITH '), 'alice smith');
  assert.equal(r.summary.nameGroups, 1); assert.deepEqual(r.issues.map(i => i.record), [1,2]);
  assert.equal(r.records[0].values[0], 'Ａlice Smith'); assert.equal(r.records[1].values[0], ' alice   smith ');
});
test('Physical line references survive quoted line breaks', () => {
  const r = inspectCSV('name,age,score,note\nA,1,2,"two\nlines"\nB,,3,');
  assert.equal(r.issues[0].record, 2); assert.equal(r.issues[0].line, 4);
});
test('Safety limits reject excessive characters, records and columns', () => {
  assert.ok(inspectCSV('x'.repeat(LIMITS.characters + 1)).errors.length);
  assert.ok(inspectCSV('name,age,score\n' + 'A,1,2\n'.repeat(501)).errors.length);
  assert.ok(inspectCSV(Array.from({length:21}, (_,i) => 'col' + i).join(',')).errors.length);
  assert.equal(inspectCSV('name,age,score\n' + 'A,1,2\n'.repeat(500)).summary.records, 500);
});
test('Source contains no network/storage calls; arbitrary content remains text', () => {
  const r = inspectCSV('name,age,score\n<script>alert(1)</script>,20,80');
  assert.equal(r.records[0].values[0], '<script>alert(1)</script>');
  const fs = require('node:fs'); const source = fs.readFileSync(require.resolve('./project-data.js'),'utf8');
  assert.ok(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|innerHTML)\b/.test(source));
});
console.log(`${count} meaningful data-quality tests passed.`);
