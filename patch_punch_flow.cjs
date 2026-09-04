const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

code = code.replace(
  /const handlePunchClick = \(action: 'PUNCH_IN' \| 'PUNCH_OUT'\) => \{[\s\S]*?executePunch\(action, false\);\n  \};/,
  `const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT', overrideSelfie?: string) => {
    const currentSelfie = overrideSelfie || selfie;
    
    // 1. Geofence Check
    if (geofenceEval?.result === 'OUTSIDE_GEOFENCE') {
      if (!isSupervisorOrAbove) {
        showError('You must be inside the site geofence to punch.');
        return;
      }
      if (!currentSelfie) {
        setPendingAction(action);
        fileInputRef.current?.click();
        return;
      }
      setPendingAction(action);
      setShowOverrideModal(true);
      return;
    }

    // 2. Normal Punch Selfie Check
    if (!currentSelfie) {
      setPendingAction(action);
      fileInputRef.current?.click();
      return;
    }

    // 3. Normal Execution
    executePunch(action, false, currentSelfie);
  };`
);

code = code.replace(
  /reader.onloadend = \(\) => \{[\s\S]*?\};\n      reader.readAsDataURL\(file\);/,
  `reader.onloadend = () => {
        const captured = reader.result as string;
        setSelfie(captured);
        setIsCameraActive(false);
        if (pendingAction) {
          handlePunchClick(pendingAction, captured);
        }
      };
      reader.readAsDataURL(file);`
);

fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
console.log('patched punch flow');
