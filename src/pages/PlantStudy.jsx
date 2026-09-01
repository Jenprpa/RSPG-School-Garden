import React, { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Image, Upload, Plus, Trash2, BookOpen, AlertCircle, FileText } from 'lucide-react';

export default function PlantStudy({ userRole }) {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [plantName, setPlantName] = useState('');
  const [drawingType, setDrawingType] = useState('ภาพวาดสีน้ำพฤกษศาสตร์'); // 'ภาพวาดสีน้ำพฤกษศาสตร์', 'ภาพวาดลายเส้นลายมือ', 'เอกสารวิจัยโครงสร้าง'
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_plant_studies'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setStudies(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (file) => {
    if (!storage || !file) return '';
    try {
      const fileName = `plant_studies/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error(err);
      alert('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor' || userRole === 'executive' || userRole === 'evaluator') {
      alert('คุณไม่มีสิทธิ์บันทึกข้อมูลในหน้านี้');
      return;
    }

    setUploading(true);
    setStatus('กำลังประมวลผลการอัปโหลดไฟล์ภาพสีน้ำ/ลายเส้น...');
    try {
      let fileUrl = '';
      if (file) {
        fileUrl = await handleFileUpload(file);
      }

      const payload = {
        plant_name: plantName,
        drawing_type: drawingType,
        artist: artist || 'ไม่ระบุชื่อ',
        description,
        file_url: fileUrl,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'rspg_plant_studies'), payload);
      setStatus('✅ บันทึกแฟ้มประเมินพืชศึกษา (องค์ประกอบที่ 3) สำเร็จแล้ว!');
      setPlantName('');
      setArtist('');
      setDescription('');
      setFile(null);
      loadData();
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin' && userRole !== 'rspg_board') {
      alert('เฉพาะผู้ดูแลระบบหรือคณะกรรมการสวนพฤกษศาสตร์เท่านั้นที่ลบข้อมูลหลักได้');
      return;
    }
    if (!window.confirm('ยืนยันที่จะลบเอกสารพืชศึกษานี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rspg_plant_studies', id));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดแฟ้มสะสมงานพืชศึกษา...</div>;

  const defaultStudies = studies.length ? studies : [
    { id: 'def_01', plant_name: 'กัลปพฤกษ์', drawing_type: 'ภาพวาดสีน้ำพฤกษศาสตร์', artist: 'นร.หญิง กานดา สุวรรณ', description: 'ภาพวาดสีน้ำแสดงช่อดอกและโครงสร้างกลีบดอก 5 กลีบอย่างสม่ำเสมอ', file_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=400&q=80' },
    { id: 'def_02', plant_name: 'ทองกวาว', drawing_type: 'ภาพวาดลายเส้นลายมือ', artist: 'นร.ชาย ธวัชชัย มีสุข', description: 'ภาพวาดลายเส้นแสดงทิศทางการงอกของใบเดี่ยวสลับขนนกปลายคี่', file_url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80' }
  ];

  const isReadOnly = userRole === 'visitor' || userRole === 'executive' || userRole === 'evaluator';

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              องค์ประกอบที่ 3 พืชศึกษา (แฟ้มประเมินดิจิทัล & ภาพวาดสีน้ำ)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              รวบรวมและวิเคราะห์โครงสร้างพรรณไม้เด่นทางวิชาการ ภาพวาดลายเส้น ภาพวาดสีน้ำ และรายงานโครงสร้างพฤกษศาสตร์ของพืชศึกษา
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }} className="rspg-progress-grid">

        {/* Upload Form (Only shown if NOT read-only) */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              🎨 เพิ่มผลงาน / เอกสารพืชศึกษาใหม่
            </h4>

            {isReadOnly ? (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(2,136,209,0.06)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>บทบาทของคุณสามารถดูแฟ้มพืชศึกษาได้ในฐานะ Read-Only เท่านั้น</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">ชื่อพรรณไม้เด่นที่ศึกษา</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น กัลปพฤกษ์"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">ประเภทผลงาน</label>
                    <select
                      className="form-control"
                      value={drawingType}
                      onChange={(e) => setDrawingType(e.target.value)}
                    >
                      <option value="ภาพวาดสีน้ำพฤกษศาสตร์">ภาพวาดสีน้ำพฤกษศาสตร์</option>
                      <option value="ภาพวาดลายเส้นลายมือ">ภาพวาดลายเส้นลายมือ</option>
                      <option value="เอกสารวิจัยโครงสร้าง">เอกสารวิจัยโครงสร้าง</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ผู้จัดทำ / วาดภาพ</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ชื่อนักเรียนหรือครู"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">คำอธิบายประกอบการจำแนก/เทคนิค</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="ระบุรายละเอียด สีน้ำที่ใช้ หรืออัตราสัดส่วนสเกลวัดขนาด..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-main)', marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 'bold' }}>แนบภาพวาด / เอกสาร PDF ผลงาน</label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ fontSize: '0.8rem', marginTop: '4px' }}
                    required
                  />
                </div>

                {status && (
                  <div style={{ padding: '8px 12px', backgroundColor: 'rgba(186,85,211,0.06)', color: 'var(--color-primary)', fontSize: '0.82rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    {status}
                  </div>
                )}

                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ width: '100%', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                  <Plus size={16} /> บันทึกและเผยแพร่ผลงาน
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Gallery / Document List */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              🖼️ แฟ้มประเมินภาพวาดทางพฤกษศาสตร์สีน้ำและสเก็ตช์ลายเส้น ({defaultStudies.length})
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="rspg-progress-grid">
              {defaultStudies.map(study => (
                <div key={study.id} className="card" style={{ padding: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
                  {study.file_url ? (
                    <img
                      src={study.file_url}
                      alt={study.plant_name}
                      style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', marginBottom: '8px' }}>
                      <FileText size={32} color="var(--text-muted)" />
                    </div>
                  )}

                  <div style={{ padding: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 'bold', border: '1px solid var(--color-primary)', padding: '1px 5px', borderRadius: '4px' }}>
                      {study.drawing_type}
                    </span>
                    <h5 style={{ margin: '8px 0 4px 0', fontSize: '0.92rem', fontWeight: 800 }}>พืช: {study.plant_name}</h5>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: '0 0 6px 0', lineHeight: 1.3 }}>{study.description}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ผู้วาด/ผู้เขียน: {study.artist}</span>
                  </div>

                  {(userRole === 'admin' || userRole === 'rspg_board') && (
                    <button
                      onClick={() => handleDelete(study.id)}
                      style={{ position: 'absolute', top: '15px', right: '15px', padding: '6px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(211,47,47,0.8)', color: '#fff', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
