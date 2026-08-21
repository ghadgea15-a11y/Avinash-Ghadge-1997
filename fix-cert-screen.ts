import * as fs from 'fs';
const file = 'src/components/screens/CertificationTrackingScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { uploadFile } from '../../services/storageService';",
  "import { StorageService } from '../../services/storageService';"
);
content = content.replace(
  "import { v4 as uuidv4 } from 'uuid';",
  "function uuidv4() { return crypto.randomUUID(); }"
);

content = content.replace(/activeCompany\.id/g, "activeCompany.companyId");

content = content.replace("uploadFile(selectedFile", "StorageService.uploadFile");
content = content.replace("`certifications/${activeCompany.companyId}/${selectedEmployeeId}`", "`companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}/${selectedFile.name}`");
content = content.replace("`companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}`", "`companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}/${selectedFile.name}`");
content = content.replace("`certifications/${activeCompany.companyId}/${selectedCert.employeeId}`", "`companies/${activeCompany.companyId}/certifications/${selectedCert.employeeId}/${selectedFile.name}`");

content = content.replace("siteId: emp.siteId,", "siteId: emp.assignedSiteId,");
content = content.replace("department: emp.department,", "department: emp.departmentId,");
content = content.replace("designation: emp.designation,", ""); // Designation is not in EmployeeRecord directly or we don't need it if it's missing

content = content.replace(
  "totalPages={Math.ceil(filteredCerts.length / itemsPerPage)}",
  "totalItems={filteredCerts.length}\n            itemsPerPage={itemsPerPage}"
);

fs.writeFileSync(file, content);
