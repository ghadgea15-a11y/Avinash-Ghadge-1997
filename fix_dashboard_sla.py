import re

with open('src/components/bi/PredictiveAnalyticsDashboard.tsx', 'r') as f:
    content = f.read()

new_logic = """
      } else if (activeTab === 'SLA_BREACH') {
         // Generate predictions for active SLAs
         const slaSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'sla_definitions'), where('status', '==', 'ACTIVE')));
         const slas = slaSnap.docs.map(d => d.data());
         
         const ticketsSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'serviceTickets'), where('status', 'in', ['OPEN', 'IN_PROGRESS'])));
         const tickets = ticketsSnap.docs.map(d => d.data());
         
         for (const sla of slas) {
           // For simplicity in this dashboard, pick a random open ticket related to the client
           const relevantTickets = tickets.filter(t => t.clientId === sla.clientId);
           for (const t of relevantTickets.slice(0, 3)) { // Limit to avoid overloading
             await PredictionService.calculateSlaBreachRisk(company.companyId, sla.contractId || 'UNKNOWN', sla.id, t.id);
           }
         }
      } else if (activeTab === 'PROFITABILITY') {
"""

pattern = re.compile(r"      \} else if \(activeTab === 'SLA_BREACH'\) \{.*?      \} else if \(activeTab === 'PROFITABILITY'\) \{", re.DOTALL)
content = pattern.sub(new_logic.strip(), content)

with open('src/components/bi/PredictiveAnalyticsDashboard.tsx', 'w') as f:
    f.write(content)
