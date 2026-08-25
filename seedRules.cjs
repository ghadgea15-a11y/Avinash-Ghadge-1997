const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "log-sheet-af97a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const companyId = 'C_LOG_SHEET_DEMO'; // assuming a common test company, wait we don't know it. 
  // We can just create a component or a service method to seed rules.
}
