const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Replace the incident card rendering
const cardStartRegex = /\{inc\.status === 'OPEN' && \(\s+<div className="flex items-center gap-2 pt-1">\s+<button\s+onClick=\{\(\) => handleUpdateIncidentStatus\(inc\.id, 'RESOLVED'\)\}\s+className="w-full py-1\.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition"\s+>\s+Mark Resolved\s+<\/button>\s+<\/div>\s+\)\}/;

const newCardControls = `
                  {/* Status updates based on TYPE */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {inc.type === 'BBS_OBSERVATION' ? (
                      <>
                        {inc.status === 'RECORDED' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'ACTION_REQUIRED')} className="flex-1 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow hover:bg-amber-600 transition">Action Required</button>
                        )}
                        {(inc.status === 'RECORDED' || inc.status === 'ACTION_REQUIRED') && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'CLOSED')} className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Close Observation</button>
                        )}
                      </>
                    ) : inc.type === 'COMPLAINT' ? (
                      <>
                        {inc.status === 'OPEN' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'IN_PROGRESS')} className="flex-1 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold shadow hover:bg-blue-600 transition">In Progress</button>
                        )}
                        {(inc.status === 'OPEN' || inc.status === 'IN_PROGRESS') && (
                          <>
                            <button onClick={() => handleUpdateIncidentStatus(inc.id, 'ESCALATED')} className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-semibold shadow hover:bg-rose-600 transition">Escalate</button>
                            <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Resolve</button>
                          </>
                        )}
                      </>
                    ) : (
                      /* Standard INCIDENT */
                      <>
                        {['OPEN', 'UNDER_INVESTIGATION', 'IN_PROGRESS'].includes(inc.status) && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Mark Resolved</button>
                        )}
                      </>
                    )}
                  </div>
`;

code = code.replace(cardStartRegex, newCardControls);

// Fix the default status of BBS/Complaint when creating an incident
const createStartRegex = /status: 'OPEN',/;
const updatedStatusLogic = `status: incidentForm.type === 'BBS_OBSERVATION' ? 'RECORDED' : 'OPEN',`;
code = code.replace(createStartRegex, updatedStatusLogic);

// Add display logic in the card for SLA and Behavior Category
const typeDisplayRegex = /<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">\{inc\.title\}<\/h4>/;
const updatedTypeDisplay = `
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span className="text-indigo-600 mr-2">[{inc.type || 'INCIDENT'}]</span>
                    {inc.title}
                  </h4>
                  {inc.type === 'BBS_OBSERVATION' && inc.behaviorCategory && (
                     <p className="text-xs font-semibold text-amber-600">Behavior: {inc.behaviorCategory}</p>
                  )}
                  {inc.type === 'COMPLAINT' && inc.slaDeadline && (
                     <p className="text-xs font-semibold text-rose-600">SLA: {inc.slaDeadline}</p>
                  )}
`;
code = code.replace(typeDisplayRegex, updatedTypeDisplay);


fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
