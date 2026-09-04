const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/PunchStation.tsx', 'utf8');

if (!code.includes('const fileInputRef = useRef<HTMLInputElement>(null);')) {
  code = code.replace(
    "const [selfie, setSelfie] = useState<string | null>(null);",
    "const [selfie, setSelfie] = useState<string | null>(null);\n  const fileInputRef = React.useRef<HTMLInputElement>(null);"
  );
  
  code = code.replace(
    "  const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {\n    if (!selfie) {\n      setIsCameraActive(true);\n      setPendingAction(action);\n      return;\n    }",
    "  const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {\n    if (!selfie) {\n      setPendingAction(action);\n      fileInputRef.current?.click();\n      return;\n    }"
  );

  code = code.replace(
    /<input[\s\S]*?type="file"[\s\S]*?capture="user"[\s\S]*?accept="image\/\*"[\s\S]*?className="hidden"[\s\S]*?onChange=\{handleCapture\}[\s\S]*?\/>/,
    `<input 
                  type="file" 
                  capture="user" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleCapture}
                />`
  );
  
  fs.writeFileSync('src/components/wfm/PunchStation.tsx', code);
  console.log('patched camera activation');
}
