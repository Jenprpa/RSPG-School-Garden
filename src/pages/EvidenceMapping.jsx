import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Layers, Link2, Unlink, FileText, CheckCircle, Search, HelpCircle } from 'lucide-react';

export default function EvidenceMapping({ userRole }) {
  const [criteria, setCriteria] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterElement, setFilterElement] = useState('ทั้งหมด');

  const loadData = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Load K7009 criteria
      const critSnap = await getDocs(collection(db, 'rspg_evaluation_criteria'));
      const critList = [];
      critSnap.forEach(d => critList.push({ id: d.id, ...d.data() }));
      critList.sort((a, b) => a.criteria_id.localeCompare(b.criteria_id, undefined, { numeric: true }));
      setCriteria(critList);

      // 2. Load Evidence Vault files
      const evSnap = await getDocs(collection(db, 'rspg_evidence_vault'));
      const evList = [];
      evSnap.forEach(d => evList.push({ id: d.id, ...d.data() }));
      setEvidence(evList);

      // 3. Load active mappings
      const mapSnap = await getDocs(collection(db, 'evidence_mapping'));
      const mapList = [];
      mapSnap.forEach(d => mapList.push({ id: d.id, ...d.data() }));
      setMappings(mapList);
    } catch (err) {
      console.error('Error loading mapping data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMap = async (critId, evId) => {
    if (userRole === 'visitor') return;
    
    const mappingKey = `map_${critId}_${evId}`;
    const existing = mappings.find(m => m.criteria_id === critId && m.evidence_id === evId);
    
    setSavingId(mappingKey);
    try {
      if (existing) {
        // Unlink
        await deleteDoc(doc(db, 'evidence_mapping', existing.id));
        setMappings(prev => prev.filter(m => m.id !== existing.id));
      } else {
        // Link
        const payload = {
          criteria_id: critId,
          evidence_id: evId,
          mapped_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'evidence_mapping', mappingKey), payload);
        setMappings(prev => [...prev, { id: mappingKey, ...payload }]);
      }
    } catch (err) {
      alert('การเชื่อมโยงหลักฐานผิดพลาด: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const getLinkedEvidenceCount = (critId) => {
    return mappings.filter(m => m.criteria_id === critId).length;
  };

  const isMapped = (critId, evId) => {
    return !!mappings.find(m => m.criteria_id === critId && m.evidence_id === evId);
  };

  const elements = [1, 2, 3, 4, 5];

  const filteredCriteria = criteria.filter(crit => {
    const matchesSearch = 
      crit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crit.criteria_id.includes(searchQuery);
    
    const matchesElement = filterElement === 'ทั้งหมด' || crit.element_num === parseInt(filterElement);
    
    return matchesSearch && matchesElement;
  });

  return (
    <div>
      {/* Upper description card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Layers size={28} color="var(--color-primary)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              ระบบเชื่อมโยงและจัดแผนผังหลักฐานประเมิน (RSPG Evidence Mapping Dashboard)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ผูกเอกสารราชการ รายงานวิชาการ ภาพกิจกรรม หรือใบงานนักเรียนจากคลังกลาง เข้ากับมาตรฐานตัวชี้วัด อพ.สธ. เพื่อใช้สืบค้นประกอบรับการประเมิน
            </p>
          </div>
        </div>
      </div>

      {/* Instructions check */}
      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(2,136,209,0.02)', border: '1px solid rgba(2,136,209,0.1)', padding: '1rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <HelpCircle size={18} color="var(--color-info)" style={{ marginTop: '2px' }} />
        <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
          <b>คำแนะนำการใช้งาน:</b> เลือกตัวชี้วัด/องค์ประกอบที่ต้องการผูกในรายการด้านล่าง แล้วคลิกเชื่อมโยงเอกสารคลังหลักฐานที่เกี่ยวข้อง 
          ข้อมูลการเชื่อมโยงจะไปปรากฏในโมดูลตรวจประเมิน ก.7-009 อัตโนมัติ โดยผู้ประเมินสามารถคลิกดูเนื้อหาไฟล์แนบได้ทันที
        </div>
      </div>

      {/* Grid containing criteria selector and mapping area */}
      <div className="grid-3" style={{ gridTemplateColumns: '1.5fr 1.5fr', gap: '1.5rem' }}>
        
        {/* Left Side: K.7-009 Indicators list */}
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>📋 เลือกตัวชี้วัดประเมิน (15 ตัวชี้วัดหลัก)</h4>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="ค้นหาชื่อตัวชี้วัด..."
              className="form-control"
              style={{ flex: 2 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="form-control"
              style={{ flex: 1 }}
              value={filterElement}
              onChange={(e) => setFilterElement(e.target.value)}
            >
              <option value="ทั้งหมด">ทุกองค์ประกอบ</option>
              {elements.map(e => <option key={e} value={e}>องค์ประกอบที่ {e}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
            {filteredCriteria.map(crit => {
              const linkedCount = getLinkedEvidenceCount(crit.criteria_id);
              return (
                <div
                  key={crit.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ paddingRight: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>ข้อ {crit.criteria_id}</span>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '2px 0 0 0' }}>{crit.title}</h5>
                  </div>
                  
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: linkedCount > 0 ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.06)',
                    color: linkedCount > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    whiteSpace: 'nowrap'
                  }}>
                    🔗 ผูกแล้ว {linkedCount} ไฟล์
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Central Evidence files mapping board */}
        <div className="card">
          <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>📂 เชื่อมต่อเอกสารหลักฐานคลังกลาง</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            ระบุความสัมพันธ์ของคลังหลักฐานกลาง (Evidence Vault) ไปยังเกณฑ์ประเมิน
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
            {evidence.map(ev => (
              <div 
                key={ev.id} 
                style={{ 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--bg-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="role-badge role-teacher" style={{ fontSize: '0.7rem', padding: '1px 5px', color: 'var(--color-primary)' }}>{ev.category}</span>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '4px 0 0 0' }}>{ev.title}</h5>
                  </div>
                  {ev.attachment_url && (
                    <a href={ev.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                      <FileText size={16} />
                    </a>
                  )}
                </div>
                
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{ev.description}</p>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ผู้รับผิดชอบ: {ev.responsible_person}</div>

                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-main)' }}>เลือกผูกเอกสารนี้กับตัวชี้วัด:</span>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {criteria.map(crit => {
                      const active = isMapped(crit.criteria_id, ev.id);
                      const currentKey = `map_${crit.criteria_id}_${ev.id}`;
                      return (
                        <button
                          key={crit.id}
                          onClick={() => handleToggleMap(crit.criteria_id, ev.id)}
                          disabled={savingId !== null}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: active ? 'var(--color-primary)' : 'var(--bg-card)',
                            color: active ? '#fff' : 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {active ? <Unlink size={10} /> : <Link2 size={10} />}
                          <span>ข้อ {crit.criteria_id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
