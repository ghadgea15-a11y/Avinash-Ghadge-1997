const fs = require('fs');

let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

file = file.replace(
  '<button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow">Save Checkpoint</button>',
  '<button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Saving..." : "Save Checkpoint"}</button>'
);

file = file.replace(
  '<button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow">Submit Incident</button>',
  '<button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Submitting..." : "Submit Incident"}</button>'
);

file = file.replace(
  '<button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow">Check In Visitor</button>',
  '<button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Checking In..." : "Check In Visitor"}</button>'
);

file = file.replace(
  '<button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow">Create Pass</button>',
  '<button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Creating..." : "Create Pass"}</button>'
);

// We should also prevent double execution by returning early in the handler if isLoading is true.
file = file.replace(
  'const handleSaveIncident = async (e: React.FormEvent) => {\n    e.preventDefault();',
  'const handleSaveIncident = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (isLoading) return;'
);

file = file.replace(
  'const handleSaveCheckpoint = async (e: React.FormEvent) => {\n    e.preventDefault();',
  'const handleSaveCheckpoint = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (isLoading) return;'
);

file = file.replace(
  'const handleCheckInVisitor = async (e: React.FormEvent) => {\n    e.preventDefault();',
  'const handleCheckInVisitor = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (isLoading) return;'
);

file = file.replace(
  'const handleSaveMaterialPass = async (e: React.FormEvent) => {\n    e.preventDefault();',
  'const handleSaveMaterialPass = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (isLoading) return;'
);

file = file.replace(
  'const handleStartPatrol = () => {',
  'const handleStartPatrol = () => {\n    if (isLoading) return;'
);

file = file.replace(
  'const handleCompletePatrol = async () => {',
  'const handleCompletePatrol = async () => {\n    if (isLoading) return;'
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Buttons patched');
