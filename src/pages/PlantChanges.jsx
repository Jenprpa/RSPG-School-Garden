import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AlertTriangle, Upload, Save, Trash2, History } from 'lucide-react';

export default function PlantChanges({ userRole }) {
  const [plants, setPlants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plantMap, setPlantMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [changeType, setChangeType] = useState('damaged');
  const [description, setDescription] = useState('');
  const [operatorName, setOperatorName] = useState('');
  
  const [imageBeforeFile, setImageBeforeFile] = useState(null);
  const [imageAfterFile, setImageAfterFile] = useState(null);
  const [statusText, setStatusText] = useState('');

  const loadData = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const plantsList = [];
      const map = {};
      plantsSnap.forEach(docSnap => {
        const item = { id: docSnap.id, ...docSnap.data() };
        plantsList.push(item);
        map[docSnap.id] = item;
      });
      setPlants(plantsList);
      setPlantMap(map);
      
      if (plantsList.length > 0 && !selectedPlantId) {
        setSelectedPlantId(plantsList[0].id);
      }

      // Query alerts ordered by created_at desc
      const q = query(
        collection(db, 'plant_logs'), 
        where('log_type', '==', 'change_alert'),
        orderBy('created_at', 'desc')
      );
      const logsSnap = await getDocs(q);
      const logsList = [];
      logsSnap.forEach(docSnap => {
        logsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLogs(logsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadLogImage = async (file, label) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logs/${Date.now()}-${label}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.error(err);
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusText('กำลังบันทึกเหตุการณ์การเปลี่ยนแปลง...');
    try {
      let photoBeforeUrl = '';
      let photoAfterUrl = '';

      if (imageBeforeFile) {
        photoBeforeUrl = await handleUploadLogImage(imageBeforeFile, 'before');
      }
      if (imageAfterFile) {
        photoAfterUrl = await handleUploadLogImage(imageAfterFile, 'after');
      }

      await addDoc(collection(db, 'plant_logs'), {
        plant_id: selectedPlantId,
        log_type: 'change_alert',
        action_type: changeType,
        description: description,
        photo_before_url: photoBeforeUrl,
        photo_after_url: photoAfterUrl,
        operator_name: operatorName,
        created_at: new Date().toISOString()
      });

      setStatusText('บันทึกการเปลี่ยนแปลงของต้นไม้สำเร็จ!');
      setDescription('');
      setOperatorName('');
      setImageBeforeFile(null);
      setImageAfterFile(null);
      loadData();
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleDeleteLog = async (id) => {
    if (userRole !== 'admin') return;
    if (window.confirm('คุณแน่ใจว่าต้องการลบประวัตินี้?')) {
      try {
        await deleteDoc(doc(db, 'plant_logs', id));
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div>
      <div className="grid-2">
        {/* Left Side: Report Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>รายงานสถานะการเปลี่ยนแปลง/ความเสียหาย</h3>
          </div>

          {userRole === 'visitor' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              เฉพาะครูผู้รับผิดชอบหรือผู้ดูแลระบบที่มีสิทธิ์บันทึกเหตุการณ์การเปลี่ยนแปลงต้นไม้
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">เลือกพรรณไม้ที่ได้รับความเปลี่ยนแปลง</label>
                <select 
                  className="form-control"
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  required
                >
                  {plants.map(p => (
                    <option key={p.id} value={p.id}>{p.plant_code} - {p.thai_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ประเภทเหตุการณ์</label>
                  <select 
                    className="form-control"
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                  >
                    <option value="damaged">ต้นไม้เสียหาย / ชำรุด</option>
                    <option value="moved">ต้นไม้ถูกเคลื่อนย้ายสถานที่ปลูก</option>
                    <option value="cut">ต้นไม้ถูกโค่นล้ม / ตัดแต่งใหญ่</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อผู้รายงานเหตุการณ์</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ระบุชื่อผู้บันทึก" 
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดการเปลี่ยนแปลง/การแก้ไขดำเนินการ</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="เช่น ย้ายต้นไม้จากบริเวณ A-01 ไปยังพื้นที่ A-02 เนื่องจากโดนบดบังแสง..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">รูปภาพหลักฐาน (ก่อนดำเนินการ)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageBeforeFile(e.target.files[0])}
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รูปภาพหลักฐาน (หลังดำเนินการ)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setImageAfterFile(e.target.files[0])}
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  />
                </div>
              </div>

              {statusText && (
                <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.1)', color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {statusText}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Save size={16} /> บันทึกการเปลี่ยนแปลงต้นไม้
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Timeline History */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <History size={24} color="var(--color-orchid)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>ประวัติและสายธารเหตุการณ์ความปลอดภัยของต้นไม้</h3>
          </div>

          <div style={{ maxHeight: '460px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังดึงข้อมูลประวัติ...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                ยังไม่มีการบันทึกอุบัติการณ์หรือความเสียหายใดๆ
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{
                  padding: '1rem',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-main)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {plantMap[log.plant_id]?.thai_name || 'พรรณไม้'} ({plantMap[log.plant_id]?.plant_code || 'ไม่ระบุรหัส'})
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: log.action_type === 'cut' ? 'var(--color-danger)' : 'var(--color-warning)'
                    }}>
                      {log.action_type === 'cut' ? 'ตัดโค่น' : log.action_type === 'damaged' ? 'ชำรุดเสียหาย' : 'เคลื่อนย้าย'}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '6px 0' }}>
                    {log.description}
                  </p>

                  {/* Photos before / after */}
                  {(log.photo_before_url || log.photo_after_url) && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                      {log.photo_before_url && (
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)' }}>ก่อนแก้ไข</span>
                          <img src={log.photo_before_url} alt="ก่อนดำเนินการ" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        </div>
                      )}
                      {log.photo_after_url && (
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)' }}>หลังแก้ไข</span>
                          <img src={log.photo_after_url} alt="หลังดำเนินการ" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: '6px',
                    marginTop: '8px'
                  }}>
                    <span>ผู้บันทึก: {log.operator_name} | {log.created_at?.split('T')[0]}</span>
                    {userRole === 'admin' && (
                      <button onClick={() => handleDeleteLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} title="ลบประวัติ">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
