const fs = require('fs');
let code = fs.readFileSync('src/components/scm/GatePassTab.tsx', 'utf8');

code = code.replace(
  `</td>
              </tr>`,
  `  {p.status === 'GATE_VERIFIED' && p.passType === 'INWARD' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.receiveGatePass(session, p.id, company.id);
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-green-600 hover:underline text-xs font-medium ml-2">Receive Stock</button>
                  )}
                  {p.status === 'RETURN_PENDING' && (
                    <button onClick={async () => {
                      try {
                        await ScmService.returnGatePassMaterials(session, p.id, company.id, p.lines.map(l => ({ itemId: l.itemId, returnedQuantity: l.quantity })));
                        loadPasses();
                      } catch (e: any) { alert(e.message); }
                    }} className="text-orange-600 hover:underline text-xs font-medium ml-2">Mark Returned</button>
                  )}
                </td>
              </tr>`
);

fs.writeFileSync('src/components/scm/GatePassTab.tsx', code);
