import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import {
  CheckSquare, AlertTriangle, AlertCircle, RefreshCw, CheckCircle2,
  ShieldCheck, Sprout, BookOpen, Layers, Award, FileText, Image as ImageIcon,
  MapPin, ChevronRight, ExternalLink
} from 'lucide-react';

export default function ReadinessCheck({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState([]);
  const [plants, setPlants] = useState([]);
  const [k7Sheets, setK7Sheets] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [adminDocs, setAdminDocs] = useState([]);

  // Active Tab: 'summary' | 'dimensions' | 'missing-plants' | 'worksheets'
  const [activeTab, setActiveTab] = useState('summary');

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

      // 5. Load Admin Docs (Dimension 1)
      const adminSnap = await getDocs(collection(db, 'rspg_admin_management'));
      const adminList = [];
      adminSnap.forEach(d => adminList.push({ id: d.id, ...d.data() }));
      setAdminDocs(adminList);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#5C1D8D' }}>กำลังประเมินความพร้อมและตรวจสอบข้อมูลพฤกษศาสตร์...</div>;

  // ----------------------------------------------------
  // Detailed Botanical Data Audits for Plants
  // ----------------------------------------------------
  const plantAudits = plants.map(p => {
    const missing = [];
    if (!p.plant_code) missing.push('รหัสพรรณไม้');
    if (!p.thai_name && !p.local_name) missing.push('ชื่อพื้นเมือง/ชื่อไทย');
    if (!p.local_uses || p.local_uses.length === 0) missing.push('การใช้ประโยชน์พื้นบ้าน (หน้า 1)');

    const mediaCats = p.media_categories || {};
    if (!mediaCats.habit && !p.image_url) missing.push('ภาพวิสัย/ทรงต้น');
    if (!mediaCats.leaf) missing.push('ภาพลักษณะใบ');
    if (!mediaCats.flower) missing.push('ภาพลักษณะดอก');
    if (!mediaCats.fruit) missing.push('ภาพผลและเมล็ด');

    if (!p.scientific_name) missing.push('ชื่อวิทยาศาสตร์ (หน้า 8)');
    if (!p.family_name) missing.push('ชื่อวงศ์ (Family)');
    if (!p.match_status || p.match_status === 'ยังไม่พบข้อมูลในฐานอ้างอิง') missing.push('การเทียบเคียงชื่อวิทยาศาสตร์ (หน้า 8)');
    if (!p.planting_location && (!p.gps_lat || !p.gps_lng)) missing.push('พิกัดผังพรรณไม้');

    return {
      plant: p,
      missingCount: missing.length,
      missingFields: missing,
      isComplete: missing.length === 0
    };
  });

  const incompletePlants = plantAudits.filter(a => !a.isComplete);
  const completePlantsCount = plantAudits.filter(a => a.isComplete).length;

  // ----------------------------------------------------
  // 4 Dimensions Completeness Calculations
  // ----------------------------------------------------
  // ด้านที่ 1: การบริหารและการจัดการ (Admin orders, criteria links, roles)
  const dim1DocsCount = adminDocs.length;
  const dim1Criteria = criteria.filter(c => c.dimension_id === '1' || c.dimension === 'ด้านที่ 1');
  const dim1Mapped = dim1Criteria.filter(c => mappings.some(m => m.criteria_id === c.criteria_id)).length;
  const dim1Score = Math.min(100, Math.round(((dim1DocsCount > 0 ? 50 : 20) + (dim1Criteria.length ? (dim1Mapped / dim1Criteria.length) * 50 : 40))));

  // ด้านที่ 2: การดำเนินงาน 5 องค์ประกอบ (Plant Registry, Tagging, Habit media)
  const totalPlants = plants.length || 1;
  const plantsWithTags = plants.filter(p => p.is_tagged === 'มี').length;
  const plantsWithPhotos = plants.filter(p => p.image_url || p.media_categories?.habit).length;
  const dim2Score = Math.min(100, Math.round(((plantsWithTags / totalPlants) * 50) + ((plantsWithPhotos / totalPlants) * 50)));

  // ด้านที่ 3: 3 สาระการเรียนรู้ (K7 worksheets, online worksheets)
  const totalK7 = k7Sheets.length;
  const k7Approved = k7Sheets.filter(s => s.status === 'ผ่าน').length;
  const dim3Score = totalK7 > 0 ? Math.min(100, Math.round((k7Approved / totalK7) * 100)) : 65;

  // ด้านที่ 4: ความถูกต้องทางวิชาการ (Scientific names, comparison page 8, family)
  const plantsWithScientific = plants.filter(p => p.scientific_name && p.family_name).length;
  const plantsWithMatchStatus = plants.filter(p => p.match_status === 'ตรงกับเอกสารอ้างอิงทั้งหมด').length;
  const dim4Score = Math.min(100, Math.round(((plantsWithScientific / totalPlants) * 50) + ((plantsWithMatchStatus / totalPlants) * 50)));

  // Overall Readiness Score
  const overallReadiness = Math.round((dim1Score + dim2Score + dim3Score + dim4Score) / 4);

  return (
    <div>
      {/* Header Card */}
      <div className="card glass-panel" style={{ marginBottom: '1.75rem', border: '1.5px solid #E5CA79' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F6EEFB', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #E5D0F5' }}>
              <ShieldCheck size={26} color="#5C1D8D" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', margin: 0 }}>
                แดชบอร์ดประเมินความพร้อมสถานศึกษา (Readiness Audit Dashboard)
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#584F66', margin: '4px 0 0 0' }}>
                วิเคราะห์ความครบถ้วนต่อ 4 ด้านมาตรฐาน อพ.สธ. และชี้จุดบกพร่องของข้อมูลพรรณไม้ก่อนรับการประเมิน
              </p>
            </div>
          </div>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> อัปเดตการประเมิน
          </button>
        </div>
      </div>

      {/* Navigation Sub Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '6px',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E5CA79',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'summary', label: '📊 ภาพรวมความพร้อม 4 ด้าน', icon: ShieldCheck },
          { id: 'missing-plants', label: `🌳 พรรณไม้ที่ยังขาดข้อมูล (${incompletePlants.length})`, icon: Sprout },
          { id: 'worksheets', label: `📝 ใบงาน ก.7-003 (${k7Sheets.length})`, icon: BookOpen },
          { id: 'criteria', label: '📋 เกณฑ์ตัวชี้วัด อพ.สธ.', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '170px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '0.86rem',
                fontWeight: active ? 700 : 500,
                borderRadius: '8px',
                border: active ? '1.5px solid #ECC85B' : '1px solid transparent',
                background: active ? 'linear-gradient(135deg, #2A084E 0%, #5C1D8D 100%)' : 'transparent',
                color: active ? '#FFFFFF' : '#4A3E56',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={active ? '#ECC85B' : '#5C1D8D'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SUMMARY & 4 DIMENSIONS BREAKDOWN */}
      {/* ======================================================== */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Overall Score Card */}
          <div className="card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #FAF7FC 0%, #FFFFFF 100%)',
            border: '2px solid #5C1D8D',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(42, 8, 78, 0.06)'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#F6EEFB', color: '#5C1D8D', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>
                <Award size={14} color="#C5931C" /> ดัชนีความพร้อมมาตรฐาน อพ.สธ.
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2A084E', margin: 0 }}>
                ความพร้อมการประเมินสถานศึกษารวม: {overallReadiness}%
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#584F66', marginTop: '6px', marginBottom: 0 }}>
                {overallReadiness >= 80 ? '✓ ความพร้อมอยู่ในเกณฑ์ดีเยี่ยม สามารถจัดทำรูปเล่มและต้อนรับคณะกรรมการประเมินได้' : '⚠️ ควรปรับปรุงและกรอกข้อมูลพรรณไม้/ใบงานที่ยังขาดให้ครบถ้วนก่อนส่งประเมิน'}
              </p>
            </div>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: `7px solid ${overallReadiness >= 80 ? '#1E6B37' : '#C5931C'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.4rem',
              color: overallReadiness >= 80 ? '#1E6B37' : '#C5931C',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
            }}>
              {overallReadiness}%
            </div>
          </div>

          {/* 4 Dimensions Breakdown Progress Cards */}
          <div>
            <h4 style={{ fontWeight: 800, color: '#2A084E', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={18} color="#5C1D8D" />
              สรุปเปอร์เซ็นต์ความครบถ้วนรายด้าน (ด้านที่ 1 - 4)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {/* ด้านที่ 1 */}
              <div className="card" style={{ padding: '18px', borderLeft: '5px solid #5C1D8D' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#5C1D8D' }}>ด้านที่ 1: การบริหารและการจัดการ</span>
                  <strong style={{ fontSize: '1.1rem', color: '#5C1D8D' }}>{dim1Score}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F0EDF3', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${dim1Score}%`, height: '100%', backgroundColor: '#5C1D8D' }}></div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#584F66' }}>
                  คำสั่งแต่งตั้งและเอกสาร: <strong>{dim1DocsCount} ฉบับ</strong> | เชื่อมโยงเกณฑ์: <strong>{dim1Mapped} ข้อ</strong>
                </div>
              </div>

              {/* ด้านที่ 2 */}
              <div className="card" style={{ padding: '18px', borderLeft: '5px solid #1E6B37' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E6B37' }}>ด้านที่ 2: การดำเนินงาน 5 องค์ประกอบ</span>
                  <strong style={{ fontSize: '1.1rem', color: '#1E6B37' }}>{dim2Score}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F0EDF3', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${dim2Score}%`, height: '100%', backgroundColor: '#1E6B37' }}></div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#584F66' }}>
                  พรรณไม้ติดป้ายรหัส: <strong>{plantsWithTags}/{plants.length} ต้น</strong> | มีภาพถ่าย: <strong>{plantsWithPhotos} ต้น</strong>
                </div>
              </div>

              {/* ด้านที่ 3 */}
              <div className="card" style={{ padding: '18px', borderLeft: '5px solid #C5931C' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94690A' }}>ด้านที่ 3: 3 สาระการเรียนรู้</span>
                  <strong style={{ fontSize: '1.1rem', color: '#94690A' }}>{dim3Score}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F0EDF3', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${dim3Score}%`, height: '100%', backgroundColor: '#C5931C' }}></div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#584F66' }}>
                  ใบงาน ก.7-003: <strong>{k7Sheets.length} ฉบับ</strong> | ผ่านการตรวจ: <strong>{k7Approved} ฉบับ</strong>
                </div>
              </div>

              {/* ด้านที่ 4 */}
              <div className="card" style={{ padding: '18px', borderLeft: '5px solid #1565C0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1565C0' }}>ด้านที่ 4: ความถูกต้องทางวิชาการ</span>
                  <strong style={{ fontSize: '1.1rem', color: '#1565C0' }}>{dim4Score}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F0EDF3', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${dim4Score}%`, height: '100%', backgroundColor: '#1565C0' }}></div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#584F66' }}>
                  ระบุชื่อวิทย์/วงศ์: <strong>{plantsWithScientific}/{plants.length} ต้น</strong> | เทียบเคียง 100%: <strong>{plantsWithMatchStatus} ต้น</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INCOMPLETE PLANTS & MISSING FIELDS (SPEC REQUIREMENT) */}
      {/* ======================================================== */}
      {activeTab === 'missing-plants' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', backgroundColor: '#FAF7FC', borderBottom: '1px solid #E8DEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontWeight: 800, color: '#2A084E', fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sprout size={18} color="#5C1D8D" />
                รายการพรรณไม้ที่ยังขาดข้อมูล (Missing Botanical Information)
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#584F66', margin: '2px 0 0 0' }}>
                ชี้จุดบกพร่องของแต่ละพรรณไม้เพื่อการติดตามเติมข้อมูลภาพถ่ายและการเทียบเคียงชื่อวิทยาศาสตร์
              </p>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: incompletePlants.length > 0 ? '#FDEAEA' : '#EAF7ED', color: incompletePlants.length > 0 ? '#D32F2F' : '#1E6B37' }}>
              ขาดข้อมูล {incompletePlants.length} / {plants.length} ต้น
            </span>
          </div>

          {incompletePlants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#1E6B37', fontWeight: 700 }}>
              🎉 ยอดเยี่ยม! พรรณไม้ทุกต้นในทะเบียนมีข้อมูลครบถ้วนสมบูรณ์ตามเกณฑ์ อพ.สธ.
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>รหัสพรรณไม้</th>
                    <th>ชื่อพื้นเมือง / ชื่อไทย</th>
                    <th>โซน / สถานที่</th>
                    <th>จุดที่ยังขาดข้อมูล (Missing Fields)</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>จำนวนที่ขาด</th>
                  </tr>
                </thead>
                <tbody>
                  {incompletePlants.map((item, idx) => (
                    <tr key={item.plant.id || idx} style={{ borderBottom: '1px solid #F0EDF3' }}>
                      <td style={{ textAlign: 'center', color: '#827891', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: '#5C1D8D', fontSize: '0.85rem' }}>{item.plant.plant_code}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1F1929', fontSize: '0.9rem' }}>
                          {item.plant.thai_name || item.plant.local_name}
                        </div>
                        <span style={{ fontSize: '0.76rem', fontStyle: 'italic', color: '#827891' }}>
                          {item.plant.scientific_name || 'ยังไม่ระบุชื่อวิทย์'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#584F66' }}>{item.plant.planting_location || 'Zone A'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {item.missingFields.map((field, fIdx) => (
                            <span
                              key={fIdx}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: field.includes('ภาพ') ? '#FDEAEA' : '#FFF9E6',
                                color: field.includes('ภาพ') ? '#D32F2F' : '#94690A',
                                border: `1px solid ${field.includes('ภาพ') ? '#F5C2C2' : '#F3DEA2'}`
                              }}
                            >
                              ⚠️ {field}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#D32F2F', fontSize: '0.86rem' }}>
                          {item.missingCount} จุด
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WORKSHEETS AUDIT */}
      {/* ======================================================== */}
      {activeTab === 'worksheets' && (
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontWeight: 800, color: '#2A084E', marginBottom: '1.25rem' }}>
            📝 รายงานความถูกต้องของใบงานสัณฐานพืช ก.7-003
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#FAF7FC', border: '1px solid #E8DEEE' }}>
              <h5 style={{ fontWeight: 700, color: '#5C1D8D', fontSize: '0.9rem', margin: '0 0 6px 0' }}>
                📊 สถิติใบงาน ก.7-003 รวม
              </h5>
              <div style={{ fontSize: '0.84rem', color: '#584F66' }}>
                จำนวนใบงานในระบบ: <strong>{k7Sheets.length} ฉบับ</strong> | ผ่านการอนุมัติแล้ว: <strong>{k7Approved} ฉบับ</strong> | รอการตรวจ: <strong>{k7Sheets.length - k7Approved} ฉบับ</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: EVALUATION CRITERIA MAPPING */}
      {/* ======================================================== */}
      {activeTab === 'criteria' && (
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontWeight: 800, color: '#2A084E', marginBottom: '1.25rem' }}>
            📋 รายการตัวชี้วัดเกณฑ์การประเมิน อพ.สธ. ({criteria.length} ข้อ)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {criteria.map(c => {
              const hasEvidence = mappings.some(m => m.criteria_id === c.criteria_id);
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E8DEEE',
                    backgroundColor: hasEvidence ? '#FDFDFD' : '#FFF9E6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: '#5C1D8D', fontSize: '0.86rem' }}>ข้อ {c.criteria_id}:</strong>{' '}
                    <span style={{ fontSize: '0.85rem', color: '#1F1929' }}>{c.title || c.criteria_name}</span>
                  </div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: hasEvidence ? '#EAF7ED' : '#FDEAEA',
                    color: hasEvidence ? '#1E6B37' : '#D32F2F'
                  }}>
                    {hasEvidence ? '✓ มีหลักฐานแนบ' : '⚠️ ยังไม่มีหลักฐาน'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

