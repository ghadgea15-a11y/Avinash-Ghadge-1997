const fs = require('fs');
let code = fs.readFileSync('src/tests/master_data_hierarchy.test.ts', 'utf8');
code = code.replace(/\{ id: 'BR-TEST',/g, "{ companyId: 'COMP-A', id: 'BR-TEST',");
code = code.replace(/\{ id: 'DEP-TEST',/g, "{ companyId: 'COMP-A', id: 'DEP-TEST',");
code = code.replace(/\{ id: 'DSG-TEST',/g, "{ companyId: 'COMP-A', id: 'DSG-TEST',");
fs.writeFileSync('src/tests/master_data_hierarchy.test.ts', code);
