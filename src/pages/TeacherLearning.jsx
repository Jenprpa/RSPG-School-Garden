import React, { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BookOpen, Upload, Plus, FileText, CheckCircle, Trash2, Calendar, User, Clipboard } from 'lucide-react';

export default function TeacherLearning({ userRole }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subjectType, setSubjectType] = useState('พืชศึกษา'); // 'พืชศึกษา', '3 สาระการเรียนรู้', 'ฐานทรัพยากรท้องถิ่น'
  const [classroom, setClassroom] = useState('');
  const [description, setDescription] = useState('');
  const [postTeachingLog, setPostTeachingLog] = useState('');
  const [creator, setCreator] = useState('');
  
  // Files
  const [planFile, setPlanFile] = useState(null);
  const [worksheetFile, setWorksheetFile] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const loadActivities = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_learning_activities'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setActivities(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleUpload = async (file, folder) => {
    if (!storage || !file) return '';
    try {
      const fileName = `${folder}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!['admin', 'teacher', 'project_advisor'].includes(userRole)) {
      alert('คุณไม่มีสิทธิ์ในการจัดการข้อมูลแผนการจัดการเรียนรู้');
      return;
    }

    setUploading(true);
    setStatus('กำลังเตรียมการและอัปโหลดไฟล์หลักฐาน...');

    try {
      let finalPlanUrl = '';
      let finalWorksheetUrl = '';

      if (planFile) {
        finalPlanUrl = await handleUpload(planFile, 'learning_plans');
      }
      if (worksheetFile) {
        finalWorksheetUrl = await handleUpload(worksheetFile, 'worksheets');
      }

      const payload = {
        title,
        subject_type: subjectType,
        classroom,
        description,
        post_teaching_log: postTeachingLog,
        creator: creator || 'ครูผู้สอน',
        plans_url: finalPlanUrl,
        worksheet_url: finalWorksheetUrl,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'rspg_learning_activities'), payload);
      setStatus('✅ บันทึกกิจกรรมการจัดการเรียนรู้และอัปโหลดหลักฐานสำเร็จ!');
      
      // Reset form
      setTitle('');
      setClassroom('');
      setDescription('');
      setPostTeachingLog('');
      setPlanFile(null);
      setWorksheetFile(null);
      
      loadActivities();
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      alert('คุณไม่มีสิทธิ์ลบข้อมูล');
      return;
    }
    if (!window.confirm('ยืนยันที่จะลบแผนการเรียนรู้และหลักฐานนี้หรือไม่?')) return;
    
    try {
      await deleteDoc(doc(db, 'rspg_learning_activities', id));
      loadActivities();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลการเรียนรู้...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบการจัดการเรียนรู้ของครู (Teacher Learning Operations)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              บันทึกแผนจัดการเรียนรู้ ใบงาน โครงการ ผลงานนักเรียน และบันทึกข้อสรุปหลังสอน (Post-teaching Logs) ประจำปี
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: ['admin', 'teacher', 'project_advisor'].includes(userRole) ? '1.2fr 1.8fr' : '1fr', gap: '2rem' }} className="rspg-progress-grid">
        
        {/* Input Form Column */}
        {['admin', 'teacher', 'project_advisor'].includes(userRole) && (
          <div>
            <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              ✍️ บันทึกการดำเนินกิจกรรมการสอนใหม่
            </h4>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">หัวข้อ / ชื่อแผนกิจกรรมการเรียนรู้</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น การจัดจำแนกใบและกลีบดอกพรรณไม้"
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">หมวดหมู่เนื้อหา อพ.สธ.</label>
                  <select
                    className="form-control"
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value)}
                  >
                    <option value="พืชศึกษา">พืชศึกษา (Plant Study)</option>
                    <option value="สาระการเรียนรู้ ธรรมชาติแห่งชีวิต">สาระการเรียนรู้ ธรรมชาติแห่งชีวิต</option>
                    <option value="สาระการเรียนรู้ สรรพสิ่งล้วนพันเกี่ยว">สาระการเรียนรู้ สรรพสิ่งล้วนพันเกี่ยว</option>
                    <option value="สาระการเรียนรู้ ประโยชน์แท้แก่มหาชน">สาระการเรียนรู้ ประโยชน์แท้แก่มหาชน</option>
                    <option value="ฐานทรัพยากรท้องถิ่น">ฐานทรัพยากรท้องถิ่น (Local Resources)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ระดับชั้น / ห้องเรียน</label>
                  <input
                    type="text"
                    className="form-control"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    placeholder="เช่น ม.3/1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ชื่อครูผู้รับผิดชอบการเรียนรู้</label>
                <input
                  type="text"
                  className="form-control"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="เช่น ครูศิริพร ใจงาม"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">คำอธิบายภาพรวมเนื้อหาการจัดการเรียนรู้</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุจุดประสงค์การเรียนรู้ สื่อที่ใช้สอน และวิธีการประเมิน..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">บันทึกผลหลังการจัดการเรียนรู้ (Post-teaching Log)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={postTeachingLog}
                  onChange={(e) => setPostTeachingLog(e.target.value)}
                  placeholder="นักเรียนมีความเข้าใจเรื่องสัณฐานวิทยาอย่างไร พบอุปสรรคใดบ้าง..."
                  required
                />
              </div>

              {/* Upload slots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>1. แนบแผนการจัดการเรียนรู้ (PDF/Word/PPT)</label>
                  <input type="file" onChange={(e) => setPlanFile(e.target.files[0])} style={{ fontSize: '0.75rem' }} />
                </div>
                <div style={{ marginTop: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>2. แนบใบงาน / ผลงานนักเรียน (PDF/รูปภาพ)</label>
                  <input type="file" onChange={(e) => setWorksheetFile(e.target.files[0])} style={{ fontSize: '0.75rem' }} />
                </div>
              </div>

              {status && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(186,85,211,0.06)',
                  color: 'var(--color-primary)',
                  fontSize: '0.82rem',
                  marginBottom: '1rem'
                }}>
                  {status}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || userRole === 'visitor' || userRole === 'student'}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={16} /> บันทึกและส่งข้อมูล
              </button>
            </form>
            </div>
          </div>
        )}

        {/* Display List Column */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              📁 รายการแผนงานและประวัติหลักฐานการจัดการเรียนรู้ ({activities.length})
            </h4>

            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                ไม่มีบันทึกข้อมูลการจัดการเรียนรู้พฤกษศาสตร์ในขณะนี้
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {activities.map(act => (
                  <div key={act.id} className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 'bold', border: '1px solid var(--color-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {act.subject_type}
                        </span>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '8px 0 4px 0' }}>{act.title}</h4>
                      </div>
                      {userRole === 'admin' && (
                        <button onClick={() => handleDelete(act.id)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div style={{ margin: '10px 0', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      <p style={{ margin: '0 0 6px 0' }}><b>ข้อมูลสาระสำคัญ:</b> {act.description}</p>
                      <p style={{ margin: 0, padding: '8px', backgroundColor: 'var(--bg-card)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px' }}>
                        <b>บันทึกหลังสอน (Post-Teaching):</b> {act.post_teaching_log || '-'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {act.creator}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {act.date}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clipboard size={12} /> {act.classroom}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {act.plans_url && (
                          <a href={act.plans_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-primary)' }}>
                            📄 แผนการสอน
                          </a>
                        )}
                        {act.worksheet_url && (
                          <a href={act.worksheet_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-orchid)' }}>
                            📂 ใบงาน/ผลงาน
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
