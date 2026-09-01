import React, { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Plus, Trash2, Edit2, Save, Upload, FileText, Image as ImageIcon,
  Calendar, User, Check, AlertCircle, X, ExternalLink, RefreshCw
} from 'lucide-react';

export default function ElementRecordsSection({ elementNum, userRole }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); // type: 'success' | 'error' | 'info'

  // Form fields
  const [title, setTitle] = useState('');
  const [data, setData] = useState('');
  const [responsible, setResponsible] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('รอดำเนินการ');
  const [imageUrl, setImageUrl] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // Upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editData, setEditData] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editActionDate, setEditActionDate] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editAttachmentUrl, setEditAttachmentUrl] = useState('');

  const fetchRecords = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'rspg_element_records'),
        where('element_num', '==', parseInt(elementNum)),
        orderBy('action_date', 'desc')
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecords(list);
    } catch (err) {
      console.error('Error fetching element records:', err);
      // Fallback query without ordering in case index is not built yet
      try {
        const fallbackQ = query(
          collection(db, 'rspg_element_records'),
          where('element_num', '==', parseInt(elementNum))
        );
        const fallbackSnap = await getDocs(fallbackQ);
        const list = [];
        fallbackSnap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort in memory
        list.sort((a, b) => b.action_date.localeCompare(a.action_date));
        setRecords(list);
      } catch (fallbackErr) {
        setStatusMsg({ text: 'ดึงข้อมูลไม่สำเร็จ: ' + fallbackErr.message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [elementNum]);

  // File Upload Handlers
  const handleFileUpload = async (file, type) => {
    if (!file) return;
    if (!storage) {
      setStatusMsg({ text: 'ระบบจัดเก็บไฟล์คลาวด์ยังไม่ได้เชื่อมต่อ', type: 'error' });
      return;
    }

    if (type === 'image') setUploadingImage(true);
    if (type === 'doc') setUploadingDoc(true);
    setStatusMsg({ text: 'กำลังอัปโหลดไฟล์...', type: 'info' });

    try {
      const fileExt = file.name.split('.').pop();
      const path = `elements/el_${elementNum}_${type}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      if (type === 'image') {
        if (editingId) setEditImageUrl(downloadUrl);
        else setImageUrl(downloadUrl);
      } else {
        if (editingId) setEditAttachmentUrl(downloadUrl);
        else setAttachmentUrl(downloadUrl);
      }
      setStatusMsg({ text: 'อัปโหลดไฟล์สำเร็จแล้ว!', type: 'success' });
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg({
        text: 'อัปโหลดล้มเหลว (คุณสามารถป้อนลิงก์ URL แทนได้): ' + err.message,
        type: 'error'
      });
    } finally {
      setUploadingImage(false);
      setUploadingDoc(false);
    }
  };

  // Create
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusMsg({ text: 'กำลังบันทึกข้อมูล...', type: 'info' });
    try {
      const newRecord = {
        element_num: parseInt(elementNum),
        title,
        data,
        responsible_person: responsible,
        action_date: actionDate,
        status,
        image_url: imageUrl,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'rspg_element_records'), newRecord);
      setStatusMsg({ text: 'บันทึกข้อมูลสำเร็จ!', type: 'success' });

      // Reset form
      setTitle('');
      setData('');
      setResponsible('');
      setActionDate(new Date().toISOString().split('T')[0]);
      setStatus('รอดำเนินการ');
      setImageUrl('');
      setAttachmentUrl('');
      setIsFormOpen(false);

      fetchRecords();
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      setStatusMsg({ text: 'เกิดข้อผิดพลาด: ' + err.message, type: 'error' });
    }
  };

  // Edit init
  const startEdit = (record) => {
    setEditingId(record.id);
    setEditTitle(record.title || '');
    setEditData(record.data || '');
    setEditResponsible(record.responsible_person || '');
    setEditActionDate(record.action_date || '');
    setEditStatus(record.status || 'รอดำเนินการ');
    setEditImageUrl(record.image_url || '');
    setEditAttachmentUrl(record.attachment_url || '');
  };

  // Update
  const handleUpdateRecord = async (id) => {
    setStatusMsg({ text: 'กำลังอัปเดตข้อมูล...', type: 'info' });
    try {
      const docRef = doc(db, 'rspg_element_records', id);
      await updateDoc(docRef, {
        title: editTitle,
        data: editData,
        responsible_person: editResponsible,
        action_date: editActionDate,
        status: editStatus,
        image_url: editImageUrl,
        attachment_url: editAttachmentUrl,
        updated_at: new Date().toISOString()
      });

      setStatusMsg({ text: 'อัปเดตข้อมูลกิจกรรมสำเร็จ!', type: 'success' });
      setEditingId(null);
      fetchRecords();
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      setStatusMsg({ text: 'อัปเดตล้มเหลว: ' + err.message, type: 'error' });
    }
  };

  // Delete
  const handleDeleteRecord = async (id) => {
    if (userRole === 'visitor' || userRole === 'student') {
      alert('คุณไม่มีสิทธิ์ในการลบข้อมูลกิจกรรม');
      return;
    }

    if (window.confirm('คุณต้องการลบข้อมูลกิจกรรมและหลักฐานนี้ใช่หรือไม่?')) {
      setStatusMsg({ text: 'กำลังลบข้อมูล...', type: 'info' });
      try {
        await deleteDoc(doc(db, 'rspg_element_records', id));
        setStatusMsg({ text: 'ลบข้อมูลสำเร็จแล้ว!', type: 'success' });
        fetchRecords();
        setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
      } catch (err) {
        setStatusMsg({ text: 'ลบล้มเหลว: ' + err.message, type: 'error' });
      }
    }
  };

  // Helper for status classes
  const getStatusBadgeStyle = (statusVal) => {
    switch (statusVal) {
      case 'เสร็จสิ้น':
        return { backgroundColor: 'rgba(46, 125, 50, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(46, 125, 50, 0.2)' };
      case 'กำลังดำเนินการ':
        return { backgroundColor: 'rgba(186, 85, 211, 0.1)', color: 'var(--color-orchid)', border: '1px solid rgba(186, 85, 211, 0.2)' };
      case 'ปรับปรุง':
        return { backgroundColor: 'rgba(255, 193, 7, 0.1)', color: '#b58900', border: '1px solid rgba(255, 193, 7, 0.2)' };
      default:
        return { backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.2)' };
    }
  };

  // Calculate element progress
  const calculateElementProgress = () => {
    if (records.length === 0) return 0;
    let score = 0;
    records.forEach(r => {
      if (r.status === 'เสร็จสิ้น') score += 100;
      else if (r.status === 'กำลังดำเนินการ') score += 50;
      else if (r.status === 'ปรับปรุง') score += 25;
    });
    return Math.round(score / records.length);
  };

  const progressPercentage = calculateElementProgress();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 1. Element Progress Card */}
      <div className="card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            📊 ความก้าวหน้าของการดำเนินงาน องค์ประกอบที่ {elementNum}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            คำนวณตามจริงจากสถานะใบงานกิจกรรมและหลักฐานอ้างอิง ({records.length} รายการบันทึก)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {progressPercentage}%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              ร้อยละความสำเร็จ
            </span>
          </div>
          <div style={{ width: '120px', height: '10px', borderRadius: '50px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {statusMsg.text && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          backgroundColor: statusMsg.type === 'success' ? 'rgba(46, 125, 50, 0.08)' : statusMsg.type === 'error' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(2, 136, 209, 0.08)',
          color: statusMsg.type === 'success' ? 'var(--color-primary)' : statusMsg.type === 'error' ? 'var(--color-danger)' : 'var(--color-info)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(46, 125, 50, 0.15)' : statusMsg.type === 'error' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(2, 136, 209, 0.15)'}`,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {statusMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2. Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📁 ทำเนียบหลักฐานและการบันทึกข้อมูล (6 ฟิลด์หลักตาม อพ.สธ.)
        </h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchRecords}
            className="btn btn-secondary"
            style={{ padding: '0.5rem', width: '36px', height: '36px', borderRadius: '50%' }}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} />
          </button>

          {userRole !== 'visitor' && !isFormOpen && (
            <button onClick={() => setIsFormOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Plus size={14} /> เพิ่มข้อมูลหลักฐานใหม่
            </button>
          )}
        </div>
      </div>

      {/* 3. Record Insert Form */}
      {isFormOpen && (
        <div className="card glass-panel" style={{ border: '2px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h4 style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
              📝 บันทึกข้อมูลและหลักฐานองค์ประกอบที่ {elementNum}
            </h4>
            <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateRecord}>
            <div className="form-group">
              <label className="form-label">หัวข้อบันทึกกิจกรรม / แผนดำเนินงาน</label>
              <input
                type="text"
                className="form-control"
                placeholder="เช่น การรวบรวมพิกัดและสำรวจรหัสพรรณไม้ประจำโซน A"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">รายละเอียด / ข้อมูลหลักของการดำเนินงาน (Data)</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="อธิบายกิจกรรม วิธีการดำเนินงาน และผลลัพธ์โดยสังเขป..."
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">ผู้รับผิดชอบ</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ชื่อครู หรือ กลุ่มนักเรียน"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">วันที่ดำเนินการ</label>
                <input
                  type="date"
                  className="form-control"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">สถานะการดำเนินงาน</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="รอดำเนินการ">รอดำเนินการ (Pending)</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ (In Progress)</option>
                  <option value="ปรับปรุง">ปรับปรุง (Need Revision)</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น (Completed)</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              {/* Photo Upload */}
              <div className="form-group" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} color="var(--color-primary)" /> 1. รูปภาพหลักฐาน (Photo)
                </label>

                <input
                  type="file"
                  accept="image/*"
                  id={`file-image-el-${elementNum}`}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <label htmlFor={`file-image-el-${elementNum}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    {uploadingImage ? 'กำลังอัปโหลด...' : <><Upload size={12} /> เลือกและอัปโหลดรูปภาพ</>}
                  </label>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หรือ ป้อน URL รูปภาพโดยตรง:</span>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', marginTop: '4px' }}
                  />
                </div>

                {imageUrl && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={imageUrl} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>เชื่อมโยงรูปภาพเรียบร้อย</span>
                  </div>
                )}
              </div>

              {/* Document Link */}
              <div className="form-group" style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="var(--color-orchid)" /> 2. เอกสาร/ไฟล์แนบ (Attachment PDF)
                </label>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                  id={`file-doc-el-${elementNum}`}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e.target.files[0], 'doc')}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <label htmlFor={`file-doc-el-${elementNum}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    {uploadingDoc ? 'กำลังอัปโหลด...' : <><Upload size={12} /> อัปโหลดเอกสารแนบ</>}
                  </label>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>หรือ ป้อน URL เอกสารโดยตรง:</span>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', marginTop: '4px' }}
                  />
                </div>

                {attachmentUrl && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                    <FileText size={14} color="var(--color-orchid)" />
                    <span style={{ color: 'var(--color-orchid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>เชื่อมโยงเอกสารแนบเรียบร้อย</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn btn-primary"><Save size={14} /> บันทึกบันทึกหลักฐาน</button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Table / List of records */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลรายงานหลักฐาน...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            ยังไม่มีการบันทึกข้อมูลหลักฐานในองค์ประกอบนี้ กรุณากด "เพิ่มข้อมูลหลักฐานใหม่" เพื่อบันทึกข้อมูลแบบไม่มี mock data
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table className="custom-table" style={{ fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>วันที่ดำเนินการ</th>
                  <th>หัวข้อและรายละเอียดงาน (Data)</th>
                  <th style={{ width: '140px' }}>ผู้รับผิดชอบ</th>
                  <th style={{ width: '100px' }}>รูปภาพแนบ</th>
                  <th style={{ width: '100px' }}>เอกสารแนบ</th>
                  <th style={{ width: '130px' }}>สถานะการดำเนินงาน</th>
                  {(userRole === 'admin' || userRole === 'teacher') && <th style={{ width: '90px' }}>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id}>
                      {/* 1. Date */}
                      <td>
                        {isEditing ? (
                          <input
                            type="date"
                            className="form-control"
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={editActionDate}
                            onChange={(e) => setEditActionDate(e.target.value)}
                          />
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500, color: 'var(--text-muted)' }}>
                            <Calendar size={12} /> {r.action_date}
                          </span>
                        )}
                      </td>

                      {/* 2. Title & Data */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="หัวข้อ"
                            />
                            <textarea
                              className="form-control"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                              value={editData}
                              onChange={(e) => setEditData(e.target.value)}
                              placeholder="รายละเอียดรายละเอียดหลัก"
                              rows="3"
                            />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.92rem', marginBottom: '4px' }}>
                              {r.title}
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                              {r.data}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 3. Responsible */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={editResponsible}
                            onChange={(e) => setEditResponsible(e.target.value)}
                          />
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <User size={12} color="var(--color-orchid)" /> {r.responsible_person || 'ไม่ระบุ'}
                          </span>
                        )}
                      </td>

                      {/* 4. Image URL */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                              type="url"
                              className="form-control"
                              placeholder="รูปภาพ URL"
                              style={{ padding: '0.25rem', fontSize: '0.78rem' }}
                              value={editImageUrl}
                              onChange={(e) => setEditImageUrl(e.target.value)}
                            />
                            <input
                              type="file"
                              accept="image/*"
                              id={`edit-file-image-${r.id}`}
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
                            />
                            <label htmlFor={`edit-file-image-${r.id}`} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'block' }}>
                              อัปโหลดใหม่
                            </label>
                          </div>
                        ) : r.image_url ? (
                          <a href={r.image_url} target="_blank" rel="noreferrer" title="คลิกเพื่อดูรูปขนาดเต็ม">
                            <img
                              src={r.image_url}
                              alt="หลักฐาน"
                              className="plant-thumbnail"
                              style={{ width: '45px', height: '45px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ไม่มีรูปภาพ</span>
                        )}
                      </td>

                      {/* 5. Attachment URL */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input
                              type="url"
                              className="form-control"
                              placeholder="เอกสาร URL"
                              style={{ padding: '0.25rem', fontSize: '0.78rem' }}
                              value={editAttachmentUrl}
                              onChange={(e) => setEditAttachmentUrl(e.target.value)}
                            />
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx"
                              id={`edit-file-doc-${r.id}`}
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileUpload(e.target.files[0], 'doc')}
                            />
                            <label htmlFor={`edit-file-doc-${r.id}`} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'block' }}>
                              อัปโหลดไฟล์
                            </label>
                          </div>
                        ) : r.attachment_url ? (
                          <a
                            href={r.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <ExternalLink size={10} /> เอกสารแนบ
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ไม่มีแนบ</span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td>
                        {isEditing ? (
                          <select
                            className="form-control"
                            style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                          >
                            <option value="รอดำเนินการ">รอดำเนินการ</option>
                            <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                            <option value="ปรับปรุง">ปรับปรุง</option>
                            <option value="เสร็จสิ้น">เสร็จสิ้น</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '50px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              display: 'inline-block',
                              ...getStatusBadgeStyle(r.status)
                            }}
                          >
                            {r.status}
                          </span>
                        )}
                      </td>

                      {/* 7. Management Buttons */}
                      {(userRole === 'admin' || userRole === 'teacher') && (
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleUpdateRecord(r.id)}
                                className="icon-btn"
                                style={{ width: '28px', height: '28px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none' }}
                                title="บันทึก"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="icon-btn"
                                style={{ width: '28px', height: '28px', backgroundColor: '#e2e8f0', color: '#000', border: 'none' }}
                                title="ยกเลิก"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => startEdit(r)}
                                className="icon-btn"
                                style={{ width: '28px', height: '28px' }}
                                title="แก้ไขกิจกรรม"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                className="icon-btn"
                                style={{ width: '28px', height: '28px', borderColor: 'var(--color-danger)' }}
                                title="ลบ"
                              >
                                <Trash2 size={12} color="var(--color-danger)" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
