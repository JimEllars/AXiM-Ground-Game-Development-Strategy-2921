const fs = require('fs');
let geoPath = 'server/src/services/__tests__/geocoding.test.ts';
let geo = fs.readFileSync(geoPath, 'utf8');
geo = geo.replace(/const mockGet = jest\.fn\(\);/, 'const mockGet = jest.fn<any>();');
geo = geo.replace(/mockResolvedValueOnce\(\{/g, 'mockResolvedValueOnce({} as any); /*');
geo = geo.replace(/mockResolvedValue\(\{/g, 'mockResolvedValue({} as any); /*');
geo = geo.replace(/\}\);/g, '*/'); // Need a better approach
fs.writeFileSync(geoPath, geo);
