const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

code = code.replace(
  /const handleCapture = \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader.readAsDataURL\(file\);\n    \}\n  \};/,
  `const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const captured = reader.result as string;
        setSelfie(captured);
        setIsCameraActive(false);
        if (pendingAction) {
          executePunch(pendingAction, false, captured);
        }
      };
      reader.readAsDataURL(file);
    }
  };`
);

code = code.replace(
  /const executePunch = async \(action: 'PUNCH_IN' \| 'PUNCH_OUT', isOverride: boolean = false\) => \{/,
  `const executePunch = async (action: 'PUNCH_IN' | 'PUNCH_OUT', isOverride: boolean = false, overrideSelfie?: string) => {
    const activeSelfie = overrideSelfie || selfie;`
);

code = code.replace(
  /if \(!selfie\) \{/g,
  `if (!activeSelfie) {`
);

code = code.replace(
  /selfie \|\| undefined,/g,
  `activeSelfie || undefined,`
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('patched punchstation camera logic');
