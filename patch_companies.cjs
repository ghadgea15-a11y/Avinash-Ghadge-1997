const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SuperAdminCompaniesScreen.tsx', 'utf8');

// Inject the import
file = file.replace(
  "import { FirestoreService } from '../../services/firestoreService';",
  "import { FirestoreService } from '../../services/firestoreService';\nimport { seedTataMotorsData } from '../../utils/tataMotorsSeeder';"
);

// Add state for seeding
file = file.replace(
  "const [message, setMessage] = useState<string | null>(null);",
  "const [message, setMessage] = useState<string | null>(null);\n  const [isSeeding, setIsSeeding] = useState(false);"
);
if (!file.includes('isSeeding')) {
  // If the previous replace failed because it didn't find that exact line
  file = file.replace(
    "const [itemsPerPage, setItemsPerPage] = useState(10);",
    "const [itemsPerPage, setItemsPerPage] = useState(10);\n  const [message, setMessage] = useState<string | null>(null);\n  const [isSeeding, setIsSeeding] = useState(false);"
  );
}

// Add the button
const buttonHtml = `
                    {company.companyLegalName && company.companyLegalName.toLowerCase().includes('tata') && (
                      <button
                        onClick={async () => {
                          if (!window.confirm('Seed 100 Tata Motors employees?')) return;
                          setIsSeeding(true);
                          setMessage('Seeding 100 employees for Tata Motors...');
                          try {
                            await seedTataMotorsData(company.companyId, currentSession.employeeId);
                            setMessage('Successfully seeded 100 employees!');
                          } catch (e: any) {
                            setMessage('Error seeding: ' + e.message);
                          }
                          setIsSeeding(false);
                        }}
                        disabled={isSeeding}
                        className="mt-2 w-full py-1.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                      >
                        {isSeeding ? 'Seeding Data...' : 'Seed 100 Employees (Mock Data)'}
                      </button>
                    )}
                  </div>
                  <span`;

file = file.replace(
  "</div>\n                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase",
  buttonHtml + " className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase"
);

fs.writeFileSync('src/components/screens/SuperAdminCompaniesScreen.tsx', file);
console.log("Patched SuperAdminCompaniesScreen.tsx");
