import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShieldCheck, Plus, Trash2, Edit3, Save, X, Upload, ExternalLink, Calendar, Users, Award, Image } from 'lucide-react';

export default function AdminManagement({ userRole }) {
  const [docsList, setDocsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  // Form fields
  const [documentType, setDocumentType] = useState('คำสั่งแต่งตั้งคณะกรรมการ');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const documentTypes = [
    'คำสั่งแต่งตั้งคณะกรรมการ',
    'แผนงาน/โครงการ',
    'ปฏิทินดำเนินงาน',
    'รายงานการประชุม',
    'ภาพกิจกรรม'
  ];

  const fetchDocs = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_admin_management'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setDocsList(list);
    } catch (err) {
      console.error('Error fetching admin docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleOpenModal = (docObj = null) => {
    if (docObj) {
      setEditingDoc(docObj);
      setDocumentType(docObj.document_type || 'คำสั่งแต่งตั้งคณะกรรมการ');
      setTitle(docObj.title || '');
      setDescription(docObj.description || '');
      setResponsiblePerson(docObj.responsible_person || '');
      setAttachmentUrl(docObj.attachment_url || '');
    } else {
      setEditingDoc(null);
      setDocumentType('คำสั่งแต่งตั้งคณะกรรมการ');
      setTitle('');
      setDescription('');
      setResponsiblePerson('');
      setAttachmentUrl('');
    }
    setUploadFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`ไฟล์ "${file.name}" มีขนาด ${(file.size / (1024 * 1024)).toFixed(2)} MB ซึ่งเกินขีดจำกัด 10 MB\nกรุณาบีบอัดไฟล์ก่อนทำการอัปโหลด`);
        e.target.value = '';
        setUploadFile(null);
        return;
      }
    }
    setUploadFile(file);
  };

  const handleFileUpload = async (file) => {
    if (!storage) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const path = documentType === 'ภาพกิจกรรม' ? 'images' : 'admin';
      const fileName = `${path}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
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
      let finalUrl = attachmentUrl;
      if (uploadFile) {
        finalUrl = await handleFileUpload(uploadFile);
      }

      const payload = {
        document_type: documentType,
        title: title,
        description: description,
        responsible_person: responsiblePerson,
        attachment_url: finalUrl,
        created_at: editingDoc?.created_at || new Date().toISOString().split('T')[0]
      };

      if (editingDoc) {
        await setDoc(doc(db, 'rspg_admin_management', editingDoc.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'rspg_admin_management'), payload);
      }

      setIsModalOpen(false);
      fetchDocs();
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole === 'visitor') return;
    if (window.confirm('ยืนยันที่จะลบเอกสารหลักฐานชิ้นนี้?')) {
      try {
        await deleteDoc(doc(db, 'rspg_admin_management', id));
        fetchDocs();
      } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'คำสั่งแต่งตั้งคณะกรรมการ': return <Users size={20} color="var(--color-primary)" />;
      case 'แผนงาน/โครงการ': return <Award size={20} color="var(--color-gold)" />;
      case 'ปฏิทินดำเนินงาน': return <Calendar size={20} color="var(--color-orchid)" />;
      case 'ภาพกิจกรรม': return <Image size={20} color="var(--color-info)" />;
      default: return <ShieldCheck size={20} color="var(--color-primary)" />;
    }
  };

  return (
    <div>
      {/* Introduction Card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} />
              ด้านที่ 1: การบริหารและการจัดการ (โครงสร้างและการประชุมดำเนินงาน)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              เอกสารคำสั่งแต่งตั้งคณะกรรมการ, ปฏิทินดำเนินงาน, แผนงาน/โครงการ, รายงานการประชุมคณะทำงาน และภาพกิจกรรมสำหรับยืนยันความพร้อมรับการประเมิน
            </p>
          </div>
          {userRole !== 'visitor' && (
            <button onClick={() => handleOpenModal()} className="btn btn-primary">
              <Plus size={16} /> บันทึกหลักฐานใหม่
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลงานบริหารและคำสั่งแต่งตั้ง...</div>
      ) : docsList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ไม่พบรายการข้อมูลในด้านที่ 1
        </div>
      ) : (
        <div className="grid-2">
          {docsList.map(docObj => (
            <div key={docObj.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="role-badge role-teacher" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(186,85,211,0.06)', color: 'var(--color-primary)' }}>
                  {getIcon(docObj.document_type)}
                  {docObj.document_type}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 บันทึกเมื่อ {docObj.created_at}</span>
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', paddingRight: '60px' }}>
                {docObj.title}
              </h4>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, flex: 1, marginBottom: '12px' }}>
                {docObj.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  👤 <b>ผู้รับผิดชอบ:</b> {docObj.responsible_person || 'คณะทำงาน อพ.สธ.'}
                </span>

                {docObj.attachment_url && (
                  <a
                    href={docObj.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {docObj.document_type === 'ภาพกิจกรรม' ? 'ดูรูปภาพ' : 'เปิดเอกสาร'} <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              {userRole !== 'visitor' && (
                <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleOpenModal(docObj)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-main)' }}>
                    <Edit3 size={12} color="var(--color-primary)" />
                  </button>
                  {userRole === 'admin' && (
                    <button onClick={() => handleDelete(docObj.id)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-main)' }}>
                      <Trash2 size={12} color="var(--color-danger)" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {editingDoc ? 'แก้ไขข้อมูลหลักฐานด้านที่ 1' : 'บันทึกหลักฐานบริหารจัดการ (ด้านที่ 1)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">ประเภทเอกสารหลักฐาน</label>
                <select
                  className="form-control"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  {documentTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">หัวข้อ / ชื่อเอกสาร</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น คำสั่งแต่งตั้งภาคเรียนที่ 1/2569"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">คำอธิบายรายละเอียด</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดสาระสำคัญ วัตถุประสงค์ หรือสรุปหัวข้อ..."
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">ผู้รับผิดชอบ / คณะทำงาน</label>
                <input
                  type="text"
                  className="form-control"
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder="เช่น ครูสมเจตน์ สังข์ทอง, ผู้อำนวยการโรงเรียน"
                  required
                />
              </div>

              <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <label className="form-label">อัปโหลดไฟล์หลักฐาน ({documentType === 'ภาพกิจกรรม' ? 'รูปภาพ JPG/PNG' : 'เอกสาร PDF'})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                  <input
                    type="file"
                    accept={documentType === 'ภาพกิจกรรม' ? 'image/*' : '.pdf'}
                    id="admin-file-upload"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="admin-file-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> เลือกไฟล์
                  </label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {uploadFile ? uploadFile.name : attachmentUrl ? 'มีลิงก์ข้อมูลแนบเดิมแล้ว' : 'ยังไม่ได้เลือกไฟล์'}
                  </span>
                </div>
                {uploadFile && (
                  <div style={{ marginTop: '10px', textAlign: 'left', padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {uploadFile.type.startsWith('image/') ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                          ตัวอย่างรูปภาพที่จะอัปโหลด (ขนาดต้นฉบับ: {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB):
                        </div>
                        <img
                          src={URL.createObjectURL(uploadFile)}
                          alt="Preview"
                          style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                        📄 ขนาดเอกสารหลักฐาน: {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
