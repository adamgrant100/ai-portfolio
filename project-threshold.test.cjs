const assert = require('node:assert/strict');
const { makeData, evaluate, alwaysNegative, toCSV } = require('./project-threshold.js');
const rows = [
  { id:'a', score:0, label:0 },
  { id:'b', score:0.5, label:1 },
  { id:'c', score:0.5, label:0 },
  { id:'d', score:1, label:1 }
];
const mid = evaluate(rows, 0.5, 2, 7);
assert.deepEqual([mid.tp, mid.fp, mid.tn, mid.fn], [2,1,1,0]);
assert.equal(mid.precision, 2/3); assert.equal(mid.recall, 1);
assert.equal(mid.accuracy, 3/4); assert.equal(mid.specificity, 1/2);
assert.equal(mid.f1, 4/5); assert.equal(mid.cost, 2);
const low = evaluate(rows, 0, 2, 7);
assert.deepEqual([low.tp, low.fp, low.tn, low.fn], [2,2,0,0]);
const high = evaluate(rows, 1, 2, 7);
assert.deepEqual([high.tp, high.fp, high.tn, high.fn], [1,0,2,1]);
assert.equal(high.cost, 7);
const none = alwaysNegative(rows, 2, 7);
assert.deepEqual([none.tp, none.fp, none.tn, none.fn], [0,0,2,2]);
assert.equal(none.precision, null); assert.equal(none.cost, 14);
assert.equal(evaluate([{score:0.8,label:0}], 0.5).recall, null);
assert.equal(evaluate([{score:0.8,label:1}], 0.5).specificity, null);
const empty = evaluate([], 0.5);
['accuracy','precision','recall','specificity','f1'].forEach(key => assert.equal(empty[key],null));
assert.equal(evaluate([{score:0,label:0}],1).f1,null);
assert.equal(evaluate([{score:0,label:1}],1).f1,0);
assert.equal(evaluate(rows,0.75,0,0).cost,0);
assert.equal(evaluate(rows,0.5,0.25,0.75).cost,0.25);
for (const value of [-0.1, 1.1, NaN, Infinity]) assert.throws(() => evaluate(rows,value),RangeError);
assert.throws(() => evaluate(rows,0.5,-1),RangeError);
assert.throws(() => evaluate([{score:0.1,label:2}],0.5),RangeError);
assert.deepEqual(makeData(),makeData()); assert.equal(makeData().length,80);
assert.equal(toCSV(makeData()).trim().split('\n').length,81);
for (let t=0;t<=100;t++) {
 const m=evaluate(makeData(),t/100);
 assert.equal(m.tp+m.fp+m.tn+m.fn,80);
}
console.log('Threshold tests passed: boundary equality, extremes, baseline, metric formulas, undefined values, cost arithmetic, validation, deterministic data, 101-threshold count invariants, CSV.');
console.log('Default metrics:',evaluate(makeData(),0.5));
