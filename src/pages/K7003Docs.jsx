import { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured, getGeminiKey, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BookOpen, Search, CheckCircle2, AlertCircle, Save, Upload, Edit, MessageSquare, Sparkles } from 'lucide-react';

export default function K7003Docs({ userRole }) {
  const [plantsList, setPlantsList] = useState([]);
  const [worksheetsList, setWorksheetsList] = useState([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection/editing states
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [activeWorksheet, setActiveWorksheet] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [stemDetail, setStemDetail] = useState('');
  const [leafDetail, setLeafDetail] = useState('');
  const [flowerDetail, setFlowerDetail] = useState('');
  const [fruitDetail, setFruitDetail] = useState('');
  const [seedDetail, setSeedDetail] = useState('');
  const [localWisdom, setLocalWisdom] = useState('');
  const [botanicalData, setBotanicalData] = useState('');
  const [utility, setUtility] = useState('');
  const [studyResults, setStudyResults] = useState('');
  
  // Extra requested fields
  const [recorder, setRecorder] = useState('');
  const [classroom, setClassroom] = useState('');
  const [checkerTeacher, setCheckerTeacher] = useState('');
  const [sheetStatus, setSheetStatus] = useState('รอตรวจ'); // 'รอตรวจ', 'ผ่าน', 'ต้องแก้ไข'
  const [comment, setComment] = useState('');

  // 6 Image URLs and upload files
  const [habitPhotoUrl, setHabitPhotoUrl] = useState('');
  const [stemPhotoUrl, setStemPhotoUrl] = useState('');
  const [leafPhotoUrl, setLeafPhotoUrl] = useState('');
  const [flowerPhotoUrl, setFlowerPhotoUrl] = useState('');
  const [fruitPhotoUrl, setFruitPhotoUrl] = useState('');
  const [seedPhotoUrl, setSeedPhotoUrl] = useState('');

  const [habitUpload, setHabitUpload] = useState(null);
  const [stemUpload, setStemUpload] = useState(null);
  const [leafUpload, setLeafUpload] = useState(null);
  const [flowerUpload, setFlowerUpload] = useState(null);
  const [fruitUpload, setFruitUpload] = useState(null);
  const [seedUpload, setSeedUpload] = useState(null);

  const [uploadProgressState, setUploadProgressState] = useState('');
  
  // Document uploads states
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docUpload, setDocUpload] = useState(null);

  const [aiPartLoading, setAiPartLoading] = useState({
    habit: false,
    stem: false,
    leaf: false,
    flower: false,
    fruit: false,
    seed: false
  });

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const plantsSnap = await getDocs(query(collection(db, 'plants'), orderBy('plant_code')));
      const plants = [];
      plantsSnap.forEach(d => {
        plants.push({ id: d.id, ...d.data() });
      });
      setPlantsList(plants);

      const sheetsSnap = await getDocs(collection(db, 'k7_worksheets'));
      const sheets = [];
      sheetsSnap.forEach(d => {
        sheets.push({ id: d.id, ...d.data() });
      });
      setWorksheetsList(sheets);
    } catch (err) {
      console.error('Error loading data for K.7-003:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPlant = (plant) => {
    setSelectedPlant(plant);
    const sheet = worksheetsList.find(s => s.plant_id === plant.id);
    if (sheet) {
      setActiveWorksheet(sheet);
      setStemDetail(sheet.stem_detail || '');
      setLeafDetail(sheet.leaf_detail || '');
      setFlowerDetail(sheet.flower_detail || '');
      setFruitDetail(sheet.fruit_detail || '');
      setSeedDetail(sheet.seed_detail || '');
      setLocalWisdom(sheet.local_wisdom || '');
      setBotanicalData(sheet.botanical_data || '');
      setUtility(sheet.utility || '');
      setStudyResults(sheet.study_results || '');
      setRecorder(sheet.recorder || '');
      setClassroom(sheet.classroom || '');
      setCheckerTeacher(sheet.checker_teacher || '');
      setSheetStatus(sheet.status || 'รอตรวจ');
      setComment(sheet.comment || '');

      setHabitPhotoUrl(sheet.habit_photo_url || '');
      setStemPhotoUrl(sheet.stem_photo_url || '');
      setLeafPhotoUrl(sheet.leaf_photo_url || '');
      setFlowerPhotoUrl(sheet.flower_photo_url || '');
      setFruitPhotoUrl(sheet.fruit_photo_url || '');
      setSeedPhotoUrl(sheet.seed_photo_url || '');
      setDocFileUrl(sheet.document_file_url || '');
      setDocFileName(sheet.document_file_name || '');
    } else {
      setActiveWorksheet(null);
      setStemDetail('');
      setLeafDetail('');
      setFlowerDetail('');
      setFruitDetail('');
      setSeedDetail('');
      setLocalWisdom('');
      setBotanicalData('');
      setUtility('');
      setStudyResults('');
      setRecorder('');
      setClassroom('');
      setCheckerTeacher('');
      setSheetStatus('รอตรวจ');
      setComment('');

      setHabitPhotoUrl('');
      setStemPhotoUrl('');
      setLeafPhotoUrl('');
      setFlowerPhotoUrl('');
      setFruitPhotoUrl('');
      setSeedPhotoUrl('');
      setDocFileUrl('');
      setDocFileName('');
    }

    setHabitUpload(null);
    setStemUpload(null);
    setLeafUpload(null);
    setFlowerUpload(null);
    setFruitUpload(null);
    setSeedUpload(null);
    setDocUpload(null);
    setIsEditing(false);
  };

  const handleImageUpload = async (file, label) => {
    if (!storage) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const fileName = `k7_photos/${selectedPlant.id}_${label}_${Date.now()}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert(`อัปโหลดรูปภาพ ${label} ไม่สำเร็จ: ` + err.message);
      return '';
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGeneratePartAiDescription = async (partName) => {
    if (!selectedPlant) return;
    const geminiKey = getGeminiKey();
    if (!geminiKey) {
      alert('กรุณาตั้งค่า Gemini API Key ในหน้าตั้งค่าระบบก่อนใช้งาน AI');
      return;
    }

    setAiPartLoading(prev => ({ ...prev, [partName]: true }));
    try {
      let fileToAnalyze = null;
      
      if (partName === 'habit') {
        fileToAnalyze = habitUpload;
      } else if (partName === 'stem') {
        fileToAnalyze = stemUpload;
      } else if (partName === 'leaf') {
        fileToAnalyze = leafUpload;
      } else if (partName === 'flower') {
        fileToAnalyze = flowerUpload;
      } else if (partName === 'fruit') {
        fileToAnalyze = fruitUpload;
      } else if (partName === 'seed') {
        fileToAnalyze = seedUpload;
      }

      let prompt = '';
      const thaiPartName = {
        habit: 'ลักษณะวิสัย (รูปทรง ความสูง การแตกกิ่งก้าน)',
        stem: 'ลักษณะลำต้นและราก (สีเปลือก ยาง ผิว ลำต้น ราก)',
        leaf: 'ลักษณะใบ (ประเภทใบ การเรียงตัว เส้นใบ ขอบใบ แผ่นใบ)',
        flower: 'ลักษณะดอก (ประเภทดอก สมบูรณ์เพศหรือไม่ กลีบเลี้ยง กลีบดอก)',
        fruit: 'ลักษณะผล (ประเภทผล สีผลดิบ สีผลแก่ ผิวผล)',
        seed: 'ลักษณะเมล็ด (รูปทรง สี จำนวนเมล็ดต่อผล)'
      }[partName];

      prompt = `จงเขียนคำอธิบายลักษณะทางพฤกษศาสตร์ส่วน "${thaiPartName}" ของพืชที่มีชื่อไทยว่า "${selectedPlant.thai_name}" และชื่อวิทยาศาสตร์คือ "${selectedPlant.scientific_name || 'ไม่ระบุ'}" ออกมาเป็นบทสรุปภาษาไทย 1 ย่อหน้าสั้นๆ ความยาวประมาณ 40-70 คำ เพื่อนำไปกรอกในเอกสารแบบลงทะเบียนพรรณไม้ อพ.สธ. ก.7-003`;

      let response;
      if (fileToAnalyze) {
        const base64Data = await fileToBase64(fileToAnalyze);
        const mimeType = fileToAnalyze.type || 'image/jpeg';
        prompt += ` โดยวิเคราะห์ลักษณะอ้างอิงจากภาพถ่ายจริงของส่วนนี้ที่แนบมาด้วย เพื่อให้สอดคล้องกับพืชในภาพมากที่สุด`;
        
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        });
      } else {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
      }

      if (!response.ok) {
        throw new Error('การเชื่อมต่อกับ Gemini API ขัดข้องหรือ API Key ไม่ถูกต้อง');
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        const cleanedText = generatedText.trim();
        if (partName === 'stem') setStemDetail(cleanedText);
        else if (partName === 'leaf') setLeafDetail(cleanedText);
        else if (partName === 'flower') setFlowerDetail(cleanedText);
        else if (partName === 'fruit') setFruitDetail(cleanedText);
        else if (partName === 'seed') setSeedDetail(cleanedText);
        else if (partName === 'habit') {
          alert(`วิเคราะห์ลักษณะวิสัยของพืชสำเร็จ:\n\n${cleanedText}\n\n(เนื่องจากในส่วนฟอร์มไม่มีช่องวิสัยเป็นข้อความยาว จึงแนะนำการวิเคราะห์ลักษณะวิสัยให้พิจารณา)`);
        }
        
        if (partName !== 'habit') {
          alert(`AI ได้ทำการวิเคราะห์และกรอกรายละเอียดสำหรับ ${thaiPartName} ให้เรียบร้อยแล้ว!`);
        }
      } else {
        alert('ไม่สามารถวิเคราะห์ข้อมูลจาก AI ได้ กรุณาลองอัปโหลดรูปภาพที่คมชัดกว่าเดิม');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI: ' + err.message);
    } finally {
      setAiPartLoading(prev => ({ ...prev, [partName]: false }));
    }
  };

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาบีบอัดไฟล์ก่อนทำการอัปโหลด`);
        e.target.value = '';
        setDocUpload(null);
        return;
      }
    }
    setDocUpload(file);
  };

  const handleDocUpload = async (file) => {
    if (!storage) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const fileName = `k7_documents/${selectedPlant.id}_doc_${Date.now()}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert(`อัปโหลดเล่มเอกสารไม่สำเร็จ: ` + err.message);
      return '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!['admin', 'rspg_board', 'teacher', 'project_advisor', 'student'].includes(userRole)) {
      alert('คุณไม่มีสิทธิ์บันทึกข้อมูลใบงาน ก.7-003');
      return;
    }
    if (userRole === 'student' && sheetStatus === 'ผ่าน') {
      alert('ไม่สามารถแก้ไขใบงานที่อนุมัติผ่านแล้วได้');
      return;
    }
    setSaving(true);
    setUploadProgressState('กำลังบันทึกและอัปโหลดรูปภาพหลักฐาน...');

    try {
      let finalHabit = habitPhotoUrl;
      let finalStem = stemPhotoUrl;
      let finalLeaf = leafPhotoUrl;
      let finalFlower = flowerPhotoUrl;
      let finalFruit = fruitPhotoUrl;
      let finalSeed = seedPhotoUrl;
      let finalDocUrl = docFileUrl;
      let finalDocName = docFileName;

      if (habitUpload) finalHabit = await handleImageUpload(habitUpload, 'habit');
      if (stemUpload) finalStem = await handleImageUpload(stemUpload, 'stem');
      if (leafUpload) finalLeaf = await handleImageUpload(leafUpload, 'leaf');
      if (flowerUpload) finalFlower = await handleImageUpload(flowerUpload, 'flower');
      if (fruitUpload) finalFruit = await handleImageUpload(fruitUpload, 'fruit');
      if (seedUpload) finalSeed = await handleImageUpload(seedUpload, 'seed');
      if (docUpload) {
        finalDocUrl = await handleDocUpload(docUpload);
        finalDocName = docUpload.name;
      }

      const docId = activeWorksheet?.id || `k7_${selectedPlant.id}`;
      const payload = {
        plant_id: selectedPlant.id,
        habit_photo_url: finalHabit,
        stem_photo_url: finalStem,
        leaf_photo_url: finalLeaf,
        flower_photo_url: finalFlower,
        fruit_photo_url: finalFruit,
        seed_photo_url: finalSeed,
        document_file_url: finalDocUrl,
        document_file_name: finalDocName,
        stem_detail: stemDetail,
        leaf_detail: leafDetail,
        flower_detail: flowerDetail,
        fruit_detail: fruitDetail,
        seed_detail: seedDetail,
        local_wisdom: localWisdom,
        botanical_data: botanicalData,
        utility: utility,
        study_results: studyResults,
        recorder: recorder,
        classroom: classroom,
        checker_teacher: checkerTeacher,
        status: sheetStatus,
        comment: comment,
        is_completed: sheetStatus === 'ผ่าน',
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'k7_worksheets', docId), payload);
      setIsEditing(false);
      setUploadProgressState('');
      await loadData();
      
      // Update selected states
      setActiveWorksheet({ id: docId, ...payload });
      setHabitPhotoUrl(finalHabit);
      setStemPhotoUrl(finalStem);
      setLeafPhotoUrl(finalLeaf);
      setFlowerPhotoUrl(finalFlower);
      setFruitPhotoUrl(finalFruit);
      setSeedPhotoUrl(finalSeed);
      setDocFileUrl(finalDocUrl);
      setDocFileName(finalDocName);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกทะเบียน ก.7-003: ' + err.message);
    } finally {
      setSaving(false);
      setUploadProgressState('');
    }
  };

  const filteredPlants = plantsList.filter(p => {
    return p.thai_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           p.plant_code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getSheetStatus = (plantId) => {
    const sheet = worksheetsList.find(s => s.plant_id === plantId);
    if (!sheet) return { text: 'ยังไม่เขียนใบงาน', icon: <AlertCircle size={14} color="var(--color-danger)" />, class: 'role-visitor' };
    
    if (sheet.status === 'ผ่าน') {
      return { text: 'ผ่าน (Approved)', icon: <CheckCircle2 size={14} color="var(--color-success)" />, class: 'role-admin' };
    } else if (sheet.status === 'ต้องแก้ไข') {
      return { text: 'ต้องแก้ไข', icon: <AlertCircle size={14} color="var(--color-danger)" />, class: 'role-visitor' };
    } else {
      return { text: 'รอตรวจ', icon: <AlertCircle size={14} color="var(--color-warning)" />, class: 'role-teacher' };
    }
  };

  const renderPhotoSlot = (label, currentUrl, fileState, setFileState, uploadId, partName) => {
    return (
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', backgroundColor: 'var(--bg-card)', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
        
        {fileState ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={URL.createObjectURL(fileState)} 
              alt={label} 
              style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {fileState.name} ({(fileState.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          </div>
        ) : currentUrl ? (
          <img 
            src={currentUrl} 
            alt={label} 
            style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
          />
        ) : (
          <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ไม่มีรูปภาพ
          </div>
        )}

        {isEditing && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
            <input 
              type="file" 
              accept="image/*" 
              id={uploadId} 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setFileState(file);
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor={uploadId} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', flex: 1, display: 'block' }}>
              <Upload size={10} /> อัปโหลดรูป
            </label>
            {(fileState || currentUrl) && (
              <button
                type="button"
                onClick={() => handleGeneratePartAiDescription(partName)}
                disabled={aiPartLoading[partName]}
                className="btn btn-gold"
                style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flex: 1 }}
              >
                <Sparkles size={10} /> {aiPartLoading[partName] ? 'วิเคราะห์...' : 'เขียนด้วย AI'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              บันทึกข้อมูลและตรวจอนุมัติทะเบียน ก.7-003 รายต้น (สัณฐานวิทยาพฤกษศาสตร์)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              นักเรียนบันทึกข้อมูลสัณฐาน ราก ลำต้น ใบ ดอก ผล เมล็ดพืช พร้อม 6 รูปถ่ายพฤกษศาสตร์ และส่งให้ครูผู้สอนเพื่อตรวจสอบอนุมัติ
            </p>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Side List */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h4 className="card-title" style={{ marginBottom: '1rem' }}>รายชื่อพรรณไม้โรงเรียน</h4>
          
          <div className="search-wrapper" style={{ marginBottom: '1rem' }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาชื่อ หรือ รหัสพืช..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredPlants.map(plant => {
              const status = getSheetStatus(plant.id);
              const isSelected = selectedPlant?.id === plant.id;
              return (
                <button
                  key={plant.id}
                  onClick={() => handleSelectPlant(plant)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(186,85,211,0.03)' : 'var(--bg-card)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{plant.thai_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0' }}>{plant.plant_code}</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }} className={`role-badge ${status.class}`}>
                    {status.icon}
                    <span>{status.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Worksheet & Reviews */}
        <div>
          {selectedPlant ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รหัสพรรณไม้: {selectedPlant.plant_code}</div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    🌳 แบบบันทึก ก.7-003: {selectedPlant.thai_name}
                  </h3>
                </div>

                {['admin', 'rspg_board', 'teacher', 'project_advisor', 'student'].includes(userRole) && !isEditing && (
                  <>
                    {userRole === 'student' && sheetStatus === 'ผ่าน' ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ ใบงานผ่านการประเมินแล้ว (นักเรียนไม่สามารถแก้ไขได้)
                      </span>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Edit size={14} /> บันทึกและแก้ไขข้อมูล
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Display Teacher Correction Comments if present */}
              {comment && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #ffd54f', backgroundColor: '#fffde7', color: '#689f38', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <MessageSquare size={16} style={{ marginTop: '2px', color: '#f57f17' }} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#f57f17' }}>💬 ความเห็นให้แก้ไขจากครูผู้ตรวจ:</span>
                    <p style={{ margin: '4px 0 0 0', lineHeight: 1.4 }}>{comment}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSave}>
                {/* 6 Photos Section */}
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                  📸 อัลบั้มรูปสัณฐานพืชพฤกษศาสตร์วิชาการ 6 ด้านย่อย
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '2rem' }}>
                  {renderPhotoSlot('1. ลักษณะวิสัย (Habit)', habitPhotoUrl, habitUpload, setHabitUpload, 'up_habit', 'habit')}
                  {renderPhotoSlot('2. เปลือก/ลำต้น (Stem)', stemPhotoUrl, stemUpload, setStemUpload, 'up_stem', 'stem')}
                  {renderPhotoSlot('3. ใบพืช (Leaf)', leafPhotoUrl, leafUpload, setLeafUpload, 'up_leaf', 'leaf')}
                  {renderPhotoSlot('4. ช่อดอก (Flower)', flowerPhotoUrl, flowerUpload, setFlowerUpload, 'up_flower', 'flower')}
                  {renderPhotoSlot('5. ผลพืช (Fruit)', fruitPhotoUrl, fruitUpload, setFruitUpload, 'up_fruit', 'fruit')}
                  {renderPhotoSlot('6. เมล็ด (Seed)', seedPhotoUrl, seedUpload, setSeedUpload, 'up_seed', 'seed')}
                </div>

                {/* Analytical text fields */}
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  🔬 รายละเอียดวิเคราะห์สัณฐานพืช (ราก ลำต้น ใบ ดอก ผล เมล็ด)
                </h4>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">ลักษณะลำต้นและราก (เปลือก ยาง ผิวสัมผัส)</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={stemDetail}
                      onChange={(e) => setStemDetail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น ลำต้นมีผิวขรุขระสีน้ำตาลแกมเทา มียางสีเหลืองจางๆ ระบบรากแก้ว..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ลักษณะใบ (ประเภทใบ การเรียงตัว เส้นใบ ขอบใบ)</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={leafDetail}
                      onChange={(e) => setLeafDetail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น ใบเดี่ยวเรียงตรงข้าม รูปรี ปลายใบแหลม ขอบใบหยักละเอียด..."
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">ลักษณะช่อดอก/กลีบดอก</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={flowerDetail}
                      onChange={(e) => setFlowerDetail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น ช่อกระจุกมีกลีบเลี้ยงสีเขียวอ่อน กลีบดอกสีชมพูมีเกสรสีเหลือง..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ลักษณะผลพืช</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={fruitDetail}
                      onChange={(e) => setFruitDetail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น ผลรูปทรงรี ผิวเรียบผลดิบสีเขียวเข้ม ผลแก่สีดำอมน้ำเงิน..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ลักษณะเมล็ดพืช</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={seedDetail}
                      onChange={(e) => setSeedDetail(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น เมล็ดกลมรีสีน้ำตาลอ่อน มีเยื่อหุ้มเมล็ดบางๆ..."
                    />
                  </div>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  🌿 แหล่งที่พบ ประโยชน์ และข้อมูลภูมิปัญญาศึกษา
                </h4>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">แหล่งที่พบ (ในโรงเรียน/พิกัด)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={utility} // mapped to local utility or habitat
                      onChange={(e) => setUtility(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น สวนสมุนไพรทิศเหนือ"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ประโยชน์ / สรรพคุณพฤกษศาสตร์</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={botanicalData} // Mapped to benefits
                      onChange={(e) => setBotanicalData(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น ดอกทำสีน้ำ ลำต้นทำฟืน เปลือกแก้ท้องร่วง"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ผลการศึกษาวิจัยเพิ่มเติม</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={studyResults} 
                      onChange={(e) => setStudyResults(e.target.value)}
                      disabled={!isEditing}
                      placeholder="เช่น การสลายตัวของแป้งใบไม้ในร่ม"
                    />
                  </div>
                </div>

                {/* Document Booklet Upload Slot */}
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  📁 เล่มเอกสาร ก.7-003 ฉบับสมบูรณ์ (PDF หรือ รูปภาพ)
                </h4>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>อัปโหลดเล่มเอกสารหลักฐาน ก.7-003 รายต้น</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รองรับไฟล์ PDF หรือรูปภาพ (JPG, PNG) ขนาดไม่เกิน 10MB</div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {docFileUrl ? (
                        <a href={docFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ backgroundColor: 'rgba(46,125,50,0.1)', color: 'var(--color-success)', border: '1px solid rgba(46,125,50,0.2)', fontSize: '0.8rem', padding: '0.4rem 0.8rem', textDecoration: 'none' }}>
                          📄 ดาวน์โหลดเล่มเอกสาร ({docFileName || 'คลิกเพื่อดาวน์โหลด'})
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ยังไม่มีการอัปโหลดเล่มเอกสาร</span>
                      )}
                      
                      {isEditing && (
                        <>
                          <input 
                            type="file" 
                            accept=".pdf,image/*" 
                            id="up_document_file" 
                            onChange={handleDocFileChange}
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="up_document_file" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Upload size={14} /> เลือกไฟล์
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                  {docUpload && (
                    <div style={{ marginTop: '10px', textAlign: 'left', padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '5px' }}>
                        เตรียมอัปโหลด: {docUpload.name} ({(docUpload.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                      {docUpload.type.startsWith('image/') && (
                        <div>
                          <img 
                            src={URL.createObjectURL(docUpload)} 
                            alt="Document Preview" 
                            style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recorder Metadata & Teacher Grading Blocks */}
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  👥 ข้อมูลผู้จัดสืบค้นและผลการตรวจสอบประเมินครู
                </h4>

                <div className="grid-2" style={{ backgroundColor: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  
                  {/* Student Entry Group */}
                  <div>
                    <h5 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-primary)' }}>ผู้บันทึกทะเบียน (นักเรียน)</h5>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>ชื่อ-สกุล นักเรียนผู้รายงาน</label>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="เช่น นร.หญิง กานดา สุวรรณ"
                        value={recorder}
                        onChange={(e) => setRecorder(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>ระดับชั้น / ห้องเรียน</label>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="เช่น ม.3/2"
                        value={classroom}
                        onChange={(e) => setClassroom(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {/* Teacher Grading Group */}
                  <div>
                    <h5 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--color-gold)' }}>ประเมินการตรวจสอบหลักฐาน (ครูผู้ตรวจ)</h5>
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>ชื่อครูผู้ทำการตรวจสอบ</label>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="เช่น ครูสมเจตน์ สังข์ทอง"
                        value={checkerTeacher}
                        onChange={(e) => setCheckerTeacher(e.target.value)}
                        disabled={!isEditing || !['admin', 'rspg_board', 'teacher', 'project_advisor'].includes(userRole)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>สถานะการอนุมัติใบงาน</label>
                      <select
                        className="form-control"
                        value={sheetStatus}
                        onChange={(e) => setSheetStatus(e.target.value)}
                        disabled={!isEditing || !['admin', 'rspg_board', 'teacher', 'project_advisor'].includes(userRole)}
                      >
                        <option value="รอตรวจ">รอตรวจ (Pending Review)</option>
                        <option value="ผ่าน">ผ่าน (Approved)</option>
                        <option value="ต้องแก้ไข">ต้องแก้ไข (Needs Correction)</option>
                      </select>
                    </div>
                  </div>

                </div>

                {isEditing && ['admin', 'rspg_board', 'teacher', 'project_advisor'].includes(userRole) && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">ความคิดเห็นจากครูผู้ตรวจ (หากระบุให้แก้ไข)</label>
                    <textarea 
                      className="form-control"
                      rows="2"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="เช่น ข้อมูลลักษณะดอกยังเขียนสั้นเกินไป และภาพสเก็ตช์ใบไม้ยังเบลอ..."
                    />
                  </div>
                )}

                {uploadProgressState && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(2,136,209,0.08)', color: 'var(--color-info)', fontSize: '0.85rem' }}>
                    {uploadProgressState}
                  </div>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <Save size={14} /> บันทึกการส่งและประเมิน
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              <BookOpen size={48} style={{ marginBottom: '1rem' }} />
              <h3>กรุณาเลือกพรรณไม้จากรายการซ้ายมือ</h3>
              <p style={{ fontSize: '0.88rem' }}>เพื่อเปิดบันทึกข้อมูลสัณฐานวิทยา ก.7-003 หรือประเมินและครูผู้สอนให้คะแนน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
