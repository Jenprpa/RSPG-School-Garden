import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { GraduationCap, BookOpen, Plus, Save, Award, ClipboardList } from 'lucide-react';
import ElementRecordsSection from '../components/ElementRecordsSection';

export default function Element5({ userRole }) {
  const [subTab, setSubTab] = useState('records'); // 'records' or 'curriculum'
  const [uses, setUses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [subjectName, setSubjectName] = useState('');
  const [lessonPlan, setLessonPlan] = useState('');
  const [studentWork, setStudentWork] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [statusText, setStatusText] = useState('');

  const fetchUses = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'educational_uses'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUses(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusText('กำลังบันทึกแผนบูรณาการ...');
    try {
      await addDoc(collection(db, 'educational_uses'), {
        subject_name: subjectName,
        lesson_plan_content: lessonPlan,
        student_work_content: studentWork,
        science_project_title: projectTitle,
        created_at: new Date().toISOString()
      });

      setStatusText('บันทึกข้อมูลบูรณาการการสอนสำเร็จ!');
      setSubjectName('');
      setLessonPlan('');
      setStudentWork('');
      setProjectTitle('');
      setIsFormOpen(false);
      fetchUses();
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div>
      {/* Introduction Card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          องค์ประกอบที่ 5: การนำไปใช้ประโยชน์ทางการศึกษา
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          เน้นการเชื่อมโยงความรู้สวนพฤกษศาสตร์บูรณาการเข้ากับกลุ่มสาระการเรียนรู้ต่างๆ (เช่น วิทยาศาสตร์, ศิลปะ, การงานอาชีพ, ภาษาไทย) การพัฒนาแผนจัดการเรียนรู้รายวิชา การทำผลงานชิ้นงานนักเรียน และการทำโครงงานวิทยาศาสตร์พฤกษศาสตร์ระดับสากล
        </p>

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
          <button 
            type="button"
            onClick={() => setSubTab('records')} 
            className={`btn ${subTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <ClipboardList size={14} /> บันทึกกิจกรรมและหลักฐาน (6 ฟิลด์หลัก)
          </button>
          
          <button 
            type="button"
            onClick={() => setSubTab('curriculum')} 
            className={`btn ${subTab === 'curriculum' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <GraduationCap size={14} /> สารบบการบูรณาการหลักสูตรเดิม ({uses.length})
          </button>
        </div>
      </div>

      {subTab === 'records' ? (
        <ElementRecordsSection elementNum={5} userRole={userRole} />
      ) : (
        <>
          {userRole !== 'visitor' && !isFormOpen && (
            <button onClick={() => setIsFormOpen(true)} className="btn btn-primary" style={{ marginBottom: '1.5rem' }}>
              <Plus size={16} /> บันทึกแผนการเรียนรู้บูรณาการเพิ่ม
            </button>
          )}

      {isFormOpen && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">เพิ่มหลักฐานการเรียนรู้และการบูรณาการกลุ่มสาระ</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ชื่อรายวิชาและการบูรณาการ</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="เช่น ศิลปะสร้างสรรค์ (ชั้น ม.1)" 
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">ชื่อโครงงานวิทยาศาสตร์ที่เกี่ยวข้อง (ถ้ามี)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="เช่น การพัฒนาสารบำบัดแมลงธรรมชาติจากพืช..." 
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">รายละเอียดแผนการจัดการเรียนรู้ (Lesson Plan)</label>
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="ระบุกิจกรรมการสอน แหล่งพรรณไม้เป้าหมายในโรงเรียน..."
                value={lessonPlan}
                onChange={(e) => setLessonPlan(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">ผลงานและชิ้นงานของนักเรียน (Outputs)</label>
              <textarea 
                className="form-control" 
                rows="2" 
                placeholder="เช่น ภาพวาดสีน้ำดอกทองกวาว, สมุดเล่มเล็กสมุนไพร..."
                value={studentWork}
                onChange={(e) => setStudentWork(e.target.value)}
              ></textarea>
            </div>

            {statusText && (
              <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.1)', color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {statusText}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      )}

      {/* Uses directory */}
      <div className="grid-2">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="var(--color-primary)" />
              สารบบการบูรณาการหลักสูตรและการนำไปใช้ประโยชน์
            </span>
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังดาวน์โหลดข้อมูลการสอน...</div>
          ) : uses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              ยังไม่พบการบูรณาการรายวิชาพฤกษศาสตร์ในโรงเรียน
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {uses.map(use => (
                <div key={use.id} style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-card)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      📘 {use.subject_name}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      วันที่บันทึก: {use.created_at?.split('T')[0]}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <h5 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-orchid)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={14} /> แผนการสอนบูรณาการ:
                      </h5>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '3px', whiteSpace: 'pre-line' }}>{use.lesson_plan_content}</p>
                    </div>

                    {use.student_work_content && (
                      <div>
                        <h5 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffb300' }}>
                          🎨 ผลงานชิ้นงานนักเรียน:
                        </h5>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{use.student_work_content}</p>
                      </div>
                    )}

                    {use.science_project_title && (
                      <div style={{
                        padding: '0.6rem 0.8rem',
                        backgroundColor: 'var(--bg-main)',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <Award size={16} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          <b>โครงงานพฤกษศาสตร์:</b> {use.science_project_title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
