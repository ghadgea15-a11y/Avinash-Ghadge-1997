const fs = require('fs');

const missingCollections = [
  "absenceRegularizations", "attendance_policies", "backgroundVerifications", "badges", 
  "billing_rate_matrices", "bpm_delegations", "bpm_escalation_events", "bpm_escalation_policies", 
  "bpm_threshold_rules", "bpm_workflows", "bulk_export_alerts", "candidateDocuments", 
  "change_requests", "client_contacts", "contract_amendments", "contract_expiry_events", 
  "contract_scopes", "contract_sites", "cost_centres", "deployments", "detected_risk_events", 
  "documentTypes", "gate_passes", "goods_receipt_notes", "grc_capa", "grc_risks", 
  "holidays", "identity_badges", "inventoryItems", "inventoryVendors", "leaveBalances", 
  "leavePolicies", "maintenanceOccurrences", "maintenancePlans", "orgAssignments", 
  "overtimePolicies", "patrol_checkpoints", "patrol_logs", "patrol_plans", "patrol_tours", 
  "priorityConfigs", "procurement_requisitions", "refresher_statuses", "rosters", 
  "safety_checksheets", "salaryProfiles", "salaryStructures", "security_assurance_runs", 
  "security_detection_rules", "security_events", "security_findings", "service_sla_policies", 
  "shift_handovers", "sla_breaches", "sla_definitions", "sla_scorecards", "sos_alerts", 
  "statutory_configs", "stock_ledger", "suspicious_patrol_scans", "three_way_matches", 
  "ticketCategories", "ticketFeedback", "transfer_orders", "transfers", "warranties", 
  "warranty_claims", "workOrders"
];

let rulesStr = '';
for (const col of missingCollections) {
  rulesStr += `
      match /${col}/{itemId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff());
      }
`;
}

let content = fs.readFileSync('firestore.rules', 'utf8');

// Append just before the end of the companies block
// Look for match /bpm_instances
content = content.replace("match /bpm_instances/{instanceId} {", rulesStr + "\n      match /bpm_instances/{instanceId} {");

fs.writeFileSync('firestore.rules', content);
console.log('Appended missing rules');
