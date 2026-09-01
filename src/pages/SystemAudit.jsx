import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { ShieldAlert, CheckCircle, AlertTriangle, FileText, ArrowRight, UserCheck, Eye } from 'lucide-react';

export default function SystemAudit() {
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState([]);
  const [k7Sheets, setK7Sheets] = useState([]);
  const [adminDocs, setAdminDocs] = useState([]);
  const [criteria, setCriteria] = useState([]);

  // Audit results states
  const [auditStats, setAuditStats] = useState({
    missingPhotos: 0,
    missingGps: 0,
    uncheckedK7: 0,
    missingAdminAttachments: 0,
    readyToRelease: 0,
    readyToPrint: 0
  });

  const [auditIssues, setAuditIssues] = useState([]);

  const runAudit = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const plantsSnap = await getDocs(collection(db, 'plants'));
      const pList = [];
      plantsSnap.forEach(d => pList.push({ id: d.id, ...d.data() }));
      setPlants(pList);

      const k7Snap = await getDocs(collection(db, 'k7_worksheets'));
      const kList = [];
      k7Snap.forEach(d => kList.push({ id: d.id, ...d.data() }));
      setK7Sheets(kList);

      const adminSnap = await getDocs(collection(db, 'rspg_admin_management'));
      const aList = [];
      adminSnap.forEach(d => aList.push({ id: d.id, ...d.data() }));
      setAdminDocs(aList);

      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const cList = [];
      critSnap.forEach(d => cList.push({ id: d.id, ...d.data() }));
      setCriteria(cList);

      // Perform Audit Scans
      const issues = [];
      let missingPhotosCount = 0;
      let missingGpsCount = 0;
      let uncheckedK7Count = 0;
      let missingAdminAttachmentsCount = 0;
      let readyToReleaseCount = 0;
      let readyToPrintCount = 0;

      // Scan 1: Plants GPS & Tag
      pList.forEach(p => {
        if (!p.gps_lat || !p.gps_lng) {
          missingGpsCount++;
          issues.push({
            category: 'พิกัด GPS',
            severity: 'warning',
            message: `พืช "${p.thai_name}" (${p.plant_code}) ยังไม่ได้รับการปักหมุดบันทึกพิกัดตำแหน่งทางภูมิศาสตร์`
          });
        }
        if (p.is_tagged === 'ไม่มี') {
          issues.push({
            category: 'ป้ายรหัสถาวร',
            severity: 'warning',
            message: `พืช "${p.thai_name}" (${p.plant_code}) ยังไม่มีการติดตั้งป้ายรหัสชื่อพืชแบบถาวร`
          });
        }
      });

      // Scan 2: K7 Worksheets (ก.7-003)
      kList.forEach(k => {
        const matchingPlant = pList.find(p => p.id === k.plant_id);
        const name = matchingPlant ? matchingPlant.thai_name : 'ไม่ระบุชื่อพืช';

        // Unchecked
        if (!k.status || k.status === 'รอตรวจ' || k.status === 'pending') {
          uncheckedK7Count++;
          issues.push({
            category: 'ก.7-003 รอตรวจสอบ',
            severity: 'info',
            message: `ทะเบียนสัณฐานวิทยา ก.7-003 ของ "${name}" ได้รับการบันทึกโดยนักเรียนแล้ว อยู่ในระหว่างรอครูผู้สอนตรวจสอบและอนุมัติ`
          });
        }

        // Missing photos (Needs at least habit, leaf, stem, flower to be complete)
        if (!k.habit_photo_url || !k.leaf_photo_url || !k.stem_photo_url || !k.flower_photo_url) {
          missingPhotosCount++;
          issues.push({
            category: 'ก.7-003 ขาดรูปถ่าย',
            severity: 'danger',
            message: `เอกสารสัณฐาน ก.7-003 ของ "${name}" ยังขาดรูปถ่ายจุดศึกษาที่สำคัญ (ต้องการรูป วิสัย ลำต้น ใบ ดอก)`
          });
        }

        // Ready to release (Checked & approved by teacher, but not set public yet)
        if (k.status === 'ผ่าน' && k.is_public !== true) {
          readyToReleaseCount++;
        }
      });

      // Scan 3: Admin Documents (ด้านที่ 1)
      aList.forEach(a => {
        if (!a.attachment_url) {
          missingAdminAttachmentsCount++;
          issues.push({
            category: 'เอกสารบริหารจัดการ',
            severity: 'danger',
            message: `เอกสารในด้านการบริหารงานหัวข้อ "${a.title}" ยังไม่มีการอัปโหลดไฟล์แนบราชการ (PDF/รูปภาพ)`
          });
        }
      });

      // Scan 4: Criteria Completion
      const hasCommitteeOrder = aList.some(d => d.document_type === 'คำสั่งแต่งตั้งคณะกรรมการ' && d.attachment_url);
      const totalScore = cList.reduce((sum, item) => sum + (item.self_score || 0), 0);

      if (totalScore >= 400 && hasCommitteeOrder) {
        readyToPrintCount = 1;
      }

      setAuditStats({
        missingPhotos: missingPhotosCount,
        missingGps: missingGpsCount,
        uncheckedK7: uncheckedK7Count,
        missingAdminAttachments: missingAdminAttachmentsCount,
        readyToRelease: readyToReleaseCount,
        readyToPrint: readyToPrintCount
      });

      setAuditIssues(issues);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังทำการวิเคราะห์และตรวจสอบระบบฐานข้อมูล...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบตรวจความพร้อมและการตรวจสอบภายใน (System Operations Audit)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              สแกนข้อมูลทั้งระบบเพื่อตรวจหาจุดขาดหาย คุณภาพเอกสาร ก.7-003 การปักหมุด GPS และสรุปความพร้อมส่งประเมิน อพ.สธ.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{auditStats.missingPhotos}</div>
          <div className="stat-label">ก.7-003 ขาดรูปถ่ายพืชวิทยา (รายการ)</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{auditStats.missingGps}</div>
          <div className="stat-label">พืชยังไม่ระบุพิกัด GPS (ต้น)</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <div className="stat-value" style={{ color: 'var(--color-info)' }}>{auditStats.uncheckedK7}</div>
          <div className="stat-label">ใบงาน ก.7-003 รอตรวจ (รายการ)</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{auditStats.missingAdminAttachments}</div>
          <div className="stat-label">เอกสารด้านที่ 1 ขาดไฟล์แนบ (ฉบับ)</div>
        </div>
      </div>

      {/* Readiness Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }} className="rspg-progress-grid">

        {/* Release Status */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(186,85,211,0.06)' }}>
            <Eye size={24} color="var(--color-primary)" />
          </div>
          <div>
            <h4 style={{ fontWeight: 800, margin: 0 }}>ความพร้อมเผยแพร่สู่เว็บไซต์สาธารณะ</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>
              มีใบงาน ก.7-003 ที่ครูอนุมัติผ่านแล้วและพร้อมเปิดดูเป็นสาธารณะจำนวน <b>{auditStats.readyToRelease}</b> ต้น
            </p>
          </div>
        </div>

        {/* Evaluation Status */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-gold)', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,193,7,0.06)' }}>
            <UserCheck size={24} color="var(--color-gold)" />
          </div>
          <div>
            <h4 style={{ fontWeight: 800, margin: 0 }}>ความพร้อมเสนอขอรับเกียรติบัตรขั้นที่ 1</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>
              {auditStats.readyToPrint > 0 ? (
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓ โครงสร้างคะแนนสูงกว่า 80% และคำสั่งแต่งตั้งครบถ้วน พร้อมพิมพ์เอกสาร</span>
              ) : (
                <span style={{ color: 'var(--color-danger)' }}>✗ คะแนนรวมต่ำกว่าเกณฑ์ 400/500 คะแนน หรือยังไม่ได้อัปโหลดไฟล์แต่งตั้งคณะกรรมการ</span>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Action Audit Issues List */}
      <div className="card">
        <h4 style={{ fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          ⚠️ ผลการวิเคราะห์จุดบกพร่องและจุดพัฒนาการดำเนินงานระบบ ({auditIssues.length})
        </h4>

        {auditIssues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-success)' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <span>ยอดเยี่ยม! ระบบข้อมูลและแฟ้มหลักฐานดำเนินงานสมบูรณ์ 100% ไม่มีข้อผิดพลาดที่ต้องจัดการ</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditIssues.map((issue, idx) => {
              let color = 'var(--color-info)';
              let bg = 'rgba(2,136,209,0.04)';
              if (issue.severity === 'warning') {
                color = 'var(--color-warning)';
                bg = 'rgba(255,152,0,0.04)';
              } else if (issue.severity === 'danger') {
                color = 'var(--color-danger)';
                bg = 'rgba(211,47,47,0.04)';
              }
              return (
                <div key={idx} style={{ padding: '12px 15px', borderRadius: '8px', border: `1px solid ${color}`, backgroundColor: bg, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <AlertTriangle size={18} color={color} style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '0.78rem', color: color, textTransform: 'uppercase', marginRight: '8px' }}>
                      [{issue.category}]
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{issue.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
