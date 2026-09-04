const fs = require('fs');
let f = fs.readFileSync('src/components/hrms/HolidayCalendarMaster.tsx', 'utf8');

f = f.replace(/import \{ useToast \} from '\.\.\/\.\.\/context\/ToastContext';/g, "import { useFeedback } from '../../context/ActionFeedbackContext';");
f = f.replace(/const \{ showToast \} = useToast\(\);/g, "const { showFeedback } = useFeedback();");
f = f.replace(/showToast\(([\s\S]*?)\);/g, "showFeedback($1);");

fs.writeFileSync('src/components/hrms/HolidayCalendarMaster.tsx', f);
