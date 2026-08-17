const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
code = code.replace(
  /static async saveDeployment\(companyId: string, deployment: DeploymentRecord, oldDeployment\?: DeploymentRecord\): Promise<boolean> \{/g,
  `static async saveDeployment(userSession: UserSession, companyId: string, deployment: DeploymentRecord, oldDeployment?: DeploymentRecord): Promise<boolean> {`
);

code = code.replace(
  /changedByUserId: 'SYSTEM', \/\/ Should ideally pass userSession.uid/g,
  `changedByUserId: userSession.userId,`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
