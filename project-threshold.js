/* Educational synthetic threshold explorer. */
(function (root) {
  'use strict';
  function makeData() {
    let seed = 314159;
    const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    return Array.from({ length: 80 }, (_, i) => {
      const score = Math.floor(random() * 101) / 100;
      const label = score + (random() - 0.5) * 0.9 >= 0.53 ? 1 : 0;
      return { id: 'S' + String(i + 1).padStart(3, '0'), score, label };
    });
  }
  function evaluate(rows, threshold, fpCost = 1, fnCost = 4) {
    if (!Array.isArray(rows) || !Number.isFinite(threshold) || threshold < 0 || threshold > 1 ||
      !Number.isFinite(fpCost) || fpCost < 0 || !Number.isFinite(fnCost) || fnCost < 0) throw new RangeError('Invalid inputs');
    const m = { tp: 0, fp: 0, tn: 0, fn: 0, total: rows.length };
    rows.forEach(row => {
      if (!Number.isFinite(row.score) || row.score < 0 || row.score > 1 || ![0, 1].includes(row.label)) throw new RangeError('Invalid sample');
      const positive = row.score >= threshold;
      m[positive ? (row.label ? 'tp' : 'fp') : (row.label ? 'fn' : 'tn')]++;
    });
    const ratio = (n, d) => d === 0 ? null : n / d;
    m.accuracy = ratio(m.tp + m.tn, m.total);
    m.precision = ratio(m.tp, m.tp + m.fp);
    m.recall = ratio(m.tp, m.tp + m.fn);
    m.specificity = ratio(m.tn, m.tn + m.fp);
    m.f1 = ratio(2 * m.tp, 2 * m.tp + m.fp + m.fn);
    m.cost = m.fp * fpCost + m.fn * fnCost;
    return m;
  }
  function alwaysNegative(rows, fpCost = 1, fnCost = 4) {
    // A separate decision rule, including for samples with score exactly 1.
    return evaluate(rows.map(row => ({ ...row, score: 0 })), 1, fpCost, fnCost);
  }
  function toCSV(rows) {
    return 'id,synthetic_score,actual_label\n' + rows.map(r => [r.id, r.score.toFixed(2), r.label].join(',')).join('\n') + '\n';
  }
  const api = { makeData, evaluate, alwaysNegative, toCSV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ThresholdExplorer = api;
  if (typeof document === 'undefined') return;
  const data = makeData();
  const $ = id => document.getElementById(id);
  if (!$('threshold-range')) return;
  let threshold = 0.5, fpCost = 1, fnCost = 4;
  const percent = n => n === null ? 'N/A' : (100 * n).toFixed(1) + '%';
  const units = n => Number(n.toFixed(2)).toLocaleString('en-GB', { maximumFractionDigits: 2 });
  const svgNS = 'http://www.w3.org/2000/svg';
  function svgElement(type, attrs) {
    const node = document.createElementNS(svgNS, type);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }
  function draw() {
    const plot = $('score-plot'); plot.replaceChildren();
    const bins = Array.from({ length: 10 }, () => [0, 0]);
    data.forEach(r => bins[Math.min(9, Math.floor(r.score * 10))][r.label]++);
    const maximum = Math.max(...bins.map(b => b[0] + b[1]));
    const x0 = 40, width = 540, y0 = 205, height = 155;
    bins.forEach((bin, i) => {
      let top = y0;
      bin.forEach((count, label) => {
        const h = count / maximum * height;
        top -= h;
        plot.appendChild(svgElement('rect', { x: x0 + i * 54 + 3, y: top, width: 48, height: h, fill: label ? '#254b3c' : '#c8d0bd' }));
      });
      const text = svgElement('text', { x: x0 + i * 54 + 27, y: top - 8, 'text-anchor': 'middle', fill: '#263a31', 'font-size': 13 });
      text.textContent = bin[0] + bin[1]; plot.appendChild(text);
    });
    plot.appendChild(svgElement('line', { x1: x0, y1: y0, x2: x0 + width, y2: y0, stroke: '#657169' }));
    for (let i = 0; i <= 10; i++) {
      const text = svgElement('text', { x: x0 + i * 54, y: 227, 'text-anchor': 'middle', fill: '#526157', 'font-size': 12 });
      text.textContent = (i / 10).toFixed(1); plot.appendChild(text);
    }
    const x = x0 + width * threshold;
    plot.appendChild(svgElement('line', { x1: x, y1: 30, x2: x, y2: y0, stroke: '#a74b29', 'stroke-width': 3, 'stroke-dasharray': '5 4' }));
    const marker = svgElement('text', { x: Math.max(83, Math.min(537, x)), y: 20, 'text-anchor': 'middle', fill: '#8a3c20', 'font-size': 13 });
    marker.textContent = 'Threshold ' + threshold.toFixed(2); plot.appendChild(marker);
    $('distribution-rows').replaceChildren();
    bins.forEach((bin, i) => {
      const tr = document.createElement('tr');
      [(i / 10).toFixed(1) + '–' + ((i + 1) / 10).toFixed(1) + (i === 9 ? ' inclusive' : ' (upper excluded)'), bin[0], bin[1]].forEach(value => {
        const td = document.createElement('td'); td.textContent = value; tr.appendChild(td);
      });
      $('distribution-rows').appendChild(tr);
    });
  }
  function render() {
    const m = evaluate(data, threshold, fpCost, fnCost), baseline = alwaysNegative(data, fpCost, fnCost);
    ['tp', 'fp', 'tn', 'fn'].forEach(key => $(key).textContent = m[key]);
    ['accuracy', 'precision', 'recall', 'specificity', 'f1'].forEach(key => $(key).textContent = percent(m[key]));
    $('total-cost').textContent = units(m.cost);
    $('baseline-accuracy').textContent = percent(baseline.accuracy);
    $('baseline-cost').textContent = units(baseline.cost);
    $('baseline-detail').textContent = baseline.tn + ' true negatives, ' + baseline.fn + ' false negatives, no predicted positives. Precision is undefined; recall is ' + percent(baseline.recall) + '.';
    $('decision-summary').textContent = 'At ' + threshold.toFixed(2) + ', ' + (m.tp + m.fp) + ' of 80 samples are predicted positive. ' + m.fp + ' false positives and ' + m.fn + ' false negatives; total illustrative cost ' + units(m.cost) + ' units.';
    $('cost-formula').textContent = m.fp + ' × ' + units(fpCost) + ' + ' + m.fn + ' × ' + units(fnCost) + ' = ' + units(m.cost) + ' units';
    $('threshold-value').textContent = threshold.toFixed(2);
    draw();
  }
  function validate(input, min, max, whole, cents = false) {
    const value = input.value.trim() === '' ? NaN : Number(input.value);
    const valid = Number.isFinite(value) && value >= min && value <= max && (!whole || Number.isInteger(value)) && (!cents || Math.abs(value * 100 - Math.round(value * 100)) < 1e-8);
    input.setAttribute('aria-invalid', String(!valid));
    input.setCustomValidity(valid ? '' : 'Enter ' + (whole ? 'a whole number' : cents ? 'a number with at most 2 decimal places' : 'a number') + ' between ' + min + ' and ' + max + '.');
    return valid ? value : null;
  }
  function errorMessage() {
    const invalid = ['threshold-number', 'fp-cost', 'fn-cost'].map($).filter(input => input.getAttribute('aria-invalid') === 'true');
    $('input-error').textContent = invalid.length ? 'Check the highlighted fields. Results retain the last valid value for each field.' : '';
  }
  $('threshold-range').addEventListener('input', event => {
    threshold = Number(event.target.value) / 100;
    $('threshold-number').value = event.target.value;
    validate($('threshold-number'), 0, 100, true); errorMessage(); render();
  });
  $('threshold-number').addEventListener('input', event => {
    const value = validate(event.target, 0, 100, true); errorMessage();
    if (value === null) return;
    threshold = value / 100; $('threshold-range').value = value; render();
  });
  ['fp-cost', 'fn-cost'].forEach(id => $(id).addEventListener('input', event => {
    const value = validate(event.target, 0, 1000, false, true); errorMessage();
    if (value === null) return;
    if (id === 'fp-cost') fpCost = value; else fnCost = value;
    render();
  }));
  $('reset-explorer').addEventListener('click', () => {
    threshold = 0.5; fpCost = 1; fnCost = 4;
    $('threshold-range').value = $('threshold-number').value = 50;
    $('fp-cost').value = 1; $('fn-cost').value = 4;
    ['threshold-number', 'fp-cost', 'fn-cost'].forEach(id => { $(id).setAttribute('aria-invalid', 'false'); $(id).setCustomValidity(''); });
    errorMessage(); render();
  });
  $('download-samples').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'threshold-synthetic-samples.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
})(typeof globalThis !== 'undefined' ? globalThis : this);
