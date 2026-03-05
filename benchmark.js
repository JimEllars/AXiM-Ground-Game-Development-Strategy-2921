const leads = Array.from({ length: 100000 }, (_, i) => ({
  status: i % 2 === 0 ? 'Completed' : 'New',
  lastInteraction: i % 3 === 0 ? new Date() : null,
}));

console.log("Benchmarking filter.length vs reduce...");

const ITERATIONS = 1000;

console.time("filter.length");
for (let i = 0; i < ITERATIONS; i++) {
  const count = leads.filter(l => l.lastInteraction).length;
}
console.timeEnd("filter.length");

console.time("reduce");
for (let i = 0; i < ITERATIONS; i++) {
  const count = leads.reduce((acc, l) => acc + (l.lastInteraction ? 1 : 0), 0);
}
console.timeEnd("reduce");

console.time("for loop");
for (let i = 0; i < ITERATIONS; i++) {
  let count = 0;
  for (let j = 0; j < leads.length; j++) {
    if (leads[j].lastInteraction) count++;
  }
}
console.timeEnd("for loop");
