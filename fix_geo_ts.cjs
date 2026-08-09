const fs = require('fs');
let geoPath = 'server/src/services/__tests__/geocoding.test.ts';
let geo = fs.readFileSync(geoPath, 'utf8');
geo = geo.replace(/mockGet\.mockResolvedValueOnce\(\{/g, 'mockGet.mockResolvedValueOnce({} as any); /*');
geo = geo.replace(/mockGet\.mockResolvedValue\(\{/g, 'mockGet.mockResolvedValue({} as any); /*');
geo = geo.replace(/\}\);/g, '*/'); // Need a better approach
fs.writeFileSync(geoPath, geo);
