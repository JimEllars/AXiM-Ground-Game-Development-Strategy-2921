const leads = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  lastInteraction: i % 2 === 0 ? new Date() : null,
}));

console.log("Benchmarking length: ", leads.length);

const startFilter1 = performance.now();
for (let i = 0; i < 100; i++) {
  const count1 = leads.filter(l => l.lastInteraction).length;
  const count2 = leads.filter(l => l.lastInteraction).length;
}
const endFilter1 = performance.now();
console.log("Original `filter().length` * 2 time:", endFilter1 - startFilter1, "ms");


const startReduce1 = performance.now();
for (let i = 0; i < 100; i++) {
  const count = leads.reduce((c, l) => c + (l.lastInteraction ? 1 : 0), 0);
  const count1 = count;
  const count2 = count;
}
const endReduce1 = performance.now();
console.log("Optimized `reduce` once time:", endReduce1 - startReduce1, "ms");

const startLoop1 = performance.now();
for (let i = 0; i < 100; i++) {
  let count = 0;
  for (let j = 0; j < leads.length; j++) {
    if (leads[j].lastInteraction) {
      count++;
    }
  }
  const count1 = count;
  const count2 = count;
}
const endLoop1 = performance.now();
console.log("Optimized `for loop` once time:", endLoop1 - startLoop1, "ms");
