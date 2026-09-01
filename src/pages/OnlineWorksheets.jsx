import { useState, useEffect, useCallback } from 'react';
import { db, storage, isFirebaseConfigured, compressImage, auth } from '../firebaseClient';
import { collection, getDocs, doc, addDoc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  FileText, CheckCircle2, AlertCircle, Clock,
  Trash2, Plus, Upload, MessageSquare, Save, Send, Eye, X, FileSpreadsheet
} from 'lucide-react';

export default function OnlineWorksheets({ userRole }) {
  // User Profile Identification
  const [activeName, setActiveName] = useState('ผู้ใช้ระบบ');
  const [activeEmail, setActiveEmail] = useState('user@email.com');
  const [activeRole, setActiveRole] = useState(userRole || 'visitor');

  useEffect(() => {
    const loadIdentity = async () => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        setActiveEmail(currentUser.email);
        setActiveRole(userRole || 'visitor');
        if (isFirebaseConfigured() && db) {
          try {
            const docSnap = await getDoc(doc(db, 'users', currentUser.email.trim().toLowerCase()));
            if (docSnap.exists()) {
              setActiveName(docSnap.data().name || 'ผู้ใช้ระบบ');
            }
          } catch (e) {
            console.error('Error fetching worksheet user profile:', e);
          }
        }
      } else {
        // Fallback for guest/anonymous
        setActiveEmail('guest@email.com');
        setActiveName('ผู้ประสงค์ดี (Guest)');
        setActiveRole('visitor');
      }
    };
    loadIdentity();
  }, [userRole]);

  const isStudent = activeRole === 'student';

  // State Management
  const [loading, setLoading] = useState(true);
  const [worksheets, setWorksheets] = useState([]); // All submissions in Firestore
  const [activeSheet, setActiveSheet] = useState(null); // Currently editing worksheet
  const [activeSubTab, setActiveSubTab] = useState(0); // Sub-tab index inside worksheet editor
  const [selectedSubmission, setSelectedSubmission] = useState(null); // Selected submission for teacher review
  const [showCommentModal, setShowCommentModal] = useState(null); // Show comments modal
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Teacher Review inputs
  const [reviewScore, setReviewScore] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // File Uploading States
  const [uploadingFile, setUploadingFile] = useState(null); // key of field uploading

  // Default Initial Data for New Worksheets
  const getInitialWorksheetData = (type) => {
    const commonInfo = {
      plant_name: '',
      scientific_name: '',
      family_name: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      partners: ''
    };

    if (type === 1) {
      return {
        ...commonInfo,
        morphology: { topic: '', method: '', result: '', summary: '', file_url: '' },
        properties: { topic: '', method: '', result: '', summary: '', file_url: '' },
        behavior: { topic: '', method: '', result: '', summary: '', file_url: '' }
      };
    } else if (type === 2) {
      return {
        ...commonInfo,
        biotic_factors: [],
        abiotic_factors: [],
        balance_summary: '',
        evidence_url: ''
      };
    } else {
      return {
        ...commonInfo,
        learning_result: '',
        potential: '',
        value_of_potential: '',
        concept: '',
        guidelines: '',
        application_method: '',
        summary_benefit: '',
        evidence_url: ''
      };
    }
  };

  const loadWorksheets = useCallback(async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q;
      if (isStudent) {
        // Students only see their own worksheets
        q = query(collection(db, 'rspg_online_worksheets'), where('student_email', '==', activeEmail));
      } else {
        // Teachers see everything
        q = collection(db, 'rspg_online_worksheets');
      }
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort by updated_at descending
      list.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      setWorksheets(list);
    } catch (err) {
      console.error('Error loading worksheets:', err);
    } finally {
      setLoading(false);
    }
  }, [isStudent, activeEmail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorksheets();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWorksheets]);

  // Helper: Status label & styling
  const getStatusInfo = (status) => {
    switch (status) {
      case 'submitted':
        return { label: 'ส่งแล้ว (รอตรวจ)', color: '#2EA8FF', bg: 'rgba(46,168,255,0.08)', border: 'rgba(46,168,255,0.2)', icon: Clock };
      case 'approved':
        return { label: 'ครูตรวจแล้ว', color: '#5DAF69', bg: 'rgba(93,175,105,0.08)', border: 'rgba(93,175,105,0.2)', icon: CheckCircle2 };
      case 'needs_revision':
        return { label: 'ต้องแก้ไข', color: '#E74C3C', bg: 'rgba(231,76,60,0.08)', border: 'rgba(231,76,60,0.2)', icon: AlertCircle };
      case 'draft':
      default:
        return { label: 'กำลังทำ (แบบร่าง)', color: '#B17C45', bg: 'rgba(177,124,69,0.08)', border: 'rgba(177,124,69,0.2)', icon: EditIcon };
    }
  };

  const getSheetName = (type) => {
    switch (type) {
      case 1: return 'ธรรมชาติแห่งชีวิต (สาระที่ 1)';
      case 2: return 'สรรพสิ่งล้วนพันเกี่ยว (สาระที่ 2)';
      case 3: return 'ประโยชน์แท้แก่มหาชน (สาระที่ 3)';
      default: return 'ใบงานสวนพฤกษศาสตร์';
    }
  };

  const EditIcon = (props) => <FileText size={props.size || 16} />;

  // File Upload Helper
  const handleFileUpload = async (e, pathKey) => {
    const file = e.target.files[0];
    if (!file || !storage) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ที่ขนาดเล็กลง');
      return;
    }

    setUploadingFile(pathKey);
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop() || 'jpg';
      const fileName = `worksheets_evidence/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Deep copy activeSheet and update the specific file url path
      const updated = { ...activeSheet };

      if (pathKey.includes('.')) {
        const [parent, child] = pathKey.split('.');
        updated.data[parent][child] = downloadUrl;
      } else {
        updated.data[pathKey] = downloadUrl;
      }

      setActiveSheet(updated);
      setStatusMsg('✅ อัปโหลดไฟล์หลักฐานสำเร็จ!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
    } finally {
      setUploadingFile(null);
    }
  };

  // Student Actions
  const handleStartWorksheet = (type) => {
    const existing = worksheets.find(w => w.worksheet_type === type && w.student_email === activeEmail);
    if (existing) {
      setActiveSheet(JSON.parse(JSON.stringify(existing)));
    } else {
      setActiveSheet({
        student_name: activeName,
        student_email: activeEmail,
        worksheet_type: type,
        status: 'draft',
        score: null,
        teacher_comments: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data: getInitialWorksheetData(type)
      });
    }
    setActiveSubTab(0);
  };

  const handleSaveDraft = async () => {
    if (!activeSheet) return;
    setStatusMsg('กำลังบันทึกแบบร่าง...');
    try {
      const payload = {
        ...activeSheet,
        status: 'draft',
        updated_at: new Date().toISOString()
      };

      if (payload.id) {
        await updateDoc(doc(db, 'rspg_online_worksheets', payload.id), payload);
      } else {
        const docRef = await addDoc(collection(db, 'rspg_online_worksheets'), payload);
        setActiveSheet(prev => ({ ...prev, id: docRef.id }));
      }

      setStatusMsg('✅ บันทึกแบบร่างสำเร็จ!');
      setTimeout(() => setStatusMsg(''), 3000);
      loadWorksheets();
    } catch (err) {
      alert('บันทึกร่างล้มเหลว: ' + err.message);
    }
  };

  const handleSubmitWorksheet = async () => {
    if (!activeSheet) return;
    if (!window.confirm('คุณต้องการส่งใบงานนี้ให้ครูตรวจประเมินใช่หรือไม่? หลังจากส่งแล้วจะไม่สามารถแก้ไขได้ชั่วคราวจนกว่าครูจะส่งกลับมาให้แก้ไข')) return;

    setStatusMsg('กำลังส่งใบงาน...');
    try {
      const payload = {
        ...activeSheet,
        status: 'submitted',
        updated_at: new Date().toISOString()
      };

      if (payload.id) {
        await updateDoc(doc(db, 'rspg_online_worksheets', payload.id), payload);
      } else {
        await addDoc(collection(db, 'rspg_online_worksheets'), payload);
      }

      setStatusMsg('✅ ส่งใบงานสำเร็จ! รอผลการตรวจจากคุณครู');
      setTimeout(() => setStatusMsg(''), 4000);
      setActiveSheet(null);
      loadWorksheets();
    } catch (err) {
      alert('ส่งใบงานล้มเหลว: ' + err.message);
    }
  };

  // Teacher Review Actions
  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSubmittingReview(true);
    try {
      const payload = {
        status: reviewStatus,
        score: reviewScore ? Number(reviewScore) : null,
        teacher_comments: reviewComment,
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'rspg_online_worksheets', selectedSubmission.id), payload);
      setStatusMsg('✅ บันทึกผลการตรวจและสะท้อนกลับเรียบร้อยแล้ว!');
      setTimeout(() => setStatusMsg(''), 3000);
      setSelectedSubmission(null);
      loadWorksheets();
    } catch (err) {
      alert('บันทึกผลการตรวจล้มเหลว: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter Submissions
  const filteredWorksheets = worksheets.filter(w => {
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchType = typeFilter === 'all' || w.worksheet_type === Number(typeFilter);
    const matchSearch = w.student_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
                        w.student_email.toLowerCase().includes(searchStudent.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดระบบใบงานออนไลน์...</div>;

  return (
    <div>
      {/* Header Info */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileSpreadsheet size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ระบบใบงานพฤกษศาสตร์ออนไลน์ (Interactive Worksheets)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isStudent
                  ? `ผู้บันทึก: ${activeName} (${activeEmail}) — บันทึกข้อมูลและส่งใบงาน 3 สาระในแบบออนไลน์`
                  : `ผู้ประเมิน: ${activeName} — ตรวจผลงานใบงานวิจัย 3 สาระและสถิติการส่งงานของนักเรียน`
                }
              </p>
            </div>
          </div>
          {statusMsg && (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
              {statusMsg}
            </span>
          )}
        </div>
      </div>

      {/* RENDER STUDENT VIEW */}
      {isStudent && !activeSheet && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(type => {
            const docItem = worksheets.find(w => w.worksheet_type === type);
            const statusInfo = getStatusInfo(docItem?.status || 'not_started');
            const Icon = statusInfo.icon;

            return (
              <div key={type} className="card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', minHeight: '230px', position: 'relative', overflow: 'hidden' }}>
                {/* Visual indicator bar top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: statusInfo.color }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.border}`,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Icon size={12} /> {statusInfo.label}
                    </span>
                    {docItem?.score !== null && docItem?.score !== undefined && (
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        คะแนน: {docItem.score} คะแนน
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                    ใบงานชุดที่ {type}: {getSheetName(type).split(' (')[0]}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '12px' }}>
                    {type === 1 && 'ศึกษาบันทึกข้อมูลลักษณะพรรณไม้เฉพาะต้น วิเคราะห์รูปลักษณ์คุณสมบัติ และพฤติกรรมสะท้อนชีวิตตน'}
                    {type === 2 && 'บันทึกความเกี่ยวพันของพืชศึกษาศึกษากับปัจจัยชีวภาพ (สิ่งมีชีวิต) กายภาพ (สิ่งไม่มีชีวิต) และดุลยภาพนิเวศ'}
                    {type === 3 && 'การนำข้อมูลพรรณไม้ทั้งหมดมาสะท้อนคุณค่า ศักยภาพ และแนวทางการนำมาสร้างนวัตกรรมเพื่อส่วนรวม'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Actions based on status */}
                    {(!docItem || docItem.status === 'draft' || docItem.status === 'needs_revision') ? (
                      <button
                        onClick={() => handleStartWorksheet(type)}
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {docItem ? '🛠️ ทำงานต่อ' : '🚀 เริ่มทำใบงาน'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveSheet(docItem);
                          // Read-only viewing Mode
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={12} /> ดูชิ้นงานที่ส่ง
                      </button>
                    )}

                    {docItem?.teacher_comments && (
                      <button
                        onClick={() => setShowCommentModal(docItem)}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="ดูความคิดเห็นครู"
                      >
                        <MessageSquare size={14} color="var(--color-primary)" />
                      </button>
                    )}
                  </div>
                  {docItem && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      อัปเดตล่าสุด: {new Date(docItem.updated_at).toLocaleDateString('th-TH')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT FORM EDITOR VIEW */}
      {isStudent && activeSheet && (
        <div className="card" style={{ border: `1.5px solid ${activeSheet.id ? 'var(--border-color)' : 'var(--color-primary-300)'}` }}>
          {/* Form Top Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                โหมดกรอกข้อมูลพฤกษศาสตร์ออนไลน์
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0' }}>
                ✏️ ใบงานชุดที่ {activeSheet.worksheet_type}: {getSheetName(activeSheet.worksheet_type)}
              </h4>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={14} /> บันทึกแบบร่าง
                  </button>
                  <button
                    onClick={handleSubmitWorksheet}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={14} /> ส่งใบงานให้ครูตรวจ
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveSheet(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
              >
                ย้อนกลับ
              </button>
            </div>
          </div>

          {/* Locked Status warning */}
          {activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision' && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(93,175,105,0.06)',
              border: '1px solid rgba(93,175,105,0.2)',
              borderRadius: '8px',
              color: 'var(--color-success)',
              fontSize: '0.82rem',
              marginBottom: '1.5rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              ใบงานนี้ถูกส่งเรียบร้อยแล้วและอยู่ในสถานะตรวจสอบ (Read-Only) คุณไม่สามารถแก้ไขได้จนกว่าครูจะปรับสถานะให้ส่งกลับมาแก้ไข
            </div>
          )}

          {/* Section 1: Common Plant Info */}
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <h5 style={{ fontWeight: 800, marginBottom: '1rem', color: 'var(--color-primary)' }}>ℹ️ ข้อมูลพืชศึกษา / ปริบทการสำรวจ</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ชื่อพืชศึกษา</label>
                <input
                  type="text"
                  className="form-control"
                  value={activeSheet.data.plant_name}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.plant_name = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  placeholder="เช่น กัลปพฤกษ์"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ชื่อวิทยาศาสตร์</label>
                <input
                  type="text"
                  className="form-control"
                  value={activeSheet.data.scientific_name}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.scientific_name = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  placeholder="Cassia bakeriana Craib"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ชื่อวงศ์</label>
                <input
                  type="text"
                  className="form-control"
                  value={activeSheet.data.family_name}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.family_name = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  placeholder="FABACEAE"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>สถานที่พบที่ศึกษา</label>
                <input
                  type="text"
                  className="form-control"
                  value={activeSheet.data.location}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.location = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  placeholder="เช่น สวนอพ.สธ. หน้าตึกวิทย์"
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>วันที่ศึกษา</label>
                <input
                  type="date"
                  className="form-control"
                  value={activeSheet.data.date}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.date = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>เพื่อนผู้ร่วมเรียนรู้ / ผู้ร่วมกิจกรรม</label>
                <input
                  type="text"
                  className="form-control"
                  value={activeSheet.data.partners}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.partners = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  placeholder="ระบุรายชื่อเพื่อนร่วมชั้นเรียน..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Worksheet Type-Specific Fields */}

          {/* WORKSHEET 1 FIELDS (ธรรมชาติแห่งชีวิต) */}
          {activeSheet.worksheet_type === 1 && (
            <div>
              {/* Inner Sub-navigation tabs (Morphology, Properties, Behavior) */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1.5px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '4px' }}>
                {['รูปลักษณ์ของพืช', 'คุณสมบัติของพืช', 'พฤติกรรมของพืช'].map((tabName, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSubTab(idx)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: activeSubTab === idx ? 800 : 500,
                      color: activeSubTab === idx ? 'var(--color-primary)' : 'var(--text-muted)',
                      borderBottom: activeSubTab === idx ? '2px solid var(--color-primary)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tabName}
                  </button>
                ))}
              </div>

              {/* Active Tab Form Fields */}
              {['morphology', 'properties', 'behavior'].map((fieldKey, idx) => {
                if (activeSubTab !== idx) return null;
                const formSection = activeSheet.data[fieldKey];
                const labelName = idx === 0 ? 'รูปลักษณ์' : idx === 1 ? 'คุณสมบัติ' : 'พฤติกรรม';

                return (
                  <div key={fieldKey} style={{ animation: 'fadeIn 0.25s' }}>
                    <h5 style={{ fontWeight: 800, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                      🔬 ด้านที่ {idx + 1}: {labelName}
                    </h5>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>เรื่องที่ต้องการศึกษา / ประเด็นย่อย</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ระบุสิ่งย่อยที่มุ่งเรียนรู้..."
                          value={formSection.topic}
                          onChange={(e) => {
                            const copy = { ...activeSheet };
                            copy.data[fieldKey].topic = e.target.value;
                            setActiveSheet(copy);
                          }}
                          disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>วิธีการศึกษาเรียนรู้</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="เช่น สังเกต วัดขนาด สัมผัส ดมกลิ่น"
                          value={formSection.method}
                          onChange={(e) => {
                            const copy = { ...activeSheet };
                            copy.data[fieldKey].method = e.target.value;
                            setActiveSheet(copy);
                          }}
                          disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ผลการศึกษาเรียนรู้ (ละเอียด)</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="กรอกลักษณะเด่น โครงสร้าง สี รูปร่าง ที่ตรวจพบ..."
                        value={formSection.result}
                        onChange={(e) => {
                          const copy = { ...activeSheet };
                          copy.data[fieldKey].result = e.target.value;
                          setActiveSheet(copy);
                        }}
                        disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>สรุปองค์ความรู้ / เปรียบเทียบสะท้อนคุณธรรมเข้าหาชีวิตตน</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="เช่น การปรับตัวของพฤกษศาสตร์ต้นไม้ สอนใจให้เราเติบโตได้อย่างไร..."
                        value={formSection.summary}
                        onChange={(e) => {
                          const copy = { ...activeSheet };
                          copy.data[fieldKey].summary = e.target.value;
                          setActiveSheet(copy);
                        }}
                        disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                        required
                      />
                    </div>

                    {/* Upload illustration for this sub-section */}
                    <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={14} color="var(--color-primary)" /> อัปโหลดภาพประกอบการศึกษาด้าน {labelName} (จำกัดไม่เกิน 10MB)
                      </label>

                      {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) ? (
                        <input
                          type="file"
                          accept="image/*"
                          className="form-control"
                          onChange={(e) => handleFileUpload(e, `${fieldKey}.file_url`)}
                          disabled={uploadingFile !== null}
                          style={{ padding: '0.35rem 0.5rem', maxWidth: '350px' }}
                        />
                      ) : null}

                      {uploadingFile === `${fieldKey}.file_url` && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'block', marginTop: '5px' }}>
                          ⏳ กำลังอัปโหลดภาพประกอบ...
                        </span>
                      )}

                      {formSection.file_url && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-nature)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>ภาพประกอบปัจจุบัน:</span>
                          <a href={formSection.file_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={formSection.file_url}
                              alt={`Illustration ${labelName}`}
                              style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'contain' }}
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WORKSHEET 2 FIELDS (สรรพสิ่งล้วนพันเกี่ยว) */}
          {activeSheet.worksheet_type === 2 && (
            <div>
              {/* Inner Sub-navigation (Biotic Factors, Abiotic Factors, Summary) */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1.5px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '4px' }}>
                {['ปัจจัยชีวภาพ (สิ่งมีชีวิต)', 'ปัจจัยกายภาพ (สิ่งไม่มีชีวิต)', 'สรุปดุลยภาพนิเวศวิทยา'].map((tabName, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSubTab(idx)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: activeSubTab === idx ? 800 : 500,
                      color: activeSubTab === idx ? 'var(--color-primary)' : 'var(--text-muted)',
                      borderBottom: activeSubTab === idx ? '2px solid var(--color-primary)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tabName}
                  </button>
                ))}
              </div>

              {/* Sub-tab 0 & 1: Factor Tables (Biotic / Abiotic) */}
              {(activeSubTab === 0 || activeSubTab === 1) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h5 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)', margin: 0 }}>
                      📊 บันทึกปัจจัย{activeSubTab === 0 ? 'ชีวภาพ (Biotic Factors)' : 'กายภาพ (Abiotic Factors)'} ที่เข้ามาเกี่ยวพันกับพืชศึกษา
                    </h5>
                    {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const copy = { ...activeSheet };
                          const targetKey = activeSubTab === 0 ? 'biotic_factors' : 'abiotic_factors';
                          copy.data[targetKey].push({
                            name: '', time: '09:00', location: 'ที่ต้นพืช', count: '1', description: '', interrelation: '', relationship: '', attachment: ''
                          });
                          setActiveSheet(copy);
                        }}
                      >
                        <Plus size={12} /> เพิ่มปัจจัยย่อย
                      </button>
                    )}
                  </div>

                  {/* Table rendering factors */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '850px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                          <th style={{ padding: '8px', textAlign: 'left', width: '120px' }}>ชื่อปัจจัย</th>
                          <th style={{ padding: '8px', textAlign: 'left', width: '90px' }}>เวลา / จุดพบ</th>
                          <th style={{ padding: '8px', textAlign: 'left', width: '80px' }}>จำนวน/ลักษณะ</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>รายละเอียดความเกี่ยวพัน / ความสัมพันธ์ / ความผูกพัน</th>
                          {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) ? (
                            <th style={{ padding: '8px', textAlign: 'center', width: '70px' }}>ลบ</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {((activeSubTab === 0 ? activeSheet.data.biotic_factors : activeSheet.data.abiotic_factors) || []).map((factor, fIdx) => {
                          const targetKey = activeSubTab === 0 ? 'biotic_factors' : 'abiotic_factors';

                          return (
                            <tr key={fIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder={activeSubTab === 0 ? "มดดำ, ผึ้ง, นกเขา" : "ดินร่วน, แสงแดด, หิน"}
                                  value={factor.name}
                                  onChange={(e) => {
                                    const copy = { ...activeSheet };
                                    copy.data[targetKey][fIdx].name = e.target.value;
                                    setActiveSheet(copy);
                                  }}
                                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                  style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="09:30น."
                                  value={factor.time}
                                  onChange={(e) => {
                                    const copy = { ...activeSheet };
                                    copy.data[targetKey][fIdx].time = e.target.value;
                                    setActiveSheet(copy);
                                  }}
                                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                  style={{ padding: '3px 6px', fontSize: '0.78rem', marginBottom: '4px' }}
                                />
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="กิ่งไม้"
                                  value={factor.location}
                                  onChange={(e) => {
                                    const copy = { ...activeSheet };
                                    copy.data[targetKey][fIdx].location = e.target.value;
                                    setActiveSheet(copy);
                                  }}
                                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                  style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="5 ตัว"
                                  value={factor.count}
                                  onChange={(e) => {
                                    const copy = { ...activeSheet };
                                    copy.data[targetKey][fIdx].count = e.target.value;
                                    setActiveSheet(copy);
                                  }}
                                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                  style={{ padding: '3px 6px', fontSize: '0.78rem', marginBottom: '4px' }}
                                />
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="สีดำ"
                                  value={factor.description}
                                  onChange={(e) => {
                                    const copy = { ...activeSheet };
                                    copy.data[targetKey][fIdx].description = e.target.value;
                                    setActiveSheet(copy);
                                  }}
                                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                  style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ความเกี่ยวพัน: เข้ามารับน้ำหวานจากเกสรดอกไม้"
                                    value={factor.interrelation}
                                    onChange={(e) => {
                                      const copy = { ...activeSheet };
                                      copy.data[targetKey][fIdx].interrelation = e.target.value;
                                      setActiveSheet(copy);
                                    }}
                                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                    style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                  />
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ความสัมพันธ์: เกื้อกูลช่วยผสมเกสรพรรณไม้"
                                    value={factor.relationship}
                                    onChange={(e) => {
                                      const copy = { ...activeSheet };
                                      copy.data[targetKey][fIdx].relationship = e.target.value;
                                      setActiveSheet(copy);
                                    }}
                                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                    style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                  />
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ความผูกพัน: พึ่งพิงแหล่งอาหารทำให้ระบบนิเวศมีผลพวงยั่งยืน"
                                    value={factor.attachment}
                                    onChange={(e) => {
                                      const copy = { ...activeSheet };
                                      copy.data[targetKey][fIdx].attachment = e.target.value;
                                      setActiveSheet(copy);
                                    }}
                                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                                    style={{ padding: '3px 6px', fontSize: '0.78rem' }}
                                  />
                                </div>
                              </td>
                              {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) ? (
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                                    onClick={() => {
                                      const copy = { ...activeSheet };
                                      copy.data[targetKey].splice(fIdx, 1);
                                      setActiveSheet(copy);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                        {((activeSubTab === 0 ? activeSheet.data.biotic_factors : activeSheet.data.abiotic_factors) || []).length === 0 && (
                          <tr>
                            <td colSpan={activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id ? 5 : 4} style={{ padding: '2rem', textStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center' }}>
                              ยังไม่มีการบันทึกรายการดัชนีปัจจัยศึกษาย่อย (กรุณากดปุ่ม "เพิ่มปัจจัยย่อย" ด้านบนขวาเพื่อบันทึกข้อมูล)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Summary Balance & Evidence Upload */}
              {activeSubTab === 2 && (
                <div style={{ animation: 'fadeIn 0.25s' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>บทวิเคราะห์และสรุปดุลยภาพความเกี่ยวพันรอบพืชศึกษา</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="เขียนบรรยายองค์รวมความเชื่อมโยงของปัจจัยชีวภาพและกายภาพ ที่ส่งผลต่อการดำรงอยู่และความสมดุลของพืชศึกษาต้นนี้..."
                      value={activeSheet.data.balance_summary}
                      onChange={(e) => {
                        const copy = { ...activeSheet };
                        copy.data.balance_summary = e.target.value;
                        setActiveSheet(copy);
                      }}
                      disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                      required
                    />
                  </div>

                  {/* Upload photo or video evidence */}
                  <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={14} color="var(--color-primary)" /> อัปโหลดหลักฐานพิกัดหรือวีดิโอ/ภาพถ่ายความพันเกี่ยว (จำกัดไม่เกิน 10MB)
                    </label>

                    {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) ? (
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e) => handleFileUpload(e, 'evidence_url')}
                        disabled={uploadingFile !== null}
                        style={{ padding: '0.35rem 0.5rem', maxWidth: '350px' }}
                      />
                    ) : null}

                    {uploadingFile === 'evidence_url' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'block', marginTop: '5px' }}>
                        ⏳ กำลังอัปโหลดหลักฐาน...
                      </span>
                    )}

                    {activeSheet.data.evidence_url && (
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-nature)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>หลักฐานอัปโหลดปัจจุบัน:</span>
                        <a href={activeSheet.data.evidence_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                          📂 เปิดดูไฟล์หลักฐานความพันเกี่ยว
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKSHEET 3 FIELDS (ประโยชน์แท้แก่มหาชน) */}
          {activeSheet.worksheet_type === 3 && (
            <div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(186,85,211,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                💡 <b>คำอธิบายใบงานสาระที่ 3</b>: นำการวิเคราะห์สัณฐานพืชและคุณสมบัติเด่นของต้นไม้ที่เราศึกษาจากใบงานก่อนหน้านี้มาสกัดศักยภาพ และหาคุณค่า/ประโยชน์ที่จะมอบให้แก่มหาชน ทั้งในทางวิชาการ ความดีงาม การต่อยอดด้านนวัตกรรม และการศึกษา
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ผลการเรียนรู้ / ผลึกความรู้หลัก</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น เรียนรู้เรื่องสารสกัดธรรมชาติในเปลือกไม้"
                    value={activeSheet.data.learning_result}
                    onChange={(e) => {
                      const copy = { ...activeSheet };
                      copy.data.learning_result = e.target.value;
                      setActiveSheet(copy);
                    }}
                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ศักยภาพสูงสุดของพืชศึกษา</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ความยืดหยุ่นของเส้นใยเปลือกไม้"
                    value={activeSheet.data.potential}
                    onChange={(e) => {
                      const copy = { ...activeSheet };
                      copy.data.potential = e.target.value;
                      setActiveSheet(copy);
                    }}
                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>คุณของศักยภาพ (ประโยชน์ทางอ้อม / ความลึกซึ้ง)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="สกัดคุณค่าแฝงที่จะพัฒนาสิ่งแวดล้อมหรือภูมิปัญญาชุมชน..."
                  value={activeSheet.data.value_of_potential}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.value_of_potential = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>แนวคิดการสรรค์สร้างสิ่งใหม่ (Concept Design)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ออกแบบกระดาษสาใยกัลปพฤกษ์สำหรับงานศิลปะ"
                    value={activeSheet.data.concept}
                    onChange={(e) => {
                      const copy = { ...activeSheet };
                      copy.data.concept = e.target.value;
                      setActiveSheet(copy);
                    }}
                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>แนวทางเชิงกลยุทธ์/การขยายผล</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น เผยแพร่สู่วิสาหกิจชุมชนและครูสอนศิลปะ"
                    value={activeSheet.data.guidelines}
                    onChange={(e) => {
                      const copy = { ...activeSheet };
                      copy.data.guidelines = e.target.value;
                      setActiveSheet(copy);
                    }}
                    disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>วิธีการ/ขั้นตอนการนำไปใช้ประโยชน์ในเชิงปฏิบัติ</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="เขียนอธิบายลำดับขั้นกระบวนการการนำไอเดียการต่อยอดไปสู่การใช้งานได้จริงแก่มหาชน..."
                  value={activeSheet.data.application_method}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.application_method = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>สรุปประโยชน์แท้แก่มหาชน (สะท้อนผลลัพธ์เพื่อประโยชน์สูงสุดต่อสาธารณะ)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="สะท้อนผลลัพธ์ว่าชิ้นงานหรือแนวทางนี้ สามารถสร้างสรรค์ความสุข ความเจริญ หรือลดภาระมลภาวะให้แก่ผู้คนส่วนรวมได้อย่งไร..."
                  value={activeSheet.data.summary_benefit}
                  onChange={(e) => {
                    const copy = { ...activeSheet };
                    copy.data.summary_benefit = e.target.value;
                    setActiveSheet(copy);
                  }}
                  disabled={activeSheet.id && activeSheet.status !== 'draft' && activeSheet.status !== 'needs_revision'}
                  required
                />
              </div>

              {/* Upload sketch, product or file */}
              <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={14} color="var(--color-primary)" /> อัปโหลดภาพร่าง/ชิ้นงาน หรือไฟล์หลักฐานนวัตกรรม (จำกัดไม่เกิน 10MB)
                </label>

                {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) ? (
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => handleFileUpload(e, 'evidence_url')}
                    disabled={uploadingFile !== null}
                    style={{ padding: '0.35rem 0.5rem', maxWidth: '350px' }}
                  />
                ) : null}

                {uploadingFile === 'evidence_url' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'block', marginTop: '5px' }}>
                    ⏳ กำลังอัปโหลดหลักฐาน...
                  </span>
                )}

                {activeSheet.data.evidence_url && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-nature)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>ผลงาน/ภาพนวัตกรรมปัจจุบัน:</span>
                    <a href={activeSheet.data.evidence_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={activeSheet.data.evidence_url}
                        alt="Product Sketch or Evidence"
                        style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'contain' }}
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Bottom Save Actions */}
          {(activeSheet.status === 'draft' || activeSheet.status === 'needs_revision' || !activeSheet.id) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button
                onClick={handleSaveDraft}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> บันทึกแบบร่าง
              </button>
              <button
                onClick={handleSubmitWorksheet}
                className="btn btn-primary"
                style={{ padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={16} /> ส่งผลงานให้ครูตรวจ
              </button>
            </div>
          )}
        </div>
      )}

      {/* TEACHER DASHBOARD VIEW */}
      {!isStudent && !selectedSubmission && (
        <div>
          {/* Filters card */}
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ minWidth: '150px' }}>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '0.45rem', fontSize: '0.85rem' }}
                >
                  <option value="all">กรองทุกสถานะ</option>
                  <option value="submitted">ส่งแล้ว (รอตรวจ)</option>
                  <option value="approved">ครูตรวจแล้ว</option>
                  <option value="needs_revision">ต้องแก้ไข</option>
                  <option value="draft">กำลังทำ (แบบร่าง)</option>
                </select>
              </div>

              <div style={{ minWidth: '180px' }}>
                <select
                  className="form-control"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ padding: '0.45rem', fontSize: '0.85rem' }}
                >
                  <option value="all">กรองตามประเภทใบงาน</option>
                  <option value="1">ใบงานที่ 1: ธรรมชาติแห่งชีวิต</option>
                  <option value="2">ใบงานที่ 2: สรรพสิ่งล้วนพันเกี่ยว</option>
                  <option value="3">ใบงานที่ 3: ประโยชน์แท้แก่มหาชน</option>
                </select>
              </div>

              <div style={{ minWidth: '220px', flex: 1 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาตามชื่อนักเรียน หรืออีเมล..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  style={{ padding: '0.45rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <button
              onClick={loadWorksheets}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            >
              🔄 รีเฟรชข้อมูล
            </button>
          </div>

          {/* Submissions list */}
          <div className="card">
            <h4 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📁 รายการใบงานและประวัติการส่งงานนักเรียน ({filteredWorksheets.length})
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>ชื่อนักเรียน</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>ใบงานที่ส่ง</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>พืชที่ศึกษา</th>
                    <th style={{ padding: '10px', textAlign: 'center', width: '150px' }}>สถานะ</th>
                    <th style={{ padding: '10px', textAlign: 'center', width: '100px' }}>คะแนน</th>
                    <th style={{ padding: '10px', textAlign: 'right', width: '120px' }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorksheets.map(item => {
                    const statusInfo = getStatusInfo(item.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>{item.student_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.student_email}</div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 500 }}>ใบงานที่ {item.worksheet_type}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{getSheetName(item.worksheet_type).split(' (')[0]}</div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>
                          {item.data?.plant_name || '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.border}`,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <StatusIcon size={12} /> {statusInfo.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                          {item.score !== null ? `${item.score}` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedSubmission(item);
                              setReviewScore(item.score !== null ? String(item.score) : '');
                              setReviewStatus(item.status === 'submitted' ? 'approved' : item.status);
                              setReviewComment(item.teacher_comments || '');
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            {activeRole === 'evaluator' ? <Eye size={12} /> : <FileText size={12} />}
                            {activeRole === 'evaluator' ? 'ดูผลงาน' : 'ตรวจงาน'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWorksheets.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ไม่พบข้อมูลผลงานการส่งใบงานของนักเรียนในตัวกรองนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER REVIEW MODAL / DETAIL VIEW */}
      {!isStudent && selectedSubmission && (
        <div className="card" style={{ border: '2px solid var(--color-primary-400)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                โหมดตรวจและให้คะแนนใบงาน
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 0 0' }}>
                🔍 ตรวจงานนักเรียน: {selectedSubmission.student_name}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>อีเมล: {selectedSubmission.student_email}</span>
            </div>

            <button
              onClick={() => setSelectedSubmission(null)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              กลับหน้ากระดาน
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '2rem' }} className="rspg-progress-grid">

            {/* Left side: Student responses representation */}
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <h5 style={{ fontWeight: 800, margin: '0 0 8px 0', color: 'var(--color-primary)', fontSize: '0.88rem' }}>ℹ️ ข้อมูลพืชศึกษาและข้อมูลสำรวจ</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                  <div><b>ชื่อพืชศึกษา:</b> {selectedSubmission.data?.plant_name || '-'}</div>
                  <div><b>ชื่อวิทยาศาสตร์:</b> <i>{selectedSubmission.data?.scientific_name || '-'}</i></div>
                  <div><b>ชื่อวงศ์:</b> {selectedSubmission.data?.family_name || '-'}</div>
                  <div><b>สถานที่:</b> {selectedSubmission.data?.location || '-'}</div>
                  <div><b>วันที่บันทึก:</b> {selectedSubmission.data?.date || '-'}</div>
                  <div><b>เพื่อนผู้ร่วมกิจกรรม:</b> {selectedSubmission.data?.partners || '-'}</div>
                </div>
              </div>

              {/* SHEET 1 DETAILED VIEW */}
              {selectedSubmission.worksheet_type === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {['morphology', 'properties', 'behavior'].map((key, idx) => {
                    const sec = selectedSubmission.data?.[key] || {};
                    const title = idx === 0 ? 'รูปลักษณ์ของพืช' : idx === 1 ? 'คุณสมบัติของพืช' : 'พฤติกรรมของพืช';
                    return (
                      <div key={key} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <h6 style={{ fontWeight: 800, margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                          ด้านที่ {idx + 1}: {title}
                        </h6>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', lineHeight: 1.5 }}>
                          <div><b>เรื่องที่ต้องการศึกษา:</b> {sec.topic || '-'}</div>
                          <div><b>วิธีการศึกษาเรียนรู้:</b> {sec.method || '-'}</div>
                          <div><b>ผลการศึกษาเรียนรู้ (ละเอียด):</b> <p style={{ margin: '3px 0 0 0', whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{sec.result || '-'}</p></div>
                          <div><b>สรุปผลเปรียบเทียบชีวิตตนเอง:</b> <p style={{ margin: '3px 0 0 0', whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-card)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{sec.summary || '-'}</p></div>
                          {sec.file_url && (
                            <div style={{ marginTop: '5px' }}>
                              <b>ภาพประกอบ:</b>
                              <a href={sec.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '4px' }}>
                                <img src={sec.file_url} alt={title} style={{ maxHeight: '140px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SHEET 2 DETAILED VIEW */}
              {selectedSubmission.worksheet_type === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Biotic / Abiotic Factors tables */}
                  {['biotic_factors', 'abiotic_factors'].map((key, idx) => {
                    const list = selectedSubmission.data?.[key] || [];
                    const title = idx === 0 ? 'ปัจจัยชีวภาพ (สิ่งมีชีวิต)' : 'ปัจจัยกายภาพ (สิ่งไม่มีชีวิต)';
                    return (
                      <div key={key} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <h6 style={{ fontWeight: 800, margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                          ปัจจัย {title}
                        </h6>
                        {list.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>ไม่มีการระบุรายการปัจจัย</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {list.map((item, fIdx) => (
                              <div key={fIdx} style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                  <div>ชื่อ: {item.name || '-'}</div>
                                  <div style={{ textAlign: 'right' }}>พบที่: {item.location || '-'} (เวลา {item.time || '-'})</div>
                                </div>
                                <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                                  <div><b>จำนวน/ลักษณะ:</b> {item.count || '-'} ({item.description || '-'})</div>
                                  <div><b>ความเกี่ยวพัน:</b> {item.interrelation || '-'}</div>
                                  <div><b>ความสัมพันธ์:</b> {item.relationship || '-'}</div>
                                  <div><b>ความผูกพัน:</b> {item.attachment || '-'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Balance Summary */}
                  <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h6 style={{ fontWeight: 800, margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                      บทวิเคราะห์และสรุปดุลยภาพความเกี่ยวพันรอบพืชศึกษา
                    </h6>
                    <p style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', margin: 0, padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {selectedSubmission.data?.balance_summary || '-'}
                    </p>
                    {selectedSubmission.data?.evidence_url && (
                      <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                        <b>ไฟล์หลักฐานอัปโหลด: </b>
                        <a href={selectedSubmission.data.evidence_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                          เปิดดูหลักฐานความพันเกี่ยวที่อัปโหลด
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SHEET 3 DETAILED VIEW */}
              {selectedSubmission.worksheet_type === 3 && (
                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <h6 style={{ fontWeight: 800, margin: '0 0 5px 0', fontSize: '0.88rem', color: 'var(--color-primary)' }}>การวิเคราะห์ศักยภาพและการประยุกต์ใช้เพื่อมหาชน</h6>
                  <div><b>ผลการเรียนรู้ / ผลึกความรู้หลัก:</b> {selectedSubmission.data?.learning_result || '-'}</div>
                  <div><b>ศักยภาพสูงสุดของพืชศึกษา:</b> {selectedSubmission.data?.potential || '-'}</div>
                  <div><b>คุณของศักยภาพ:</b> <p style={{ margin: '3px 0 0 0', padding: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{selectedSubmission.data?.value_of_potential || '-'}</p></div>
                  <div><b>แนวคิดต่อยอดสรรค์สร้าง (Concept):</b> {selectedSubmission.data?.concept || '-'}</div>
                  <div><b>แนวทางเชิงกลยุทธ์:</b> {selectedSubmission.data?.guidelines || '-'}</div>
                  <div><b>ขั้นตอนการนำไปใช้ประโยชน์ในทางปฏิบัติ:</b> <p style={{ margin: '3px 0 0 0', padding: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{selectedSubmission.data?.application_method || '-'}</p></div>
                  <div><b>สรุปผลลัพธ์ประโยชน์แท้แก่มหาชน:</b> <p style={{ margin: '3px 0 0 0', padding: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{selectedSubmission.data?.summary_benefit || '-'}</p></div>

                  {selectedSubmission.data?.evidence_url && (
                    <div style={{ marginTop: '5px' }}>
                      <b>ภาพนวัตกรรม/หลักฐานประกอบ:</b>
                      <a href={selectedSubmission.data.evidence_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '4px' }}>
                        <img src={selectedSubmission.data.evidence_url} alt="Worksheet 3 Evidence" style={{ maxHeight: '160px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Teacher Review Input Form */}
            <div style={{
              backgroundColor: 'rgba(186,85,211,0.02)',
              border: '1px solid var(--border-color)',
              padding: '1.25rem',
              borderRadius: '10px',
              alignSelf: 'start'
            }}>
              <h5 style={{ fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                ✏️ แบบประเมินผลการตรวจงาน
              </h5>

              {activeRole === 'evaluator' ? (
                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <b>คะแนนตรวจปัจจุบัน:</b> {selectedSubmission.score !== null ? `${selectedSubmission.score} คะแนน` : 'ยังไม่ระบุคะแนน'}
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <b>ข้อคิดเห็นของครูผู้ตรวจ:</b>
                    <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{selectedSubmission.teacher_comments || 'ไม่มีข้อคิดเห็น'}</p>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '10px' }}>
                    * สิทธิ์ของคุณคือผู้ประเมินภายนอก (Read-only) ไม่สามารถแก้ไขเกรดหรือความคิดเห็นของโรงเรียนได้
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveReview}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>ประเมินสถานะการตรวจ</label>
                    <select
                      className="form-control"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      required
                    >
                      <option value="approved">🟢 ตรวจผ่านแล้ว (Approved)</option>
                      <option value="needs_revision">🔴 ส่งกลับแก้ไข (Needs Revision)</option>
                      <option value="submitted">⏳ รอตรวจตามปกติ (Submitted)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>ให้คะแนน (เต็ม 100 คะแนน)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      placeholder="กรอกคะแนน เช่น 85"
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>ความคิดเห็นของครูผู้ตรวจ (Feedback)</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="เขียนประเด็นที่ชื่นชม จุดที่ต้องปรับปรุง หรือแนวทางการขยายผลการเรียนรู้ให้นักเรียนแก้ไข..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '0.55rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Save size={14} /> {submittingReview ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(null)}
                      className="btn btn-secondary"
                      style={{ padding: '0.55rem', fontSize: '0.82rem' }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT COMMENT MODAL DISPLAY */}
      {showCommentModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1.5rem'
        }} onClick={() => setShowCommentModal(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', margin: 0 }}>
                💬 ความคิดเห็นประเมินจากครูผู้สอน
              </h4>
              <button
                onClick={() => setShowCommentModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <div>
                <b>ใบงาน: </b> {getSheetName(showCommentModal.worksheet_type)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                <b>คะแนนประเมิน:</b>
                <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1rem' }}>
                  {showCommentModal.score !== null ? `${showCommentModal.score} / 100` : 'รอครูประเมินคะแนน'}
                </span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                <b>คำติชมและข้อเสนอแนะ:</b>
                <p style={{
                  marginTop: '6px',
                  backgroundColor: 'var(--bg-main)',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-main)'
                }}>
                  {showCommentModal.teacher_comments || 'ไม่มีข้อเสนอแนะเพิ่มเติม'}
                </p>
              </div>

              {showCommentModal.status === 'needs_revision' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600, marginTop: '5px' }}>
                  <AlertCircle size={14} /> กรุณากดปุ่ม "ทำต่อ/แก้ไข" ที่การ์ดใบงานเพื่อเข้าปรับปรุงแก้ไขและส่งงานใหม่อีกครั้ง
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => setShowCommentModal(null)}
                className="btn btn-primary"
                style={{ padding: '0.4rem 1.25rem', fontSize: '0.8rem' }}
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
