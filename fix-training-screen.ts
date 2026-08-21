import * as fs from 'fs';

const file = 'src/components/screens/TrainingLmsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  "import { useStore } from '../../store';",
  "import { useTheme } from '../../context/ThemeContext';\nimport { PhaseAScreen, UserSession, CompanyTenant } from '../../types';"
);

// Replace signature
content = content.replace(
  "export const TrainingLmsScreen = () => {",
  `export const TrainingLmsScreen: React.FC<{
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate: React.Dispatch<React.SetStateAction<PhaseAScreen>>;
}> = ({ userSession, activeCompany, onNavigate }) => {`
);

// Replace useStore hook
content = content.replace(
  "const { isDark, userSession, activeCompany } = useStore();",
  "const { isDark } = useTheme();"
);

fs.writeFileSync(file, content);
