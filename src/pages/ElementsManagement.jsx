import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Layers, CheckCircle, Edit3, X, Save, Upload, ExternalLink, Sliders, AlertTriangle } from 'lucide-react';

export default function ElementsManagement({ userRole }) {
  const [criteriaList, setCriteriaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeElementTab, setActiveElementTab] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);

  // Modal Form states
  const [selfScore, setSelfScore] = useState(0);
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [status, setStatus] = useState('ยังไม่มีหลักฐาน');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadImageFile, setUploadImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCriteria = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort list by criteria_id alphabetically/numerically e.g. 1.1, 1.2
      list.sort((a, b) => a.criteria_id.localeCompare(b.criteria_id, undefined, { numeric: true }));
      setCriteriaList(list);
    } catch (err) {
      console.error('Error fetching criteria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const getElementName = (num) => {
    switch (num) {
      case 1: return 'องค์ประกอบที่ 1 การจัดทำป้ายรหัสประจำต้น';
      case 2: return 'องค์ประกอบที่ 2 การรวบรวมพรรณไม้เข้าปลูก';
      case 3: return 'องค์ประกอบที่ 3 การศึกษาข้อมูลด้านต่าง ๆ';
      case 4: return 'องค์ประกอบที่ 4 การรายงานผลการเรียนรู้';
      case 5: return 'องค์ประกอบที่ 5 การนำไปใช้ประโยชน์';
      default: return '';
    }
  };

  const getElementDescription = (num) => {
    switch (num) {
      case 1: return 'การจัดเก็บหลักฐานการจำแนกชนิดพืช, รหัสพิกัดประจำต้นพรรณไม้ชั่วคราวและถาวร';
      case 2: return 'การจัดตั้งพื้นที่และขยายเพาะพันธุ์พรรณไม้เพิ่มเติม พร้อมบันทึกตารางดูแลบำรุงรักษาประวัติ';
      case 3: return 'การเขียนใบงาน ก.7-003 รายละเอียดทางสัณฐานวิทยาของ 6 ส่วนพืช และสเก็ตช์ภาพวาดลายเส้น';
      case 4: return 'การรายงานสรุปชั่วโมงวิชาการพฤกษศาสตร์ของนักเรียนรายบุคคล สมุดการเรียนรู้ และรายงานกลุ่มส่ง อพ.สธ.';
      case 5: return 'การนำวิชาพฤกษศาสตร์บูรณาการร่วมกับกลุ่มสาระวิทยาศาสตร์ ศิลปะ งานอาชีพ และเผยแพร่องค์ความรู้สู่ปราชญ์ท้องถิ่น';
      default: return '';
    }
  };

  const handleOpenModal = (crit) => {
    setEditingCriteria(crit);
    setSelfScore(crit.self_score || 0);
    setDescription(crit.description || '');
    setEvidenceText(crit.evidence_text || '');
    setResponsiblePerson(crit.responsible_person || '');
    setStatus(crit.status || 'ยังไม่มีหลักฐาน');
    setAttachmentUrl(crit.attachment_url || '');
    setImageUrl(crit.image_url || '');
    setUploadFile(null);
    setUploadImageFile(null);
    setIsModalOpen(true);
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาบีบอัดไฟล์ก่อนทำการอัปโหลด`);
      e.target.value = '';
      setUploadFile(null);
      return;
    }
    setUploadFile(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadImageFile(file);
    }
  };

  const handleFileUpload = async (file, folder = 'evidence') => {
    if (!storage) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message);
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;
    setSaving(true);

    try {
      let finalDocUrl = attachmentUrl;
      let finalImgUrl = imageUrl;

      if (uploadFile) {
        finalDocUrl = await handleFileUpload(uploadFile, 'evidence');
      }
      if (uploadImageFile) {
        finalImgUrl = await handleFileUpload(uploadImageFile, 'evidence_images');
      }

      const payload = {
        ...editingCriteria,
        self_score: parseInt(selfScore) || 0,
        description: description,
        evidence_text: evidenceText,
        responsible_person: responsiblePerson,
        status: status,
        attachment_url: finalDocUrl,
        image_url: finalImgUrl,
        updated_at: new Date().toISOString()
      };

      await setDoc(doc(db, 'rspg_evaluation_criteria', editingCriteria.id), payload, { merge: true });
      setIsModalOpen(false);
      fetchCriteria();
    } catch (err) {
      alert('บันทึกผลงานไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter criteria belonging to the active tab element
  const currentCriteria = criteriaList.filter(c => c.element_num === activeElementTab);

  // Calculate stats for current tab element
  const totalMaxScore = currentCriteria.reduce((sum, c) => sum + (c.max_score || 0), 0);
  const totalSelfScore = currentCriteria.reduce((sum, c) => sum + (c.self_score || 0), 0);
  const completionPercentage = totalMaxScore > 0 ? Math.round((totalSelfScore / totalMaxScore) * 100) : 0;

  const getStatusColor = (statusName) => {
    switch (statusName) {
      case 'เสร็จสิ้น': return 'var(--color-success)';
      case 'กำลังดำเนินการ': return 'var(--color-info)';
      case 'ปรับปรุง': return 'var(--color-warning)';
      default: return 'var(--color-danger)';
    }
  };

  return (
    <div>
      {/* Tab bar header */}
      <div className="card glass-panel" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Layers size={22} />
          ด้านที่ 2: การดำเนินงาน 5 องค์ประกอบ (15 ตัวชี้วัดสำหรับขอกรรมการประเมินขั้นที่ 1)
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(num => (
            <button
              key={num}
              onClick={() => setActiveElementTab(num)}
              className={`btn ${activeElementTab === num ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              องค์ประกอบที่ {num}
            </button>
          ))}
        </div>
      </div>

      {/* Info summary of the current element */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-primary)', marginBottom: '1.5rem', backgroundColor: 'rgba(186,85,211,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>{getElementName(activeElementTab)}</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{getElementDescription(activeElementTab)}</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: 'var(--color-cream)', border: '1px solid #ffe8a1' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b6f00' }}>{totalSelfScore} / {totalMaxScore}</div>
            <span style={{ fontSize: '0.68rem', color: '#8b6f00', fontWeight: 600 }}>คะแนนประเมินตนเอง ({completionPercentage}%)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดหัวข้อเกณฑ์ประเมินด้านที่ 2...</div>
      ) : currentCriteria.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ไม่พบเกณฑ์การประเมินในองค์ประกอบนี้
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentCriteria.map(crit => (
            <div key={crit.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)' }}>เกณฑ์ {crit.criteria_id}</span>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      color: '#fff',
                      backgroundColor: getStatusColor(crit.status)
                    }}>
                      {crit.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    {crit.title}
                  </h4>
                </div>

                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>คะแนนประเมินตนเอง</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {crit.self_score} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>/ {crit.max_score} คะแนน</span>
                  </div>
                </div>
              </div>

              <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>📝 รายละเอียดและข้อมูลดำเนินงาน</h5>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, marginTop: '4px' }}>
                    {crit.description || 'ยังไม่ได้บันทึกรายละเอียดการดำเนินงาน'}
                  </p>

                  <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                    <b>📁 หลักฐานอ้างอิง:</b> {crit.evidence_text || 'ไม่มีเอกสารระบุ'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      👤 ผู้รับผิดชอบ: <b>{crit.responsible_person || 'คณะครูและสภานักเรียน'}</b>
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {crit.attachment_url && (
                        <a href={crit.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          เปิดเอกสารแนบ <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {crit.image_url ? (
                    <img 
                      src={crit.image_url} 
                      alt="รูปหลักฐานการจัดกิจกรรม" 
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '110px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      🖼️ ไม่มีภาพหลักฐานกิจกรรม
                    </div>
                  )}
                </div>
              </div>

              {/* Edit evaluation triggers */}
              {userRole !== 'visitor' && (
                <button
                  onClick={() => handleOpenModal(crit)}
                  className="btn btn-secondary"
                  style={{ position: 'absolute', top: '15px', right: '15px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit3 size={12} /> ประเมินตนเอง
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Evaluation modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ประเมินตนเอง: เกณฑ์ที่ {editingCriteria?.criteria_id} {editingCriteria?.title}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--color-cream)', borderRadius: '8px', border: '1px solid #ffe8a1' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#8b6f00' }}>
                  <Sliders size={16} /> กำหนดคะแนนประเมินตนเอง (เต็ม {editingCriteria?.max_score} คะแนน)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '0.5rem' }}>
                  <input
                    type="range"
                    min="0"
                    max={editingCriteria?.max_score || 10}
                    value={selfScore}
                    onChange={(e) => setSelfScore(e.target.value)}
                    style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', width: '60px', textAlign: 'right' }}>
                    {selfScore} / {editingCriteria?.max_score}
                  </span>
                </div>
              </div>

              <div className="grid-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">สถานะการดำเนินงาน</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="เสร็จสิ้น">เสร็จสิ้น (สมบูรณ์ 100%)</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ (In progress)</option>
                    <option value="ปรับปรุง">ปรับปรุง (Need revision)</option>
                    <option value="ยังไม่มีหลักฐาน">ยังไม่มีหลักฐาน</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ครูผู้รับผิดชอบหลัก</label>
                  <input
                    type="text"
                    className="form-control"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    placeholder="ระบุชื่อครูดูแลตัวชี้วัดนี้"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดการดำเนินงานในโรงเรียน</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เขียนสรุปรายละเอียดผลที่ทำสำเร็จ กิจกรรมต่างๆ และความก้าวหน้า..."
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">รายการหลักฐานอ้างอิง (เช่น บัญชีรายชื่อ, ภาพถัง, เล่มแผน)</label>
                <input
                  type="text"
                  className="form-control"
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="เช่น แฟ้มบัญชีรหัส, ภาพวาดสีน้ำ ม.2"
                />
              </div>

              {/* File uploading options */}
              <div className="grid-2" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>ไฟล์เอกสารอ้างอิง (.pdf)</label>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    id="crit-file-pdf"
                    onChange={handlePdfChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="crit-file-pdf" className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} /> เลือก PDF
                  </label>
                  <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '4px' }}>
                    {uploadFile ? `${uploadFile.name} (${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)` : attachmentUrl ? 'มีไฟล์แนบเดิม' : 'ไม่มีไฟล์'}
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>ภาพหลักฐาน (.jpg/.png)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="crit-file-img"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="crit-file-img" className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} /> เลือกรูปภาพ
                  </label>
                  <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '4px' }}>
                    {uploadImageFile ? `${uploadImageFile.name} (${(uploadImageFile.size / (1024 * 1024)).toFixed(2)} MB)` : imageUrl ? 'มีภาพแนบเดิม' : 'ไม่มีภาพ'}
                  </span>
                  {uploadImageFile && (
                    <div style={{ marginTop: '8px' }}>
                      <img 
                        src={URL.createObjectURL(uploadImageFile)} 
                        alt="Evidence Preview" 
                        style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
