sed -i "s/hasRole('SUPER_ADMIN')/isSuperAdmin()/g" firestore.rules
sed -i "s/hasRole('COMPANY_ADMIN')/isCompanyAdmin(companyId)/g" firestore.rules
sed -i "s/hasRole('SYSTEM')/false/g" firestore.rules
sed -i "s/hasRole('HR_ADMIN')/hasCompanyRole(companyId, ['HR_ADMIN', 'hr_admin'])/g" firestore.rules
sed -i "s/isCompanyMember()/sameCompany(companyId)/g" firestore.rules
sed -i "s/hasRole(companyId, 'A3_SUPERVISOR_MANAGER')/hasCompanyRole(companyId, ['SUPERVISOR', 'MANAGER'])/g" firestore.rules
sed -i "s/hasRole(companyId, 'HR')/hasCompanyRole(companyId, ['HR', 'HR_ADMIN'])/g" firestore.rules
sed -i "s/hasRole(companyId, 'ADMIN')/hasCompanyRole(companyId, ['ADMIN', 'COMPANY_ADMIN'])/g" firestore.rules
sed -i "s/hasRole(companyId, 'MANAGER')/hasCompanyRole(companyId, ['MANAGER', 'OPS_MANAGER'])/g" firestore.rules
