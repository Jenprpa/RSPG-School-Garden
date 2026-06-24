import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Eye, EyeOff, Check, X, ShieldCheck, Search, Sprout, FileText } from 'lucide-react';

export default function PublicReleaseManager({ userRole }) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const loadPlants = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const list = [];
      plantsSnap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setPlants(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleToggleRelease = async (plantId, currentVal) => {
    if (userRole !== 'admin' && userRole !== 'rspg_teacher') {
      alert('เฉพาะผู้ดูแลระบบและครูผู้รับผิดชอบงานสวนพฤกษศาสตร์เท่านั้นที่จัดการสิทธิ์การเผยแพร่ได้');
      return;
    }

    try {
      const plantRef = doc(db, 'plants', plantId);
      const newVal = !currentVal;
      await updateDoc(plantRef, { is_public: newVal });
      
      setStatusMsg(`อัปเดตสิทธิ์การเผยแพร่ของพืชเรียบร้อยแล้ว! (สถานะ: ${newVal ? 'เผยแพร่สาธารณะ' : 'ส่วนตัวในระบบ'})`);
      setTimeout(() => setStatusMsg(''), 3000);
      
      loadPlants();
    } catch (err) {
      alert('ล้มเหลวในการตั้งค่า: ' + err.message);
    }
  };

  const filteredPlants = plants.filter(p => 
    p.thai_name.toLowerCase().includes(search.toLowerCase()) ||
    p.plant_code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดทะเบียนพรรณไม้...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบเผยแพร่ข้อมูลสาธารณะ (Public Release Manager)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              อนุมัติและปรับสถานะการเผยแพร่ ทะเบียนพืชและสัณฐานวิทยาใบงาน ก.7-003 ออกสู่หน้าเว็บไซต์สำหรับบุคคลทั่วไป
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '320px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="ค้นหาชื่อพืช หรือรหัสพรรณไม้..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {statusMsg && (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
              {statusMsg}
            </span>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>รหัสพรรณไม้</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>ชื่อไทย / ชื่อวิทยาศาสตร์</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>สถานะในระบบ</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>สถานะเผยแพร่สาธารณะ</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlants.map(plant => {
              const isPublic = plant.is_public !== false; // default to true if not explicitly set false
              return (
                <tr key={plant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{plant.plant_code}</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 600 }}>{plant.thai_name}</div>
                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{plant.scientific_name}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(186,85,211,0.06)',
                      color: 'var(--color-primary)',
                      fontWeight: 600
                    }}>
                      {plant.status || 'สมบูรณ์'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {isPublic ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        <Eye size={14} /> เผยแพร่แล้ว
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <EyeOff size={14} /> ส่วนตัว (Private)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleToggleRelease(plant.id, isPublic)}
                      disabled={userRole !== 'admin' && userRole !== 'rspg_teacher'}
                      className={`btn ${isPublic ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isPublic ? (
                        <>
                          <EyeOff size={12} /> ตั้งเป็นส่วนตัว
                        </>
                      ) : (
                        <>
                          <Eye size={12} /> เปิดเผยแพร่
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
