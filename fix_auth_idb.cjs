const fs = require('fs');

let db = fs.readFileSync('src/db.ts', 'utf8');

if (!db.includes("export interface OfflineAuth")) {
  db = db.replace(
    /export interface OfflineSetting \{/g,
    `export interface OfflineAuth {\n  id: string;\n  user: any;\n}\n\nexport interface OfflineSetting {`
  );

  db = db.replace(
    /settings\!: Table<OfflineSetting, string>;/g,
    `settings!: Table<OfflineSetting, string>;\n  auth!: Table<OfflineAuth, string>;`
  );

  db = db.replace(
    /settings: 'id',/g,
    `settings: 'id',\n      auth: 'id',`
  );

  fs.writeFileSync('src/db.ts', db);
}

let auth = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

auth = auth.replace(
  /localStorage\.setItem\('groundgame_offline_auth', JSON\.stringify\(response\.data\)\);/g,
  `db.auth.put({ id: 'current', user: response.data });`
);

auth = auth.replace(
  /const cached = localStorage\.getItem\('groundgame_offline_auth'\);\n              if \(cached\) \{\n                setUser\(JSON\.parse\(cached\)\);\n              \} else \{/g,
  `const cached = await db.auth.get('current');
              if (cached) {
                setUser(cached.user);
              } else {`
);

auth = auth.replace(
  /const cached = localStorage\.getItem\('groundgame_offline_auth'\);\n            if \(cached\) \{\n              setUser\(JSON\.parse\(cached\)\);\n              setError\(null\);\n            \}/g,
  `const cached = await db.auth.get('current');
            if (cached) {
              setUser(cached.user);
              setError(null);
            }`
);

auth = auth.replace(
  /localStorage\.setItem\('groundgame_offline_auth', JSON\.stringify\(user\)\);/g,
  `db.auth.put({ id: 'current', user });`
);

auth = auth.replace(
  /localStorage\.removeItem\('groundgame_offline_auth'\);/g,
  `db.auth.delete('current');`
);

if (!auth.includes("import { db } from '@/db';")) {
  auth = auth.replace(
    /import \{ authAPI \} from '@\/services\/api';/,
    `import { authAPI } from '@/services/api';\nimport { db } from '@/db';`
  );
}

fs.writeFileSync('src/contexts/AuthContext.tsx', auth);
