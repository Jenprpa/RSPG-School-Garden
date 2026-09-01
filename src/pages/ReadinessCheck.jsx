import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, query } from 'firebase/firestore';
import { CheckSquare, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck, Sprout, BookOpen, Layers } from 'lucide-react';

export default function ReadinessCheck({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState([]);
  const [plants, setPlants] = useState([]);
  const [k7Sheets, setK7Sheets] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Selections
  const [activeTab, setActiveTab] = useState('summary'); // summary | criteria | plants | worksheets

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Load Criteria
      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const critList = [];
      critSnap.forEach(d => critList.push({ id: d.id, ...d.data() }));
      setCriteria(critList);

      // 2. Load Plants
      const plantSnap = await getDocs(collection(db, 'plants'));
      const plantList = [];
      plantSnap.forEach(d => plantList.push({ id: d.id, ...d.data() }));
      setPlants(plantList);

      // 3. Load K7 sheets
      const k7Snap = await getDocs(collection(db, 'k7_worksheets'));
      const k7List = [];
      k7Snap.forEach(d => k7List.push({ id: d.id, ...d.data() }));
      setK7Sheets(k7List);

      // 4. Load mappings
      const mapSnap = await getDocs(collection(db, 'evidence_mapping'));
      const mapList = [];
      mapSnap.forEach(d => mapList.push({ id: d.id, ...d.data() }));
      setMappings(mapList);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังทำการตรวจสอบความพร้อมระบบงาน...</div>;

  // 1. Audit Criteria
  const critMissingEvidence = criteria.filter(c => {
    const linkedCount = mappings.filter(m => m.criteria_id === c.criteria_id).length;
    return linkedCount === 0;
  });

  const critMissingOwner = criteria.filter(c => !c.responsible_person || c.responsible_person === '-');
  const critMissingSelfScore = criteria.filter(c => c.self_score === undefined || c.self_score === 0);
  const critMissingPhoto = criteria.filter(c => !c.image_url);

  // 2. Audit Plants
  const plantsMissingQr = plants.filter(p => !p.plant_code);
  const plantsMissingLabel = plants.filter(p => p.is_tagged === 'ไม่มี');
  const plantsMissingDesc = plants.filter(p => !p.description || p.description.length < 10);

  // 3. Audit Worksheets
  const plantsMissingK7 = plants.filter(p => {
    const hasSheet = k7Sheets.find(s => s.plant_id === p.id);
    return !hasSheet;
  });

  const k7MissingPhotos = k7Sheets.filter(s => {
    return !s.habit_photo_url || !s.stem_photo_url || !s.leaf_photo_url ||
           !s.flower_photo_url || !s.fruit_photo_url || !s.seed_photo_url;
  });

  const k7Unapproved = k7Sheets.filter(s => s.status !== 'ผ่าน');

  // Counts and Rates
  const totalCriteria = criteria.length || 15;
  const completedCriteria = criteria.filter(c => {
    const hasEvidence = mappings.filter(m => m.criteria_id === c.criteria_id).length > 0;
    return hasEvidence && c.responsible_person && c.self_score > 0 && c.status === 'เสร็จสิ้น';
  }).length;
  const completionRate = Math.round((completedCriteria / totalCriteria) * 100);

  return (
    <div>
      {/* Upper header */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckSquare size={28} color="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ระบบตรวจเช็คความพร้อมการประเมินสถานศึกษา (Readiness Audit System)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                วิเคราะห์หาจุดบกพร่อง ขาดหลักฐานอ้างอิง หรือใบงาน ก.7-003 ของนักเรียนที่ยังไม่ครบถ้วน ก่อนรับคณะกรรมการประเมิน
              </p>
            </div>
          </div>
          <button onClick={loadData} className="btn btn-secondary">
            <RefreshCw size={14} /> อัปเดตผลตรวจ
          </button>
        </div>
      </div>

      {/* Navigation Sub Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'summary', label: '📊 ภาพรวมสรุปความพร้อม', icon: ShieldCheck },
          { id: 'criteria', label: '📋 จุดที่ขาดของเกณฑ์ตัวชี้วัด', icon: Layers },
          { id: 'plants', label: '🌳 จุดที่ขาดของพรรณไม้', icon: Sprout },
          { id: 'worksheets', label: '📝 จุดที่ขาดของใบงาน ก.7-003', icon: BookOpen }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                color: active ? '#fff' : 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}

      {/* SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Readiness gauge banner */}
          <div className="card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2rem',
            backgroundImage: 'radial-gradient(circle at top right, rgba(186,85,211,0.06), transparent 50%)',
            border: '2px solid var(--color-primary)'
          }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                เกณฑ์ดัชนีความพร้อมรวม: {completionRate}%
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                {completionRate >= 80 ? '✓ ความพร้อมอยู่ในระดับสูง พร้อมสำหรับการส่งเล่มใบเสนอขอประเมิน' : '⚠ กรุณาเติมหลักฐานหรือใบงานให้ครบถ้วนเพื่อผลคะแนนตามเกณฑ์'}
              </p>
            </div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: `6px solid ${completionRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1.25rem',
              color: completionRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)'
            }}>
              {completionRate}%
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }} className="rspg-progress-grid">
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ตัวชี้วัดขาดหลักฐาน</span>
                <AlertTriangle size={18} color="var(--color-danger)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0 0 0' }}>{critMissingEvidence.length} ข้อ</h3>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>พืชขาดป้ายชื่อ/รหัส</span>
                <AlertCircle size={18} color="var(--color-warning)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0 0 0' }}>{plantsMissingLabel.length} ต้น</h3>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ใบงาน ก.7-003 ยังไม่ผ่านตรวจ</span>
                <CheckSquare size={18} color="var(--color-primary)" />
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '10px 0 0 0' }}>{k7Unapproved.length} ฉบับ</h3>
            </div>
          </div>
        </div>
      )}

      {/* CRITERIA TAB */}
      {activeTab === 'criteria' && (
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: '1.25rem' }}>📋 ผลการสแกนความพร้อมของเกณฑ์ประเมินด้านบริหารและการจัดการ</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Row 1: Missing Evidences */}
            <div>
              <h5 style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '8px' }}>
                ⚠️ ตัวชี้วัดที่ยังไม่ได้ทำแผนผังหรือเชื่อมโยงหลักฐาน ({critMissingEvidence.length} รายการ)
              </h5>
              {critMissingEvidence.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-success)' }}>✓ ตัวชี้วัดทุกตัวได้รับการเชื่อมโยงหลักฐานคลังกลางเรียบร้อยแล้ว</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {critMissingEvidence.map(c => (
                    <span key={c.id} style={{ padding: '3px 8px', fontSize: '0.74rem', backgroundColor: 'rgba(211,47,47,0.06)', border: '1px solid rgba(211,47,47,0.1)', color: 'var(--color-danger)', borderRadius: '4px' }}>
                      ข้อ {c.criteria_id}: {c.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Row 2: Missing Self Score */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9rem', marginBottom: '8px' }}>
                ⚠️ ตัวชี้วัดที่ยังไม่ได้ประเมินคะแนนตนเอง ({critMissingSelfScore.length} รายการ)
              </h5>
              {critMissingSelfScore.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-success)' }}>✓ ตัวชี้วัดทุกตัวได้รับการกำหนดระดับคะแนนประเมินตนเองแล้ว</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {critMissingSelfScore.map(c => (
                    <span key={c.id} style={{ padding: '3px 8px', fontSize: '0.74rem', backgroundColor: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.1)', color: 'var(--color-gold)', borderRadius: '4px' }}>
                      ข้อ {c.criteria_id}: {c.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Row 3: Missing Owner */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                ⚠️ ตัวชี้วัดที่ยังขาดผู้รับผิดชอบหลักดูแล ({critMissingOwner.length} รายการ)
              </h5>
              {critMissingOwner.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--color-success)' }}>✓ ตัวชี้วัดทุกตัวได้รับการระบุชื่อครู/นักเรียนผู้ประสานงานหลักแล้ว</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {critMissingOwner.map(c => (
                    <span key={c.id} style={{ padding: '3px 8px', fontSize: '0.74rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                      ข้อ {c.criteria_id}: {c.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLANTS TAB */}
      {activeTab === 'plants' && (
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: '1.25rem' }}>🌳 รายงานความบกพร่องของทะเบียนพรรณไม้</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h5 style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '6px' }}>⚠️ พรรณไม้ที่แจ้งสถานะว่ายังไม่มีป้ายชื่อ ({plantsMissingLabel.length} ต้น)</h5>
              {plantsMissingLabel.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-success)', margin: 0 }}>✓ พืชทุกต้นในระบบได้รับการติดตั้งป้ายเรียบร้อยแล้ว</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {plantsMissingLabel.map(p => <li key={p.id}>{p.thai_name} (รหัส: {p.plant_code}) - สถานที่: {p.planting_location}</li>)}
                </ul>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9rem', marginBottom: '6px' }}>⚠️ พรรณไม้ที่ยังไม่มีคำอธิบายลักษณะพฤกษศาสตร์หรือคำอธิบายสั้นเกินไป ({plantsMissingDesc.length} ต้น)</h5>
              {plantsMissingDesc.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-success)', margin: 0 }}>✓ พืชทุกต้นมีเนื้อหาข้อมูลจำแนกครบถ้วน</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {plantsMissingDesc.map(p => <li key={p.id}>{p.thai_name} - มีคำอธิบาย {p.description ? p.description.length : 0} ตัวอักษร</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WORKSHEETS TAB */}
      {activeTab === 'worksheets' && (
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: '1.25rem' }}>📝 ตรวจสอบความถูกต้องและรูปภาพใบงานสัณฐานพืช ก.7-003</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Missing sheets */}
            <div>
              <h5 style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '6px' }}>⚠️ พรรณไม้ที่ยังไม่ได้สืบค้นและบันทึกใบงาน ก.7-003 ({plantsMissingK7.length} ต้น)</h5>
              {plantsMissingK7.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-success)', margin: 0 }}>✓ พืชทุกต้นมีบันทึกใบงาน ก.7-003 เชื่อมต่อในระบบแล้ว</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {plantsMissingK7.map(p => <li key={p.id}>{p.thai_name} (รหัส: {p.plant_code})</li>)}
                </ul>
              )}
            </div>

            {/* Incomplete 6 photos */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9rem', marginBottom: '6px' }}>⚠️ ใบงานที่ยังอัปโหลดรูปภาพ 6 จุดไม่ครบถ้วน ({k7MissingPhotos.length} รายการ)</h5>
              {k7MissingPhotos.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-success)', margin: 0 }}>✓ ใบงานพืชทุกต้นมีภาพครบทั้ง 6 จุด (วิสัย, ลำต้น, ใบ, ดอก, ผล, เมล็ด)</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {k7MissingPhotos.map(s => {
                    const match = plants.find(p => p.id === s.plant_id);
                    return <li key={s.id}>ใบงานของพืช: <b>{match?.thai_name || 'ไม่ทราบ'}</b> - ขาดรูปถ่ายพฤกษศาสตร์บางจุด</li>;
                  })}
                </ul>
              )}
            </div>

            {/* Unapproved sheets */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <h5 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: '6px' }}>⚠️ ใบงานที่ยังไม่ผ่านตรวจอนุมัติจากครู ({k7Unapproved.length} รายการ)</h5>
              {k7Unapproved.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-success)', margin: 0 }}>✓ ใบงานพืชทุกรายการผ่านตรวจประเมินเรียบร้อยแล้ว</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {k7Unapproved.map(s => {
                    const match = plants.find(p => p.id === s.plant_id);
                    return <li key={s.id}>ใบงานพืช: <b>{match?.thai_name}</b> - สถานะปัจจุบัน: <b>{s.status || 'รอตรวจ'}</b></li>;
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
