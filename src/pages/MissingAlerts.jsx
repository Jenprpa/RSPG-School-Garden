import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, ShieldAlert, Sparkles, MapPin, FileText, Image, UserCheck } from 'lucide-react';

export default function MissingAlerts() {
  const [alerts, setAlerts] = useState({
    untaggedPlants: [],
    missingGpsPlants: [],
    incompleteWorksheets: [],
    missingAdminDocs: [],
    missingEvidenceCriteria: []
  });
  const [loading, setLoading] = useState(true);

  const runQualityAudit = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch plants
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const plants = [];
      plantsSnap.forEach(d => plants.push({ id: d.id, ...d.data() }));

      // 2. Fetch worksheets
      const sheetsSnap = await getDocs(collection(db, 'k7_worksheets'));
      const sheets = [];
      sheetsSnap.forEach(d => sheets.push({ id: d.id, ...d.data() }));

      // 3. Fetch admin docs
      const adminSnap = await getDocs(collection(db, 'rspg_admin_management'));
      const adminDocs = [];
      adminSnap.forEach(d => adminDocs.push({ id: d.id, ...d.data() }));

      // 4. Fetch evaluation criteria
      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const criteria = [];
      critSnap.forEach(d => criteria.push({ id: d.id, ...d.data() }));

      // --- Audits ---
      // A. Untagged plants
      const untagged = plants.filter(p => p.is_tagged === 'ไม่มี');

      // B. Missing GPS coordinates
      const missingGps = plants.filter(p => !p.gps_lat || !p.gps_lng);

      // C. Incomplete worksheets (missing worksheet, not marked as complete, or missing photos)
      const incompleteSheets = [];
      plants.forEach(plant => {
        const sheet = sheets.find(s => s.plant_id === plant.id);
        if (!sheet) {
          incompleteSheets.push({
            plantName: plant.thai_name,
            reason: 'ยังไม่มีใบสัณฐานวิทยา ก.7-003'
          });
        } else {
          const missingPhotos = [];
          if (!sheet.habit_photo_url) missingPhotos.push('ลักษณะวิสัย');
          if (!sheet.stem_photo_url) missingPhotos.push('ลำต้น');
          if (!sheet.leaf_photo_url) missingPhotos.push('ใบ');
          if (!sheet.flower_photo_url) missingPhotos.push('ดอก');
          if (!sheet.fruit_photo_url) missingPhotos.push('ผล');
          if (!sheet.seed_photo_url) missingPhotos.push('เมล็ด');

          if (!sheet.is_completed || missingPhotos.length > 0) {
            let reasonStr = '';
            if (missingPhotos.length > 0) {
              reasonStr += `ขาดรูปถ่าย 6 องค์ประกอบ (${missingPhotos.join(', ')})`;
            }
            if (!sheet.is_completed) {
              reasonStr += reasonStr ? ' และยังไม่ได้กดบันทึกความสมบูรณ์' : 'ยังไม่ได้กดบันทึกความสมบูรณ์';
            }
            incompleteSheets.push({
              plantName: plant.thai_name,
              reason: reasonStr
            });
          }
        }
      });

      // D. Missing Administration documents (out of the 5 standard types)
      const requiredTypes = [
        'คำสั่งแต่งตั้งคณะกรรมการ',
        'แผนงาน/โครงการ',
        'ปฏิทินดำเนินงาน',
        'รายงานการประชุม',
        'ภาพกิจกรรม'
      ];
      const missingAdmin = [];
      requiredTypes.forEach(type => {
        const docExists = adminDocs.some(d => d.document_type === type && d.attachment_url);
        if (!docExists) {
          missingAdmin.push(type);
        }
      });

      // E. Criteria lacking score/evidence
      const lackingCrit = criteria.filter(c => c.status === 'ยังไม่มีหลักฐาน' || c.self_score === 0 || !c.description);

      setAlerts({
        untaggedPlants: untagged,
        missingGpsPlants: missingGps,
        incompleteWorksheets: incompleteSheets,
        missingAdminDocs: missingAdmin,
        missingEvidenceCriteria: lackingCrit
      });

    } catch (err) {
      console.error('Error running audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQualityAudit();
  }, []);

  const totalAlerts =
    alerts.untaggedPlants.length +
    alerts.missingGpsPlants.length +
    alerts.incompleteWorksheets.length +
    alerts.missingAdminDocs.length +
    alerts.missingEvidenceCriteria.length;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังทำการตรวจสอบความสมบูรณ์ของฐานข้อมูล (RSPG Quality Audit)...</div>;
  }

  return (
    <div>
      {/* Alert Header Summary */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={32} color={totalAlerts > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ระบบตรวจสอบความสมบูรณ์และแจ้งเตือนข้อมูลที่ยังขาด (RSPG Live Quality Check)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                วิเคราะห์โครงสร้างฐานข้อมูลอัจฉริยะแบบเรียลไทม์ เพื่อให้มั่นใจว่าคะแนนและหลักฐานของ ปายวิทยาคาร เป็นไปตามเกณฑ์ขั้นที่ 1
              </p>
            </div>
          </div>

          <div style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: totalAlerts > 0 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(46, 125, 50, 0.1)',
            color: totalAlerts > 0 ? 'var(--color-warning)' : 'var(--color-success)',
            border: `1.5px solid ${totalAlerts > 0 ? 'var(--color-warning)' : 'var(--color-success)'}`,
            fontWeight: 800,
            fontSize: '1.15rem'
          }}>
            {totalAlerts > 0 ? `⚠️ ตรวจพบ ${totalAlerts} จุดบกพร่อง` : '✅ ข้อมูลสมบูรณ์ 100%'}
          </div>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderLeft: '4px solid var(--color-success)' }}>
          <Sparkles size={48} color="var(--color-success)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.5rem' }}>ยินดีด้วย! เอกสารและฐานข้อมูลพร้อมประเมินสมบูรณ์</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            ปายวิทยาคาร มีหลักฐานครบทุกตัวชี้วัด ทะเบียน ก.7-003 มีรูปครบถ้วน และคำสั่งแต่งตั้งถูกอัปโหลดเรียบร้อยแล้ว
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* 1. Untagged Plants Alerts */}
          {alerts.untaggedPlants.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} />
                ต้นไม้ที่ยังไม่ได้ติดตั้งป้ายชื่อพรรณไม้ถาวร ({alerts.untaggedPlants.length} ต้น)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                ต้องดำเนินการทำป้ายถาวรและนำไปแขวนติดตั้งที่ต้นไม้จริง (องค์ประกอบที่ 1 ตัวชี้วัด 1.5)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {alerts.untaggedPlants.map(p => (
                  <span key={p.id} className="role-badge role-visitor" style={{ fontSize: '0.8rem' }}>
                    🌳 {p.thai_name} ({p.plant_code})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 2. Missing GPS coordinates */}
          {alerts.missingGpsPlants.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} />
                พรรณไม้ที่ยังไม่ได้ระบุตำแหน่งพิกัด GPS ({alerts.missingGpsPlants.length} ต้น)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                ต้องใช้สมาร์ทโฟนหรืออุปกรณ์เพื่อกรอกตำแหน่ง Latitude / Longitude ในหน้าทะเบียนพืชเพื่อพล็อตร่างผังพรรณไม้
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {alerts.missingGpsPlants.map(p => (
                  <span key={p.id} className="role-badge role-teacher" style={{ fontSize: '0.8rem' }}>
                    📍 {p.thai_name} ({p.plant_code})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Incomplete Worksheets K.7-003 */}
          {alerts.incompleteWorksheets.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                ทะเบียน ก.7-003 ที่ยังกรอกไม่สมบูรณ์ หรือ ขาดรูปสัณฐานวิทยา ({alerts.incompleteWorksheets.length} เล่ม)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                เกณฑ์ประเมิน อพ.สธ. กำหนดให้รูปภาพลักษณะวิสัย เปลือก ใบ ดอก ผล และเมล็ดต้องถูกบันทึกให้ครบถ้วนในจุดปลูกศึกษา
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: 'bold' }}>
                    <th style={{ padding: '6px' }}>ชื่อพรรณไม้</th>
                    <th style={{ padding: '6px' }}>จุดบกพร่องที่ต้องปรับปรุง</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.incompleteWorksheets.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{item.plantName}</td>
                      <td style={{ padding: '8px', color: 'var(--color-danger)' }}>⚠️ {item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Missing Administration Docs */}
          {alerts.missingAdminDocs.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                ขาดเอกสารหลักฐาน ด้านที่ 1 การบริหารจัดการ ({alerts.missingAdminDocs.length} รายการ)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                กรุณาไปที่เมนู <b>"ด้านที่ 1: การบริหารจัดการ"</b> เพื่อแนบไฟล์หรือข้อมูลสำคัญดังต่อไปนี้:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {alerts.missingAdminDocs.map((type, idx) => (
                  <span key={idx} className="role-badge role-visitor" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    📁 ขาด: {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Incomplete Self-Assessment Criteria */}
          {alerts.missingEvidenceCriteria.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} />
                ตัวชี้วัดที่ยังไม่ได้บันทึกความคืบหน้า หรือ ขาดหลักฐานกิจกรรม ({alerts.missingEvidenceCriteria.length} เกณฑ์ย่อย)
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                กรุณาตรวจสอบและกรอกคำอธิบาย หรือแนบเอกสารเพื่อไม่ให้คะแนนประเมินตนเองเป็น 0 คะแนน:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {alerts.missingEvidenceCriteria.map(crit => (
                  <div key={crit.id} style={{ padding: '6px 10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem' }}>
                    📍 <b>เกณฑ์ {crit.criteria_id}:</b> {crit.title.substring(0, 20)}...
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
