import * as fs from 'fs';

const files = [
  'src/components/common/NavigationDrawer.tsx',
  'src/components/common/TabletNavigationRail.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('CERTIFICATION_TRACKING')) {
    content = content.replace(
      '<NavItem icon={GraduationCap} label="13. LMS & PSARA Compliance" screen="TRAINING_LMS" />',
      '<NavItem icon={GraduationCap} label="13.1 LMS & PSARA Compliance" screen="TRAINING_LMS" />\n                <NavItem icon={Award} label="13.2 Certifications Expiry" screen="CERTIFICATION_TRACKING" />'
    );
    fs.writeFileSync(file, content);
    console.log(file, 'updated');
  }
}
