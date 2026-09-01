import { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Search, Plus, FileSpreadsheet, Upload, Trash2, Edit3, X,
  MapPin, Image as ImageIcon, QrCode, FileText,
  ShieldCheck, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PlantCard from '../components/PlantCard';
import PlantIncident from './PlantIncident';
import { QRCodeSVG } from 'qrcode.react';

// Standard RSPG Uses Multi-Select Options
export const STANDARD_USES_OPTIONS = [
  { id: 'medicinal', label: '🌿 ยาสมุนไพร / การแพทย์พื้นบ้าน' },
  { id: 'food', label: '🍲 อาหาร / เครื่องดื่ม / พืชผัก' },
  { id: 'timber', label: '🪵 ไม้ใช้สอย / ก่อสร้าง / เครื่องเรือน' },
  { id: 'ornamental', label: '🌸 ไม้ประดับ / ให้ร่มเงา / ปรับภูมิทัศน์' },
  { id: 'ritual', label: '🕯️ พิธีกรรม / ประเพณี / ความเชื่อ' },
  { id: 'craft', label: '🧵 หัตถกรรม / สีย้อมธรรมชาติ / เส้นใย' },
  { id: 'other', label: '💡 อื่นๆ (ระบุในหมายเหตุ)' }
];

// Botanical Part Categories
export const BOTANICAL_CATEGORIES = [
  { key: 'habit', label: '1. วิสัย / ทรงต้น (Habit)', icon: '🌳', placeholder: 'เช่น ไม้ต้นผลัดใบ สูง 10-15 เมตร ทรงพุ่มกลมทึบ...' },
  { key: 'stem', label: '2. ลำต้นและเปลือก (Stem & Bark)', icon: '🪵', placeholder: 'เช่น เปลือกต้นสีเทาอมน้ำตาล แตกเป็นร่องตื้นตามยาว...' },
  { key: 'leaf', label: '3. ลักษณะใบ (Leaves)', icon: '🍃', placeholder: 'เช่น ใบประกอบแบบขนนกปลายคู่ เรียงสลับ แผ่นใบรูปไข่...' },
  { key: 'flower', label: '4. ลักษณะดอก (Flowers)', icon: '🌸', placeholder: 'เช่น ดอกช่อกระจะออกตามซอกใบ กลีบดอกสีชมพูอ่อนถึงขาว...' },
  { key: 'fruit', label: '5. ผลและเมล็ด (Fruits & Seeds)', icon: '🌰', placeholder: 'เช่น ผลเป็นฝักทรงกระบอกยาว 30-40 ซม. เมล็ดแบนรูปไข่...' },
  { key: 'drawing', label: '6. ภาพวาดพฤกษศาสตร์ (ก.7-003 Drawing)', icon: '🎨', placeholder: 'ภาพวาดลายเส้นแสดงส่วนประกอบครบถ้วนตามแบบ ก.7-003' }
];

// Interactive School Zones
export const SCHOOL_ZONES = [
  { id: 'Zone A', name: 'โซน A: สวนพฤกษศาสตร์หน้าอาคาร 1', color: '#5C1D8D', x: 25, y: 30 },
  { id: 'Zone B', name: 'โซน B: สวนหย่อมเรือนเพาะชำ', color: '#1E6B37', x: 70, y: 35 },
  { id: 'Zone C', name: 'โซน C: แปลงเกษตรและพืชสมุนไพร', color: '#C5931C', x: 30, y: 75 },
  { id: 'Zone D', name: 'โซน D: ลานพรรณไม้ทรงปลูกหน้าหอประชุม', color: '#1565C0', x: 75, y: 75 },
  { id: 'Zone E', name: 'โซน E: แนวรั้วรอบโรงเรียนและพืชริมทาง', color: '#7B1FA2', x: 50, y: 15 },
  { id: 'Zone F', name: 'โซน F: พื้นที่อนุรักษ์ป่าธรรมชาติหลังโรงเรียน', color: '#00695C', x: 50, y: 90 }
];

export default function PlantRegistry({ onSelectPlant, onPrintLabel, userRole }) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedArea, setSelectedArea] = useState('ทั้งหมด');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [modalTab, setModalTab] = useState('page1'); // 'page1' | 'page2to7' | 'page8' | 'location'
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isTagPreviewOpen, setIsTagPreviewOpen] = useState(false);
  const [selectedTagPlant, setSelectedTagPlant] = useState(null);

  // Form fields: Page 1 Local Info
  const [plantCode, setPlantCode] = useState('');
  const [thaiName, setThaiName] = useState('');
  const [localUses, setLocalUses] = useState([]);
  const [localLocation, setLocalLocation] = useState('');
  const [informantName, setInformantName] = useState('');
  const [status, setStatus] = useState('draft'); // 'draft' | 'pending_review' | 'approved'

  // Form fields: Pages 2-7 Botanical morphology descriptions & category media
  const [categoryTexts, setCategoryTexts] = useState({
    habit: '',
    stem: '',
    leaf: '',
    flower: '',
    fruit: '',
    drawing: ''
  });
  const [categoryMedia, setCategoryMedia] = useState({
    habit: '',
    stem: '',
    leaf: '',
    flower: '',
    fruit: '',
    drawing: ''
  });
  const [uploadingCategory, setUploadingCategory] = useState(null);

  // Form fields: Pages 8-10 Scientific Comparison & References
  const [scientificName, setScientificName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [plantType, setPlantType] = useState('ไม้ต้น');
  const [matchStatus, setMatchStatus] = useState('ตรงกับเอกสารอ้างอิงทั้งหมด');
  const [referenceSources, setReferenceSources] = useState('ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์ ฉบับแก้ไขเพิ่มเติม พ.ศ. 2557)');
  const [herbariumNumber, setHerbariumNumber] = useState('');
  const [description, setDescription] = useState('');

  // Form fields: Location & Pinning
  const [plantingLocation, setPlantingLocation] = useState('Zone A');
  const [surveyor, setSurveyor] = useState('');
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [pinCoordinates, setPinCoordinates] = useState({ x: 25, y: 30 });
  const [isTagged, setIsTagged] = useState('มี');

  const [submitLoading, setSubmitLoading] = useState(false);

  // GPS Location getter
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
          btn.innerHTML = '📍 ดึงพิกัด GPS สำเร็จ';
          btn.disabled = false;
        }
      },
      (error) => {
        console.error(error);
        if (btn) {
          btn.innerHTML = '📍 ดึงพิกัด GPS ปัจจุบัน';
          btn.disabled = false;
        }
        alert('เกิดข้อผิดพลาดในการดึงพิกัด GPS: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  // Handle single category image upload
  const handleUploadCategoryImage = async (categoryKey, file) => {
    if (!file || !storage) return;
    setUploadingCategory(categoryKey);
    try {
      const processedFile = await compressImage(file);
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `plants/${categoryKey}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, processedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setCategoryMedia(prev => ({ ...prev, [categoryKey]: downloadUrl }));
    } catch (err) {
      console.error('Upload error:', err.message);
      alert(`ไม่สามารถอัปโหลดรูปภาพส่วน ${categoryKey} ได้: ` + err.message);
    } finally {
      setUploadingCategory(null);
    }
  };

  // Toggle local uses checkboxes
  const handleToggleUse = (useId) => {
    setLocalUses(prev =>
      prev.includes(useId) ? prev.filter(id => id !== useId) : [...prev, useId]
    );
  };

  // Click on SVG Map to place pin
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPinCoordinates({ x, y });

    let nearest = SCHOOL_ZONES[0];
    let minDist = 99999;
    SCHOOL_ZONES.forEach(z => {
      const dist = Math.hypot(z.x - x, z.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = z;
      }
    });
    setPlantingLocation(nearest.id);
  };

  // Open Add/Edit Modal
  const openModal = (plant = null) => {
    if (plant) {
      setEditingPlant(plant);
      setPlantCode(plant.plant_code || '');
      setThaiName(plant.thai_name || plant.local_name || '');
      setLocalUses(Array.isArray(plant.local_uses) ? plant.local_uses : []);
      setLocalLocation(plant.local_location || '');
      setInformantName(plant.informant_name || '');
      setStatus(plant.status || 'draft');

      setCategoryTexts({
        habit: plant.morphology?.habit || plant.habit || '',
        stem: plant.morphology?.stem || '',
        leaf: plant.morphology?.leaf || '',
        flower: plant.morphology?.flower || '',
        fruit: plant.morphology?.fruit || '',
        drawing: plant.morphology?.drawing || ''
      });

      setCategoryMedia({
        habit: plant.media_categories?.habit || plant.image_url || '',
        stem: plant.media_categories?.stem || '',
        leaf: plant.media_categories?.leaf || '',
        flower: plant.media_categories?.flower || '',
        fruit: plant.media_categories?.fruit || '',
        drawing: plant.media_categories?.drawing || ''
      });

      setScientificName(plant.scientific_name || '');
      setFamilyName(plant.family_name || '');
      setCommonName(plant.common_name || '');
      setPlantType(plant.plant_type || 'ไม้ต้น');
      setMatchStatus(plant.match_status || 'ตรงกับเอกสารอ้างอิงทั้งหมด');
      setReferenceSources(plant.reference_sources || 'ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์ ฉบับแก้ไขเพิ่มเติม พ.ศ. 2557)');
      setHerbariumNumber(plant.herbarium_number || '');
      setDescription(plant.description || '');

      setPlantingLocation(plant.planting_location || 'Zone A');
      setSurveyor(plant.surveyor || '');
      setGpsLat(plant.gps_lat || '');
      setGpsLng(plant.gps_lng || '');
      setPinCoordinates(plant.pin_coordinates || { x: 25, y: 30 });
      setIsTagged(plant.is_tagged || 'มี');
    } else {
      setEditingPlant(null);
      const nextNum = String(plants.length + 1).padStart(3, '0');
      setPlantCode(`7-50300-001-${nextNum}`);
      setThaiName('');
      setLocalUses(['medicinal', 'ornamental']);
      setLocalLocation('บริเวณโรงเรียนปายวิทยาคาร');
      setInformantName('');
      setStatus('draft');

      setCategoryTexts({
        habit: '',
        stem: '',
        leaf: '',
        flower: '',
        fruit: '',
        drawing: ''
      });

      setCategoryMedia({
        habit: '',
        stem: '',
        leaf: '',
        flower: '',
        fruit: '',
        drawing: ''
      });

      setScientificName('');
      setFamilyName('');
      setCommonName('');
      setPlantType('ไม้ต้น');
      setMatchStatus('ตรงกับเอกสารอ้างอิงทั้งหมด');
      setReferenceSources('ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์ ฉบับแก้ไขเพิ่มเติม พ.ศ. 2557)');
      setHerbariumNumber('');
      setDescription('');

      setPlantingLocation('Zone A');
      setSurveyor('');
      setGpsLat('19.355400');
      setGpsLng('98.442000');
      setPinCoordinates({ x: 25, y: 30 });
      setIsTagged('มี');
    }

    setModalTab('page1');
    setIsModalOpen(true);
  };

  // Submit Add / Edit Plant
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!plantCode.trim()) {
      alert('กรุณาระบุรหัสพรรณไม้ (Plant Code) ให้เรียบร้อยก่อน');
      setModalTab('page1');
      return;
    }
    if (!thaiName.trim()) {
      alert('กรุณาระบุชื่อพื้นเมือง/ชื่อไทย (Local Name) ให้เรียบร้อยก่อน');
      setModalTab('page1');
      return;
    }

    setSubmitLoading(true);
    try {
      const mediaList = [];
      Object.entries(categoryMedia).forEach(([cat, url]) => {
        if (url) {
          mediaList.push({
            category: cat,
            url: url,
            caption: categoryTexts[cat] || `ภาพ${cat}ของ ${thaiName}`,
            uploadedAt: new Date().toISOString()
          });
        }
      });

      const plantData = {
        plant_code: plantCode.trim(),
        thai_name: thaiName.trim(),
        local_name: thaiName.trim(),
        local_uses: localUses,
        local_location: localLocation,
        informant_name: informantName,
        status: status,

        // Pages 2-7 Morphology
        morphology: categoryTexts,
        habit: categoryTexts.habit || plantType,
        media_categories: categoryMedia,
        media: mediaList,
        image_url: categoryMedia.habit || categoryMedia.flower || categoryMedia.leaf || '',

        // Pages 8-10 Scientific info
        scientific_name: scientificName.trim(),
        family_name: familyName.trim(),
        common_name: commonName.trim(),
        plant_type: plantType,
        match_status: matchStatus,
        reference_sources: referenceSources,
        herbarium_number: herbariumNumber,
        description: description || categoryTexts.habit,

        // Location & Tagging
        planting_location: plantingLocation,
        survey_date: new Date().toISOString().split('T')[0],
        surveyor: surveyor || 'คณะทำงาน อพ.สธ.',
        gps_lat: gpsLat ? parseFloat(gpsLat) : null,
        gps_lng: gpsLng ? parseFloat(gpsLng) : null,
        pin_coordinates: pinCoordinates,
        is_tagged: isTagged,
        updated_at: new Date().toISOString()
      };

      if (editingPlant) {
        await setDoc(doc(db, 'plants', editingPlant.id), plantData, { merge: true });
      } else {
        plantData.created_at = new Date().toISOString();
        await addDoc(collection(db, 'plants'), plantData);
      }

      setIsModalOpen(false);
      fetchPlants();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete plant
  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจว่าต้องการลบข้อมูลพรรณไม้นี้ออกจากทะเบียน?')) {
      try {
        await deleteDoc(doc(db, 'plants', id));
        fetchPlants();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
      }
    }
  };

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    if (plants.length === 0) {
      alert('ไม่พบข้อมูลพรรณไม้สำหรับส่งออก');
      return;
    }

    const excelData = plants.map((p, index) => {
      const usesLabel = (p.local_uses || [])
        .map(uId => {
          const opt = STANDARD_USES_OPTIONS.find(o => o.id === uId);
          return opt ? opt.label.replace(/^[^\s]+\s/, '') : uId;
        })
        .join(', ');

      return {
        'ลำดับ': index + 1,
        'รหัสพรรณไม้': p.plant_code || '',
        'ชื่อพื้นเมือง / ชื่อไทย': p.thai_name || p.local_name || '',
        'ชื่อวิทยาศาสตร์': p.scientific_name || '-',
        'ชื่อวงศ์ (Family)': p.family_name || '-',
        'ชื่อสามัญ (Common Name)': p.common_name || '-',
        'วิสัยพืช (Habit)': p.habit || p.plant_type || '-',
        'การใช้ประโยชน์พื้นบ้าน (Uses)': usesLabel || 'ไม่ระบุ',
        'สถานที่ปลูก / โซน': p.planting_location || '-',
        'พิกัด GPS': (p.gps_lat && p.gps_lng) ? `${p.gps_lat}, ${p.gps_lng}` : '-',
        'สถานะเทียบเคียง (หน้า 8)': p.match_status || 'ตรงกับเอกสารอ้างอิงทั้งหมด',
        'สถานะข้อมูล': p.status === 'draft' ? 'ฉบับร่าง (Draft)' : p.status === 'pending_review' ? 'รอตรวจสอบ' : 'อนุมัติแล้ว',
        'ผู้สำรวจ': p.surveyor || '-',
        'วันที่สำรวจ': p.survey_date || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const columnWidths = [
      { wch: 6 },
      { wch: 18 },
      { wch: 22 },
      { wch: 26 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 35 },
      { wch: 20 },
      { wch: 22 },
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 }
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ทะเบียนพรรณไม้_อพ.สธ.');
    XLSX.writeFile(workbook, `RSPG_Plant_Registry_PWTK_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filtered Plants
  const filteredPlants = plants.filter(plant => {
    const matchesSearch =
      (plant.thai_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.scientific_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.plant_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.family_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'ทั้งหมด' || plant.plant_type === selectedType || plant.habit === selectedType;
    const matchesArea = selectedArea === 'ทั้งหมด' || plant.planting_location === selectedArea;

    return matchesSearch && matchesType && matchesArea;
  });

  return (
    <div>
      {/* Search & Actions Header Card */}
      <div className="card glass-panel" style={{ marginBottom: '1.75rem', border: '1.5px solid #E5CA79' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShieldCheck size={22} color="#5C1D8D" />
              ทะเบียนพรรณไม้ (ก.7-003 & สารระบบงานพฤกษศาสตร์)
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#584F66', margin: '4px 0 0 0' }}>
              ระบบบันทึกข้อมูลพื้นบ้าน (หน้า 1), ลักษณะพฤกษศาสตร์ (หน้า 2-7), เปรียบเทียบข้อมูล (หน้า 8), และผังพิกัดพรรณไม้
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportExcel}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', padding: '8px 14px', backgroundColor: '#EAF7ED', color: '#1E6B37', border: '1px solid #B8E5C4' }}
            >
              <FileSpreadsheet size={16} color="#1E6B37" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>

            {userRole !== 'visitor' && (
              <button
                onClick={() => openModal()}
                className="btn btn-gold"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', padding: '8px 16px' }}
              >
                <Plus size={16} />
                <span>เพิ่มพรรณไม้ใหม่ (ก.7-003)</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1, minWidth: '240px', marginBottom: 0 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="🔍 ค้นหาด้วยชื่อไทย, ชื่อวิทยาศาสตร์, วงศ์ หรือรหัสพรรณไม้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.86rem', padding: '8px 12px 8px 36px' }}
            />
          </div>

          <div style={{ minWidth: '140px' }}>
            <select
              className="form-control"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ fontSize: '0.84rem', padding: '7px 10px' }}
            >
              <option value="ทั้งหมด">ทุกวิสัยพืช</option>
              <option value="ไม้ต้น">ไม้ต้น</option>
              <option value="ไม้พุ่ม">ไม้พุ่ม</option>
              <option value="ไม้ล้มลุก">ไม้ล้มลุก</option>
              <option value="ไม้เลื้อย">ไม้เลื้อย</option>
              <option value="หญ้า">หญ้า</option>
              <option value="เฟิร์น">เฟิร์น</option>
              <option value="กล้วยไม้">กล้วยไม้</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-control"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={{ fontSize: '0.84rem', padding: '7px 10px' }}
            >
              <option value="ทั้งหมด">ทุกโซน / ผังพรรณไม้</option>
              {SCHOOL_ZONES.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Plants Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#5C1D8D' }}>กำลังดาวน์โหลดข้อมูลทะเบียนพรรณไม้...</div>
      ) : filteredPlants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#827891' }}>
          ไม่พบรายการพรรณไม้ที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
        <div className="grid-3">
          {filteredPlants.map(plant => (
            <div key={plant.id} style={{ position: 'relative' }}>
              <PlantCard
                plant={plant}
                onSelect={(p) => {
                  if (onSelectPlant) onSelectPlant(p);
                  else openModal(p);
                }}
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                gap: '6px',
                zIndex: 10
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTagPlant(plant);
                    setIsTagPreviewOpen(true);
                  }}
                  className="icon-btn"
                  title="ดูตัวอย่างและสั่งพิมพ์ป้ายชื่อพรรณไม้"
                  style={{ width: '28px', height: '28px', backgroundColor: '#FDF6E2', border: '1px solid #ECC85B' }}
                >
                  <QrCode size={13} color="#C5931C" />
                </button>

                {userRole !== 'visitor' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(plant);
                      }}
                      className="icon-btn"
                      title="แก้ไขข้อมูลพรรณไม้"
                      style={{ width: '28px', height: '28px', backgroundColor: '#F6EEFB', border: '1px solid #E5D0F5' }}
                    >
                      <Edit3 size={13} color="#5C1D8D" />
                    </button>
                    {userRole === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plant.id);
                        }}
                        className="icon-btn"
                        title="ลบพรรณไม้"
                        style={{ width: '28px', height: '28px', backgroundColor: '#FFF5F5', border: '1px solid #F5C2C2' }}
                      >
                        <Trash2 size={13} color="#D32F2F" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4-STEP WIZARD MODAL: RSPG PLANT REGISTRY & MORPHOLOGY */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '880px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px', border: '1.5px solid #E5CA79', padding: '24px' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #E8DEEE', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="#5C1D8D" />
                  {editingPlant ? `แก้ไขข้อมูลพรรณไม้: ${thaiName || plantCode}` : 'บันทึกพรรณไม้ใหม่ (แบบ ก.7-003)'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#827891' }}>
                  มาตรฐานงานสวนพฤกษศาสตร์โรงเรียน อพ.สธ.
                </span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Sub-Tabs */}
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              backgroundColor: '#FAF8FC',
              borderRadius: '10px',
              border: '1px solid #E8DEEE',
              marginBottom: '1.5rem',
              overflowX: 'auto'
            }}>
              {[
                { id: 'page1', label: '1. ข้อมูลพื้นบ้าน (หน้า 1)', icon: FileText },
                { id: 'page2to7', label: '2. สัณฐานวิทยา & ภาพหมวดหมู่ (หน้า 2-7)', icon: ImageIcon },
                { id: 'page8', label: '3. เทียบเคียงชื่อวิทยาศาสตร์ (หน้า 8-10)', icon: FileText },
                { id: 'location', label: '4. ผังพิกัด & ปักหมุดแผนที่', icon: MapPin }
              ].map(t => {
                const isCurrent = modalTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalTab(t.id)}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: isCurrent ? '1.5px solid #ECC85B' : '1px solid transparent',
                      background: isCurrent ? 'linear-gradient(135deg, #2A084E 0%, #5C1D8D 100%)' : 'transparent',
                      color: isCurrent ? '#FFFFFF' : '#4A3E56',
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={14} color={isCurrent ? '#ECC85B' : '#5C1D8D'} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              {/* TAB 1: PAGE 1 LOCAL INFO */}
              {modalTab === 'page1' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                        รหัสพรรณไม้ (Plant Code) <span style={{ color: '#D32F2F' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={plantCode}
                        onChange={(e) => setPlantCode(e.target.value)}
                        placeholder="เช่น 7-50300-001-001"
                        required
                        style={{ fontWeight: 700, color: '#5C1D8D' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#827891', marginTop: '2px', display: 'block' }}>
                        รูปแบบมาตรฐาน: 7-รหัสโรงเรียน-ลำดับพื้นที่-ลำดับต้น
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                        ชื่อพื้นเมือง / ชื่อท้องถิ่น (Local Name) <span style={{ color: '#D32F2F' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={thaiName}
                        onChange={(e) => setThaiName(e.target.value)}
                        placeholder="เช่น กัลปพฤกษ์, ชวนชม, มะม่วงป่า"
                        required
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* Multi-Select Uses Checkboxes (RSPG Page 1) */}
                  <div className="form-group" style={{ marginBottom: '1.25rem', padding: '14px', backgroundColor: '#FAF8FC', borderRadius: '10px', border: '1px solid #E8DEEE' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#2A084E', marginBottom: '8px' }}>
                      การใช้ประโยชน์พื้นบ้าน (Local Uses — เลือกได้หลายข้อ)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {STANDARD_USES_OPTIONS.map(opt => {
                        const checked = localUses.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: checked ? '#F6EEFB' : '#FFFFFF',
                              border: checked ? '1.5px solid #C5931C' : '1px solid #E8DEEE',
                              fontSize: '0.82rem',
                              fontWeight: checked ? 700 : 500,
                              color: checked ? '#5C1D8D' : '#4A3E56',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleUse(opt.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ถิ่นอาศัย / บริเวณที่พบในท้องถิ่น</label>
                      <input
                        type="text"
                        className="form-control"
                        value={localLocation}
                        onChange={(e) => setLocalLocation(e.target.value)}
                        placeholder="เช่น ริมลำห้วยปาย, ป่าเบญจพรรณเชิงเขา, ในชุมชน"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ผู้ให้ข้อมูล / ปราชญ์ชาวบ้าน</label>
                      <input
                        type="text"
                        className="form-control"
                        value={informantName}
                        onChange={(e) => setInformantName(e.target.value)}
                        placeholder="เช่น พ่อหลวงสมควร, แม่เฒ่าคำใส, คณะครู"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>สถานะเอกสารพรรณไม้</label>
                    <select
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ fontWeight: 700, color: status === 'draft' ? '#94690A' : '#1E6B37' }}
                    >
                      <option value="draft">📝 ฉบับร่าง (Draft) — กำลังจัดทำข้อมูล</option>
                      <option value="pending_review">⏳ รอการตรวจสอบความถูกต้อง (Pending Review)</option>
                      <option value="approved">✅ ตรวจสอบและอนุมัติแล้ว (Approved)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: PAGES 2-7 MORPHOLOGY & CATEGORY-BOUND MEDIA */}
              {modalTab === 'page2to7' && (
                <div>
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#F6EEFB',
                    borderLeft: '4px solid #5C1D8D',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    color: '#5C1D8D',
                    marginBottom: '1.25rem'
                  }}>
                    💡 <strong>คำแนะนำ:</strong> กรอกคำอธิบายและอัปโหลดรูปภาพแยกตามหมวดหมู่โครงสร้างพืช (Habit, Stem, Leaf, Flower, Fruit, Drawing) ภาพถ่ายจะถูกผูกเข้ากับหมวดหมู่นั้นทันที
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {BOTANICAL_CATEGORIES.map(cat => {
                      const isUploading = uploadingCategory === cat.key;
                      const currentMediaUrl = categoryMedia[cat.key];

                      return (
                        <div
                          key={cat.key}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1px solid #E8DEEE',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2A084E' }}>
                              {cat.icon} {cat.label}
                            </span>
                            {currentMediaUrl && (
                              <span style={{ fontSize: '0.74rem', color: '#1E6B37', fontWeight: 600 }}>
                                ✓ แนบภาพแล้ว
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
                            <textarea
                              className="form-control"
                              rows="2"
                              value={categoryTexts[cat.key]}
                              onChange={(e) => setCategoryTexts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                              placeholder={cat.placeholder}
                              style={{ fontSize: '0.82rem' }}
                            ></textarea>

                            <div style={{
                              border: '1.5px dashed #E5CA79',
                              borderRadius: '8px',
                              padding: '8px',
                              backgroundColor: '#FAF8FC',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              minHeight: '80px'
                            }}>
                              {currentMediaUrl ? (
                                <div style={{ width: '100%', position: 'relative' }}>
                                  <img
                                    src={currentMediaUrl}
                                    alt={cat.label}
                                    style={{ width: '100%', height: '65px', objectFit: 'cover', borderRadius: '4px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCategoryMedia(prev => ({ ...prev, [cat.key]: '' }))}
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      background: 'rgba(217, 74, 74, 0.9)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '18px',
                                      height: '18px',
                                      fontSize: '10px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="file"
                                    id={`upload-${cat.key}`}
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleUploadCategoryImage(cat.key, e.target.files[0]);
                                      }
                                    }}
                                    style={{ display: 'none' }}
                                  />
                                  <label
                                    htmlFor={`upload-${cat.key}`}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Upload size={12} /> {isUploading ? 'กำลังอัปโหลด...' : 'แนบภาพส่วนนี้'}
                                  </label>
                                  <span style={{ fontSize: '0.7rem', color: '#827891', marginTop: '4px' }}>
                                    หมวด {cat.key}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: PAGES 8-10 SCIENTIFIC COMPARISON */}
              {modalTab === 'page8' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        ชื่อวิทยาศาสตร์ (Scientific Name / Binomial Name)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={scientificName}
                        onChange={(e) => setScientificName(e.target.value)}
                        placeholder="เช่น Cassia bakeriana Craib"
                        style={{ fontStyle: 'italic', fontWeight: 600 }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        ชื่อวงศ์ (Family Name)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="เช่น FABACEAE (LEGUMINOSAE)"
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">ชื่อสามัญ (Common Name)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={commonName}
                        onChange={(e) => setCommonName(e.target.value)}
                        placeholder="เช่น Pink Shower, Wishing Tree"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">วิสัยพืช (Habit)</label>
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
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#5C1D8D' }}>
                      สถานะการเปรียบเทียบข้อมูลพรรณไม้ (Match Status)
                    </label>
                    <select
                      className="form-control"
                      value={matchStatus}
                      onChange={(e) => setMatchStatus(e.target.value)}
                      style={{ fontWeight: 700, color: matchStatus.includes('100%') || matchStatus.includes('ทั้งหมด') ? '#1E6B37' : '#C5931C' }}
                    >
                      <option value="ตรงกับเอกสารอ้างอิงทั้งหมด">✅ ตรงกับเอกสารอ้างอิงทั้งหมด (100% Verified Match)</option>
                      <option value="ตรงบางส่วน / อยู่ระหว่างเทียบเคียง">⚠️ ตรงบางส่วน / อยู่ระหว่างเทียบเคียง (Partial Match)</option>
                      <option value="ยังไม่พบข้อมูลในฐานอ้างอิง">❓ ยังไม่พบข้อมูลในฐานอ้างอิง (Under Research)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">เอกสารและแหล่งอ้างอิง</label>
                      <input
                        type="text"
                        className="form-control"
                        value={referenceSources}
                        onChange={(e) => setReferenceSources(e.target.value)}
                        placeholder="ชื่อหนังสือ เล่มที่ หน้า หรือฐานข้อมูลพรรณไม้อ้างอิง"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">หมายเลขตัวอย่างพรรณไม้แห้ง (Herbarium Voucher)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={herbariumNumber}
                        onChange={(e) => setHerbariumNumber(e.target.value)}
                        placeholder="เช่น PWTK-BOT-2569-001"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: INTERACTIVE MAP & LOCATION PINNING */}
              {modalTab === 'location' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                      🗺️ แผนผังพิกัดพรรณไม้ในโรงเรียน (คลิกบนผังเพื่อปักหมุดตำแหน่งพรรณไม้)
                    </label>
                    <div
                      onClick={handleMapClick}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '240px',
                        backgroundColor: '#E8F5E9',
                        borderRadius: '12px',
                        border: '2px solid #81C784',
                        cursor: 'crosshair',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.06)'
                      }}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect x="10" y="10" width="30" height="35" fill="#E1BEE7" stroke="#8E24AA" strokeWidth="0.5" rx="2" />
                        <text x="25" y="28" fontSize="3" fill="#4A148C" textAnchor="middle" fontWeight="bold">อาคาร 1 (Zone A)</text>

                        <rect x="55" y="10" width="35" height="35" fill="#C8E6C9" stroke="#388E3C" strokeWidth="0.5" rx="2" />
                        <text x="72" y="28" fontSize="3" fill="#1B5E20" textAnchor="middle" fontWeight="bold">เรือนเพาะชำ (Zone B)</text>

                        <rect x="10" y="55" width="35" height="35" fill="#FFF9C4" stroke="#FBC02D" strokeWidth="0.5" rx="2" />
                        <text x="27" y="73" fontSize="3" fill="#F57F17" textAnchor="middle" fontWeight="bold">แปลงเกษตร (Zone C)</text>

                        <rect x="55" y="55" width="35" height="35" fill="#BBDEFB" stroke="#1976D2" strokeWidth="0.5" rx="2" />
                        <text x="72" y="73" fontSize="3" fill="#0D47A1" textAnchor="middle" fontWeight="bold">หอประชุม (Zone D)</text>

                        <line x1="0" y1="50" x2="100" y2="50" stroke="#FFF" strokeWidth="2.5" strokeDasharray="2,1" />
                        <line x1="47" y1="0" x2="47" y2="100" stroke="#FFF" strokeWidth="2.5" strokeDasharray="2,1" />
                      </svg>

                      <div
                        style={{
                          position: 'absolute',
                          left: `${pinCoordinates.x}%`,
                          top: `${pinCoordinates.y}%`,
                          transform: 'translate(-50%, -100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        <div style={{
                          backgroundColor: '#5C1D8D',
                          color: '#ECC85B',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}>
                          📍 {thaiName || plantCode || 'ตำแหน่งที่ปัก'}
                        </div>
                        <div style={{ width: '4px', height: '8px', backgroundColor: '#5C1D8D' }}></div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#584F66', marginTop: '4px', display: 'block' }}>
                      *พิกัดผัง: X={pinCoordinates.x}%, Y={pinCoordinates.y}% (โซนที่กำหนด: <strong>{plantingLocation}</strong>)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">โซนผังพรรณไม้</label>
                      <select
                        className="form-control"
                        value={plantingLocation}
                        onChange={(e) => setPlantingLocation(e.target.value)}
                        style={{ fontWeight: 600 }}
                      >
                        {SCHOOL_ZONES.map(z => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">ผู้สำรวจ / บันทึกข้อมูล</label>
                      <input
                        type="text"
                        className="form-control"
                        value={surveyor}
                        onChange={(e) => setSurveyor(e.target.value)}
                        placeholder="เช่น ครูเจนประภา เรือนคำ, นักเรียนแกนนำ"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>พิกัด GPS ละติจูด (Lat)</span>
                        <button
                          type="button"
                          id="btn-get-gps"
                          onClick={handleGetLocation}
                          style={{ background: 'none', border: 'none', color: '#5C1D8D', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          📍 ดึง GPS ปัจจุบัน
                        </button>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={gpsLat}
                        onChange={(e) => setGpsLat(e.target.value)}
                        placeholder="19.355400"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">พิกัด GPS ลองจิจูด (Lng)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={gpsLng}
                        onChange={(e) => setGpsLng(e.target.value)}
                        placeholder="98.442000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #E8DEEE',
                paddingTop: '16px',
                marginTop: '20px'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {modalTab !== 'page1' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'page2to7') setModalTab('page1');
                        else if (modalTab === 'page8') setModalTab('page2to7');
                        else if (modalTab === 'location') setModalTab('page8');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.84rem' }}
                    >
                      ย้อนกลับ
                    </button>
                  )}
                  {modalTab !== 'location' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'page1') setModalTab('page2to7');
                        else if (modalTab === 'page2to7') setModalTab('page8');
                        else if (modalTab === 'page8') setModalTab('location');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.84rem' }}
                    >
                      ถัดไป ➔
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={submitLoading} className="btn btn-gold">
                    {submitLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพรรณไม้'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY COMPLETE PLANT TAG PREVIEW & APPROVE MODAL */}
      {isTagPreviewOpen && selectedTagPlant && (
        <div className="modal-overlay" onClick={() => setIsTagPreviewOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', borderRadius: '16px', border: '2px solid #E5CA79', padding: '24px', backgroundColor: '#FFFFFF' }}
          >
            <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #E8DEEE', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2A084E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} color="#C5931C" />
                ตัวอย่างป้ายชื่อพรรณไม้สมบูรณ์ (ก.7-003)
              </h3>
              <button onClick={() => setIsTagPreviewOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div style={{
              border: '2px solid #5C1D8D',
              borderRadius: '12px',
              padding: '18px',
              backgroundColor: '#FAF7FC',
              boxShadow: '0 4px 16px rgba(42, 8, 78, 0.08)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #ECC85B', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="./rspg-logo.png" alt="อพ.สธ." style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#5C1D8D', lineHeight: 1.1 }}>สวนพฤกษศาสตร์โรงเรียน</div>
                    <div style={{ fontSize: '10px', color: '#827891' }}>โรงเรียนปายวิทยาคาร อพ.สธ.</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#5C1D8D' }}>{selectedTagPlant.plant_code}</div>
                  <div style={{ fontSize: '10px', color: '#C5931C' }}>{selectedTagPlant.planting_location || 'Zone A'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1F1929', marginBottom: '4px' }}>
                    {selectedTagPlant.thai_name || selectedTagPlant.local_name}
                  </div>
                  <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#5C1D8D', fontWeight: 600, marginBottom: '4px' }}>
                    {selectedTagPlant.scientific_name || 'ยังไม่ระบุชื่อวิทยาศาสตร์'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#584F66', marginBottom: '2px' }}>
                    <strong>วงศ์:</strong> {selectedTagPlant.family_name || '-'}
                  </div>
                  {selectedTagPlant.common_name && (
                    <div style={{ fontSize: '11px', color: '#827891' }}>
                      <strong>ชื่อสามัญ:</strong> {selectedTagPlant.common_name}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '8px', border: '1px solid #E8DEEE' }}>
                  <QRCodeSVG
                    value={`https://rspg-school-garden.web.app/#/plant/${selectedTagPlant.plant_code || selectedTagPlant.id}`}
                    size={76}
                    level="M"
                  />
                  <span style={{ fontSize: '8px', color: '#5C1D8D', fontWeight: 700, marginTop: '2px' }}>สแกนดูข้อมูล</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsTagPreviewOpen(false)}
                className="btn btn-secondary"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="btn btn-gold"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>อนุมัติสั่งพิมพ์ป้ายชื่อ</span>
              </button>
            </div>
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
