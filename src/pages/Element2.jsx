import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Sprout, Layers, Heart, Calendar, Plus, Save, Activity, ClipboardList } from 'lucide-react';
import ElementRecordsSection from '../components/ElementRecordsSection';

export default function Element2({ userRole }) {
  const [subTab, setSubTab] = useState('records'); // 'records', 'areas', 'maintenance', 'relocations'
  
  // States
  const [areas, setAreas] = useState([]);
  const [plants, setPlants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [plantMap, setPlantMap] = useState({});
  
  // Form states
  const [areaCode, setAreaCode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [statusText, setStatusText] = useState('');

  // Maintenance form states
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [maintType, setMaintType] = useState('watering');
  const [operator, setOperator] = useState('');
  const [maintDesc, setMaintDesc] = useState('');

  const loadData = async () => {
    if (!isFirebaseConfigured()) return;
    try {
      // 1. Fetch study areas
      const areasSnap = await getDocs(collection(db, 'study_areas'));
      const areasList = [];
      areasSnap.forEach(docSnap => {
        areasList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAreas(areasList);

      // 2. Fetch plants
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

      // 3. Fetch logs
      const q = query(collection(db, 'plant_logs'), orderBy('created_at', 'desc'));
      const logsSnap = await getDocs(q);
      const logsList = [];
      logsSnap.forEach(docSnap => {
        logsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLogs(logsList);
    } catch (err) {
      console.error('Error loading data in Element 2:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusText('กำลังบันทึก...');
    try {
      await addDoc(collection(db, 'study_areas'), {
        area_code: areaCode,
        area_name: areaName,
        description: areaDesc
      });

      setStatusText('บันทึกพื้นที่ศึกษาสำเร็จ!');
      setAreaCode('');
      setAreaName('');
      setAreaDesc('');
      loadData();
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusText('กำลังบันทึกกิจกรรม...');
    try {
      await addDoc(collection(db, 'plant_logs'), {
        plant_id: selectedPlantId,
        log_type: 'maintenance',
        action_type: maintType,
        description: maintDesc,
        operator_name: operator,
        created_at: new Date().toISOString()
      });

      setStatusText('บันทึกกิจกรรมการดูแลรักษาสำเร็จ!');
      setMaintDesc('');
      loadData();
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div>
      {/* Introduction Card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          องค์ประกอบที่ 2: การรวบรวมพรรณไม้เข้าปลูกในโรงเรียน
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          เน้นเรื่องการวิเคราะห์พื้นที่ออกแบบสวนพฤกษศาสตร์ กำหนดจุดศึกษาพืช การปลูกพืชเพิ่มเติมเพื่อประดับตกแต่งหรือการเรียนรู้ และจัดเก็บประวัติการบำรุงรักษา (การรดน้ำ ใส่ปุ๋ย ตัดแต่งกิ่ง ถอนวัชพืช) ตลอดจนการติดตามประวัติย้ายต้นไม้หรือการชำรุดเสียหายเพื่อคงสภาพ
        </p>

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
          <button 
            onClick={() => { setSubTab('records'); setStatusText(''); }} 
            className={`btn ${subTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <ClipboardList size={14} /> บันทึกกิจกรรมและหลักฐาน (6 ฟิลด์หลัก)
          </button>

          <button 
            onClick={() => { setSubTab('areas'); setStatusText(''); }} 
            className={`btn ${subTab === 'areas' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Layers size={14} /> ทะเบียนพื้นที่ศึกษา ({areas.length})
          </button>
          
          <button 
            onClick={() => { setSubTab('maintenance'); setStatusText(''); }} 
            className={`btn ${subTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Heart size={14} /> บันทึกการดูแลรักษา
          </button>
          
          <button 
            onClick={() => { setSubTab('relocations'); setStatusText(''); }} 
            className={`btn ${subTab === 'relocations' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Activity size={14} /> ประวัติการย้ายและแจ้งชำรุด
          </button>
        </div>
      </div>

      {statusText && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(46, 125, 50, 0.08)',
          color: 'var(--color-primary)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(46, 125, 50, 0.15)'
        }}>
          {statusText}
        </div>
      )}

      {/* Render subtabs content */}
      {subTab === 'records' && (
        <ElementRecordsSection elementNum={2} userRole={userRole} />
      )}

      {subTab === 'areas' && (
        <div className="grid-2">
          {/* List study areas */}
          <div className="card">
            <h3 className="card-title">ผังพื้นที่ศึกษาพรรณไม้ของโรงเรียน</h3>
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>รหัสพื้นที่</th>
                    <th>ชื่อเรียกพื้นที่</th>
                    <th>คำอธิบาย/เป้าหมาย</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่ได้บันทึกพื้นที่ศึกษา</td>
                    </tr>
                  ) : (
                    areas.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.area_code}</td>
                        <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{a.area_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{a.description || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Study Area form */}
          <div className="card">
            <h3 className="card-title">เพิ่มพื้นที่ศึกษาพฤกษศาสตร์ใหม่</h3>
            {userRole === 'visitor' ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>เฉพาะผู้ได้รับสิทธิ์จึงจะบันทึกข้อมูลได้</div>
            ) : (
              <form onSubmit={handleAddArea}>
                <div className="form-group">
                  <label className="form-label">รหัสพื้นที่ (Area Code)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น A-04" 
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อพื้นที่ศึกษา</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น สวนสมุนไพรข้างตึกคหกรรม" 
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รายละเอียด / จุดประสงค์การศึกษา</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="ระบุจุดมุ่งหมายหรือพันธุ์พืชหลักของจุดนี้..."
                    value={areaDesc}
                    onChange={(e) => setAreaDesc(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Save size={16} /> บันทึกพื้นที่ศึกษา
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {subTab === 'maintenance' && (
        <div className="grid-2">
          {/* Maintenance Input Form */}
          <div className="card">
            <h3 className="card-title">บันทึกประวัติการบำรุงรักษาต้นไม้</h3>
            {userRole === 'visitor' ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>เฉพาะครูและนักเรียนที่มีรหัสผ่านจึงจะบันทึกกิจกรรมได้</div>
            ) : (
              <form onSubmit={handleAddMaintenance}>
                <div className="form-group">
                  <label className="form-label">เลือกต้นไม้ที่ได้รับการดูแล</label>
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
                    <label className="form-label">ประเภทการดูแล</label>
                    <select 
                      className="form-control"
                      value={maintType}
                      onChange={(e) => setMaintType(e.target.value)}
                    >
                      <option value="watering">รดน้ำต้นไม้</option>
                      <option value="fertilizing">ใส่ปุ๋ย/บำรุงดิน</option>
                      <option value="weeding">ถอนวัชพืช/ปราบศัตรูพืช</option>
                      <option value="pruning">ตัดแต่งกิ่งไม้/เรือนยอด</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ชื่อผู้ดำเนินการ (คุณครู/นักเรียน)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุชื่อผู้ดูแล"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">รายละเอียดผลการดำเนินงาน</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="เช่น ใส่ปุ๋ยคอกปริมาณ 1 กิโลกรัมรอบโคนต้น รดน้ำตามทันที..."
                    value={maintDesc}
                    onChange={(e) => setMaintDesc(e.target.value)}
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Save size={16} /> บันทึกกิจกรรมการดูแล
                </button>
              </form>
            )}
          </div>

          {/* Maintenance list logs */}
          <div className="card">
            <h3 className="card-title">บันทึกกิจกรรมล่าสุด</h3>
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.filter(l => l.log_type === 'maintenance').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>ยังไม่พบประวัติการดูแลรักษาต้นไม้</div>
              ) : (
                logs.filter(l => l.log_type === 'maintenance').map(log => (
                  <div key={log.id} style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-main)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        {plantMap[log.plant_id]?.thai_name || 'พรรณไม้'} ({plantMap[log.plant_id]?.plant_code || 'ไม่ระบุรหัส'})
                      </span>
                      <span style={{ color: 'var(--color-orchid)', fontWeight: 600 }}>
                        {log.action_type === 'watering' ? 'รดน้ำ' : log.action_type === 'fertilizing' ? 'ใส่ปุ๋ย' : log.action_type === 'weeding' ? 'กำจัดวัชพืช' : log.action_type === 'pruning' ? 'ตัดแต่ง' : 'อื่นๆ'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-main)', margin: '4px 0' }}>{log.description || 'ไม่มีคำอธิบาย'}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                      <span>ผู้ทำ: {log.operator_name}</span>
                      <span>{log.created_at?.split('T')[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'relocations' && (
        <div className="card">
          <h3 className="card-title">ประวัติการเคลื่อนย้าย ชำรุด และเปลี่ยนแปลงพืชพรรณ</h3>
          <div className="table-container" style={{ marginTop: 0 }}>
            <table className="custom-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>รหัสต้นไม้</th>
                  <th>ชื่อต้นไม้</th>
                  <th>เหตุการณ์การเปลี่ยนแปลง</th>
                  <th>ภาพถ่ายหลักฐาน</th>
                  <th>วันที่ดำเนินการ</th>
                  <th>ผู้รายงาน</th>
                </tr>
              </thead>
              <tbody>
                {logs.filter(l => l.log_type === 'change_alert').length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      ยังไม่มีประวัติการย้าย ชำรุด หรือเปลี่ยนแปลงพรรณไม้
                    </td>
                  </tr>
                ) : (
                  logs.filter(l => l.log_type === 'change_alert').map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{plantMap[log.plant_id]?.plant_code}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{plantMap[log.plant_id]?.thai_name}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: log.action_type === 'cut' ? '#ffcdd2' : log.action_type === 'damaged' ? '#ffe0b2' : '#e1bee7',
                          color: log.action_type === 'cut' ? '#b71c1c' : log.action_type === 'damaged' ? '#e65100' : '#4a148c'
                        }}>
                          {log.action_type === 'cut' ? 'ตัดโค่น' : log.action_type === 'damaged' ? 'เสียหาย/ชำรุด' : 'ย้ายพิกัดปลูก'}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {log.description}
                        </div>
                      </td>
                      <td>
                        {log.photo_before_url ? (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <a href={log.photo_before_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-orchid)', textDecoration: 'underline' }}>ดูภาพก่อน</a>
                            {log.photo_after_url && <a href={log.photo_after_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>ดูภาพหลัง</a>}
                          </div>
                        ) : 'ไม่มีรูป'}
                      </td>
                      <td>{log.created_at?.split('T')[0]}</td>
                      <td>{log.operator_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
