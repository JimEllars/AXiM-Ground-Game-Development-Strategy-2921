const fs = require('fs');

let repo = fs.readFileSync('server/src/repositories/InteractionRepository.ts', 'utf8');

// The typescript compiler threw errors:
// src/repositories/InteractionRepository.ts(39,5): error TS2304: Cannot find name 'clientMutationIdsArr'.
// src/repositories/InteractionRepository.ts(73,7): error TS2304: Cannot find name 'clientMutationIdsArr'.

repo = repo.replace(
  /const surveysArr: \(any \| null\)\[\] = new Array\(len\);/g,
  `const surveysArr: (any | null)[] = new Array(len);\n  const clientMutationIdsArr: (string | null)[] = new Array(len);`
);

fs.writeFileSync('server/src/repositories/InteractionRepository.ts', repo);
