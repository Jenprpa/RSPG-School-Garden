import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { CheckCircle2, XCircle, MapPin, Tag, Edit2, Check, ClipboardList } from 'lucide-react';
import ElementRecordsSection from '../components/ElementRecordsSection';

export default function Element1({ userRole, onSelectPlant }) {
  const [activeSubTab, setActiveSubTab] = useState('records'); // 'records' or 'coords'
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [statusText, setStatusText] = useState('');

  const fetchPlants = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'plants'), orderBy('plant_code'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlants(list);

      if (list.length > 0) {
        setSelectedPlantId(list[0].id);
        setLat(list[0].gps_lat || '');
        setLng(list[0].gps_lng || '');
      }
    } catch (err) {
      console.error('Error fetching plants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handlePlantChange = (id) => {
    setSelectedPlantId(id);
    const plant = plants.find(p => p.id === id);
    if (plant) {
      setLat(plant.gps_lat || '');
      setLng(plant.gps_lng || '');
    }
  };

  const handleUpdateCoordinates = async (e) => {
    e.preventDefault();
    if (!selectedPlantId) return;

    setStatusText('กำลังบันทึกพิกัด...');
    try {
      await setDoc(doc(db, 'plants', selectedPlantId), {
        gps_lat: lat ? parseFloat(lat) : null,
        gps_lng: lng ? parseFloat(lng) : null
      }, { merge: true });

      setStatusText('บันทึกพิกัด GPS สำเร็จ!');
      fetchPlants();
      setTimeout(() => setStatusText(''), 3000);
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const gpsCompletedCount = plants.filter(p => p.gps_lat && p.gps_lng).length;
  const imageCompletedCount = plants.filter(p => p.image_url).length;

  return (
    <div>
      {/* Element 1 Introduction Header */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          องค์ประกอบที่ 1: การจัดทำป้ายชื่อพรรณไม้
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          เป็นการศึกษาธรรมชาติของพืชพรรณที่ปลูกในโรงเรียนและชุมชน คัดเลือกพืชตัวอย่างเพื่อวิเคราะห์ลักษณะ วาดแผนผังโรงเรียน จัดตั้งจุดหรือพื้นที่ศึกษา กำหนดรหัสพรรณไม้ วาดภาพ สัณฐานวิเคราะห์ บันทึกพิกัดตำแหน่ง ละติจูด ลองจิจูด และสร้างป้ายข้อมูล (QR Code) เพื่อเผยแพร่การศึกษา
        </p>

        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
          <button
            onClick={() => setActiveSubTab('records')}
            className={`btn ${activeSubTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <ClipboardList size={14} /> บันทึกกิจกรรมและหลักฐาน (6 ฟิลด์หลัก)
          </button>

          <button
            onClick={() => setActiveSubTab('coords')}
            className={`btn ${activeSubTab === 'coords' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <MapPin size={14} /> ทะเบียนพิกัดตำแหน่งพรรณไม้ ({gpsCompletedCount})
          </button>
        </div>
      </div>

      {activeSubTab === 'records' ? (
        <ElementRecordsSection elementNum={1} userRole={userRole} />
      ) : (
        <div>
          {/* Progress gauge */}
          <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(46, 125, 50, 0.08)',
              border: '1px solid rgba(46, 125, 50, 0.2)',
              fontSize: '0.85rem'
            }}>
              📍 <b>พิกัด GPS สำเร็จ:</b> {gpsCompletedCount} / {plants.length} ต้น ({plants.length ? Math.round((gpsCompletedCount/plants.length)*100) : 0}%)
            </div>
            <div style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(186, 85, 211, 0.08)',
              border: '1px solid rgba(186, 85, 211, 0.2)',
              fontSize: '0.85rem'
            }}>
              📸 <b>ภาพถ่ายแนบสำเร็จ:</b> {imageCompletedCount} / {plants.length} ต้น ({plants.length ? Math.round((imageCompletedCount/plants.length)*100) : 0}%)
            </div>
          </div>

          <div className="grid-2">
            {/* Left Card: Tree coordinates list */}
            <div className="card">
              <h3 className="card-title">สถานะความพร้อมข้อมูลตำแหน่งพรรณไม้</h3>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดข้อมูล...</div>
              ) : (
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', fontSize: '0.88rem' }}>
                    <thead>
                      <tr>
                        <th>รหัสพรรณไม้</th>
                        <th>ชื่อไทย</th>
                        <th>พิกัด GPS</th>
                        <th>สถานะรูปภาพ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plants.map(p => (
                        <tr key={p.id} onClick={() => handlePlantChange(p.id)} style={{ cursor: 'pointer', backgroundColor: selectedPlantId === p.id ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                          <td style={{ fontWeight: 600 }}>{p.plant_code}</td>
                          <td>{p.thai_name}</td>
                          <td>
                            {p.gps_lat && p.gps_lng ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: 500 }}>
                                <CheckCircle2 size={14} /> ครบ
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontWeight: 500 }}>
                                <XCircle size={14} /> ขาด
                              </span>
                            )}
                          </td>
                          <td>
                            {p.image_url ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: 500 }}>
                                <CheckCircle2 size={14} /> มีภาพ
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontWeight: 500 }}>
                                <XCircle size={14} /> ขาด
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Card: GPS coordinates form */}
            <div className="card">
              <h3 className="card-title">บันทึกและปรับปรุงพิกัดตำแหน่ง (GPS & Layout)</h3>

              {userRole === 'visitor' ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  เฉพาะผู้ดูแลระบบ ครู และนักเรียนที่ลงทะเบียน เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลพิกัด
                </div>
              ) : (
                <form onSubmit={handleUpdateCoordinates}>
                  <div className="form-group">
                    <label className="form-label">เลือกพรรณไม้สำหรับระบุพิกัด</label>
                    <select
                      className="form-control"
                      value={selectedPlantId}
                      onChange={(e) => handlePlantChange(e.target.value)}
                    >
                      <option value="">-- เลือกต้นไม้ --</option>
                      {plants.map(p => (
                        <option key={p.id} value={p.id}>{p.plant_code} - {p.thai_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">พิกัดละติจูด (Latitude)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        placeholder="เช่น 19.3621"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">พิกัดลองจิจูด (Longitude)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        placeholder="เช่น 98.4372"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <MapPin size={16} color="var(--color-orchid)" />
                    <span>
                      คำแนะนำ: สามารถสแกนพิกัดได้จาก Google Maps บนโทรศัพท์มือถือขณะสำรวจหน้าต้นไม้ แล้วนำมากรอกด้านบน
                    </span>
                  </div>

                  {statusText && (
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(46,125,50,0.1)',
                      color: 'var(--color-success)',
                      fontSize: '0.88rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Check size={16} />
                      {statusText}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <Edit2 size={16} /> บันทึกพิกัดตำแหน่งต้นไม้
                  </button>
                </form>
              )}

              {/* Guidelines on plotting */}
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>การทำผังตำแหน่งพรรณไม้โรงเรียน</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  เมื่อบันทึกพิกัดครบถ้วนแล้ว ระบบจะดึงพิกัดไปใช้วาดผังแบบเรียลไทม์บน Dashboard เพื่อนำเสนอหลักฐานในการประเมินโรงเรียน ท่านสามารถพิมพ์ผังตำแหน่งพรรณไม้ของโรงเรียนออกเป็นเอกสารประกอบการประเมินได้
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
