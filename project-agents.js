/* Agent navigation lab. No dependencies; the pure model also runs under Node. */
(function (root) {
  'use strict';
  const SIZE = 10;
  const START = 41;
  const GOAL = 48;
  const DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // east, south, west, north
  const distance = (a, b, size = SIZE) => Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size);
  function neighbours(cell, size = SIZE) {
    const row = Math.floor(cell / size), col = cell % size;
    return DIRECTIONS.map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size).map(([r, c]) => r * size + c);
  }
  function validate(world) {
    const { size, start, goal, walls } = world;
    if (!Number.isInteger(size) || size < 1 || !Number.isInteger(start) || !Number.isInteger(goal) || start < 0 || goal < 0 || start >= size * size || goal >= size * size || !(walls instanceof Set) || walls.has(start) || walls.has(goal) || [...walls].some(c => !Number.isInteger(c) || c < 0 || c >= size * size)) throw new Error('Invalid grid world');
  }
  function greedy(world) {
    validate(world);
    const { size, start, goal, walls } = world;
    const path = [start], expanded = [];
    let current = start;
    while (true) {
      expanded.push(current);
      if (current === goal) return { success: true, path, expanded, reason: 'Goal reached' };
      const next = neighbours(current, size).filter(c => !walls.has(c) && distance(c, goal, size) < distance(current, goal, size));
      if (!next.length) return { success: false, path, expanded, reason: 'No move reduces distance to the goal' };
      // All permitted moves reduce Manhattan distance by one; direction order breaks ties.
      current = next[0];
      path.push(current);
    }
  }
  function astar(world) {
    validate(world);
    const { size, start, goal, walls } = world;
    const open = new Set([start]), closed = new Set(), parents = new Map(), costs = new Map([[start, 0]]), expanded = [];
    const compare = (a, b) => (costs.get(a) + distance(a, goal, size)) - (costs.get(b) + distance(b, goal, size)) || distance(a, goal, size) - distance(b, goal, size) || a - b;
    while (open.size) {
      const current = [...open].sort(compare)[0];
      open.delete(current);
      expanded.push(current);
      if (current === goal) {
        const path = [current];
        while (parents.has(path[0])) path.unshift(parents.get(path[0]));
        return { success: true, path, expanded, reason: 'Shortest route found' };
      }
      closed.add(current);
      for (const next of neighbours(current, size)) {
        if (walls.has(next) || closed.has(next)) continue;
        const tentative = costs.get(current) + 1;
        if (tentative < (costs.get(next) ?? Infinity)) {
          parents.set(next, current);
          costs.set(next, tentative);
          open.add(next);
        }
      }
    }
    return { success: false, path: [], expanded, reason: 'No route exists' };
  }
  function scenario(name) {
    const walls = new Set();
    if (name === 'detour') for (let r = 1; r <= 8; r++) walls.add(r * SIZE + 5);
    else if (name === 'unreachable') for (let r = 0; r < SIZE; r++) walls.add(r * SIZE + 5);
    else if (name !== 'open') throw new Error('Unknown scenario');
    return { size: SIZE, start: START, goal: GOAL, walls };
  }
  const model = { SIZE, START, GOAL, distance, neighbours, greedy, astar, scenario };
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  root.AgentLab = model;
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const board = $('agent-grid');
    if (!board) return;
    let world = scenario('detour'), result = null, focusCell = START, modified = false;
    const names = { open: 'Open world', detour: 'Detour trap', unreachable: 'Unreachable goal' };
    const cells = [];
    function setStatus(text) { $('agent-status').textContent = text; }
    function render() {
      const greedyPath = new Set(result ? result.greedy.path : []), astarPath = new Set(result ? result.astar.path : []);
      cells.forEach((button, cell) => {
        const start = cell === world.start, goal = cell === world.goal, blocked = world.walls.has(cell), g = greedyPath.has(cell), a = astarPath.has(cell);
        button.className = 'lab-cell' + (blocked ? ' wall' : '') + (g ? ' greedy-route' : '') + (a ? ' astar-route' : '') + (start ? ' start' : '') + (goal ? ' goal' : '');
        button.textContent = start ? 'S' : goal ? 'G' : blocked ? '×' : g && a ? '●' : g ? 'g' : a ? 'a' : '';
        button.setAttribute('aria-label', `Row ${Math.floor(cell / SIZE) + 1}, column ${cell % SIZE + 1}: ${start ? 'start, fixed' : goal ? 'goal, fixed' : blocked ? 'obstacle, activate to remove' : 'open, activate to add obstacle'}${g ? ', greedy trace' : ''}${a ? ', A star route' : ''}`);
        button.setAttribute('aria-disabled', String(start || goal));
        button.tabIndex = cell === focusCell ? 0 : -1;
      });
      $('agent-world-name').textContent = modified ? 'Custom world' : names[$('agent-scenario').value];
      $('agent-download').disabled = !result;
    }
    function invalidate() {
      result = null;
      $('greedy-result').textContent = 'World changed. Run the comparison.';
      $('astar-result').textContent = 'World changed. Run the comparison.';
      $('agent-conclusion').textContent = 'Edit more cells or compare both agents on this world.';
      setStatus('World changed. Results cleared; run the comparison to update.');
      render();
    }
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.addEventListener('click', () => {
        focusCell = cell;
        if (cell === world.start || cell === world.goal) { render(); return; }
        if (world.walls.has(cell)) world.walls.delete(cell); else world.walls.add(cell);
        modified = true;
        invalidate();
      });
      button.addEventListener('keydown', event => {
        let next = cell;
        const row = Math.floor(cell / SIZE), col = cell % SIZE;
        if (event.key === 'ArrowRight' && col < SIZE - 1) next++;
        else if (event.key === 'ArrowLeft' && col > 0) next--;
        else if (event.key === 'ArrowDown' && row < SIZE - 1) next += SIZE;
        else if (event.key === 'ArrowUp' && row > 0) next -= SIZE;
        else if (event.key === 'Home') next = row * SIZE;
        else if (event.key === 'End') next = row * SIZE + SIZE - 1;
        else if (!event.key.startsWith('Arrow')) return;
        event.preventDefault();
        focusCell = next;
        render();
        cells[next].focus();
      });
      cells.push(button);
      board.appendChild(button);
    }
    function describe(output, planning) {
      return `${output.success ? 'Success' : 'Stopped'} · ${planning && !output.success ? 'No route' : `${output.path.length - 1} ${planning ? 'route steps' : 'moves taken'}`} · ${output.expanded.length} states ${planning ? 'expanded' : 'visited'}. ${output.reason}.`;
    }
    function run() {
      result = { greedy: greedy(world), astar: astar(world) };
      $('greedy-result').textContent = describe(result.greedy, false);
      $('astar-result').textContent = describe(result.astar, true);
      const { greedy: g, astar: a } = result;
      $('agent-conclusion').textContent = a.success && !g.success ? `The greedy agent stops after ${g.path.length - 1} moves. A* finds a ${a.path.length - 1}-step route by considering moves that initially lead away from the goal.` : a.success ? 'Both agents reach the goal. In this four-direction grid, every greedy move reduces distance by one, so its successful route is also shortest.' : 'The goal is unreachable. A* exhausts the reachable region; the local agent stops when it cannot get closer. Only the search establishes that no route exists.';
      setStatus('Comparison complete. ' + describe(g, false) + ' A star: ' + describe(a, true));
      render();
    }
    $('agent-run').addEventListener('click', run);
    function reset() { world = scenario($('agent-scenario').value); modified = false; run(); }
    $('agent-scenario').addEventListener('change', reset);
    $('agent-reset').addEventListener('click', reset);
    $('agent-clear').addEventListener('click', () => { world.walls.clear(); modified = true; invalidate(); });
    $('agent-download').addEventListener('click', () => {
      if (!result) return;
      const output = { schema: 'agent-lab-v1', world: { ...world, walls: [...world.walls].sort((a, b) => a - b) }, results: result, conventions: 'Zero-based row-major cell IDs; four-direction unit-cost movement. Expanded states include goal. Greedy path includes its failed partial walk; failed A* has no route. Synthetic environment.' };
      const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'agent-navigation-results.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    for (const key of ['open', 'detour', 'unreachable']) {
      const fixed = scenario(key), g = greedy(fixed), a = astar(fixed), tr = document.createElement('tr');
      [names[key], g.success ? 'Reached' : 'Stopped', String(g.path.length - 1), String(g.expanded.length), a.success ? 'Reached' : 'No route', a.success ? String(a.path.length - 1) : '—', String(a.expanded.length)].forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); });
      $('agent-benchmark').appendChild(tr);
    }
    run();
  });
})(typeof globalThis === 'undefined' ? this : globalThis);
