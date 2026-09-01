import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Archive, Search, Plus, Trash2, Save, X, Upload, ExternalLink, FileSpreadsheet, Download } from 'lucide-react';

export default function EvidenceVault({ userRole }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('องค์ประกอบที่ 1');
  const [description, setDescription] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const categories = [
    'ด้านที่ 1 บริหารจัดการ',
    'องค์ประกอบที่ 1',
    'องค์ประกอบที่ 2',
    'องค์ประกอบที่ 3',
    'องค์ประกอบที่ 4',
    'องค์ประกอบที่ 5',
    'อื่นๆ'
  ];

  const fetchEvidence = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_evidence_vault'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setEvidenceList(list);
    } catch (err) {
      console.error('Error fetching evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  const handleOpenModal = () => {
    setTitle('');
    setCategory('องค์ประกอบที่ 1');
    setDescription('');
    setResponsiblePerson('');
    setAttachmentUrl('');
    setUploadFile(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!storage) return '';
    try {
      const ext = file.name.split('.').pop();
      const fileName = `vault/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, file);
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
    if (!['admin', 'rspg_board', 'doc_officer'].includes(userRole)) {
      alert('คุณไม่มีสิทธิ์อัปโหลดเอกสารหลักฐาน');
      return;
    }
    setSaving(true);

    try {
      let finalUrl = attachmentUrl;
      if (uploadFile) {
        finalUrl = await handleFileUpload(uploadFile);
      }

      const payload = {
        title: title,
        category: category,
        description: description,
        responsible_person: responsiblePerson,
        attachment_url: finalUrl,
        status: 'เสร็จสิ้น',
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'rspg_evidence_vault'), payload);
      setIsModalOpen(false);
      fetchEvidence();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกหลักฐาน: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole === 'visitor') return;
    if (window.confirm('คุณแน่ใจว่าต้องการลบเอกสารหลักฐานชิ้นนี้ออกจากคลัง?')) {
      try {
        await deleteDoc(doc(db, 'rspg_evidence_vault', id));
        fetchEvidence();
      } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const handleExportCSV = () => {
    if (evidenceList.length === 0) return;
    const headers = ['หมวดหมู่', 'หัวข้อหลักฐาน', 'คำอธิบาย', 'ผู้รับผิดชอบ', 'ลิงก์เอกสาร', 'วันที่บันทึก'];
    const rows = evidenceList.map(ev => [
      ev.category,
      ev.title,
      `"${(ev.description || '').replace(/"/g, '""')}"`,
      ev.responsible_person || '',
      ev.attachment_url || '',
      ev.created_at?.split('T')[0] || ''
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RSPG_Evidence_Vault_Index.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEvidence = evidenceList.filter(ev => {
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.responsible_person || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ทั้งหมด' || ev.category.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Introduction Card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Archive size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                คลังจัดเก็บเอกสารหลักฐานรวม (RSPG Evidence Vault)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                รวบรวมไฟล์ PDF, รูปภาพ, รายงานสรุปผล และหลักฐานอ้างอิงทั้งหมดของ ปายวิทยาคาร เพื่อความสะดวกในการทวนสอบ
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <FileSpreadsheet size={16} /> ส่งออกบัญชีหลักฐาน
            </button>
            {['admin', 'rspg_board', 'doc_officer'].includes(userRole) && (
              <button onClick={handleOpenModal} className="btn btn-primary">
                <Plus size={16} /> อัปโหลดหลักฐานใหม่
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาชื่อหลักฐาน คำอธิบาย หรือผู้ดูแล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ทั้งหมด">แสดงทุกหมวดหมู่</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Evidence Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดคลังเอกสารหลักฐาน...</div>
      ) : filteredEvidence.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ไม่พบรายการหลักฐานตามเงื่อนไขค้นหา
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredEvidence.map(ev => (
            <div key={ev.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="role-badge role-teacher" style={{ fontSize: '0.72rem', backgroundColor: 'rgba(186,85,211,0.06)', color: 'var(--color-primary)' }}>
                  {ev.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {ev.created_at?.split('T')[0]}
                </span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', paddingRight: '30px' }}>
                {ev.title}
              </h4>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, flex: 1, marginBottom: '12px' }}>
                {ev.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: 'auto', fontSize: '0.8rem' }}>
                <span>👤 <b>ผู้ดูแล:</b> {ev.responsible_person || 'ไม่ระบุ'}</span>

                {ev.attachment_url && (
                  <a
                    href={ev.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📂 เปิดหลักฐาน <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Delete trigger */}
              {userRole === 'admin' && (
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="icon-btn"
                  style={{ position: 'absolute', top: '15px', right: '15px', width: '28px', height: '28px', backgroundColor: 'var(--bg-main)' }}
                >
                  <Trash2 size={12} color="var(--color-danger)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                อัปโหลดหลักฐานอ้างอิงสู่คลัง (Evidence Vault)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">หมวดหมู่ประเมินผล</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.filter(c => c !== 'ทั้งหมด').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">หัวข้อหลักฐาน</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น สมุดจดฟิลด์โน้ตพรรณไม้ชั่วคราว ม.2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดคำอธิบายสั้นๆ</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายว่าเอกสารนี้ยืนยันถึงการทำกิจกรรมจุดใด ตัวชี้วัดใด..."
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">ผู้จัดทำ / ผู้รับผิดชอบหลัก</label>
                <input
                  type="text"
                  className="form-control"
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder="เช่น ครูศิริพร ใจงาม"
                  required
                />
              </div>

              <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <label className="form-label">เลือกไฟล์หลักฐาน (PDF หรือรูปภาพ)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    id="vault-file-picker"
                    style={{ display: 'none' }}
                    required
                  />
                  <label htmlFor="vault-file-picker" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> เลือกไฟล์
                  </label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {uploadFile ? uploadFile.name : 'ยังไม่ได้เลือกไฟล์'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกหลักฐาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
