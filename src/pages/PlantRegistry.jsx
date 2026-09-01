import { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured, getGeminiKey, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Search, Plus, FileSpreadsheet, Sparkles, Upload, Trash2, Edit3, X } from 'lucide-react';
import PlantCard from '../components/PlantCard';
import PlantIncident from './PlantIncident';

export default function PlantRegistry({ onSelectPlant, onPrintLabel, userRole }) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedArea, setSelectedArea] = useState('ทั้งหมด');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // Form fields
  const [plantCode, setPlantCode] = useState('');
  const [thaiName, setThaiName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [plantType, setPlantType] = useState('ไม้ต้น');
  const [plantingLocation, setPlantingLocation] = useState('');
  const [surveyor, setSurveyor] = useState('');
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isTagged, setIsTagged] = useState('มี');
  const [habit, setHabit] = useState('ไม้ต้น');
  const [status, setStatus] = useState('ตรวจสอบแล้ว');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัดตำแหน่ง (Geolocation)');
      return;
    }

    const btn = document.getElementById('btn-get-gps');
    if (btn) {
      btn.innerHTML = '⏳ กำลังระบุตำแหน่ง...';
      btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude.toFixed(6));
        setGpsLng(position.coords.longitude.toFixed(6));
        if (btn) {
          btn.innerHTML = '📍 ดึงพิกัด GPS ปัจจุบัน';
          btn.disabled = false;
        }
        alert('ดึงพิกัดตำแหน่งปัจจุบันของคุณสำเร็จแล้ว!');
      },
      (error) => {
        console.error(error);
        if (btn) {
          btn.innerHTML = '📍 ดึงพิกัด GPS ปัจจุบัน';
          btn.disabled = false;
        }

        let errMsg = 'ไม่สามารถดึงพิกัดได้';
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = 'กรุณาอนุญาตให้เว็บเข้าถึงพิกัดตำแหน่งในเบราว์เซอร์หรือสิทธิ์ GPS ก่อน';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = 'ข้อมูลตำแหน่งไม่พร้อมใช้งาน (กรุณาเปิดการทำงานของ GPS หรือเครือข่าย)';
        } else if (error.code === error.TIMEOUT) {
          errMsg = 'หมดเวลาค้นหาตำแหน่งพิกัด';
        }
        alert('เกิดข้อผิดพลาด: ' + errMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Load plants
  const fetchPlants = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'plants'), orderBy('plant_code'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlants(list);
    } catch (err) {
      console.error('Error fetching plants:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured()) {
      fetchPlants();
    } else {
      setLoading(false);
    }
  }, []);

  // Filter study locations/areas
  const uniqueLocations = Array.from(new Set(plants.map(p => p.planting_location).filter(Boolean)));

  // Handle image upload to Firebase Storage
  const handleUploadImage = async (file) => {
    try {
      const processedFile = await compressImage(file);
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `plants/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, processedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.error('Upload error:', err.message);
      alert('ไม่สามารถอัปโหลดรูปภาพได้: ' + err.message);
      return '';
    }
  };

  // AI Assistant for descriptions
  const handleGenerateAiDescription = async () => {
    if (!thaiName) {
      alert('กรุณากรอกชื่อไทยของพืชก่อนใช้ระบบ AI');
      return;
    }
    const geminiKey = getGeminiKey();
    if (!geminiKey) {
      alert('กรุณาตั้งค่า Gemini API Key ในหน้าตั้งค่าระบบก่อนใช้งาน AI');
      return;
    }

    setAiLoading(true);
    try {
      const prompt = `จงเขียนคำอธิบายลักษณะทางพฤกษศาสตร์ของพืชชื่อไทยว่า "${thaiName}" (ชื่อวิทยาศาสตร์: ${scientificName || 'ค้นหาตามความเหมาะสม'}, วงศ์: ${familyName || 'ค้นหาตามความเหมาะสม'}) ในรูปแบบบทสรุปภาษาไทยสั้นๆ ความยาวประมาณ 80-120 คำ โดยระบุลักษณะเด่น สรรพคุณทางยาหรือการใช้ประโยชน์ และคำแนะนำในการดูแลรักษาเบื้องต้นในสถานศึกษา`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error('Gemini API Error or Invalid API Key');
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        setDescription(generatedText.trim());
      } else {
        alert('ไม่สามารถรับข้อมูลจาก AI ได้ กรุณาลองอีกครั้ง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเรียก AI: ' + err.message);
    } finally {
      setAiLoading(false);
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

  const handleScanPlantWithAi = async () => {
    if (!imageFile) {
      alert('กรุณาเลือกไฟล์ภาพถ่ายพืชก่อน เพื่อให้ AI ทำการวิเคราะห์');
      return;
    }
    const geminiKey = getGeminiKey();
    if (!geminiKey) {
      alert('กรุณาตั้งค่า Gemini API Key ในหน้าตั้งค่าระบบก่อนใช้งาน AI');
      return;
    }

    setAiLoading(true);
    try {
      const base64Data = await fileToBase64(imageFile);
      const mimeType = imageFile.type || 'image/jpeg';

      const prompt = `จงระบุชนิดและสัณฐานวิทยาของพืชในภาพนี้ ให้ตอบกลับเฉพาะ JSON object ที่มีโครงสร้างดังนี้เท่านั้น โดยไม่มี markdown code blocks (ไม่มี \`\`\`json หรือ \`\`\`) หรือข้อความภายนอกใดๆ ทั้งสิ้น:
{
  "thai_name": "ชื่อสามัญภาษาไทย/ชื่อไทยของพืชที่ถูกต้อง",
  "scientific_name": "ชื่อวิทยาศาสตร์ (ทับศัพท์ Binomial name เช่น Mangifera indica)",
  "family_name": "ชื่อวงศ์พืชภาษาอังกฤษ (เช่น Anacardiaceae)",
  "habit": "เลือกจากรายการนี้เท่านั้น: ไม้ต้น, ไม้พุ่ม, ไม้ล้มลุก, ไม้เลื้อย, หญ้า, เฟิร์น, กล้วยไม้",
  "description": "คำอธิบายพฤกษศาสตร์ของพืช ลักษณะใบ ลำต้น ดอก และประโยชน์การใช้งานอย่างละเอียดแต่กระชับภาษาไทย ความยาว 80-120 คำ"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error('การเชื่อมต่อกับ Gemini API ขัดข้องหรือ API Key ไม่ถูกต้อง');
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resultText) {
        let cleanedText = resultText.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanedText);
        if (parsed.thai_name) setThaiName(parsed.thai_name);
        if (parsed.scientific_name) setScientificName(parsed.scientific_name);
        if (parsed.family_name) setFamilyName(parsed.family_name);
        if (parsed.habit) {
          setHabit(parsed.habit);
          setPlantType(parsed.habit);
        }
        if (parsed.description) setDescription(parsed.description);

        alert('AI วิเคราะห์ข้อมูลพืชและกรอกลงแบบฟอร์มสำเร็จเรียบร้อยแล้ว!');
      } else {
        alert('ไม่สามารถรับข้อมูลวิเคราะห์จาก AI ได้ กรุณาลองอัปโหลดภาพที่ชัดเจนขึ้น');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเรียก AI วิเคราะห์ภาพ: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };


  // Open Add/Edit Modal
  const openModal = (plant = null) => {
    if (plant) {
      setEditingPlant(plant);
      setPlantCode(plant.plant_code);
      setThaiName(plant.thai_name);
      setScientificName(plant.scientific_name || '');
      setFamilyName(plant.family_name || '');
      setPlantType(plant.plant_type || 'ไม้ต้น');
      setPlantingLocation(plant.planting_location || '');
      setSurveyor(plant.surveyor || '');
      setGpsLat(plant.gps_lat || '');
      setGpsLng(plant.gps_lng || '');
      setDescription(plant.description || '');
      setImageUrl(plant.image_url || '');
      setIsTagged(plant.is_tagged || 'มี');
      setHabit(plant.habit || plant.plant_type || 'ไม้ต้น');
      setStatus(plant.status || 'ตรวจสอบแล้ว');
    } else {
      setEditingPlant(null);
      // Auto-generate code base on count
      const nextNum = String(plants.length + 1).padStart(3, '0');
      setPlantCode(`7-30210-002-${nextNum}/1`);
      setThaiName('');
      setScientificName('');
      setFamilyName('');
      setPlantType('ไม้ต้น');
      setPlantingLocation('');
      setSurveyor('');
      setGpsLat('');
      setGpsLng('');
      setDescription('');
      setImageUrl('');
      setIsTagged('มี');
      setHabit('ไม้ต้น');
      setStatus(userRole === 'student' ? 'รอการตรวจสอบ' : 'ตรวจสอบแล้ว');
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  // Handle submit Add/Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await handleUploadImage(imageFile);
      }

      const plantData = {
        plant_code: plantCode,
        thai_name: thaiName,
        scientific_name: scientificName,
        family_name: familyName,
        plant_type: plantType,
        planting_location: plantingLocation,
        survey_date: new Date().toISOString().split('T')[0],
        surveyor: surveyor,
        gps_lat: gpsLat ? parseFloat(gpsLat) : null,
        gps_lng: gpsLng ? parseFloat(gpsLng) : null,
        description: description,
        image_url: finalImageUrl,
        is_tagged: isTagged,
        habit: habit,
        status: userRole === 'student' ? 'รอการตรวจสอบ' : status
      };

      if (editingPlant) {
        await setDoc(doc(db, 'plants', editingPlant.id), plantData, { merge: true });
      } else {
        await addDoc(collection(db, 'plants'), plantData);
      }

      setIsModalOpen(false);
      fetchPlants();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete plant
  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจว่าต้องการลบข้อมูลพรรณไม้นี้? ข้อมูลใบงานที่เกี่ยวข้องจะถูกลบออกด้วย')) {
      try {
        await deleteDoc(doc(db, 'plants', id));
        fetchPlants();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
      }
    }
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (plants.length === 0) return;

    const headers = ['รหัสพรรณไม้', 'ชื่อไทย', 'ชื่อวิทยาศาสตร์', 'วงศ์', 'ประเภทพืช', 'สถานที่ปลูก', 'ผู้สำรวจ', 'วันที่สำรวจ', 'พิกัด Lat', 'พิกัด Lng', 'คำอธิบาย'];

    const rows = plants.map(p => [
      p.plant_code,
      p.thai_name,
      p.scientific_name || '',
      p.family_name || '',
      p.plant_type || '',
      p.planting_location || '',
      p.surveyor || '',
      p.survey_date || '',
      p.gps_lat || '',
      p.gps_lng || '',
      `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'RSPG_Plant_Registry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Plants
  const filteredPlants = plants.filter(plant => {
    const matchesSearch =
      plant.thai_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.scientific_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.plant_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.family_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'ทั้งหมด' || plant.plant_type === selectedType;
    const matchesArea = selectedArea === 'ทั้งหมด' || plant.planting_location === selectedArea;

    return matchesSearch && matchesType && matchesArea;
  });

  return (
    <div>
      {/* Search & Filter Header */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search Inputs */}
          <div className="search-wrapper" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาชื่อไทย, ชื่อวิทยาศาสตร์, วงศ์ หรือรหัสพรรณไม้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Plant Type Dropdown */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="ทั้งหมด">ทุกประเภทพืช</option>
              <option value="ไม้ต้น">ไม้ต้น</option>
              <option value="ไม้พุ่ม">ไม้พุ่ม</option>
              <option value="ไม้ล้มลุก">ไม้ล้มลุก</option>
              <option value="ไม้เลื้อย">ไม้เลื้อย</option>
              <option value="หญ้า">หญ้า</option>
              <option value="เฟิร์น">เฟิร์น</option>
              <option value="กล้วยไม้">กล้วยไม้</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          {/* Location Area Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-control"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="ทั้งหมด">ทุกสถานที่ปลูก</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <FileSpreadsheet size={16} /> ส่งออก CSV
            </button>
            {(userRole === 'admin' || userRole === 'student') && (
              <button onClick={() => setIsIncidentModalOpen(true)} className="btn btn-secondary" style={{ backgroundColor: 'rgba(186,85,211,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(186,85,211,0.2)' }}>
                ⚠️ แจ้งเปลี่ยนสถานะพืช
              </button>
            )}
            {(userRole === 'admin' || userRole === 'student') && (
              <button onClick={() => openModal()} className="btn btn-primary">
                <Plus size={16} /> {userRole === 'student' ? 'แจ้งข้อมูลพรรณไม้ใหม่' : 'ลงทะเบียนพืชใหม่'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดึงข้อมูลพรรณไม้...</div>
      ) : filteredPlants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ไม่พบพรรณไม้ตามเงื่อนไขการค้นหา
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredPlants.map(plant => (
            <div key={plant.id} style={{ position: 'relative' }}>
              <PlantCard
                plant={plant}
                onView={onSelectPlant}
                onPrintLabel={onPrintLabel}
              />

              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 10 }}>
                {(userRole === 'admin' || userRole === 'student') && (
                  <button
                    onClick={() => openModal(plant)}
                    className="icon-btn"
                    style={{ width: '32px', height: '32px', backgroundColor: 'var(--bg-card)' }}
                    title="แก้ไขข้อมูล"
                  >
                    <Edit3 size={12} color="var(--color-primary)" />
                  </button>
                )}
                {userRole === 'admin' && (
                  <button
                    onClick={() => handleDelete(plant.id)}
                    className="icon-btn"
                    style={{ width: '32px', height: '32px', backgroundColor: 'var(--bg-card)' }}
                    title="ลบข้อมูล"
                  >
                    <Trash2 size={12} color="var(--color-danger)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {editingPlant ? 'แก้ไขข้อมูลพรรณไม้' : 'ลงทะเบียนพรรณไม้ใหม่ (ตามแนวทาง อพ.สธ.)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">รหัสพรรณไม้ อพ.สธ.</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantCode}
                    onChange={(e) => setPlantCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อไทยของพืช</label>
                  <input
                    type="text"
                    className="form-control"
                    value={thaiName}
                    onChange={(e) => setThaiName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ชื่อวิทยาศาสตร์</label>
                  <input
                    type="text"
                    className="form-control"
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">วงศ์พืช (Family)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ประเภทพืช</label>
                  <select
                    className="form-control"
                    value={plantType}
                    onChange={(e) => setPlantType(e.target.value)}
                  >
                    <option value="ไม้ต้น">ไม้ต้น (Tree)</option>
                    <option value="ไม้พุ่ม">ไม้พุ่ม (Shrub)</option>
                    <option value="ไม้ล้มลุก">ไม้ล้มลุก (Herb)</option>
                    <option value="ไม้เลื้อย">ไม้เลื้อย (Climber)</option>
                    <option value="หญ้า">หญ้า (Grass)</option>
                    <option value="เฟิร์น">เฟิร์น (Fern)</option>
                    <option value="กล้วยไม้">กล้วยไม้ (Orchid)</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ลักษณะวิสัย (Habit)</label>
                  <select
                    className="form-control"
                    value={habit}
                    onChange={(e) => setHabit(e.target.value)}
                  >
                    <option value="ไม้ต้น">ไม้ต้น</option>
                    <option value="ไม้พุ่ม">ไม้พุ่ม</option>
                    <option value="ไม้ล้มลุก">ไม้ล้มลุก</option>
                    <option value="ไม้เลื้อย">ไม้เลื้อย</option>
                    <option value="หญ้า">หญ้า</option>
                    <option value="เฟิร์น">เฟิร์น</option>
                    <option value="กล้วยไม้">กล้วยไม้</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">สถานะติดตั้งป้ายรหัสประจำต้นถาวร</label>
                  <select
                    className="form-control"
                    value={isTagged}
                    onChange={(e) => setIsTagged(e.target.value)}
                  >
                    <option value="มี">มี (ติดตั้งสมบูรณ์)</option>
                    <option value="ไม่มี">ไม่มี (รอการติดตั้ง)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">สถานที่ปลูก / บริเวณศึกษา</label>
                  <input
                    type="text"
                    className="form-control"
                    value={plantingLocation}
                    onChange={(e) => setPlantingLocation(e.target.value)}
                    placeholder="เช่น สวนสมุนไพร, ด้านหน้าตึก 1"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">สถานะการตรวจสอบข้อมูล</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={userRole !== 'admin'}
                  >
                    <option value="ตรวจสอบแล้ว">ตรวจสอบแล้ว (Approved)</option>
                    <option value="รอการตรวจสอบ">รอการตรวจสอบ (Pending Review)</option>
                  </select>
                  {userRole !== 'admin' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      *ข้อมูลของนักเรียนจะรอการตรวจสอบจากคุณครู
                    </span>
                  )}
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">ผู้สำรวจ</label>
                  <input
                    type="text"
                    className="form-control"
                    value={surveyor}
                    onChange={(e) => setSurveyor(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>พิกัด GPS (Latitude)</span>
                    <button
                      type="button"
                      id="btn-get-gps"
                      onClick={handleGetLocation}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      📍 ดึงพิกัด GPS ปัจจุบัน
                    </button>
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    placeholder="19.3554"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">พิกัด GPS (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    placeholder="98.4420"
                  />
                </div>
              </div>

              {/* Upload image file */}
              <div className="form-group">
                <label className="form-label">อัปโหลดภาพพรรณไม้</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) setImageFile(file);
                    }}
                    id="plant-file-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="plant-file-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> เลือกไฟล์รูปภาพ
                  </label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '10px' }}>
                    {imageFile ? `${imageFile.name} (${(imageFile.size / (1024 * 1024)).toFixed(2)} MB)` : imageUrl ? 'ใช้ลิงก์รูปภาพที่มีอยู่แล้ว' : 'ยังไม่ได้เลือกไฟล์'}
                  </span>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleScanPlantWithAi}
                      disabled={aiLoading}
                      className="btn btn-gold"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={12} /> {aiLoading ? 'AI กำลังวิเคราะห์...' : 'สแกนและวิเคราะห์พืชด้วย AI'}
                    </button>
                  )}
                </div>
                {imageFile && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>ตัวอย่างรูปภาพที่จะอัปโหลด:</div>
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Plant Preview"
                      style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                )}
              </div>

              {/* AI helper block */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>คำอธิบายพรรณไม้</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={aiLoading}
                    className="btn btn-gold"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <Sparkles size={12} /> {aiLoading ? 'AI กำลังเขียน...' : 'AI ช่วยเขียนคำอธิบาย'}
                  </button>
                </div>
                <textarea
                  className="form-control"
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เขียนลักษณะเด่น ประโยชน์ สรรพคุณ หรือวิเคราะห์ทางพฤกษศาสตร์..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitLoading} className="btn btn-primary">
                  {submitLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพรรณไม้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {isIncidentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIncidentModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>⚠️ บันทึกรายงานสถานะและการแจ้งเปลี่ยนพรรณไม้</h3>
              <button onClick={() => setIsIncidentModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <PlantIncident userRole={userRole} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
