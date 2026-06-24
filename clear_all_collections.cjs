const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AlzaSyC-IHT36beAyYZY-RFFchSMDRx6LqVRO6E",
  authDomain: "rspg-school-garden.firebaseapp.com",
  projectId: "rspg-school-garden",
  storageBucket: "rspg-school-garden.firebasestorage.app",
  messagingSenderId: "891945309006",
  appId: "1:891945309006:web:f6c2a4b8c144f33843041f",
  measurementId: "G-3V4SHJ4R40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  'plants',
  'study_areas',
  'plant_logs',
  'k7_worksheets',
  'rspg_school_info',
  'rspg_admin_management',
  'rspg_evaluation_criteria',
  'rspg_evidence_vault',
  'rspg_goodness',
  'rspg_learning_activities',
  'rspg_plant_changes',
  'rspg_banners',
  'student_portfolios',
  'evidence_mapping',
  'rspg_portfolio',
  'rspg_online_worksheets',
  'rspg_plant_studies',
  'rspg_public_docs',
  'public_documents'
];

async function clearDb() {
  console.log("Starting cleanup of mock data...");
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.size === 0) {
        console.log(`Collection "${colName}" is already empty.`);
        continue;
      }
      console.log(`Clearing ${snap.size} documents from "${colName}"...`);
      for (const document of snap.docs) {
        await deleteDoc(doc(db, colName, document.id));
      }
      console.log(`Cleared "${colName}" successfully.`);
    } catch (err) {
      console.error(`Error clearing "${colName}": ${err.message}`);
    }
  }
  console.log("Cleanup completed!");
}

clearDb().catch(console.error);
