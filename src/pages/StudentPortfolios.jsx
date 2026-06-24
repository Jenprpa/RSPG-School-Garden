import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Search, Plus, Trash2, Edit3, Save, X, Upload, ExternalLink, Award, FileText, Video, MessageSquare, Clipboard } from 'lucide-react';

export default function StudentPortfolios({ userRole }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPort, setSelectedPort] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('ทั้งหมด');
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
  const [filterPlant, setFilterPlant] = useState('ทั้งหมด');

  // Form states
  const [studentName, setStudentName] = useState('');
  const [classroom, setClassroom] = useState('');
  const [academicYear, setAcademicYear] = useState('2569');
  const [teacherName, setTeacherName] = useState('');
  const [plantName, setPlantName] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [k7003Status, setK7003Status] = useState('รอตรวจ');
  const [drawingType, setDrawingType] = useState('ภาพวาดสีน้ำพฤกษศาสตร์');
  const [drawingUrl, setDrawingUrl] = useState('');
  const [worksheetUrl, setWorksheetUrl] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('รอตรวจ');
  const [feedback, setFeedback] = useState('');

  // Upload targets
  const [drawingFile, setDrawingFile] = useState(null);
  const [worksheetFile, setWorksheetFile] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchPortfolios = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'student_portfolios'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setPortfolios(list);
    } catch (err) {
      console.error('Error fetching portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleOpenModal = (port = null) => {
    if (port) {
      setSelectedPort(port);
      setStudentName(port.student_name || '');
      setClassroom(port.classroom || '');
      setAcademicYear(port.academic_year || '2569');
      setTeacherName(port.teacher_name || '');
      setPlantName(port.plant_name || '');
      setPlantCode(port.plant_code || '');
      setK7003Status(port.k7003_status || 'รอตรวจ');
      setDrawingType(port.drawing_type || 'ภาพวาดสีน้ำพฤกษศาสตร์');
      setDrawingUrl(port.drawing_url || '');
      setWorksheetUrl(port.worksheet_url || '');
      setReportUrl(port.report_url || '');
      setVideoUrl(port.video_url || '');
      setStatus(port.status || 'รอตรวจ');
      setFeedback(port.feedback || '');
    } else {
      setSelectedPort(null);
      setStudentName('');
      setClassroom('');
      setAcademicYear('2569');
      setTeacherName('');
      setPlantName('');
      setPlantCode('');
      setK7003Status('รอตรวจ');
      setDrawingType('ภาพวาดสีน้ำพฤกษศาสตร์');
      setDrawingUrl('');
      setWorksheetUrl('');
      setReportUrl('');
      setVideoUrl('');
      setStatus('รอตรวจ');
      setFeedback('');
    }
    setDrawingFile(null);
    setWorksheetFile(null);
    setReportFile(null);
    setVideoFile(null);
    setIsModalOpen(true);
  };

  const handleUpload = async (file, folder) => {
    if (!storage || !file) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const path = `portfolios/${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, path);
      const snapshot = await uploadBytes(fileRef, processedFile);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
      return '';
    }
  };

  const handlePortfolioFileChange = (file, setFileState, inputElement, isRequiredImage = false) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const isImage = file.type.startsWith('image/');

    if (isRequiredImage && !isImage) {
      alert('กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น');
      if (inputElement) inputElement.value = '';
      setFileState(null);
      return;
    }

    if (!isImage) {
      if (file.size > maxSize) {
        alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาบีบอัดไฟล์ก่อนทำการอัปโหลด`);
        if (inputElement) inputElement.value = '';
        setFileState(null);
        return;
      }
    }
    setFileState(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;
    setSaving(true);

    try {
      let finalDrawing = drawingUrl;
      let finalWorksheet = worksheetUrl;
      let finalReport = reportUrl;
      let finalVideo = videoUrl;

      if (drawingFile) finalDrawing = await handleUpload(drawingFile, 'drawings');
      if (worksheetFile) finalWorksheet = await handleUpload(worksheetFile, 'worksheets');
      if (reportFile) finalReport = await handleUpload(reportFile, 'reports');
      if (videoFile) finalVideo = await handleUpload(videoFile, 'videos');

      const payload = {
        student_name: studentName,
        classroom: classroom,
        academic_year: academicYear,
        teacher_name: teacherName,
        plant_name: plantName,
        plant_code: plantCode,
        k7003_status: k7003Status,
        drawing_type: drawingType,
        drawing_url: finalDrawing,
        worksheet_url: finalWorksheet,
        report_url: finalReport,
        video_url: finalVideo,
        status: status,
        feedback: feedback,
        updated_at: new Date().toISOString()
      };

      const docId = selectedPort?.id || `port_${Date.now()}`;
      await setDoc(doc(db, 'student_portfolios', docId), payload);
      setIsModalOpen(false);
      fetchPortfolios();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่ลบผลงานได้');
      return;
    }
    if (window.confirm('คุณแน่ใจว่าต้องการลบแฟ้มสะสมงานของนักเรียนคนนี้?')) {
      try {
        await deleteDoc(doc(db, 'student_portfolios', id));
        fetchPortfolios();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Get unique classrooms and plants for filters
  const uniqueClassrooms = Array.from(new Set(portfolios.map(p => p.classroom).filter(Boolean)));
  const uniquePlants = Array.from(new Set(portfolios.map(p => p.plant_name).filter(Boolean)));

  const filteredPortfolios = portfolios.filter(p => {
    const matchesSearch = 
      p.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.teacher_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = filterClassroom === 'ทั้งหมด' || p.classroom === filterClassroom;
    const matchesStatus = filterStatus === 'ทั้งหมด' || p.status === filterStatus;
    const matchesPlant = filterPlant === 'ทั้งหมด' || p.plant_name === filterPlant;

    return matchesSearch && matchesClass && matchesStatus && matchesPlant;
  });

  const getStatusBadge = (s) => {
    switch (s) {
      case 'ผ่าน':
        return <span className="role-badge role-admin" style={{ color: 'var(--color-success)', backgroundColor: 'rgba(46,125,50,0.06)' }}>✓ ผ่าน (Approved)</span>;
      case 'ต้องแก้ไข':
        return <span className="role-badge role-visitor" style={{ color: 'var(--color-danger)', backgroundColor: 'rgba(211,47,47,0.06)' }}>⚠ ต้องแก้ไข</span>;
      default:
        return <span className="role-badge role-teacher" style={{ color: 'var(--color-warning)', backgroundColor: 'rgba(255,152,0,0.06)' }}>รอตรวจ</span>;
    }
  };

  const canEdit = ['admin', 'teacher', 'project_advisor'].includes(userRole);
  const canStudentEdit = userRole === 'student';

  return (
    <div>
      {/* Intro Card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                แฟ้มสะสมงานพฤกษศาสตร์นักเรียนรายบุคคล (Student Portfolios System)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                รวบรวมประวัติความก้าวหน้าพืชศึกษา แบบบันทึก ก.7-003 ภาพวาดสีน้ำ และรายงานย่อยของนักเรียนเพื่อใช้ประเมินผลงาน
              </p>
            </div>
          </div>
          {['admin', 'teacher', 'student', 'project_advisor'].includes(userRole) && (
            <button onClick={() => handleOpenModal()} className="btn btn-primary">
              <Plus size={16} /> เพิ่มแฟ้มงานนักเรียน
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="ค้นชื่อนักเรียน พรรณไม้ที่ศึกษา หรือครูผู้สอน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select className="form-control" value={filterClassroom} onChange={(e) => setFilterClassroom(e.target.value)}>
              <option value="ทั้งหมด">กรองตามชั้นเรียน (ทั้งหมด)</option>
              {uniqueClassrooms.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <select className="form-control" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)}>
              <option value="ทั้งหมด">กรองตามพรรณไม้ (ทั้งหมด)</option>
              {uniquePlants.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ทั้งหมด">กรองสถานะตรวจ (ทั้งหมด)</option>
              <option value="ผ่าน">ผ่าน (Approved)</option>
              <option value="ต้องแก้ไข">ต้องแก้ไข</option>
              <option value="รอตรวจ">รอตรวจ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดึงข้อมูลแฟ้มผลงานนักเรียน...</div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ไม่พบข้อมูลแฟ้มสะสมงานพฤกษศาสตร์นักเรียน
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredPortfolios.map(port => (
            <div key={port.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid var(--border-color)', gap: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>🏷️ ห้องเรียน: {port.classroom}</span>
                {getStatusBadge(port.status)}
              </div>

              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  👤 {port.student_name}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  พืชที่ศึกษา: <b>{port.plant_name}</b> ({port.plant_code || '-'})
                </p>
              </div>

              {port.drawing_url && (
                <img 
                  src={port.drawing_url} 
                  alt="ผลงานพฤกษศาสตร์" 
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              )}

              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'var(--bg-main)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clipboard size={14} /> <b>ใบงาน ก.7-003:</b> {port.k7003_status}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14} /> <b>ประเภทภาพ:</b> {port.drawing_type}</div>
                {port.feedback && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', fontStyle: 'italic', color: 'var(--color-primary)' }}>
                    <MessageSquare size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><b>ครูผู้ตรวจ:</b> {port.feedback}</span>
                  </div>
                )}
              </div>

              {/* Resource files row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                {port.worksheet_url && (
                  <a href={port.worksheet_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <FileText size={12} /> ใบงาน
                  </a>
                )}
                {port.report_url && (
                  <a href={port.report_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <FileText size={12} /> รายงานย่อย
                  </a>
                )}
                {port.video_url && (
                  <a href={port.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <Video size={12} /> คลิปนำเสนอ
                  </a>
                )}
              </div>

              {/* Edit/Delete triggers */}
              <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '4px' }}>
                {(canEdit || (canStudentEdit && port.status !== 'ผ่าน')) && (
                  <button onClick={() => handleOpenModal(port)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-card)' }}>
                    <Edit3 size={12} color="var(--color-primary)" />
                  </button>
                )}
                {userRole === 'admin' && (
                  <button onClick={() => handleDelete(port.id)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-card)' }}>
                    <Trash2 size={12} color="var(--color-danger)" />
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Student Portfolio Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {selectedPort ? 'แก้ไขข้อมูลแฟ้มสะสมงานพฤกษศาสตร์' : 'เพิ่มแฟ้มสะสมงานพฤกษศาสตร์นักเรียน'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ชื่อ-สกุล นักเรียน</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={studentName} 
                    onChange={(e) => setStudentName(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ห้องเรียน (เช่น ม.3/2)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={classroom} 
                    onChange={(e) => setClassroom(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">ปีการศึกษา</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={academicYear} 
                    onChange={(e) => setAcademicYear(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ครูผู้รับผิดชอบ/ผู้สอน</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={teacherName} 
                    onChange={(e) => setTeacherName(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">สถานะ ก.7-003</label>
                  <select 
                    className="form-control" 
                    value={k7003Status} 
                    onChange={(e) => setK7003Status(e.target.value)}
                    disabled={selectedPort && !canEdit}
                  >
                    <option value="รอตรวจ">รอตรวจ</option>
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ต้องแก้ไข">ต้องแก้ไข</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ชื่อพรรณไม้ที่ศึกษา</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={plantName} 
                    onChange={(e) => setPlantName(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">รหัสพรรณไม้ อพ.สธ.</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={plantCode} 
                    onChange={(e) => setPlantCode(e.target.value)} 
                    disabled={selectedPort && !canEdit}
                    required 
                  />
                </div>
              </div>

              {/* Uploads and attachments */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px 0' }}>📂 แนบไฟล์ผลงานสะสมงาน (เอกสาร/วิดีโอสูงสุด 10MB)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>1. ภาพวาดทางพฤกษศาสตร์ (ลายเส้น/สีน้ำ)</label>
                    <input type="file" accept="image/*" onChange={(e) => handlePortfolioFileChange(e.target.files[0], setDrawingFile, e.target, true)} style={{ fontSize: '0.75rem' }} />
                    {drawingFile && (
                      <div style={{ marginTop: '5px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ขนาด: {(drawingFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        <img src={URL.createObjectURL(drawingFile)} alt="Drawing Preview" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', marginTop: '3px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>2. แนบเอกสารใบงานย่อย (PDF หรือ รูปภาพ)</label>
                    <input type="file" accept=".pdf,image/*" onChange={(e) => handlePortfolioFileChange(e.target.files[0], setWorksheetFile, e.target, false)} style={{ fontSize: '0.75rem' }} />
                    {worksheetFile && (
                      <div style={{ marginTop: '5px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ขนาด: {(worksheetFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        {worksheetFile.type.startsWith('image/') && (
                          <img src={URL.createObjectURL(worksheetFile)} alt="Worksheet Preview" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', marginTop: '3px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>3. แนบรายงานโครงสร้างย่อย (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => handlePortfolioFileChange(e.target.files[0], setReportFile, e.target, false)} style={{ fontSize: '0.75rem' }} />
                    {reportFile && (
                      <div style={{ marginTop: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ขนาดไฟล์: {(reportFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>4. แนบไฟล์คลิปนำเสนอ (mp4)</label>
                    <input type="file" accept="video/mp4,video/*" onChange={(e) => handlePortfolioFileChange(e.target.files[0], setVideoFile, e.target, false)} style={{ fontSize: '0.75rem' }} />
                    {videoFile && (
                      <div style={{ marginTop: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ขนาดไฟล์: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher reviews options */}
              {canEdit && (
                <div style={{ backgroundColor: 'rgba(255,193,7,0.03)', border: '1px solid rgba(255,193,7,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gold)', margin: '0 0 10px 0' }}>📝 ความเห็นครูผู้ประเมินและการส่งงาน</h4>
                  <div className="form-group">
                    <label className="form-label">สถานะแฟ้มสะสมงานรวม</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="รอตรวจ">รอตรวจ (Pending Review)</option>
                      <option value="ผ่าน">ผ่าน (Approved)</option>
                      <option value="ต้องแก้ไข">ต้องแก้ไข (Needs Correction)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">คำแนะนำและข้อเสนอแนะครูผู้สอน</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={feedback} 
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="เช่น เพิ่มพิกัดสวนสมุนไพรทิศเหนือ หรือปรับน้ำหนักสีใบไม้ให้อ่อนลง..."
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกแฟ้มสะสมงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
