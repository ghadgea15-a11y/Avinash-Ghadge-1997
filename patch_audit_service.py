with open('src/services/auditTrailService.ts', 'r') as f:
    content = f.read()

content = content.replace("session: UserSession | null,", "actor: { userId: string, employeeId?: string, role?: string, companyId: string } | null,")
content = content.replace("if (!session) return;", "if (!actor) return;")
content = content.replace("companyId || session.companyId", "companyId || actor.companyId")
content = content.replace("actorId: session.userId", "actorId: actor.userId")
content = content.replace("actorEmployeeId: session.employeeId", "actorEmployeeId: actor.employeeId")
content = content.replace("actorRole: session.role", "actorRole: actor.role")

# Helpers
content = content.replace("session: UserSession, module", "actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module")
content = content.replace("session, session.companyId", "actor, actor.companyId")

with open('src/services/auditTrailService.ts', 'w') as f:
    f.write(content)
