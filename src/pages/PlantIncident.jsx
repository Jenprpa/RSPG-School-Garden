import React, { useState, useEffect } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AlertTriangle, Plus, Upload, CheckCircle, Trash2, Camera, Calendar, User, UserCheck } from 'lucide-react';

export default function PlantIncident({ userRole }) {
  const [plants, setPlants] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [changeType, setChangeType] = useState('ตัดแต่ง (Pruned)'); // 'ตัดแต่ง (Pruned)', 'ถูกย้าย (Moved)', 'ตาย (Died)', 'ถูกตัด (Cut)'
  const [description, setDescription] = useState('');
  const [reporter, setReporter] = useState('');
  const [approver, setApprover] = useState('');
  const [reason, setReason] = useState('');

  // Before & After files
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch plants for dropdown selection
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const pList = [];
      plantsSnap.forEach(d => pList.push({ id: d.id, ...d.data() }));
      setPlants(pList);

      // Fetch incident logs
      const incSnap = await getDocs(collection(db, 'rspg_plant_changes'));
      const iList = [];
      incSnap.forEach(d => iList.push({ id: d.id, ...d.data() }));
      setIncidents(iList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (file, folder) => {
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
    if (!selectedPlantId) {
      alert('กรุณาเลือกพรรณไม้');
      return;
    }

    setUploading(true);
    setStatus('กำลังเตรียมการและอัปโหลดภาพก่อน-หลัง...');

    try {
      let beforeUrl = '';
      let afterUrl = '';

      if (beforeFile) {
        beforeUrl = await handleFileUpload(beforeFile, 'incident_before');
      }
      if (afterFile) {
        afterUrl = await handleFileUpload(afterFile, 'incident_after');
      }

      const matchPlant = plants.find(p => p.id === selectedPlantId);
      const plantCode = matchPlant ? matchPlant.plant_code : '';
      const plantName = matchPlant ? matchPlant.thai_name : '';

      const payload = {
        plant_id: selectedPlantId,
        plant_code: plantCode,
        plant_name: plantName,
        change_type: changeType,
        description,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        reporter: reporter || 'ผู้แจ้งเหตุ',
        approver: approver || 'ครูผู้ดูแล',
        reason,
        status: (userRole === 'admin' || userRole === 'teacher' || userRole === 'rspg_teacher') ? 'อนุมัติแล้ว' : 'รอการอนุมัติ',
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      // 1. Save incident document
      await addDoc(collection(db, 'rspg_plant_changes'), payload);

      // 2. If approved, automatically update the plant status in main plants collection
      if (payload.status === 'อนุมัติแล้ว') {
        const plantRef = doc(db, 'plants', selectedPlantId);
        let statusString = 'สมบูรณ์';
        if (changeType.includes('ตาย')) statusString = 'ตาย (Died)';
        else if (changeType.includes('ตัด')) statusString = 'ถูกตัด (Cut)';
        else if (changeType.includes('ย้าย')) statusString = 'ถูกย้าย (Moved)';
        else if (changeType.includes('แต่ง')) statusString = 'ตัดแต่งแล้ว';

        await updateDoc(plantRef, { status: statusString });
      }

      setStatus('✅ บันทึกอุบัติการณ์ความปลอดภัยพรรณไม้สำเร็จแล้ว!');

      // Reset
      setSelectedPlantId('');
      setDescription('');
      setReporter('');
      setApprover('');
      setReason('');
      setBeforeFile(null);
      setAfterFile(null);

      loadData();
    } catch (err) {
      setStatus('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (incident) => {
    if (userRole !== 'admin' && userRole !== 'teacher' && userRole !== 'rspg_teacher') {
      alert('เฉพาะครูและผู้ดูแลระบบเท่านั้นที่สามารถอนุมัติได้');
      return;
    }

    try {
      // 1. Update status to Approved
      const incRef = doc(db, 'rspg_plant_changes', incident.id);
      await updateDoc(incRef, { status: 'อนุมัติแล้ว' });

      // 2. Update status of the plant
      const plantRef = doc(db, 'plants', incident.plant_id);
      let statusString = 'สมบูรณ์';
      if (incident.change_type.includes('ตาย')) statusString = 'ตาย (Died)';
      else if (incident.change_type.includes('ตัด')) statusString = 'ถูกตัด (Cut)';
      else if (incident.change_type.includes('ย้าย')) statusString = 'ถูกย้าย (Moved)';
      else if (incident.change_type.includes('แต่ง')) statusString = 'ตัดแต่งแล้ว';

      await updateDoc(plantRef, { status: statusString });

      alert('อนุมัติการเปลี่ยนแปลงและบันทึกประวัติสำเร็จ');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบประวัติได้');
      return;
    }
    if (!window.confirm('ต้องการลบประวัติตัวนี้ออกจากฐานข้อมูลหรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'rspg_plant_changes', id));
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดบันทึกอุบัติการณ์...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบแจ้งการเปลี่ยนแปลงพรรณไม้และการบำรุงรักษา (Plant Change incidents Log)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              รายงานความปลอดภัยทางกายภาพต้นไม้: ย้ายที่ปลูก, กิ่งชำรุดตัดแต่ง, ต้นไม้ถูกตัด หรือต้นไม้ตาย พร้อมภาพถ่ายเปรียบเทียบก่อน-หลัง
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }} className="rspg-progress-grid">

        {/* Form to submit changes */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              📝 แจ้งและบันทึกการเปลี่ยนแปลง
            </h4>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">เลือกพรรณไม้ที่เกิดเหตุ</label>
                <select
                  className="form-control"
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  required
                >
                  <option value="">-- กรุณาเลือกต้นไม้ --</option>
                  {plants.map(p => (
                    <option key={p.id} value={p.id}>{p.thai_name} ({p.plant_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ประเภทการเปลี่ยนแปลง</label>
                  <select
                    className="form-control"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                  >
                    <option value="ตัดแต่ง (Pruned)">ตัดแต่ง (Pruned)</option>
                    <option value="ถูกย้าย (Moved)">ถูกย้าย (Moved)</option>
                    <option value="ตาย (Died)">ตาย (Died)</option>
                    <option value="ถูกตัด (Cut)">ถูกตัด (Cut)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ผู้รายงานแจ้งเรื่อง</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ชื่อผู้สืบค้น/นักเรียน/ครู"
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ผู้อนุมัติดำเนินการ (สำหรับครู/ผู้บริหาร)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น ผู้อำนวยการโรงเรียน / หัวหน้า อพ.สธ."
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">เหตุผลประกอบการดำเนินงาน</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น พายุพัดกิ่งชำรุด หรือ ย้ายหลบขอบอาคารใหม่"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">คำอธิบายงานบำรุงรักษา</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุพฤติกรรมการแก้ไข การสมานแผลต้นไม้ หรือวิธีการเคลื่อนย้าย..."
                  required
                />
              </div>

              {/* Before After Image Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📸 ภาพก่อนทำเหตุ</label>
                  <input type="file" onChange={(e) => setBeforeFile(e.target.files[0])} style={{ fontSize: '0.72rem', width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>📸 ภาพหลังทำเหตุ</label>
                  <input type="file" onChange={(e) => setAfterFile(e.target.files[0])} style={{ fontSize: '0.72rem', width: '100%' }} />
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
                disabled={uploading || userRole === 'visitor'}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={16} /> บันทึกและส่งตรวจอนุมัติ
              </button>
            </form>
          </div>
        </div>

        {/* List of incidents reported */}
        <div>
          <div className="card">
            <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              📋 ประวัติเหตุการณ์และบำรุงรักษาพรรณไม้ ({incidents.length})
            </h4>

            {incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                ไม่มีบันทึกข้อมูลการเปลี่ยนแปลงพรรณไม้ในรอบปี
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {incidents.map(inc => (
                  <div key={inc.id} className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: inc.status === 'อนุมัติแล้ว' ? 'rgba(46,125,50,0.1)' : 'rgba(255,152,0,0.1)',
                          color: inc.status === 'อนุมัติแล้ว' ? 'var(--color-success)' : 'var(--color-warning)'
                        }}>
                          {inc.status}
                        </span>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '8px 0 4px 0' }}>
                          {inc.plant_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({inc.plant_code})</span>
                        </h4>
                      </div>
                      {userRole === 'admin' && (
                        <button onClick={() => handleDelete(inc.id)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', margin: '8px 0' }}>
                      <p style={{ margin: '0 0 4px 0' }}><b>ประเภทการเปลี่ยน:</b> {inc.change_type}</p>
                      <p style={{ margin: '0 0 4px 0' }}><b>สาเหตุ/เหตุผล:</b> {inc.reason}</p>
                      <p style={{ margin: 0, padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', borderLeft: '3px solid var(--color-primary)' }}>
                        <b>การบำรุงรักษา:</b> {inc.description}
                      </p>
                    </div>

                    {/* Show Images if present */}
                    {(inc.before_photo_url || inc.after_photo_url) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '10px 0' }}>
                        {inc.before_photo_url ? (
                          <div>
                            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', textAlign: 'center' }}>ก่อนเกิดเหตุ</span>
                            <img src={inc.before_photo_url} alt="ก่อน" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                          </div>
                        ) : null}
                        {inc.after_photo_url ? (
                          <div>
                            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', textAlign: 'center' }}>หลังแก้ไข</span>
                            <img src={inc.after_photo_url} alt="หลัง" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><User size={10} /> แจ้งโดย: {inc.reporter}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><UserCheck size={10} /> ครูผู้ตรวจ: {inc.approver}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Calendar size={10} /> {inc.date}</span>
                      </div>

                      {inc.status !== 'อนุมัติแล้ว' && (userRole === 'admin' || userRole === 'teacher' || userRole === 'rspg_teacher') && (
                        <button onClick={() => handleApprove(inc)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                          อนุมัติการแจ้งเตือน
                        </button>
                      )}
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
