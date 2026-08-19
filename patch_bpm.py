import re

with open('src/services/bpmDelegationService.ts', 'r') as f:
    content = f.read()

if "SecurityAuditService" not in content:
    content = content.replace("import { BpmApprovalInstance, ProxyDelegation, ProxyAuthCheckResult, BpmDelegationLog, UserSession } from '../types';", "import { BpmApprovalInstance, ProxyDelegation, ProxyAuthCheckResult, BpmDelegationLog, UserSession } from '../types';\nimport { SecurityAuditService } from './securityAuditService';")

# Patch Cross-company access denied
cross_company = """    // 0a. Strict Tenant Isolation: User must belong to the instance company
    if (instance.companyId && session.companyId !== instance.companyId && session.role !== 'SUPER_ADMIN') {
      SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'CROSS_COMPANY_ACCESS_DENIED', 'bpm_instances', instance.instanceId, false, 'HIGH', 'User tried to access cross-company instance').catch(() => {});
      return {"""
content = content.replace("""    // 0a. Strict Tenant Isolation: User must belong to the instance company
    if (instance.companyId && session.companyId !== instance.companyId && session.role !== 'SUPER_ADMIN') {
      return {""", cross_company)

# Patch Privilege Intersection: Delegate does not have operational authority at the target site.
privilege = """            // Privilege Intersection Check: Delegate's own site boundary
            if (session.assignedSiteId && instance.siteId && session.assignedSiteId !== instance.siteId && session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN' && session.role !== 'DIRECTOR_CEO') {
              SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'CROSS_SITE_ACCESS_DENIED', 'bpm_instances', instance.instanceId, false, 'MEDIUM', 'Proxy attempted cross-site access').catch(() => {});
              return {"""
content = content.replace("""            // Privilege Intersection Check: Delegate's own site boundary
            if (session.assignedSiteId && instance.siteId && session.assignedSiteId !== instance.siteId && session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN' && session.role !== 'DIRECTOR_CEO') {
              return {""", privilege)

with open('src/services/bpmDelegationService.ts', 'w') as f:
    f.write(content)
