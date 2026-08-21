import * as fs from 'fs';
const file = 'src/components/screens/CertificationTrackingScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "documentUrl = await StorageService.uploadFile, `companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}/${selectedFile.name}`);",
  "documentUrl = await StorageService.uploadFile(`companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}/${selectedFile.name}`, selectedFile, userSession);"
);

content = content.replace(
  "documentUrl = await StorageService.uploadFile, `companies/${activeCompany.companyId}/certifications/${selectedCert.employeeId}/${selectedFile.name}`);",
  "documentUrl = await StorageService.uploadFile(`companies/${activeCompany.companyId}/certifications/${selectedCert.employeeId}/${selectedFile.name}`, selectedFile, userSession);"
);

fs.writeFileSync(file, content);
