/* Data-quality detective. Browser-only, dependency-free independent prototype.
 * No data is transmitted. See the page for scope.
 */
(function () {
  'use strict';
  const SAMPLE = 'name,age,score,notes\nAlice Morgan,29,84,Complete record\n" alice   morgan ",29,84,Spacing and case variation\nBen Patel,,72,Missing age\nCara Jones,151,91,Age outside example range\nDan Green,34,eighty,Score is not numeric\nEva Reed,42,105,Score outside example range\nFaye Hall,31,88,"Quoted comma, supported"\nFaye Hall,31,88,"Quoted comma, supported"\n,27,66,Missing name\nGus Chen,38,79,"Two-line note:\n""quoted text"" is supported"';
  const LIMITS = { characters: 100000, records: 500, columns: 20 };
  const REQUIRED = ['name', 'age', 'score'];

  /** Strict comma-separated CSV. Records retain physical start lines.
   * Accepts CRLF/LF/CR, escaped quotes, quoted newlines and an initial BOM.
   * Rejects unescaped or unclosed quotes instead of guessing a repair.
   * Blank lines become empty records, except a single final line terminator.
   */
  function parseCSV(input) {
    if (typeof input !== 'string') throw new TypeError('CSV input must be a string.');
    if (input.length > LIMITS.characters) return { rows: [], lines: [], errors: [{ line: 1, message: 'Input exceeds 100,000 characters. Use a smaller sample.' }] };
    const source = input.replace(/^\uFEFF/, '');
    const rows = [], lines = [], errors = [];
    if (source === '') return { rows, lines, errors };
    let record = [], value = '', state = 'start', line = 1, startLine = 1;
    function fail(message) { errors.push({ line, message }); }
    function endField() { record.push(value); value = ''; state = 'start'; }
    function endRecord() {
      endField();
      if (record.length > LIMITS.columns) fail('A record exceeds the limit of 20 columns.');
      rows.push(record); lines.push(startLine); record = [];
      if (rows.length > LIMITS.records + 1) fail('Input exceeds 500 data records. Use a smaller sample.');
    }
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      const newline = c === '\n' || c === '\r';
      if (state === 'quoted') {
        if (c === '"') {
          if (source[i + 1] === '"') { value += '"'; i++; }
          else state = 'closed';
        } else if (newline) {
          value += '\n';
          if (c === '\r' && source[i + 1] === '\n') i++;
          line++;
        } else value += c;
      } else if (c === ',') {
        endField();
      } else if (newline) {
        endRecord();
        if (errors.length) break;
        if (c === '\r' && source[i + 1] === '\n') i++;
        line++; startLine = line;
      } else if (state === 'closed') {
        fail('Unexpected character after a closing quote. A comma or line break is required.'); break;
      } else if (c === '"') {
        if (state !== 'start') { fail('Quote inside an unquoted field. Quote the entire field and double any internal quotes.'); break; }
        state = 'quoted';
      } else { value += c; state = 'plain'; }
    }
    if (!errors.length) {
      if (state === 'quoted') fail('Unclosed quoted field. Add the closing quote.');
      else if (record.length || value !== '' || state !== 'start') endRecord();
    }
    return { rows, lines, errors };
  }

  function normalizeName(value) {
    return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
  }

  function inspectCSV(input) {
    const parsed = parseCSV(input);
    const result = { schema: { required: REQUIRED, age: 'Integer, 0–120 inclusive', score: 'Decimal, 0–100 inclusive', additionalColumns: 'Preserved; only checked for record width and exact duplicates' }, limits: LIMITS, errors: parsed.errors, headers: [], records: [], issues: [], summary: null };
    if (result.errors.length) return result;
    if (!parsed.rows.length) { result.errors.push({ line: 1, message: 'Paste a CSV header and at least one data record.' }); return result; }
    result.headers = parsed.rows[0];
    const headers = result.headers.map(s => s.trim().toLowerCase());
    if (headers.some(s => !s)) result.errors.push({ line: 1, message: 'Every column needs a non-empty header.' });
    if (new Set(headers).size !== headers.length) result.errors.push({ line: 1, message: 'Column headers must be unique after trimming and lowercasing.' });
    const missing = REQUIRED.filter(h => !headers.includes(h));
    if (missing.length) result.errors.push({ line: 1, message: 'Required headers missing: ' + missing.join(', ') + '. Use name, age, score (any order).' });
    if (parsed.rows.length < 2) result.errors.push({ line: 1, message: 'Add at least one data record below the header.' });
    if (result.errors.length) return result;
    result.records = parsed.rows.slice(1).map((values, index) => ({ record: index + 1, line: parsed.lines[index + 1], values }));
    const indices = Object.fromEntries(REQUIRED.map(h => [h, headers.indexOf(h)]));
    const duplicates = new Map(), names = new Map();
    let missingCells = 0, duplicateRows = 0, nameGroups = 0;
    function issue(row, code, field, value, message, action, level = 'Check') {
      result.issues.push({ record: row.record, line: row.line, code, level, field, value, message, action });
    }
    for (const row of result.records) {
      if (row.values.length !== headers.length) issue(row, 'width', 'record', String(row.values.length), 'Expected ' + headers.length + ' fields; found ' + row.values.length + '.', 'Check missing delimiters or quote values containing commas.');
      for (const field of REQUIRED) {
        const raw = row.values[indices[field]] ?? '';
        const clean = raw.trim();
        if (!clean) {
          missingCells++;
          issue(row, 'missing', field, raw, 'Required value is empty or whitespace only.', 'Check the source; do not substitute a guessed value.');
          continue;
        }
        if (field === 'name') {
          const normalized = normalizeName(raw);
          if (!names.has(normalized)) names.set(normalized, []);
          names.get(normalized).push({ row, raw });
        } else {
          if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean) || !Number.isFinite(Number(clean))) {
            issue(row, 'number', field, raw, 'Expected a finite decimal number.', 'Use digits and an optional decimal point; no percentages, exponent notation or thousands separators.');
            continue;
          }
          const number = Number(clean), max = field === 'age' ? 120 : 100;
          if (field === 'age' && !Number.isInteger(number)) issue(row, 'integer', field, raw, 'Age must be a whole number for this example schema.', 'Check the age unit and source value.');
          if (number < 0 || number > max) issue(row, 'range', field, raw, field + ' is outside 0–' + max + ' inclusive.', 'Verify the value and whether this example range suits your data.');
        }
      }
      const key = JSON.stringify(row.values);
      if (duplicates.has(key)) {
        duplicateRows++;
        issue(row, 'duplicate', 'record', '', 'Exact repeat of data record ' + duplicates.get(key) + '.', 'Review whether the repeated record is intentional before removing it.', 'Review');
      } else duplicates.set(key, row.record);
    }
    for (const [normalized, entries] of names) {
      if (entries.length < 2 || new Set(entries.map(e => e.raw)).size < 2) continue;
      nameGroups++;
      const members = entries.map(e => e.row.record).join(', ');
      for (const entry of entries) issue(entry.row, 'name_candidate', 'name', entry.raw, 'Normalises to “' + normalized + '”; candidate group: records ' + members + '.', 'Compare against a reliable identifier. Matching names do not establish identity; no merge is performed.', 'Review');
    }
    result.issues.sort((a, b) => a.record - b.record);
    const affected = new Set(result.issues.map(i => i.record)).size;
    result.summary = { records: result.records.length, affectedRecords: affected, unflaggedRecords: result.records.length - affected, issues: result.issues.length, missingCells, duplicateRows, nameGroups };
    return result;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { SAMPLE, LIMITS, parseCSV, normalizeName, inspectCSV };
  if (typeof document === 'undefined') return;

  const input = document.getElementById('csv-input');
  if (!input) return;
  const status = document.getElementById('data-status');
  const results = document.getElementById('data-results');
  const download = document.getElementById('download-report');
  let currentReport = null;
  function cell(row, text, tag = 'td') {
    const element = document.createElement(tag);
    element.textContent = text;
    row.appendChild(element);
    return element;
  }
  function render() {
    currentReport = inspectCSV(input.value);
    download.disabled = true;
    results.hidden = true;
    const errorList = document.getElementById('data-errors');
    errorList.replaceChildren();
    input.removeAttribute('aria-invalid');
    if (currentReport.errors.length) {
      for (const error of currentReport.errors) {
        const li = document.createElement('li'); li.textContent = 'Line ' + error.line + ': ' + error.message; errorList.appendChild(li);
      }
      input.setAttribute('aria-invalid', 'true');
      status.textContent = 'Check the CSV format before analysing. No partial results are shown.';
      return;
    }
    const s = currentReport.summary;
    document.getElementById('metric-records').textContent = s.records;
    document.getElementById('metric-affected').textContent = s.affectedRecords;
    document.getElementById('metric-missing').textContent = s.missingCells;
    document.getElementById('metric-duplicates').textContent = s.duplicateRows;
    document.getElementById('metric-names').textContent = s.nameGroups;
    document.getElementById('report-summary').textContent = s.issues + ' flags across ' + s.affectedRecords + ' of ' + s.records + ' records. ' + s.unflaggedRecords + ' records have no flags under these checks.';
    const body = document.getElementById('issue-body'); body.replaceChildren();
    for (const issue of currentReport.issues) {
      const tr = document.createElement('tr');
      cell(tr, issue.record + ' / line ' + issue.line);
      cell(tr, issue.level + ' · ' + issue.field);
      cell(tr, issue.value === '' ? '(empty / record)' : issue.value).classList.add('raw-value');
      cell(tr, issue.message);
      cell(tr, issue.action);
      body.appendChild(tr);
    }
    document.getElementById('issue-table').hidden = s.issues === 0;
    document.getElementById('no-issues').hidden = s.issues !== 0;
    const head = document.getElementById('preview-head'); head.replaceChildren();
    const headerRow = document.createElement('tr');
    cell(headerRow, 'Record', 'th').scope = 'col';
    for (const header of currentReport.headers) cell(headerRow, header, 'th').scope = 'col';
    // Extra cells remain visible in a dedicated column when record widths differ.
    const hasExtra = currentReport.records.some(r => r.values.length > currentReport.headers.length);
    if (hasExtra) cell(headerRow, 'Extra fields', 'th').scope = 'col';
    head.appendChild(headerRow);
    const preview = document.getElementById('preview-body'); preview.replaceChildren();
    for (const row of currentReport.records.slice(0, 20)) {
      const tr = document.createElement('tr'); cell(tr, row.record);
      for (let j = 0; j < currentReport.headers.length; j++) cell(tr, row.values[j] === undefined ? '(absent)' : row.values[j]).classList.add('raw-value');
      if (hasExtra) cell(tr, JSON.stringify(row.values.slice(currentReport.headers.length)));
      preview.appendChild(tr);
    }
    document.getElementById('preview-caption').textContent = 'Parsed data: first ' + Math.min(20, s.records) + ' of ' + s.records + ' records. Input values are preserved; missing cells are not filled.';
    results.hidden = false;
    download.disabled = false;
    status.textContent = 'Analysed ' + s.records + ' records: ' + s.issues + ' flags across ' + s.affectedRecords + ' affected records. Your data remains in this browser tab.';
  }
  document.getElementById('analyse-data').addEventListener('click', render);
  document.getElementById('sample-data').addEventListener('click', () => { input.value = SAMPLE; render(); });
  input.addEventListener('input', () => {
    currentReport = null; download.disabled = true; results.hidden = true;
    input.removeAttribute('aria-invalid'); document.getElementById('data-errors').replaceChildren();
    status.textContent = 'Input changed. Select “Check data” to refresh the report.';
  });
  download.addEventListener('click', () => {
    if (!currentReport || currentReport.errors.length) return;
    const report = { project: 'Data-quality detective', generatedAt: new Date().toISOString(), note: 'Rule-based checks for the stated example schema. Review flags are not proof of errors or identity. Contains supplied data; review before sharing.', ...currentReport };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'data-quality-report.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  input.value = SAMPLE;
  render();
})();
