const v8 = require('v8');

const leads = Array.from({ length: 1000000 }, (_, i) => ({
  status: i % 2 === 0 ? 'Completed' : 'New',
  lastInteraction: i % 3 === 0 ? new Date() : null,
}));

function gc() {
  if (global.gc) {
    global.gc();
  }
}

const ITERATIONS = 100;

console.log("Benchmarking filter.length vs reduce...");

// filter.length
gc();
const startMemFilter = process.memoryUsage().heapUsed;
console.time("filter.length");
for (let i = 0; i < ITERATIONS; i++) {
  const count = leads.filter(l => l.lastInteraction).length;
}
console.timeEnd("filter.length");
const endMemFilter = process.memoryUsage().heapUsed;
console.log(`Memory Used (filter): ${Math.round((endMemFilter - startMemFilter) / 1024 / 1024)} MB`);

// reduce
gc();
const startMemReduce = process.memoryUsage().heapUsed;
console.time("reduce");
for (let i = 0; i < ITERATIONS; i++) {
  const count = leads.reduce((acc, l) => acc + (l.lastInteraction ? 1 : 0), 0);
}
console.timeEnd("reduce");
const endMemReduce = process.memoryUsage().heapUsed;
console.log(`Memory Used (reduce): ${Math.round((endMemReduce - startMemReduce) / 1024 / 1024)} MB`);

// for loop
gc();
const startMemFor = process.memoryUsage().heapUsed;
console.time("for loop");
for (let i = 0; i < ITERATIONS; i++) {
  let count = 0;
  for (let j = 0; j < leads.length; j++) {
    if (leads[j].lastInteraction) count++;
  }
}
console.timeEnd("for loop");
const endMemFor = process.memoryUsage().heapUsed;
console.log(`Memory Used (for): ${Math.round((endMemFor - startMemFor) / 1024 / 1024)} MB`);
