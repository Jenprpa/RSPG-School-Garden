import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileText, Save, Upload, CheckCircle, AlertTriangle, Link2, Eye, X, HelpCircle, Info, Edit3, Clipboard } from 'lucide-react';
import SystemAudit from './SystemAudit';

export default function SchoolAssessmentK7009({ userRole }) {
  // Sub Tabs
  const [activeSubTab, setActiveSubTab] = useState('general'); // general | criteria | audit

  // Loading / Saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // General School Info States
  const [schoolName, setSchoolName] = useState('โรงเรียนปายวิทยาคาร');
  const [location, setLocation] = useState('อำเภอปาย จังหวัดแม่ฮ่องสอน');
  const [educationLevels, setEducationLevels] = useState('มัธยมศึกษาตอนต้น - มัธยมศึกษาตอนปลาย');
  const [studentCount, setStudentCount] = useState(850);
  const [teacherCount, setTeacherCount] = useState(55);
  const [coordinator, setCoordinator] = useState('ครูสมเจตน์ สังข์ทอง');
  const [academicYear, setAcademicYear] = useState('2569');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Criteria & Evidence Mapping States
  const [criteria, setCriteria] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [evidence, setEvidence] = useState([]);
  
  // Modals / Selection States
  const [selectedCriteria, setSelectedCriteria] = useState(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [editingCrit, setEditingCrit] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [editStatus, setEditStatus] = useState('ยังไม่เริ่ม');
  const [editDesc, setEditDesc] = useState('');

  const docId = 'pai_wittyakarn';

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch School Info
      const docRef = doc(db, 'rspg_school_info', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchoolName(data.school_name || '');
        setLocation(data.location || '');
        setEducationLevels(data.education_levels || '');
        setStudentCount(data.student_count || 0);
        setTeacherCount(data.teacher_count || 0);
        setCoordinator(data.coordinator || '');
        setAcademicYear(data.academic_year || '');
        setActionDate(data.action_date || new Date().toISOString().split('T')[0]);
        setAttachmentUrl(data.attachment_url || '');
      }

      // 2. Fetch Criteria
      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const critList = [];
      critSnap.forEach(d => critList.push({ id: d.id, ...d.data() }));
      critList.sort((a, b) => a.criteria_id.localeCompare(b.criteria_id, undefined, { numeric: true }));
      setCriteria(critList);

      // 3. Fetch Mappings
      const mapSnap = await getDocs(collection(db, 'evidence_mapping'));
      const mapList = [];
      mapSnap.forEach(d => mapList.push({ id: d.id, ...d.data() }));
      setMappings(mapList);

      // 4. Fetch Central Evidence Vault
      const evSnap = await getDocs(collection(db, 'rspg_evidence_vault'));
      const evList = [];
      evSnap.forEach(d => evList.push({ id: d.id, ...d.data() }));
      setEvidence(evList);

    } catch (err) {
      console.error('Error loading school assessment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (file) => {
    if (!storage) return '';
    setUploading(true);
    try {
      const fileName = `assessments/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message);
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSchoolInfo = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') {
      alert('บทบาทผู้เยี่ยมชมไม่ได้รับอนุญาตให้แก้ไขข้อมูล');
      return;
    }
    setSaving(true);
    setStatus('กำลังบันทึกข้อมูล...');

    try {
      let finalUrl = attachmentUrl;
      if (uploadFile) {
        finalUrl = await handleFileUpload(uploadFile);
        if (finalUrl) {
          setAttachmentUrl(finalUrl);
        }
      }

      const payload = {
        school_name: schoolName,
        location: location,
        education_levels: educationLevels,
        student_count: parseInt(studentCount) || 0,
        teacher_count: parseInt(teacherCount) || 0,
        coordinator: coordinator,
        academic_year: academicYear,
        action_date: actionDate,
        attachment_url: finalUrl,
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'rspg_school_info', docId), payload, { merge: true });
      setStatus('บันทึกข้อมูลแบบประเมิน ก.7-009 เรียบร้อยแล้ว!');
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      setStatus('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCriteriaEdit = async (e) => {
    e.preventDefault();
    if (!editingCrit) return;
    
    try {
      const docRef = doc(db, 'rspg_evaluation_criteria', editingCrit.id);
      await updateDoc(docRef, {
        self_score: Number(editScore),
        status: editStatus,
        description: editDesc,
        updated_at: new Date().toISOString()
      });
      setEditingCrit(null);
      loadData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการแก้ไขตัวชี้วัด: ' + err.message);
    }
  };

  const openEvidenceModal = (crit) => {
    setSelectedCriteria(crit);
    setIsEvidenceModalOpen(true);
  };

  const openEditModal = (crit) => {
    setEditingCrit(crit);
    setEditScore(crit.self_score || 0);
    setEditStatus(crit.status || 'ยังไม่เริ่ม');
    setEditDesc(crit.description || '');
  };

  // Find linked documents in the central vault for a given criteria code
  const getLinkedEvidenceDocs = (critId) => {
    const linkedMappings = mappings.filter(m => m.criteria_id === critId);
    const docs = [];
    linkedMappings.forEach(map => {
      const docMatch = evidence.find(ev => ev.id === map.evidence_id);
      if (docMatch) {
        docs.push(docMatch);
      }
    });
    return docs;
  };

  const calculateTotalScore = () => {
    return criteria.reduce((sum, item) => sum + (item.self_score || 0), 0);
  };

  const calculateMaxPossibleScore = () => {
    return criteria.reduce((sum, item) => sum + (item.max_score || 0), 0);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลแบบประเมินสถานศึกษา...</div>;
  }

  const canEdit = ['admin', 'rspg_board', 'executive'].includes(userRole);

  return (
    <div>
      {/* Tab Selector Header */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ระบบตรวจประเมินตามมาตรฐาน อพ.สธ. ขั้นที่ 1 (ก.7-009 / เกณฑ์ประเมิน)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ตรวจสอบเอกสารประกอบคำขอรับเกียรติบัตร พิมพ์แผนผังหลักฐานที่เกี่ยวข้อง และตรวจสอบคุณภาพการดำเนินงานรายปี
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => setActiveSubTab('general')} 
              className={`btn ${activeSubTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            >
              📝 1. ข้อมูลทั่วไป ก.7-009
            </button>
            <button 
              onClick={() => setActiveSubTab('criteria')} 
              className={`btn ${activeSubTab === 'criteria' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            >
              📋 2. รายการ 15 ตัวชี้วัด
            </button>
            <button 
              onClick={() => setActiveSubTab('audit')} 
              className={`btn ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            >
              🔍 3. ตรวจสอบระบบบกพร่อง
            </button>
          </div>
        </div>
      </div>

      {/* GENERAL GENERAL SUB TAB */}
      {activeSubTab === 'general' && (
        <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main form */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h4 className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              รายละเอียดข้อมูลใบสมัครและโครงสร้างสถานศึกษา (ส่วนที่ 1)
            </h4>

            <form onSubmit={handleSaveSchoolInfo}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ชื่อสถานศึกษา (โรงเรียน)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ปีการศึกษาที่ขอประเมิน</label>
                  <input
                    type="text"
                    className="form-control"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                    placeholder="เช่น 2569"
                    disabled={userRole === 'visitor'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">สถานที่ตั้ง / จังหวัด</label>
                <input
                  type="text"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  disabled={userRole === 'visitor'}
                />
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">ระดับชั้นที่เปิดสอน</label>
                  <input
                    type="text"
                    className="form-control"
                    value={educationLevels}
                    onChange={(e) => setEducationLevels(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">จำนวนครู/บุคลากร (คน)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={teacherCount}
                    onChange={(e) => setTeacherCount(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">จำนวนนักเรียนทั้งหมด (คน)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ครูผู้ประสานงานหลัก</label>
                  <input
                    type="text"
                    className="form-control"
                    value={coordinator}
                    onChange={(e) => setCoordinator(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่ส่งใบสมัคร / อัปเดตข้อมูล</label>
                  <input
                    type="date"
                    className="form-control"
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                    required
                    disabled={userRole === 'visitor'}
                  />
                </div>
              </div>

              {/* Document Upload for complete G.7-009 */}
              <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <label className="form-label" style={{ fontWeight: 'bold' }}>แนบเอกสารขอประเมิน ก.7-009 ตัวเต็ม (PDF เท่านั้น)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '0.5rem' }}>
                  <input
                    type="file"
                    accept=".pdf"
                    id="pdf-upload"
                    style={{ display: 'none' }}
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    disabled={userRole === 'visitor' || uploading}
                  />
                  <label htmlFor="pdf-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={14} /> เลือกไฟล์ PDF
                  </label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {uploadFile ? uploadFile.name : attachmentUrl ? 'มีเอกสารแนบในระบบแล้ว' : 'ยังไม่ได้อัปโหลดไฟล์'}
                  </span>
                </div>
                {attachmentUrl && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    >
                      📂 คลิกเพื่อเปิดดูเอกสารที่อัปโหลดไว้
                    </a>
                  </div>
                )}
              </div>

              {status && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: status.includes('สำเร็จ') || status.includes('เรียบร้อย') ? 'rgba(46,125,50,0.1)' : 'rgba(2,136,209,0.1)',
                  color: status.includes('สำเร็จ') || status.includes('เรียบร้อย') ? 'var(--color-success)' : 'var(--color-info)',
                  fontSize: '0.88rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={16} />
                  <span>{status}</span>
                </div>
              )}

              {userRole !== 'visitor' && (
                <button type="submit" disabled={saving || uploading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}>
                  <Save size={16} />
                  <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล ก.7-009'}</span>
                </button>
              )}
            </form>
          </div>

          {/* Right Info Box */}
          <div className="card" style={{ gridColumn: 'span 1', backgroundColor: 'rgba(186,85,211,0.03)', border: '1px solid rgba(186,85,211,0.15)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💡 คำแนะนำการประเมิน
            </h4>
            <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-main)', lineHeight: 1.4 }}>
              <li><b>ข้อมูลสถานศึกษา</b> จะถูกนำไปใช้อัตโนมัติในการสร้างหน้าฟอร์มพิมพ์รายงานขอรับเกียรติบัตร ก.7-009 เพื่อเสนอ อพ.สธ.</li>
              <li>ควรเตรียมเอกสารแนบที่เป็น <b>โครงการแผนงานการประเมิน</b> หรือใบสมัครที่ลงลายมือชื่อของผู้อำนวยการเรียบร้อยแล้ว สแกนเป็น PDF และอัปโหลดเข้าระบบ</li>
              <li>สถิติจนวนครูและนักเรียนจะถูกใช้เป็นตัวคำนวณสัดส่วนชั่วโมงการทำกิจกรรมและการมีส่วนร่วมในรายงานสรุปบทเรียน</li>
            </ul>
          </div>
        </div>
      )}

      {/* CRITERIA SUB TAB */}
      {activeSubTab === 'criteria' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Banner */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
            <div>
              <h4 style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.2rem', margin: 0 }}>
                สรุปคะแนนประเมินตนเองตามมาตรฐานเกียรติบัตรขั้นที่ 1
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                ความต้องการขั้นต่ำผ่านเกณฑ์เสนอประเมิน: <b>400 / 500 คะแนน (80% ขึ้นไป)</b>
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>คะแนนประเมินตนเองสะสม:</span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-primary)', margin: 0 }}>
                  {calculateTotalScore()} / {calculateMaxPossibleScore()}
                </h3>
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                backgroundColor: calculateTotalScore() >= 400 ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.06)',
                color: calculateTotalScore() >= 400 ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                {calculateTotalScore() >= 400 ? '✓ ผ่านเกณฑ์ขั้นต่ำ' : '⚠️ คะแนนต่ำกว่าเกณฑ์ 80%'}
              </div>
            </div>
          </div>

          {/* Criteria Checklist Card */}
          <div className="card">
            <h4 style={{ fontWeight: 800, marginBottom: '1.25rem' }}>📋 เกณฑ์ชี้วัดหลัก 15 รายการ (จัดเก็บตามแบบฟอร์มประเมิน ก.7-009)</h4>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', width: '80px' }}>รหัสตัวชี้วัด</th>
                    <th style={{ padding: '0.75rem' }}>รายการมาตรฐานตัวชี้วัด</th>
                    <th style={{ padding: '0.75rem', width: '110px', textAlign: 'center' }}>คะแนนประเมิน</th>
                    <th style={{ padding: '0.75rem', width: '110px' }}>สถานะ</th>
                    <th style={{ padding: '0.75rem', width: '130px' }}>ผู้รับผิดชอบหลัก</th>
                    <th style={{ padding: '0.75rem', width: '220px', textAlign: 'center' }}>เอกสารหลักฐาน</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        ยังไม่มีข้อมูลตัวชี้วัดในระบบ (กรุณาไปที่หน้าตั้งค่าเพื่อนำเข้าข้อมูลทดสอบ)
                      </td>
                    </tr>
                  ) : (
                    criteria.map((crit) => {
                      const linkedDocs = getLinkedEvidenceDocs(crit.criteria_id);
                      return (
                        <tr key={crit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            ข้อ {crit.criteria_id}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{crit.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {crit.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {crit.self_score || 0} / {crit.max_score}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: crit.status === 'เสร็จสิ้น' ? 'rgba(46,125,50,0.06)' : 'rgba(255,152,0,0.06)',
                              color: crit.status === 'เสร็จสิ้น' ? 'var(--color-success)' : 'var(--color-gold)'
                            }}>
                              {crit.status || 'รออัปเดต'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                            {crit.responsible_person || '-'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              <button 
                                onClick={() => openEvidenceModal(crit)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.72rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  width: '100%',
                                  justifyContent: 'center'
                                }}
                              >
                                <Link2 size={12} />
                                <span>ดูหลักฐาน ({linkedDocs.length})</span>
                              </button>

                              {canEdit && (
                                <button 
                                  onClick={() => openEditModal(crit)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '0.72rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: '100%',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Edit3 size={12} />
                                  <span>แก้ไขเกณฑ์</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM AUDIT SUB TAB */}
      {activeSubTab === 'audit' && (
        <div style={{ marginTop: '1rem' }}>
          <SystemAudit />
        </div>
      )}

      {/* 1. Evidence Viewer Modal */}
      {isEvidenceModalOpen && selectedCriteria && (
        <div className="modal-overlay" onClick={() => setIsEvidenceModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                🔗 เอกสารหลักฐานที่เชื่อมโยง: ข้อ {selectedCriteria.criteria_id}
              </h3>
              <button onClick={() => setIsEvidenceModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>หัวข้อการประเมิน:</span>
              <h4 style={{ fontWeight: 800, margin: '2px 0 0 0' }}>{selectedCriteria.title}</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {selectedCriteria.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📂 บัญชีเอกสารหลักฐานอ้างอิง ({getLinkedEvidenceDocs(selectedCriteria.criteria_id).length} รายการ)</h5>
              
              {getLinkedEvidenceDocs(selectedCriteria.criteria_id).length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(211,47,47,0.04)',
                  border: '1px dashed rgba(211,47,47,0.2)',
                  borderRadius: '8px',
                  color: 'var(--color-danger)',
                  fontSize: '0.85rem'
                }}>
                  <AlertTriangle size={24} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <span>ยังไม่มีการผูกไฟล์เอกสารหลักฐานเข้าระบบสำหรับตัวชี้วัดนี้</span>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                    ผู้รับผิดชอบงานเอกสารสามารถดำเนินการเชื่อมโยงเอกสารคลังกลางได้ที่เมนู <b>"แผนผังหลักฐาน (Mapping)"</b>
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {getLinkedEvidenceDocs(selectedCriteria.criteria_id).map((docObj) => (
                    <div 
                      key={docObj.id} 
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-color)', 
                        backgroundColor: 'var(--bg-main)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ paddingRight: '15px' }}>
                        <span className="role-badge role-student" style={{ fontSize: '0.65rem', padding: '1px 4px', color: 'var(--color-primary)' }}>
                          {docObj.category}
                        </span>
                        <h5 style={{ fontSize: '0.82rem', fontWeight: 800, margin: '2px 0 0 0' }}>{docObj.title}</h5>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                          ผู้ดูแล: {docObj.responsible_person || '-'}
                        </p>
                      </div>
                      
                      {docObj.attachment_url ? (
                        <a 
                          href={docObj.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={12} />
                          <span>เปิดดูไฟล์</span>
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ไม่มีลิงก์</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setIsEvidenceModalOpen(false)} className="btn btn-secondary">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Criteria Editor Modal */}
      {editingCrit && (
        <div className="modal-overlay" onClick={() => setEditingCrit(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                📝 แก้ไขคะแนนประเมินตนเอง: ข้อ {editingCrit.criteria_id}
              </h3>
              <button onClick={() => setEditingCrit(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCriteriaEdit}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>หัวข้อเกณฑ์ประเมิน</label>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>{editingCrit.title}</p>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">คะแนนตนเอง (สูงสุด {editingCrit.max_score} คะแนน)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={editScore} 
                    onChange={(e) => setEditScore(Math.min(editingCrit.max_score, Math.max(0, parseInt(e.target.value) || 0)))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">สถานะการดำเนินงาน</label>
                  <select 
                    className="form-control" 
                    value={editStatus} 
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ยังไม่เริ่ม">ยังไม่เริ่ม</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                    <option value="ปรับปรุง">ปรับปรุง</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">บันทึกผลดำเนินงานย่อย / คำอธิบายหลักฐาน</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={editDesc} 
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="รายละเอียดการดำเนินงานเพื่อให้กรรมการประเมินอ่าน..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setEditingCrit(null)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกเกณฑ์</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
