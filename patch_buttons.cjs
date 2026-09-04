const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

const oldButtons = `                {canApproveOnboarding && (
                  <button
                    onClick={() => handleApproveStatus(
                      selectedEmployee.id, 
                      selectedEmployee.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                    )}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow \${
                      selectedEmployee.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }\`}
                  >
                    {selectedEmployee.status === 'ACTIVE' ? 'Suspend Employee' : 'Activate Employee'}
                  </button>
                )}`;

const newButtons = `                {canApproveOnboarding && (
                  <>
                    <button
                      onClick={() => handleApproveStatus(
                        selectedEmployee.id, 
                        selectedEmployee.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                      )}
                      className={\`px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow \${
                        selectedEmployee.status === 'ACTIVE' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                      }\`}
                    >
                      {selectedEmployee.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                    {selectedEmployee.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleApproveStatus(selectedEmployee.id, 'TERMINATED')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow bg-rose-600 hover:bg-rose-500"
                      >
                        Terminate
                      </button>
                    )}
                  </>
                )}`;

code = code.replace(oldButtons, newButtons);
fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
console.log('patched buttons');
