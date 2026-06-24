import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Sprout, Layers, ClipboardList, HelpCircle, Activity, Award, CheckCircle, ShieldAlert, AlertTriangle, FileText, Image } from 'lucide-react';
import PlantMap from '../components/PlantMap';

export default function Dashboard({ userRole, onSelectPlant, setActiveTab }) {
  const [stats, setStats] = useState({
    totalPlants: 0,
    totalSpecies: 0,
    totalAreas: 0,
    taggedPlants: 0,
    completedK7: 0,
    totalActivities: 0,
    totalEvidence: 0
  });

  const [plantsList, setPlantsList] = useState([]);
  const [plantTypeData, setPlantTypeData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Evaluation states
  const [selfScoreTotal, setSelfScoreTotal] = useState(0);
  const [elementProgress, setElementProgress] = useState({
    p1: 0, p2: 0, p3: 0, p4: 0, p5: 0
  });
  
  // Audits lists
  const [missingEvidenceList, setMissingEvidenceList] = useState([]);
  const [readyEvidenceList, setReadyEvidenceList] = useState([]);
  const [schoolMapUrl, setSchoolMapUrl] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    async function fetchDashboardData() {
      try {
        // 1. Fetch plants
        const plantsSnap = await getDocs(collection(db, 'plants'));
        const plantsData = [];
        plantsSnap.forEach(docSnap => {
          plantsData.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPlantsList(plantsData);

        const uniqueSpecies = new Set(plantsData.map(p => p.scientific_name).filter(Boolean));
        const taggedCount = plantsData.filter(p => p.is_tagged === 'มี').length;

        // 2. Fetch areas
        const areasSnap = await getDocs(collection(db, 'study_areas'));
        const areaCount = areasSnap.size;

        // 3. Fetch K7 worksheets
        const k7Snap = await getDocs(collection(db, 'k7_worksheets'));
        const worksheets = [];
        k7Snap.forEach(d => worksheets.push(d.data()));
        const completedK7Count = worksheets.filter(w => w.status === 'ผ่าน').length;

        // 4. Fetch learning activities
        const actSnap = await getDocs(collection(db, 'rspg_learning_activities'));
        const actCount = actSnap.size;

        // 5. Fetch evidence vault
        const evSnap = await getDocs(collection(db, 'rspg_evidence_vault'));
        const evCount = evSnap.size;

        // 6. Fetch evaluation criteria
        const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
        const criteriaList = [];
        critSnap.forEach(d => criteriaList.push(d.data()));

        let totalScore = 0;
        let p1Score = 0, p1Max = 0;
        let p2Score = 0, p2Max = 0;
        let p3Score = 0, p3Max = 0;
        let p4Score = 0, p4Max = 0;
        let p5Score = 0, p5Max = 0;

        const missingList = [];
        const readyList = [];

        criteriaList.forEach(c => {
          const score = c.self_score || 0;
          totalScore += score;
          
          if (c.element_num === 1) { p1Score += score; p1Max += c.max_score || 20; }
          else if (c.element_num === 2) { p2Score += score; p2Max += c.max_score || 30; }
          else if (c.element_num === 3) { p3Score += score; p3Max += c.max_score || 30; }
          else if (c.element_num === 4) { p4Score += score; p4Max += c.max_score || 50; }
          else if (c.element_num === 5) { p5Score += score; p5Max += c.max_score || 50; }

          if (!c.attachment_url && score === 0) {
            missingList.push(c.title);
          } else if (c.attachment_url) {
            readyList.push(c.title);
          }
        });

        // Add default checklist items if empty
        if (missingList.length === 0 && readyList.length === 0) {
          missingList.push('ป้ายชื่อพรรณไม้ถาวร (องค์ประกอบที่ 1)', 'รายงานการเติบโตส่ง อพ.สธ. (องค์ประกอบที่ 4)');
          readyList.push('ผังแสดงตำแหน่งพิกัดพืชศึกษา (องค์ประกอบที่ 1)', 'แผนบูรณาการกลุ่มสาระการเรียนรู้ (องค์ประกอบที่ 5)');
        }

        setMissingEvidenceList(missingList.slice(0, 3));
        setReadyEvidenceList(readyList.slice(0, 3));
        setSelfScoreTotal(totalScore);
        
        setElementProgress({
          p1: p1Max > 0 ? Math.round((p1Score / p1Max) * 100) : 0,
          p2: p2Max > 0 ? Math.round((p2Score / p2Max) * 100) : 0,
          p3: p3Max > 0 ? Math.round((p3Score / p3Max) * 100) : 0,
          p4: p4Max > 0 ? Math.round((p4Score / p4Max) * 100) : 0,
          p5: p5Max > 0 ? Math.round((p5Score / p5Max) * 100) : 0,
        });

        // Plant type pie chart
        const typeCounts = {};
        plantsData.forEach(p => {
          const type = p.plant_type || 'อื่นๆ';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const chartData = Object.keys(typeCounts).map(key => ({
          name: key,
          value: typeCounts[key]
        }));
        setPlantTypeData(chartData);

        setStats({
          totalPlants: plantsData.length,
          totalSpecies: uniqueSpecies.size || plantsData.length,
          totalAreas: areaCount || 0,
          taggedPlants: taggedCount,
          completedK7: completedK7Count,
          totalActivities: actCount,
          totalEvidence: evCount
        });

        // 7. Fetch custom school map URL from banners configuration
        const bannerSnap = await getDocs(collection(db, 'rspg_banners'));
        if (!bannerSnap.empty) {
          const configData = bannerSnap.docs[0].data();
          if (configData.school_map_url) {
            setSchoolMapUrl(configData.school_map_url);
          }
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const COLORS = ['#BA55D3', '#2E7D32', '#FFC107', '#0288D1', '#D32F2F', '#8E9F90'];
  const overallPercentage = Math.round((selfScoreTotal / 500) * 100);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลแดชบอร์ดการดำเนินงาน...</div>;
  }

  return (
    <div>
      {/* School Header Banner */}
      <div className="card glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '2rem',
        padding: '1.25rem 1.5rem',
        flexWrap: 'wrap'
      }}>
        <img src="/rspg-logo.png" alt="อพ.สธ." style={{ width: '70px', height: 'auto', backgroundColor: '#fff', borderRadius: '8px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        <div>
          <h2 style={{ 
            fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)', 
            fontWeight: 800, 
            color: 'var(--color-primary)', 
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            ระบบดำเนินงานสวนพฤกษศาสตร์โรงเรียนแบบครบวงจร (อพ.สธ. ปายวิทยาคาร)
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
            การสำรวจทางพฤกษศาสตร์ประจําปี, ทะเบียนใบงาน ก.7-003, และเอกสารประเมินสถานศึกษาขอรับเกียรติบัตรขั้นที่ 1
          </p>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper nature">
            <Sprout size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalPlants}</div>
            <div className="stat-label">พรรณไม้ทั้งหมด (ต้น)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <ClipboardList size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.completedK7}</div>
            <div className="stat-label">ใบงาน ก.7-003 (ผ่านตรวจ)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper water">
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalActivities}</div>
            <div className="stat-label">แผนกิจกรรมเรียนรู้ครู</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper earth">
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.totalEvidence}</div>
            <div className="stat-label">หลักฐานคลังเอกสาร (ไฟล์)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Award size={24} />
          </div>
          <div>
            <div className="stat-value">{selfScoreTotal} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 500</span></div>
            <div className="stat-label">คะแนนสะสมประเมินตนเอง</div>
          </div>
        </div>
      </div>

      {/* Progress & Audits Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }} className="rspg-progress-grid">
        
        {/* Progress list */}
        <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Activity size={18} color="var(--color-gold)" />
            ความก้าวหน้าการจัดทำหลักฐานตาม 5 องค์ประกอบหลัก อพ.สธ.
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { num: 1, name: '1. การจัดทำป้ายรหัสประจำต้น', val: elementProgress.p1, color: 'var(--color-primary)' },
              { num: 2, name: '2. การรวบรวมพรรณไม้เข้าปลูก', val: elementProgress.p2, color: 'var(--color-primary)' },
              { num: 3, name: '3. การศึกษาข้อมูลลักษณะพืช', val: elementProgress.p3, color: 'var(--color-orchid)' },
              { num: 4, name: '4. การรายงานผลการเรียนรู้', val: elementProgress.p4, color: 'var(--color-primary)' },
              { num: 5, name: '5. การนำความรู้ไปใช้ประโยชน์', val: elementProgress.p5, color: 'var(--color-orchid)' },
            ].map(el => (
              <div key={el.num} style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                  <span>{el.name}</span>
                  <span style={{ color: el.color }}>{el.val}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '10px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ width: `${el.val}%`, height: '100%', backgroundColor: el.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Audit Preview: Complete vs Missing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Complete list preview */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-success)', flex: 1 }}>
            <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle size={16} /> รายการหลักฐานย่อยที่สมบูรณ์
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
              {readyEvidenceList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Missing list preview */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-danger)', flex: 1 }}>
            <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <AlertTriangle size={16} /> เอกสารหลักฐานที่ยังขาด
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
              {missingEvidenceList.map((item, idx) => (
                <li key={idx} style={{ color: 'var(--color-danger)' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Map visualization */}
      <div style={{ marginBottom: '2rem' }}>
        <PlantMap plants={plantsList} onSelectPlant={onSelectPlant} schoolMapUrl={schoolMapUrl} />
      </div>
    </div>
  );
}
