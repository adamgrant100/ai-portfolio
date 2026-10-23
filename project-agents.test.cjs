const assert = require('node:assert/strict');
const lab = require('./project-agents.js');
function bfs(world) {
  const queue = [[world.start, 0]], seen = new Set([world.start]);
  for (let i = 0; i < queue.length; i++) {
    const [cell, cost] = queue[i];
    if (cell === world.goal) return cost;
    for (const next of lab.neighbours(cell, world.size)) if (!world.walls.has(next) && !seen.has(next)) { seen.add(next); queue.push([next, cost + 1]); }
  }
  return null;
}
function check(world) {
  const route = lab.astar(world), shortest = bfs(world), greedy = lab.greedy(world);
  assert.equal(route.success, shortest !== null);
  if (route.success) assert.equal(route.path.length - 1, shortest);
  else assert.deepEqual(route.path, []);
  for (const result of [route, greedy]) {
    assert.equal(new Set(result.expanded).size, result.expanded.length);
    if (result.path.length) assert.equal(result.path[0], world.start);
    if (result.success) assert.equal(result.path.at(-1), world.goal);
    result.path.forEach((cell, i) => { assert.ok(!world.walls.has(cell)); if (i) assert.equal(lab.distance(result.path[i - 1], cell, world.size), 1); });
  }
  greedy.path.slice(1).forEach((cell, i) => assert.equal(lab.distance(greedy.path[i], world.goal, world.size) - lab.distance(cell, world.goal, world.size), 1));
  assert.deepEqual(lab.astar(world), route, 'deterministic A*');
  assert.deepEqual(lab.greedy(world), greedy, 'deterministic greedy');
}
for (const name of ['open', 'detour', 'unreachable']) check(lab.scenario(name));
const detour = lab.scenario('detour');
assert.equal(lab.greedy(detour).success, false);
assert.equal(lab.astar(detour).path.length - 1, 15);
assert.equal(lab.astar(lab.scenario('unreachable')).expanded.length, 50);
assert.deepEqual(lab.greedy(lab.scenario('open')).path, [41,42,43,44,45,46,47,48]);
check({size: 1, start: 0, goal: 0, walls: new Set()});
assert.throws(() => lab.astar({size: 10, start: 0, goal: 99, walls: new Set([0])}), /Invalid/);
let seed = 98651;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
for (let trial = 0; trial < 250; trial++) {
  const world = {size: 10, start: Math.floor(random()*100), goal: Math.floor(random()*100), walls: new Set()};
  for (let i = 0; i < 100; i++) if (i !== world.start && i !== world.goal && random() < .33) world.walls.add(i);
  check(world);
}
console.log('PASS: fixed scenarios, invalid world, same start/goal, valid routes, monotone greedy movement, deterministic results, A* vs BFS on 250 seeded random worlds.');
