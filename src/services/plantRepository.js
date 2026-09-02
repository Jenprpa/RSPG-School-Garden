import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const plantRepository = {
  /**
   * Fetch all plants for a given school and academic year
   */
  async getPlants(schoolId = 'pwtk', academicYear = '2569') {
    if (!isFirebaseConfigured() || !db) return [];
    try {
      // 1. Primary path: schools/{schoolId}/academicYears/{academicYear}/plants
      const yearCol = collection(db, 'schools', schoolId, 'academicYears', academicYear, 'plants');
      const q = query(yearCol, orderBy('plant_code'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      if (list.length > 0) return list;

      // 2. Fallback to root plants collection
      const rootCol = collection(db, 'plants');
      const rootQ = query(rootCol, orderBy('plant_code'));
      const rootSnap = await getDocs(rootQ);
      rootSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.warn('Repository fetch fallback:', err.message);
      // Fallback query without index
      const rootSnap = await getDocs(collection(db, 'plants'));
      const list = [];
      rootSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    }
  },

  /**
   * Create a new plant
   */
  async create(plantData, schoolId = 'pwtk', academicYear = '2569') {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }
    if (!plantData.plant_code?.trim()) {
      throw new Error('รหัสพรรณไม้ (code) ต้องไม่เป็นค่าว่าง');
    }
    if (!plantData.thai_name?.trim() && !plantData.local_name?.trim()) {
      throw new Error('ชื่อพื้นเมือง/ชื่อไทย (localName) ต้องไม่เป็นค่าว่าง');
    }

    const payload = {
      ...plantData,
      school_id: schoolId,
      academic_year: academicYear,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to root collection
    const docRef = await addDoc(collection(db, 'plants'), payload);
    const plantId = docRef.id;

    // Sync to hierarchical path schools/{schoolId}/academicYears/{academicYear}/plants/{plantId}
    try {
      const yearDocRef = doc(db, 'schools', schoolId, 'academicYears', academicYear, 'plants', plantId);
      await setDoc(yearDocRef, { ...payload, id: plantId }, { merge: true });
    } catch (subErr) {
      console.warn('Hierarchical sync notice:', subErr.message);
    }

    return plantId;
  },

  /**
   * Update existing plant
   */
  async update(plantId, updateData, schoolId = 'pwtk', academicYear = '2569') {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }
    const payload = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Update root
    const rootDocRef = doc(db, 'plants', plantId);
    await setDoc(rootDocRef, payload, { merge: true });

    // Update hierarchical path
    try {
      const yearDocRef = doc(db, 'schools', schoolId, 'academicYears', academicYear, 'plants', plantId);
      await setDoc(yearDocRef, payload, { merge: true });
    } catch (subErr) {
      console.warn('Hierarchical update notice:', subErr.message);
    }
  },

  /**
   * Delete plant
   */
  async delete(plantId, schoolId = 'pwtk', academicYear = '2569') {
    if (!isFirebaseConfigured() || !db) return;
    await deleteDoc(doc(db, 'plants', plantId));
    try {
      await deleteDoc(doc(db, 'schools', schoolId, 'academicYears', academicYear, 'plants', plantId));
    } catch (subErr) {
      console.warn('Hierarchical delete notice:', subErr.message);
    }
  },

  /**
   * Upload plant image to category folder
   */
  async uploadMedia(file, category = 'habit', plantId = 'temp') {
    if (!storage) throw new Error('Firebase Storage is not configured');
    if (!category) throw new Error('กรุณาระบุหมวดหมู่ภาพ (category) ก่อนอัปโหลด');

    const processedFile = await compressImage(file);
    const fileExt = processedFile.name.split('.').pop() || 'jpg';
    const fileName = `plants/${category}/${plantId}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, processedFile);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  }
};
