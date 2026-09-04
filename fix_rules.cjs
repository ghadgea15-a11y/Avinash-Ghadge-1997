const fs = require('fs');
let f = fs.readFileSync('firestore.rules', 'utf8');

if (!f.includes("match /leaveLedger/{itemId} {")) {
  f = f.replace(/match \/leaveBalances\/\{itemId\} \{/, 
`match /leaveLedger/{itemId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff());
      }
      match /leaveBalances/{itemId} {`);
  fs.writeFileSync('firestore.rules', f);
  console.log("Added leaveLedger to rules");
}
