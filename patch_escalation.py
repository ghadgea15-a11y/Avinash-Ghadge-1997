import re

with open('src/services/bpmEscalationService.ts', 'r') as f:
    content = f.read()

# Make sure to import BpmDelegationService at the top
if 'BpmDelegationService' not in content:
    content = re.sub(
        r"import \{ RbacService \} from '\./rbacService';",
        "import { RbacService } from './rbacService';\nimport { BpmDelegationService } from './bpmDelegationService';",
        content
    )

new_logic = """
            if (allowReassignment && resolvedTargets.length > 0) {
              // Reassign approval ownership to the resolved target approvers
              let finalTargets = [...resolvedTargets];
              
              // Integrate Proxy Delegation: If the target has an active proxy, route it to the proxy
              try {
                const activeProxies = await BpmDelegationService.getActiveProxiesForApprovers(companyId, resolvedTargets, instance, now);
                if (activeProxies.length > 0) {
                  const proxyMap = new Map<string, string>();
                  activeProxies.forEach(p => proxyMap.set(p.delegatorUserId, p.delegateUserId));
                  
                  finalTargets = resolvedTargets.map(uid => proxyMap.has(uid) ? proxyMap.get(uid)! : uid);
                }
              } catch (e) {
                console.warn('[EscalationEngine] Proxy evaluation failed during escalation:', e);
              }

              newApprovers = Array.from(new Set(finalTargets));
              instance.reassignedFrom = previousApprovers;
              instance.currentApprovers = newApprovers;
              result.actionsTaken.reassigned = true;
            }
"""

pattern = re.compile(r"            if \(allowReassignment && resolvedTargets\.length > 0\) \{.*?result\.actionsTaken\.reassigned = true;\n            \}", re.DOTALL)
content = pattern.sub(new_logic.strip(), content)

with open('src/services/bpmEscalationService.ts', 'w') as f:
    f.write(content)
