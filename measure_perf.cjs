const fs = require('fs');

// Create mock leads
const leads = [];
for (let i = 0; i < 100000; i++) {
  leads.push({
    id: `lead_${i}`,
    status: i % 2 === 0 ? 'active' : 'inactive',
    location: i % 10 === 0 ? null : {
      type: 'Point',
      coordinates: [Math.random() * 360 - 180, Math.random() * 180 - 90]
    }
  });
}

function originalApproach() {
  const start = performance.now();
  const features = leads.map(lead => {
    // Ensure lead.location is valid and has coordinates
    if (!lead.location || !lead.location.coordinates) {
        return null;
    }
    return {
      type: 'Feature',
      geometry: lead.location,
      properties: {
          id: lead.id,
          status: lead.status,
      }
    };
  }).filter(feature => feature !== null);
  const end = performance.now();
  return { time: end - start, count: features.length };
}

function reduceApproach() {
  const start = performance.now();
  const features = leads.reduce((acc, lead) => {
    if (lead.location && lead.location.coordinates) {
      acc.push({
        type: 'Feature',
        geometry: lead.location,
        properties: {
          id: lead.id,
          status: lead.status,
        }
      });
    }
    return acc;
  }, []);
  const end = performance.now();
  return { time: end - start, count: features.length };
}

// Warm up
for (let i = 0; i < 5; i++) {
    originalApproach();
    reduceApproach();
}

let origTotal = 0;
let reduceTotal = 0;
const iterations = 50;

for (let i = 0; i < iterations; i++) {
    origTotal += originalApproach().time;
    reduceTotal += reduceApproach().time;
}

console.log(`Original approach avg: ${origTotal / iterations} ms`);
console.log(`Reduce approach avg: ${reduceTotal / iterations} ms`);
console.log(`Reduce Improvement: ${((origTotal - reduceTotal) / origTotal * 100).toFixed(2)}%`);
