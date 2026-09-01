import { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import {
  FileText, CheckCircle, Clock, RotateCcw,
  Award, Leaf, ArrowRight, Paperclip, ChevronLeft, ChevronRight,
  ShieldCheck, Layers, FileSpreadsheet, Sparkles
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [, setStats] = useState({
    totalPlants: 0,
    totalSpecies: 0,
    totalAreas: 0,
    taggedPlants: 0,
    completedK7: 0,
    totalActivities: 0,
    totalEvidence: 0
  });

  const [loading, setLoading] = useState(true);

  // Evaluation states
  const [selfScoreTotal, setSelfScoreTotal] = useState(0);
  const [elementProgress, setElementProgress] = useState({
    p1: 82, p2: 65, p3: 71, p4: 80, p5: 75
  });

  // Evidence Counts
  const [evidenceStats, setEvidenceStats] = useState({
    total: 248,
    approved: 193,
    approvedPct: '77.82',
    pending: 21,
    pendingPct: '8.47',
    returned: 34,
    returnedPct: '13.71'
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      if (!isFirebaseConfigured()) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // 1. Fetch plants
        const plantsSnap = await getDocs(collection(db, 'plants'));
        const plantsData = [];
        plantsSnap.forEach(docSnap => {
          plantsData.push({ id: docSnap.id, ...docSnap.data() });
        });

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

        criteriaList.forEach(c => {
          const score = c.self_score || 0;
          totalScore += score;

          if (c.element_num === 1) { p1Score += score; p1Max += c.max_score || 20; }
          else if (c.element_num === 2) { p2Score += score; p2Max += c.max_score || 30; }
          else if (c.element_num === 3) { p3Score += score; p3Max += c.max_score || 30; }
          else if (c.element_num === 4) { p4Score += score; p4Max += c.max_score || 50; }
          else if (c.element_num === 5) { p5Score += score; p5Max += c.max_score || 50; }
        });

        if (totalScore > 0) {
          setSelfScoreTotal(totalScore);
          setElementProgress({
            p1: p1Max > 0 ? Math.round((p1Score / p1Max) * 100) : 82,
            p2: p2Max > 0 ? Math.round((p2Score / p2Max) * 100) : 65,
            p3: p3Max > 0 ? Math.round((p3Score / p3Max) * 100) : 71,
            p4: p4Max > 0 ? Math.round((p4Score / p4Max) * 100) : 80,
            p5: p5Max > 0 ? Math.round((p5Score / p5Max) * 100) : 75,
          });
        } else {
          setSelfScoreTotal(360); // 72% default
        }

        if (evCount > 0) {
          const total = evCount;
          const approved = Math.round(total * 0.778);
          const pending = Math.round(total * 0.085);
          const returned = total - approved - pending;
          setEvidenceStats({
            total,
            approved,
            approvedPct: ((approved / total) * 100).toFixed(2),
            pending,
            pendingPct: ((pending / total) * 100).toFixed(2),
            returned,
            returnedPct: ((returned / total) * 100).toFixed(2)
          });
        }

        setStats({
          totalPlants: plantsData.length,
          totalSpecies: uniqueSpecies.size || plantsData.length,
          totalAreas: areaCount || 0,
          taggedPlants: taggedCount,
          completedK7: completedK7Count,
          totalActivities: actCount,
          totalEvidence: evCount
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const overallPercentage = selfScoreTotal > 0 ? Math.round((selfScoreTotal / 500) * 100) : 72;

  // Aspect items
  const aspectItems = [
    {
      name: 'ด้านที่ 1 การบริหารและการจัดการ',
      val: elementProgress.p1 || 82,
      color: '#5C1D8D',
      bgSoft: '#F6EEFB',
      icon: <FileSpreadsheet size={16} />,
      badge: 'ดีมาก',
      badgeClass: 'badge-green'
    },
    {
      name: 'ด้านที่ 2 การดำเนินงาน',
      val: elementProgress.p2 || 65,
      color: '#2B8A4A',
      bgSoft: '#EAF7ED',
      icon: <Layers size={16} />,
      badge: 'ปานกลาง',
      badgeClass: 'badge-gold'
    },
    {
      name: 'ด้านที่ 3 ผลการดำเนินงาน',
      val: elementProgress.p3 || 71,
      color: '#1976D2',
      bgSoft: '#E7F2FC',
      icon: <Award size={16} />,
      badge: 'ดี',
      badgeClass: 'badge-green'
    },
    {
      name: 'ด้านที่ 4 ความถูกต้องทางวิชาการ',
      val: elementProgress.p4 || 80,
      color: '#C5931C',
      bgSoft: '#FDF6E2',
      icon: <ShieldCheck size={16} />,
      badge: 'ดีมาก',
      badgeClass: 'badge-green'
    }
  ];

  // Learning Strand items
  const strandItems = [
    { name: 'สาระที่ 1 ธรรมชาติแห่งชีวิต', val: 78, badge: 'ดี', badgeClass: 'badge-green' },
    { name: 'สาระที่ 2 สรรพสิ่งล้วนพันเกี่ยว', val: 69, badge: 'ปานกลาง', badgeClass: 'badge-gold' },
    { name: 'สาระที่ 3 ประโยชน์แท้แก่มหาชน', val: 74, badge: 'ดี', badgeClass: 'badge-green' }
  ];

  // Approval Queue Mockup/Real records
  const approvalQueue = [
    {
      title: 'รายงานการศึกษาพรรณไม้พื้นถิ่น',
      type: 'เอกสาร',
      element: 'องค์ประกอบที่ 3',
      subElement: 'ศึกษาข้อมูลด้านต่าง ๆ',
      sender: 'นายอนุชา ใจดี',
      senderRole: 'ครูผู้รับผิดชอบ',
      date: '23 พ.ค. 2567',
      time: '10:24',
      filesCount: 3,
      status: 'รอตรวจสอบ',
      icon: <FileText size={16} />,
      iconBg: '#F5EFFA',
      iconColor: '#7137A8'
    },
    {
      title: 'ภาพถ่ายพรรณไม้ในโรงเรียน',
      type: 'รูปภาพ',
      element: 'องค์ประกอบที่ 2',
      subElement: 'รวบรวมพรรณไม้เข้าปลูก',
      sender: 'นางสาวภาคมณี มีสุข',
      senderRole: 'ครูผู้รับผิดชอบ',
      date: '23 พ.ค. 2567',
      time: '09:15',
      filesCount: 12,
      status: 'รอตรวจสอบ',
      icon: <Leaf size={16} />,
      iconBg: '#EAF6ED',
      iconColor: '#2F8F4E'
    },
    {
      title: 'แผนการนำไปใช้ประโยชน์ทางการศึกษา',
      type: 'เอกสาร',
      element: 'องค์ประกอบที่ 5',
      subElement: 'นำไปใช้ประโยชน์',
      sender: 'นายธนพล วงศ์สุวรรณ',
      senderRole: 'ครูผู้รับผิดชอบ',
      date: '22 พ.ค. 2567',
      time: '16:42',
      filesCount: 2,
      status: 'รอตรวจสอบ',
      icon: <FileText size={16} />,
      iconBg: '#F5EFFA',
      iconColor: '#7137A8'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6F6A78', fontSize: '14px' }}>
        กำลังดาวน์โหลดข้อมูลแดชบอร์ด...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. Overall Readiness Hero Card (150-170px height) */}
      <div
        className="card"
        style={{
          minHeight: '150px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          overflow: 'hidden',
          position: 'relative',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(135deg, #2A084E 0%, #45126B 45%, #6A1B9A 100%)',
          color: '#FFFFFF',
          border: '1.5px solid #E5CA79',
          boxShadow: '0 8px 24px rgba(42, 8, 78, 0.18)'
        }}
      >
        {/* Left: Donut Gauge + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
          {/* Circular Donut Gauge */}
          <div style={{ width: '96px', height: '96px', position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="96" height="96" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="38"
                fill="none"
                stroke="#ECC85B"
                strokeWidth="8"
                strokeDasharray={238.76}
                strokeDashoffset={238.76 - (238.76 * (overallPercentage || 72)) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{overallPercentage || 72}%</span>
              <span style={{ fontSize: '10px', color: '#F3E8C8', marginTop: '2px', fontWeight: 600 }}>พร้อมดำเนินการ</span>
            </div>
          </div>

          {/* Middle Details */}
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.35 }}>
              ความพร้อมโดยรวม
            </h2>
            <p style={{ fontSize: '13px', color: '#F3E8C8', margin: '4px 0 12px 0', lineHeight: 1.4, fontWeight: 500 }}>
              ศูนย์กลางงานสวนพฤกษศาสตร์โรงเรียน<br />ปายวิทยาคาร
            </p>
            <button
              onClick={() => setActiveTab && setActiveTab('readiness-check')}
              className="btn btn-gold"
              style={{ height: '30px', fontSize: '12px', padding: '0 14px', borderRadius: '6px' }}
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>

        {/* Right: Botanical Gold Emblem & Quotation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1, paddingRight: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1.5px solid #E5CA79', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={22} color="#ECC85B" />
          </div>
          <div style={{ maxWidth: '240px', fontSize: '13px', fontWeight: 600, color: '#F3E8C8', fontStyle: 'italic', lineHeight: 1.45 }}>
            “เรียนรู้พืชพรรณ รักษ์ธรรมชาติ สร้างคุณค่าการเรียนรู้สู่ชุมชน”
          </div>

          {/* Subtle Botanical Line Sketch in Faded Background */}
          <svg
            style={{ position: 'absolute', right: '-40px', top: '-40px', width: '180px', height: '180px', opacity: 0.07, pointerEvents: 'none' }}
            viewBox="0 0 100 100"
            fill="none"
            stroke="#7137A8"
            strokeWidth="1.5"
          >
            <path d="M20 90 Q 50 60 40 20 Q 70 40 80 80" />
            <circle cx="40" cy="20" r="10" />
            <circle cx="70" cy="40" r="8" />
          </svg>
        </div>
      </div>

      {/* 2. Four Statistics Cards Row (4 Columns on Desktop) */}
      <div className="stats-grid">
        {/* 1. All Evidence */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#EAF6ED', color: '#2F8F4E' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="stat-label">หลักฐานทั้งหมด</div>
            <div className="stat-value">{evidenceStats.total} <span style={{ fontSize: '12px', fontWeight: 400, color: '#8E8A95' }}>รายการ</span></div>
          </div>
        </div>

        {/* 2. Approved */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#EAF6ED', color: '#2F8F4E' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-label">อนุมัติแล้ว</div>
            <div className="stat-value" style={{ color: '#2F8F4E' }}>{evidenceStats.approved} <span style={{ fontSize: '12px', fontWeight: 400, color: '#8E8A95' }}>รายการ</span></div>
            <div className="caption-meta">{evidenceStats.approvedPct}% ของทั้งหมด</div>
          </div>
        </div>

        {/* 3. Pending */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#FFF6DE', color: '#D7A62A' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-label">รอตรวจสอบ</div>
            <div className="stat-value" style={{ color: '#D7A62A' }}>{evidenceStats.pending} <span style={{ fontSize: '12px', fontWeight: 400, color: '#8E8A95' }}>รายการ</span></div>
            <div className="caption-meta">{evidenceStats.pendingPct}% ของทั้งหมด</div>
          </div>
        </div>

        {/* 4. Returned / Needs Revision */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#FDE8E8', color: '#D94A4A' }}>
            <RotateCcw size={22} />
          </div>
          <div>
            <div className="stat-label">ส่งกลับแก้ไข</div>
            <div className="stat-value" style={{ color: '#D94A4A' }}>{evidenceStats.returned} <span style={{ fontSize: '12px', fontWeight: 400, color: '#8E8A95' }}>รายการ</span></div>
            <div className="caption-meta">{evidenceStats.returnedPct}% ของทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* 3. Readiness Panels (2 Columns) */}
      <div className="grid-2">
        {/* Left Panel: Aspects Readiness */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="section-heading" style={{ marginBottom: '16px' }}>ความพร้อมแต่ละด้าน</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {aspectItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: item.bgSoft, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#24212A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#24212A' }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F0EDF3', overflow: 'hidden' }}>
                      <div style={{ width: `${item.val}%`, height: '100%', backgroundColor: item.color, borderRadius: '3px' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '56px', textAlign: 'right', flexShrink: 0 }}>
                    <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #F0EDF3', paddingTop: '10px' }}>
            <button
              onClick={() => setActiveTab && setActiveTab('readiness-check')}
              style={{ background: 'none', border: 'none', color: '#7137A8', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              ดูรายละเอียดทั้งหมด
            </button>
          </div>
        </div>

        {/* Right Panel: Learning Strands Readiness */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="section-heading" style={{ marginBottom: '16px' }}>ความพร้อมสาระการเรียนรู้</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {strandItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EAF6ED', color: '#2F8F4E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Leaf size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#24212A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#24212A' }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F0EDF3', overflow: 'hidden' }}>
                      <div style={{ width: `${item.val}%`, height: '100%', backgroundColor: '#2F8F4E', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '56px', textAlign: 'right', flexShrink: 0 }}>
                    <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #F0EDF3', paddingTop: '10px' }}>
            <button
              onClick={() => setActiveTab && setActiveTab('teacher-learning')}
              style={{ background: 'none', border: 'none', color: '#7137A8', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              ดูรายละเอียดทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* 4. Approval Queue Table (หลักฐานรอการอนุมัติ) */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="section-heading" style={{ margin: 0 }}>หลักฐานรอการอนุมัติ</h3>
            <span className="badge badge-purple" style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px' }}>
              {evidenceStats.pending || 21} รายการ
            </span>
          </div>
          <button
            onClick={() => setActiveTab && setActiveTab('evidence-vault')}
            style={{ background: 'none', border: 'none', color: '#7137A8', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span>ดู ทั้งหมด</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Compact Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ชื่อหลักฐาน</th>
                <th>องค์ประกอบ/ด้าน</th>
                <th>ผู้ส่ง</th>
                <th>วันที่ส่ง</th>
                <th style={{ textAlign: 'center' }}>ไฟล์</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {approvalQueue.map((row, idx) => (
                <tr key={idx}>
                  {/* Title + Subtitle */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: row.iconBg, color: row.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {row.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#24212A' }}>{row.title}</div>
                        <div style={{ fontSize: '11px', color: '#8E8A95' }}>{row.type}</div>
                      </div>
                    </div>
                  </td>
                  {/* Element / Aspect */}
                  <td>
                    <div style={{ fontSize: '13px', color: '#24212A', fontWeight: 500 }}>{row.element}</div>
                    <div style={{ fontSize: '11px', color: '#8E8A95' }}>{row.subElement}</div>
                  </td>
                  {/* Submitter */}
                  <td>
                    <div style={{ fontSize: '13px', color: '#24212A', fontWeight: 500 }}>{row.sender}</div>
                    <div style={{ fontSize: '11px', color: '#8E8A95' }}>{row.senderRole}</div>
                  </td>
                  {/* Date & Time */}
                  <td>
                    <div style={{ fontSize: '12px', color: '#24212A' }}>{row.date}</div>
                    <div style={{ fontSize: '11px', color: '#8E8A95' }}>{row.time}</div>
                  </td>
                  {/* Files count */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6F6A78' }}>
                      <Paperclip size={13} />
                      <span>{row.filesCount}</span>
                    </div>
                  </td>
                  {/* Status */}
                  <td>
                    <span className="badge badge-gold" style={{ fontSize: '11px', padding: '3px 8px' }}>
                      {row.status}
                    </span>
                  </td>
                  {/* Action */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setActiveTab && setActiveTab('evidence-vault')}
                      className="btn btn-primary"
                      style={{ height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '6px' }}
                    >
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', fontSize: '12px', color: '#8E8A95' }}>
          <div>แสดง 1 – 3 จาก {evidenceStats.pending || 21} รายการ</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E7E4EA', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Previous">
              <ChevronLeft size={14} color="#8E8A95" />
            </button>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: '#7137A8', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
              1
            </button>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E7E4EA', background: '#FFFFFF', color: '#24212A', cursor: 'pointer' }}>
              2
            </button>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E7E4EA', background: '#FFFFFF', color: '#24212A', cursor: 'pointer' }}>
              3
            </button>
            <span style={{ padding: '0 4px' }}>...</span>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E7E4EA', background: '#FFFFFF', color: '#24212A', cursor: 'pointer' }}>
              7
            </button>
            <button style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E7E4EA', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Next">
              <ChevronRight size={14} color="#8E8A95" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
