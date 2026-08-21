import * as fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('MandatoryRefreshersScreen')) {
  // Add import
  content = content.replace(
    "import { TrainingLmsScreen } from './components/screens/TrainingLmsScreen';",
    "import { TrainingLmsScreen } from './components/screens/TrainingLmsScreen';\nimport { MandatoryRefreshersScreen } from './components/screens/MandatoryRefreshersScreen';"
  );
  
  // Add screen block
  content = content.replace(
    "                    {currentScreen === 'TRAINING_LMS' && (",
    "                    {currentScreen === 'MANDATORY_REFRESHERS' && activeCompany && (\n                      <MandatoryRefreshersScreen\n                        userSession={userSession}\n                        activeCompany={activeCompany}\n                        onNavigate={setCurrentScreen}\n                      />\n                    )}\n                    {currentScreen === 'TRAINING_LMS' && ("
  );
  fs.writeFileSync(file, content);
}
