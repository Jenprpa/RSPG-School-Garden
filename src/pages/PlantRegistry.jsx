import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Filter, ArrowUpDown, Upload, Trash2, Edit3, X,
  MapPin, Image as ImageIcon, QrCode, FileText, CheckCircle2,
  AlertTriangle, ShieldCheck, Printer, Calendar, Info, Layers,
  Compass, Eye, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PlantCard from '../components/PlantCard';
import PlantIncident from './PlantIncident';
import {
  PLANT_USES, MEDIA_CATEGORIES, LOCATION_METHODS,
  PAGE8_MATCH_STATUS, ACADEMIC_YEARS, SCHOOL_ZONES
} from '../constants/rspgEnums';
import { plantRepository } from '../services/plantRepository';

export default function PlantRegistry({ onSelectPlant, userRole }) {
  // Context States
  const [schoolId, setSchoolId] = useState('pwtk');
  const [academicYear, setAcademicYear] = useState('2569');

  // Plant List State
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUseFilter, setSelectedUseFilter] = useState('ทั้งหมด');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('ทั้งหมด');
  const [sortField, setSortField] = useState('code'); // 'code' | 'localName'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [modalTab, setModalTab] = useState('page1'); // 'basic' | 'page1' | 'page2to7' | 'page8' | 'location' | 'media'
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isTagPreviewOpen, setIsTagPreviewOpen] = useState(false);
  const [selectedTagPlant, setSelectedTagPlant] = useState(null);

  // Form Fields: 1. Basic Info
  const [code, setCode] = useState('');
  const [localName, setLocalName] = useState('');
  const [status, setStatus] = useState('draft'); // 'draft' | 'pending_review' | 'approved'

  // Form Fields: 2. StudySheet Page 1 (Local Info)
  const [unknownFlag, setUnknownFlag] = useState(false);
  const [uses, setUses] = useState([]);
  const [usesOther, setUsesOther] = useState('');
  const [informantName, setInformantName] = useState('');
  const [informantAge, setInformantAge] = useState('');
  const [informantAddress, setInformantAddress] = useState('');
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [interviewLocation, setInterviewLocation] = useState('');

  // Form Fields: 3. StudySheet Pages 2-7 (Morphology 7 Parts)
  const [morphology, setMorphology] = useState({
    habit: '',
    root: '',
    stem: '',
    leaf: '',
    flower: '',
    fruit: '',
    seed: ''
  });

  // Form Fields: 4. StudySheet Pages 8-10 (Comparison & References)
  const [fieldDataSummary, setFieldDataSummary] = useState('');
  const [referenceDataSummary, setReferenceDataSummary] = useState('');
  const [matchStatus, setMatchStatus] = useState('match');
  const [references, setReferences] = useState([
    'ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์ ฉบับแก้ไขเพิ่มเติม พ.ศ. 2557)'
  ]);
  const [confirmedScientificName, setConfirmedScientificName] = useState('');
  const [confirmedFamilyName, setConfirmedFamilyName] = useState('');
  const [confirmedCommonName, setConfirmedCommonName] = useState('');

  // Form Fields: 5. Location & Canopy
  const [locationMethod, setLocationMethod] = useState('gps');
  const [gpsLat, setGpsLat] = useState('19.355400');
  const [gpsLng, setGpsLng] = useState('98.442000');
  const [coordX, setCoordX] = useState(25);
  const [coordY, setCoordY] = useState(30);
  const [zone, setZone] = useState('Zone A');
  const [surveyor, setSurveyor] = useState('');
  const [canopyWidth, setCanopyWidth] = useState({
    north: 0,
    south: 0,
    east: 0,
    west: 0
  });

  // Form Fields: 6. Media Gallery
  const [plantMediaList, setPlantMediaList] = useState([]);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Validation & Error States (Inline)
  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  // Load plants when context changes
  const loadPlants = async () => {
    setLoading(true);
    try {
      const data = await plantRepository.getPlants(schoolId, academicYear);
      setPlants(data);
    } catch (err) {
      console.error('Failed to load plants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlants();
  }, [schoolId, academicYear]);

  // Code Uniqueness Check
  const validateCodeUnique = (codeVal) => {
    if (!codeVal.trim()) return 'กรุณาระบุรหัสพรรณไม้ (Code)';
    const exists = plants.some(
      p => (p.plant_code || p.code || '').toLowerCase() === codeVal.trim().toLowerCase() &&
           (!editingPlant || p.id !== editingPlant.id)
    );
    if (exists) return 'รหัสพรรณไม้นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสที่ไม่ซ้ำกัน';
    return null;
  };

  // Open Add / Edit Modal
  const openModal = (plant = null) => {
    setErrors({});
    setSubmitSuccessMsg('');
    if (plant) {
      setEditingPlant(plant);
      setCode(plant.plant_code || plant.code || '');
      setLocalName(plant.thai_name || plant.local_name || plant.localName || '');
      setStatus(plant.status || 'draft');

      // Page 1
      setUnknownFlag(Boolean(plant.unknownFlag));
      setUses(Array.isArray(plant.uses) ? plant.uses : Array.isArray(plant.local_uses) ? plant.local_uses : []);
      setUsesOther(plant.usesOther || '');
      setInformantName(plant.informantName || plant.informant_name || '');
      setInformantAge(plant.informantAge || '');
      setInformantAddress(plant.informantAddress || '');
      setInterviewDate(plant.interviewDate || plant.survey_date || new Date().toISOString().split('T')[0]);
      setInterviewLocation(plant.interviewLocation || plant.local_location || '');

      // Pages 2-7
      setMorphology({
        habit: plant.morphology?.habit || plant.habit || '',
        root: plant.morphology?.root || '',
        stem: plant.morphology?.stem || '',
        leaf: plant.morphology?.leaf || '',
        flower: plant.morphology?.flower || '',
        fruit: plant.morphology?.fruit || '',
        seed: plant.morphology?.seed || ''
      });

      // Pages 8-10
      setFieldDataSummary(plant.fieldDataSummary || plant.description || '');
      setReferenceDataSummary(plant.referenceDataSummary || '');
      setMatchStatus(plant.matchStatus || plant.match_status || 'match');
      setReferences(
        Array.isArray(plant.references) && plant.references.length > 0
          ? plant.references
          : [plant.reference_sources || 'ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์)']
      );
      setConfirmedScientificName(plant.scientific_name || plant.confirmedScientificName || '');
      setConfirmedFamilyName(plant.family_name || plant.confirmedFamilyName || '');
      setConfirmedCommonName(plant.common_name || plant.confirmedCommonName || '');

      // Location
      setLocationMethod(plant.location?.method || plant.locationMethod || 'gps');
      setGpsLat(plant.gps_lat ? String(plant.gps_lat) : '19.355400');
      setGpsLng(plant.gps_lng ? String(plant.gps_lng) : '98.442000');
      setCoordX(plant.location?.x || plant.pin_coordinates?.x || 25);
      setCoordY(plant.location?.y || plant.pin_coordinates?.y || 30);
      setZone(plant.planting_location || plant.zone || 'Zone A');
      setSurveyor(plant.surveyor || '');
      setCanopyWidth(plant.canopyWidth || { north: 0, south: 0, east: 0, west: 0 });

      // Media
      setPlantMediaList(plant.media || []);
    } else {
      setEditingPlant(null);
      const nextNum = String(plants.length + 1).padStart(3, '0');
      setCode(`7-50300-001-${nextNum}`);
      setLocalName('');
      setStatus('draft');

      setUnknownFlag(false);
      setUses(['medicine', 'ornamental']);
      setUsesOther('');
      setInformantName('');
      setInformantAge('');
      setInformantAddress('');
      setInterviewDate(new Date().toISOString().split('T')[0]);
      setInterviewLocation('บริเวณโรงเรียนปายวิทยาคาร');

      setMorphology({
        habit: '',
        root: '',
        stem: '',
        leaf: '',
        flower: '',
        fruit: '',
        seed: ''
      });

      setFieldDataSummary('');
      setReferenceDataSummary('');
      setMatchStatus('match');
      setReferences(['ชื่อพรรณไม้แห่งประเทศไทย (เต็ม สมิตินันทน์ ฉบับแก้ไขเพิ่มเติม พ.ศ. 2557)']);
      setConfirmedScientificName('');
      setConfirmedFamilyName('');
      setConfirmedCommonName('');

      setLocationMethod('gps');
      setGpsLat('19.355400');
      setGpsLng('98.442000');
      setCoordX(25);
      setCoordY(30);
      setZone('Zone A');
      setSurveyor('');
      setCanopyWidth({ north: 0, south: 0, east: 0, west: 0 });

      setPlantMediaList([]);
    }

    setSelectedUploadCategory('');
    setUploadCaption('');
    setModalTab('page1');
    setIsModalOpen(true);
  };

  // Toggle Uses Multi-Select Checkboxes
  const handleToggleUse = (useVal) => {
    if (unknownFlag) return;
    setUses(prev =>
      prev.includes(useVal) ? prev.filter(v => v !== useVal) : [...prev, useVal]
    );
  };

  // Toggle Unknown Flag
  const handleToggleUnknownFlag = (checked) => {
    setUnknownFlag(checked);
    if (checked) {
      setUses([]);
      setUsesOther('');
      setInformantName('-');
      setInformantAge('');
      setInformantAddress('-');
      setInterviewLocation('-');
    }
  };

  // Reference List Handlers
  const handleAddReference = () => {
    if (references.length >= 10) {
      alert('สามารถเพิ่มเอกสารอ้างอิงได้สูงสุด 10 รายการ');
      return;
    }
    setReferences(prev => [...prev, '']);
  };

  const handleUpdateReference = (index, value) => {
    setReferences(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveReference = (index) => {
    if (references.length <= 1) {
      alert('ต้องมีเอกสารอ้างอิงอย่างน้อย 1 รายการ');
      return;
    }
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  // Dedicated Category Media Upload
  const handleUploadCategoryMedia = async (file, category) => {
    if (!file) return;
    if (!category) {
      setErrors(prev => ({ ...prev, media: 'กรุณาเลือกหมวดหมู่ภาพ (category) ก่อนทำการอัปโหลด' }));
      return;
    }
    setUploading(true);
    setErrors(prev => ({ ...prev, media: null }));
    try {
      const url = await plantRepository.uploadMedia(file, category, code || 'new');
      const newMediaItem = {
        category: category,
        url: url,
        caption: uploadCaption.trim() || `ภาพ ${category} ของ ${localName || code}`,
        uploadedAt: new Date().toISOString()
      };
      setPlantMediaList(prev => [...prev, newMediaItem]);
      setUploadCaption('');
      setSelectedUploadCategory('');
    } catch (err) {
      console.error(err);
      setErrors(prev => ({ ...prev, media: `การอัปโหลดล้มเหลว: ${err.message}` }));
    } finally {
      setUploading(false);
    }
  };

  // GPS Location Getter
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการดึงพิกัด Geolocation');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toFixed(6));
        setGpsLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        alert(`เกิดข้อผิดพลาดในการดึงพิกัด GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Interactive Map Pinning
  const handleMapPin = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setCoordX(x);
    setCoordY(y);

    // Auto-detect zone
    let nearest = SCHOOL_ZONES[0];
    let minDist = 99999;
    SCHOOL_ZONES.forEach(z => {
      const dist = Math.hypot(z.x - x, z.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = z;
      }
    });
    setZone(nearest.id);
  };

  // Form Submit Handler with Strict Validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = {};

    // 1. Validate Code
    const codeError = validateCodeUnique(code);
    if (codeError) validationErrors.code = codeError;

    // 2. Validate Local Name
    if (!localName.trim()) {
      validationErrors.localName = 'กรุณาระบุชื่อพื้นเมือง/ชื่อไทย (localName)';
    }

    // 3. Validate References (no empty items)
    const emptyRefIndex = references.findIndex(r => !r.trim());
    if (emptyRefIndex !== -1) {
      validationErrors.references = `เอกสารอ้างอิงลำดับที่ ${emptyRefIndex + 1} ต้องไม่เป็นค่าว่าง`;
    }

    // 4. Validate Character Counts (max 2000 per field)
    Object.entries(morphology).forEach(([k, text]) => {
      if (text && text.length > 2000) {
        validationErrors[k] = `เนื้อหาหมวด ${k} เกินขีดจำกัด 2000 ตัวอักษร (ปัจจุบัน ${text.length})`;
      }
    });
    if (fieldDataSummary.length > 2000) {
      validationErrors.fieldDataSummary = 'คำอธิบายข้อมูลภาคสนามเกิน 2000 ตัวอักษร';
    }
    if (referenceDataSummary.length > 2000) {
      validationErrors.referenceDataSummary = 'คำอธิบายข้อมูลเอกสารอ้างอิงเกิน 2000 ตัวอักษร';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Auto-switch to tab containing error
      if (validationErrors.code || validationErrors.localName) setModalTab('page1');
      else if (Object.keys(morphology).some(k => validationErrors[k])) setModalTab('page2to7');
      else if (validationErrors.references || validationErrors.fieldDataSummary) setModalTab('page8');
      return;
    }

    setSubmitLoading(true);
    setErrors({});

    try {
      // Find main image from media list or habit
      const habitMedia = plantMediaList.find(m => m.category === 'habit');
      const mainImageUrl = habitMedia ? habitMedia.url : (plantMediaList[0]?.url || '');

      const plantData = {
        plant_code: code.trim(),
        code: code.trim(),
        thai_name: localName.trim(),
        local_name: localName.trim(),
        localName: localName.trim(),
        status: status,

        // Page 1
        unknownFlag: unknownFlag,
        uses: uses,
        local_uses: uses,
        usesOther: uses.includes('other') ? usesOther.trim() : '',
        informantName: informantName.trim(),
        informantAge: informantAge ? parseInt(informantAge, 10) : null,
        informantAddress: informantAddress.trim(),
        interviewDate: interviewDate,
        interviewLocation: interviewLocation.trim(),

        // Pages 2-7
        morphology: morphology,
        habit: morphology.habit,

        // Pages 8-10
        fieldDataSummary: fieldDataSummary.trim(),
        referenceDataSummary: referenceDataSummary.trim(),
        matchStatus: matchStatus,
        match_status: matchStatus === 'match' ? 'ตรงกับเอกสารอ้างอิงทั้งหมด' : matchStatus === 'partial' ? 'ตรงบางส่วน' : 'ไม่ตรงกับเอกสารอ้างอิง',
        references: references.map(r => r.trim()).filter(Boolean),
        reference_sources: references.join(', '),
        scientific_name: confirmedScientificName.trim(),
        family_name: confirmedFamilyName.trim(),
        common_name: confirmedCommonName.trim(),

        // Location & Canopy
        location: {
          method: locationMethod,
          gpsLat: gpsLat ? parseFloat(gpsLat) : null,
          gpsLng: gpsLng ? parseFloat(gpsLng) : null,
          x: coordX,
          y: coordY,
          zone: zone
        },
        locationMethod: locationMethod,
        gps_lat: gpsLat ? parseFloat(gpsLat) : null,
        gps_lng: gpsLng ? parseFloat(gpsLng) : null,
        planting_location: zone,
        surveyor: surveyor.trim(),
        survey_date: interviewDate,
        canopyWidth: canopyWidth,

        // Media
        media: plantMediaList,
        image_url: mainImageUrl
      };

      if (editingPlant) {
        await plantRepository.update(editingPlant.id, plantData, schoolId, academicYear);
      } else {
        await plantRepository.create(plantData, schoolId, academicYear);
      }

      setSubmitSuccessMsg('บันทึกข้อมูลพรรณไม้สำเร็จเรียบร้อยแล้ว');
      setTimeout(() => {
        setIsModalOpen(false);
        loadPlants();
      }, 600);
    } catch (err) {
      console.error(err);
      setErrors({ form: `บันทึกล้มเหลว: ${err.message}` });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Plant
  const handleDeletePlant = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบพรรณไม้นี้ออกจากทะเบียน?')) {
      try {
        await plantRepository.delete(id, schoolId, academicYear);
        loadPlants();
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
      }
    }
  };

  // Filtered & Sorted Plants
  const filteredPlants = useMemo(() => {
    return plants
      .filter(p => {
        const nameMatch =
          (p.thai_name || p.local_name || p.localName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.scientific_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.plant_code || p.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.family_name || '').toLowerCase().includes(searchQuery.toLowerCase());

        const plantUsesList = Array.isArray(p.uses) ? p.uses : Array.isArray(p.local_uses) ? p.local_uses : [];
        const useMatch = selectedUseFilter === 'ทั้งหมด' || plantUsesList.includes(selectedUseFilter);
        const zoneMatch = selectedZoneFilter === 'ทั้งหมด' || (p.planting_location || p.zone) === selectedZoneFilter;

        return nameMatch && useMatch && zoneMatch;
      })
      .sort((a, b) => {
        let valA = (sortField === 'code' ? (a.plant_code || a.code || '') : (a.thai_name || a.local_name || a.localName || '')).toLowerCase();
        let valB = (sortField === 'code' ? (b.plant_code || b.code || '') : (b.thai_name || b.local_name || b.localName || '')).toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [plants, searchQuery, selectedUseFilter, selectedZoneFilter, sortField, sortDirection]);

  return (
    <div>
      {/* Upper Context Header: School & Academic Year Context Selector */}
      <div className="card glass-panel" style={{ marginBottom: '1.5rem', border: '1.5px solid #E5CA79', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="#5C1D8D" />
              ทะเบียนพรรณไม้ — Plant Registry (Sprint 1)
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#584F66', margin: '3px 0 0 0' }}>
              ระบบบันทึกข้อมูลพรรณไม้แบบ Structured Schema ตามมาตรฐาน อพ.สธ. (หน้า 1 ถึง 10)
            </p>
          </div>

          {/* Context Selector: Academic Year & School */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F6EEFB', padding: '4px 10px', borderRadius: '8px', border: '1px solid #E5D0F5' }}>
              <Calendar size={15} color="#5C1D8D" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5C1D8D' }}>ปีการศึกษา:</span>
              <select
                className="form-control"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '4px 8px', fontWeight: 700, color: '#5C1D8D', border: 'none', background: 'transparent' }}
              >
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {userRole !== 'visitor' && (
              <button
                onClick={() => openModal()}
                className="btn btn-gold"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', padding: '8px 16px' }}
              >
                <Plus size={16} />
                <span>เพิ่มพรรณไม้ใหม่</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card glass-panel" style={{ marginBottom: '1.5rem', padding: '14px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="search-wrapper" style={{ flex: 1, minWidth: '220px', marginBottom: 0 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="🔍 ค้นหารหัส, ชื่อพื้นเมือง, ชื่อวิทย์ หรือวงศ์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.84rem', padding: '7px 12px 7px 34px' }}
            />
          </div>

          {/* Plant Uses Filter (Mandatory Enum Whitelist) */}
          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={selectedUseFilter}
              onChange={(e) => setSelectedUseFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px' }}
            >
              <option value="ทั้งหมด">🎯 ทุกการใช้ประโยชน์พื้นบ้าน</option>
              {PLANT_USES.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Zone Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px' }}
            >
              <option value="ทั้งหมด">📍 ทุกโซน / ผัง</option>
              {SCHOOL_ZONES.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Field & Direction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              className="form-control"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '7px 10px' }}
            >
              <option value="code">เรียงตามรหัสพรรณไม้</option>
              <option value="localName">เรียงตามชื่อพื้นเมือง</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="icon-btn"
              title={`สลับลำดับ: ${sortDirection === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}`}
              style={{ width: '32px', height: '32px', backgroundColor: '#F6EEFB', border: '1px solid #E5D0F5' }}
            >
              <ArrowUpDown size={14} color="#5C1D8D" />
            </button>
          </div>
        </div>
      </div>

      {/* Plant Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#5C1D8D' }}>กำลังโหลดข้อมูลพรรณไม้ ปีการศึกษา {academicYear}...</div>
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
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 10 }}>
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
                          handleDeletePlant(plant.id);
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

      {/* ======================================================== */}
      {/* SPRINT 1 STRUCTURED MODAL (PAGES 1 TO 10) */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px', border: '1.5px solid #E5CA79', padding: '24px' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #E8DEEE', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} color="#5C1D8D" />
                  {editingPlant ? `แก้ไขข้อมูล: ${localName || code}` : 'เพิ่มพรรณไม้ใหม่ (ก.7-003)'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#827891' }}>
                  สังกัดโรงเรียน: <strong>{schoolId}</strong> | ปีการศึกษา: <strong>{academicYear}</strong>
                </span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
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
                { id: 'page2to7', label: '2. สัณฐานวิทยา (หน้า 2-7)', icon: Layers },
                { id: 'page8', label: '3. เปรียบเทียบข้อมูล (หน้า 8-10)', icon: Info },
                { id: 'location', label: '4. ผังพรรณไม้ & พิกัด', icon: MapPin },
                { id: 'media', label: `5. คลังภาพแยกหมวด (${plantMediaList.length})`, icon: ImageIcon }
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
                      minWidth: '150px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isCurrent ? '1.5px solid #ECC85B' : '1px solid transparent',
                      background: isCurrent ? 'linear-gradient(135deg, #2A084E 0%, #5C1D8D 100%)' : 'transparent',
                      color: isCurrent ? '#FFFFFF' : '#4A3E56',
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: '0.8rem',
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

            {/* Error & Success Banner */}
            {errors.form && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FDEAEA', color: '#D32F2F', borderRadius: '8px', border: '1px solid #F5C2C2', fontSize: '0.84rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errors.form}</span>
              </div>
            )}
            {submitSuccessMsg && (
              <div style={{ padding: '10px 14px', backgroundColor: '#EAF7ED', color: '#1E6B37', borderRadius: '8px', border: '1px solid #B8E5C4', fontSize: '0.84rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{submitSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ==================================================== */}
              {/* TAB 1: ADD PLANT & STUDY SHEET PAGE 1 LOCAL INFO */}
              {/* ==================================================== */}
              {modalTab === 'page1' && (
                <div>
                  {/* Basic Code & Local Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                        รหัสพรรณไม้ (Plant Code) <span style={{ color: '#D32F2F' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          if (errors.code) setErrors(prev => ({ ...prev, code: null }));
                        }}
                        placeholder="เช่น 7-50300-001-001"
                        style={{ fontWeight: 700, color: '#5C1D8D', borderColor: errors.code ? '#D32F2F' : undefined }}
                      />
                      {errors.code && (
                        <span style={{ fontSize: '0.74rem', color: '#D32F2F', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                          ⚠️ {errors.code}
                        </span>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                        ชื่อพื้นเมือง / ชื่อท้องถิ่น (Local Name) <span style={{ color: '#D32F2F' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={localName}
                        onChange={(e) => {
                          setLocalName(e.target.value);
                          if (errors.localName) setErrors(prev => ({ ...prev, localName: null }));
                        }}
                        placeholder="เช่น กัลปพฤกษ์, มะม่วงป่า"
                        style={{ fontWeight: 700, borderColor: errors.localName ? '#D32F2F' : undefined }}
                      />
                      {errors.localName && (
                        <span style={{ fontSize: '0.74rem', color: '#D32F2F', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                          ⚠️ {errors.localName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unknown Flag Toggle */}
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: unknownFlag ? '#FFF9E6' : '#FAF8FC',
                    border: unknownFlag ? '1.5px solid #E5CA79' : '1px solid #E8DEEE',
                    borderRadius: '10px',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.86rem', color: '#2A084E' }}>ผู้รู้ไม่ทราบข้อมูลพื้นบ้าน (-)</strong>
                      <div style={{ fontSize: '0.75rem', color: '#584F66' }}>
                        ตามเกณฑ์ อพ.สธ.: หากผู้รู้ไม่ทราบข้อมูล ให้ทำเครื่องหมาย - และปิดการกรอกข้อมูลในหน้านี้
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#5C1D8D', fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={unknownFlag}
                        onChange={(e) => handleToggleUnknownFlag(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>ไม่ทราบข้อมูล (-)</span>
                    </label>
                  </div>

                  {/* Multi-Select Uses Checkboxes (Strict Whitelist Enum) */}
                  <div className="form-group" style={{ marginBottom: '1.25rem', padding: '14px', backgroundColor: '#FAF8FC', borderRadius: '10px', border: '1px solid #E8DEEE', opacity: unknownFlag ? 0.5 : 1 }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#2A084E', marginBottom: '8px' }}>
                      การใช้ประโยชน์พื้นบ้าน (Plant Uses Whitelist — ห้ามพิมพ์อิสระ)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {PLANT_USES.map(u => {
                        const checked = uses.includes(u.value);
                        return (
                          <label
                            key={u.value}
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
                              cursor: unknownFlag ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={unknownFlag}
                              onChange={() => handleToggleUse(u.value)}
                            />
                            <span>{u.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* usesOther text field enabled ONLY when 'other' is checked */}
                    {uses.includes('other') && !unknownFlag && (
                      <div style={{ marginTop: '10px' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5C1D8D' }}>
                          ระบุรายละเอียดการใช้ประโยชน์อื่นๆ (usesOther)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={usesOther}
                          onChange={(e) => setUsesOther(e.target.value)}
                          placeholder="เช่น ใช้ทำเครื่องจักสาน, ประดับในงานบายศรี..."
                          style={{ fontSize: '0.82rem' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Informant Fields */}
                  <div style={{ opacity: unknownFlag ? 0.5 : 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>ชื่อผู้ให้ข้อมูล / ปราชญ์ชาวบ้าน (informantName)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={informantName}
                          disabled={unknownFlag}
                          onChange={(e) => setInformantName(e.target.value)}
                          placeholder="เช่น พ่อหลวงสมควร ชัยนาม"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>อายุ (ปี)</label>
                        <input
                          type="number"
                          min="0"
                          max="150"
                          className="form-control"
                          value={informantAge}
                          disabled={unknownFlag}
                          onChange={(e) => setInformantAge(e.target.value)}
                          placeholder="เช่น 68"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>สถานที่สัมภาษณ์ / ถิ่นอาศัย (interviewLocation)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={interviewLocation}
                          disabled={unknownFlag}
                          onChange={(e) => setInterviewLocation(e.target.value)}
                          placeholder="เช่น หมู่ 3 บ้านเวียงใต้ ต.เวียงใต้ อ.ปาย"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>วันที่สัมภาษณ์ (interviewDate)</label>
                        <input
                          type="date"
                          className="form-control"
                          value={interviewDate}
                          disabled={unknownFlag}
                          onChange={(e) => setInterviewDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ที่อยู่ผู้ให้ข้อมูล (informantAddress)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={informantAddress}
                        disabled={unknownFlag}
                        onChange={(e) => setInformantAddress(e.target.value)}
                        placeholder="บ้านเลขที่, หมู่บ้าน, ตำบล, อำเภอ"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 2: STUDY SHEET PAGES 2-7 BOTANICAL MORPHOLOGY */}
              {/* ==================================================== */}
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
                    💡 <strong>7 ส่วนลักษณะพฤกษศาสตร์:</strong> แต่ละช่องจำกัดสูงสุด 2,000 ตัวอักษรตามสัญญา Backend และสามารถแนบรูปภาพเฉพาะส่วนเพื่อผูกหมวดหมู่โดยตรง
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'habit', label: '1. วิสัย / ทรงต้น (Habit)', icon: '🌳', placeholder: 'เช่น ไม้ต้นผลัดใบ สูง 10-15 เมตร ทรงพุ่มกลมทึบ...' },
                      { key: 'root', label: '2. ระบบราก (Root)', icon: '🌱', placeholder: 'เช่น ระบบรากแก้ว รากแขนงแผ่กว้าง...' },
                      { key: 'stem', label: '3. ลำต้นและเปลือก (Stem & Bark)', icon: '🪵', placeholder: 'เช่น ลำต้นตั้งตรง เปลือกต้นสีเทาอมน้ำตาล แตกเป็นร่องตื้น...' },
                      { key: 'leaf', label: '4. ลักษณะใบ (Leaf)', icon: '🍃', placeholder: 'เช่น ใบประกอบแบบขนนกปลายคู่ เรียงสลับ แผ่นใบรูปไข่...' },
                      { key: 'flower', label: '5. ลักษณะดอก (Flower)', icon: '🌸', placeholder: 'เช่น ดอกช่อกระจะออกตามซอกใบ กลีบดอกสีชมพูอ่อน...' },
                      { key: 'fruit', label: '6. ลักษณะผล (Fruit)', icon: '🍎', placeholder: 'เช่น ผลเป็นฝักทรงกระบอกยาว 30-40 ซม. ผิวเรียบ...' },
                      { key: 'seed', label: '7. ลักษณะเมล็ด (Seed)', icon: '🌰', placeholder: 'เช่น เมล็ดรูปไข่แบน สีน้ำตาลเข้ม เรียงตัวตามขวาง...' }
                    ].map(part => {
                      const charCount = (morphology[part.key] || '').length;
                      const isOverLimit = charCount > 2000;
                      const hasAttachedPhoto = plantMediaList.some(m => m.category === part.key);

                      return (
                        <div
                          key={part.key}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: `1px solid ${isOverLimit ? '#D32F2F' : '#E8DEEE'}`,
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#2A084E' }}>
                              {part.icon} {part.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {hasAttachedPhoto && (
                                <span style={{ fontSize: '0.72rem', color: '#1E6B37', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={12} /> มีภาพแนบ
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: isOverLimit ? '#D32F2F' : charCount > 1800 ? '#C5931C' : '#827891'
                              }}>
                                {charCount} / 2000 ตัวอักษร
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'start' }}>
                            <textarea
                              className="form-control"
                              rows="2"
                              value={morphology[part.key] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMorphology(prev => ({ ...prev, [part.key]: val }));
                              }}
                              placeholder={part.placeholder}
                              style={{ fontSize: '0.82rem' }}
                            ></textarea>

                            <div>
                              <input
                                type="file"
                                id={`file-part-${part.key}`}
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadCategoryMedia(e.target.files[0], part.key);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                              <label
                                htmlFor={`file-part-${part.key}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <Upload size={12} /> แนบภาพ {part.key}
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 3: STUDY SHEET PAGES 8-10 COMPARISON & REFS */}
              {/* ==================================================== */}
              {modalTab === 'page8' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                          สรุปข้อมูลภาคสนาม (fieldDataSummary)
                        </label>
                        <span style={{ fontSize: '0.72rem', color: fieldDataSummary.length > 2000 ? '#D32F2F' : '#827891' }}>
                          {fieldDataSummary.length} / 2000
                        </span>
                      </div>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={fieldDataSummary}
                        onChange={(e) => setFieldDataSummary(e.target.value)}
                        placeholder="บันทึกสรุปลักษณะสำคัญที่พบจริงในพื้นที่โรงเรียน..."
                        style={{ fontSize: '0.82rem' }}
                      ></textarea>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                          สรุปข้อมูลจากเอกสารอ้างอิง (referenceDataSummary)
                        </label>
                        <span style={{ fontSize: '0.72rem', color: referenceDataSummary.length > 2000 ? '#D32F2F' : '#827891' }}>
                          {referenceDataSummary.length} / 2000
                        </span>
                      </div>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={referenceDataSummary}
                        onChange={(e) => setReferenceDataSummary(e.target.value)}
                        placeholder="บันทึกสรุปตามคู่มือหรือหนังสือพรรณไม้ทางวิชาการ..."
                        style={{ fontSize: '0.82rem' }}
                      ></textarea>
                    </div>
                  </div>

                  {/* Match Status Dropdown (Strict Whitelist Enum) */}
                  <div className="form-group" style={{ marginBottom: '1.25rem', padding: '14px', backgroundColor: '#FAF8FC', borderRadius: '10px', border: '1px solid #E8DEEE' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#5C1D8D', marginBottom: '6px' }}>
                      สถานะการเปรียบเทียบข้อมูล (matchStatus Dropdown — ห้ามพิมพ์อิสระ)
                    </label>
                    <select
                      className="form-control"
                      value={matchStatus}
                      onChange={(e) => setMatchStatus(e.target.value)}
                      style={{ fontWeight: 700, color: matchStatus === 'match' ? '#1E6B37' : matchStatus === 'partial' ? '#94690A' : '#D32F2F' }}
                    >
                      {PAGE8_MATCH_STATUS.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic References List (1-10 items, no empty) */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 700, marginBottom: 0 }}>
                        เอกสารและฐานข้อมูลอ้างอิง (References List: 1-10 รายการ)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddReference}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      >
                        + เพิ่มเอกสารอ้างอิง
                      </button>
                    </div>

                    {errors.references && (
                      <span style={{ fontSize: '0.74rem', color: '#D32F2F', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                        ⚠️ {errors.references}
                      </span>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {references.map((refText, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.76rem', color: '#827891', width: '20px' }}>{idx + 1}.</span>
                          <input
                            type="text"
                            className="form-control"
                            value={refText}
                            onChange={(e) => handleUpdateReference(idx, e.target.value)}
                            placeholder="ระบุชื่อหนังสือ เล่มที่ หรือแหล่งข้อมูลพรรณไม้อ้างอิง..."
                            style={{ fontSize: '0.82rem' }}
                          />
                          {references.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveReference(idx)}
                              className="icon-btn"
                              style={{ width: '28px', height: '28px', color: '#D32F2F' }}
                              title="ลบรายการนี้"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirmed Scientific Identity Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ชื่อวิทยาศาสตร์ที่ยืนยัน</label>
                      <input
                        type="text"
                        className="form-control"
                        value={confirmedScientificName}
                        onChange={(e) => setConfirmedScientificName(e.target.value)}
                        placeholder="เช่น Cassia bakeriana Craib"
                        style={{ fontStyle: 'italic' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ชื่อวงศ์ (Family)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={confirmedFamilyName}
                        onChange={(e) => setConfirmedFamilyName(e.target.value)}
                        placeholder="เช่น FABACEAE"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>ชื่อสามัญ (Common Name)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={confirmedCommonName}
                        onChange={(e) => setConfirmedCommonName(e.target.value)}
                        placeholder="เช่น Pink Shower"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 4: LOCATION, PINNING & CANOPY MEASUREMENTS */}
              {/* ==================================================== */}
              {modalTab === 'location' && (
                <div>
                  {/* Location Method Dropdown */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#5C1D8D' }}>
                      วิธีการกำหนดตำแหน่ง (location.method Dropdown)
                    </label>
                    <select
                      className="form-control"
                      value={locationMethod}
                      onChange={(e) => setLocationMethod(e.target.value)}
                      style={{ fontWeight: 700 }}
                    >
                      {LOCATION_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Conditional Inputs: GPS vs X/Y Coordinates */}
                  {locationMethod === 'gps' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '14px', backgroundColor: '#FAF8FC', borderRadius: '10px', border: '1px solid #E8DEEE' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>พิกัดละติจูด (Latitude)</span>
                          <button
                            type="button"
                            onClick={handleGetGpsLocation}
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
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">พิกัดลองจิจูด (Longitude)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={gpsLng}
                          onChange={(e) => setGpsLng(e.target.value)}
                          placeholder="98.442000"
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#2A084E' }}>
                        ผังพิกัด X/Y (คลิกบนแผนผังโรงเรียนเพื่อกำหนดพิกัด)
                      </label>
                      <div
                        onClick={handleMapPin}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '200px',
                          backgroundColor: '#E8F5E9',
                          borderRadius: '10px',
                          border: '2px solid #81C784',
                          cursor: 'crosshair',
                          overflow: 'hidden'
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
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            left: `${coordX}%`,
                            top: `${coordY}%`,
                            transform: 'translate(-50%, -100%)',
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{ backgroundColor: '#5C1D8D', color: '#ECC85B', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                            📍 {localName || code || 'จุดปัก'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#584F66', marginTop: '4px', display: 'block' }}>
                        พิกัด: X={coordX}%, Y={coordY}% | โซนที่เลือก: <strong>{zone}</strong>
                      </span>
                    </div>
                  )}

                  {/* Canopy Width 4 Directions (min=0) */}
                  <div style={{ padding: '14px', backgroundColor: '#FAF8FC', borderRadius: '10px', border: '1px solid #E8DEEE', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#2A084E', marginBottom: '8px' }}>
                      รัศมีทรงพุ่ม 4 ทิศทาง (canopyWidth: เมตร — ขั้นต่ำ 0)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {[
                        { dir: 'north', label: 'ทิศเหนือ (N)' },
                        { dir: 'south', label: 'ทิศใต้ (S)' },
                        { dir: 'east', label: 'ทิศตะวันออก (E)' },
                        { dir: 'west', label: 'ทิศตะวันตก (W)' }
                      ].map(d => (
                        <div key={d.dir}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#584F66' }}>{d.label}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-control"
                            value={canopyWidth[d.dir] || 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setCanopyWidth(prev => ({ ...prev, [d.dir]: Math.max(0, v) }));
                            }}
                            style={{ fontSize: '0.82rem', marginTop: '2px' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">โซนผังพรรณไม้</label>
                      <select
                        className="form-control"
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        style={{ fontWeight: 600 }}
                      >
                        {SCHOOL_ZONES.map(z => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ผู้สำรวจ / บันทึกข้อมูล (surveyor)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={surveyor}
                        onChange={(e) => setSurveyor(e.target.value)}
                        placeholder="เช่น ครูเจนประภา เรือนคำ"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 5: MEDIA GALLERY & WHITELIST CATEGORY UPLOAD */}
              {/* ==================================================== */}
              {modalTab === 'media' && (
                <div>
                  {/* Mandatory Category Selection Before Upload */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px dashed #E5CA79',
                    backgroundColor: '#FAF8FC',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2A084E', margin: '0 0 8px 0' }}>
                      📤 อัปโหลดรูปภาพใหม่ (บังคับเลือก Category ก่อนเสมอ)
                    </h4>

                    {errors.media && (
                      <div style={{ fontSize: '0.78rem', color: '#D32F2F', marginBottom: '8px', fontWeight: 600 }}>
                        ⚠️ {errors.media}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5C1D8D', marginBottom: '4px' }}>
                          เลือกหมวดหมู่ภาพ (media.category) <span style={{ color: '#D32F2F' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={selectedUploadCategory}
                          onChange={(e) => {
                            setSelectedUploadCategory(e.target.value);
                            setErrors(prev => ({ ...prev, media: null }));
                          }}
                          style={{ fontSize: '0.82rem', fontWeight: 600 }}
                        >
                          <option value="">-- กรุณาเลือกหมวดหมู่ภาพ --</option>
                          {MEDIA_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                          คำบรรยายภาพ (caption)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={uploadCaption}
                          onChange={(e) => setUploadCaption(e.target.value)}
                          placeholder="เช่น ลักษณะใบแก่ด้านบน, ดอกบานเต็มที่..."
                          style={{ fontSize: '0.82rem' }}
                        />
                      </div>

                      <div>
                        <input
                          type="file"
                          id="general-media-upload"
                          accept="image/*"
                          disabled={!selectedUploadCategory || uploading}
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadCategoryMedia(e.target.files[0], selectedUploadCategory);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <label
                          htmlFor="general-media-upload"
                          className={`btn ${selectedUploadCategory && !uploading ? 'btn-gold' : 'btn-secondary'}`}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.82rem',
                            cursor: selectedUploadCategory && !uploading ? 'pointer' : 'not-allowed',
                            opacity: selectedUploadCategory && !uploading ? 1 : 0.6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Upload size={14} /> {uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพ'}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Gallery of Uploaded Media */}
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2A084E', marginBottom: '10px' }}>
                    🖼️ รูปภาพที่แนบในทะเบียน ({plantMediaList.length} รูป)
                  </h4>

                  {plantMediaList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#827891', backgroundColor: '#FAF8FC', borderRadius: '8px' }}>
                      ยังไม่มีรูปภาพในคลังของพรรณไม้นี้
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                      {plantMediaList.map((m, idx) => {
                        const catObj = MEDIA_CATEGORIES.find(c => c.value === m.category);
                        return (
                          <div
                            key={idx}
                            style={{
                              borderRadius: '8px',
                              border: '1px solid #E8DEEE',
                              overflow: 'hidden',
                              backgroundColor: '#FFFFFF',
                              position: 'relative',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                            }}
                          >
                            <img
                              src={m.url}
                              alt={m.caption || m.category}
                              style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                            />
                            <div style={{ padding: '8px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#F6EEFB',
                                color: '#5C1D8D',
                                display: 'inline-block',
                                marginBottom: '4px'
                              }}>
                                {catObj?.icon} {catObj?.label || m.category}
                              </span>
                              <div style={{ fontSize: '0.74rem', color: '#1F1929', lineHeight: 1.2 }}>
                                {m.caption || '-'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPlantMediaList(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'rgba(211, 47, 47, 0.85)',
                                color: '#FFF',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="ลบรูปภาพนี้"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Actions */}
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
                        else if (modalTab === 'media') setModalTab('location');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.84rem' }}
                    >
                      ย้อนกลับ
                    </button>
                  )}
                  {modalTab !== 'media' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'page1') setModalTab('page2to7');
                        else if (modalTab === 'page2to7') setModalTab('page8');
                        else if (modalTab === 'page8') setModalTab('location');
                        else if (modalTab === 'location') setModalTab('media');
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
