import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Map, MapPin, Award, Book, Landmark, Heart, Plus, Save } from 'lucide-react';

export default function LocalResources({ userRole }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [resType, setResType] = useState('biological');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [statusText, setStatusText] = useState('');

  const fetchResources = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'local_resources'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setResources(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;

    setStatusText('กำลังบันทึกทรัพยากรท้องถิ่น...');
    try {
      await addDoc(collection(db, 'local_resources'), {
        resource_type: resType,
        name: name,
        description: description,
        details: details,
        created_at: new Date().toISOString()
      });

      setStatusText('บันทึกทรัพยากรท้องถิ่นสำเร็จ!');
      setName('');
      setDescription('');
      setDetails('');
      setIsFormOpen(false);
      fetchResources();
    } catch (err) {
      setStatusText('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const getTabIcon = (type) => {
    switch (type) {
      case 'biological': return <Heart size={14} />;
      case 'physical': return <MapPin size={14} />;
      case 'local_wisdom': return <Award size={14} />;
      case 'local_culture': return <Landmark size={14} />;
      case 'community_map': return <Map size={14} />;
      default: return <Book size={14} />;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'biological': return 'ทรัพยากรชีวภาพ';
      case 'physical': return 'ทรัพยากรกายภาพ';
      case 'local_wisdom': return 'ภูมิปัญญาท้องถิ่น';
      case 'local_culture': return 'วัฒนธรรมท้องถิ่น';
      case 'community_map': return 'แผนที่ชุมชน';
      default: return 'ทรัพยากร';
    }
  };

  const filteredResources = resources.filter(r => activeTab === 'all' || r.resource_type === activeTab);

  return (
    <div>
      {/* Intro info card */}
      <div className="card glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          ฐานทรัพยากรท้องถิ่น (ตามแนวทาง อพ.สธ.)
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          เป็นการศึกษาและเก็บรวบรวมข้อมูลทรัพยากร 3 ฐาน ได้แก่ ทรัพยากรกายภาพ (ดิน หิน แหล่งน้ำ) ทรัพยากรชีวภาพ (พืชพรรณและสัตว์ในท้องถิ่น) และทรัพยากรวัฒนธรรมภูมิปัญญา (การนวด สมุนไพร ทักษะหัตถกรรม งานฝีมือ) เพื่อนำข้อมูลมาบูรณาการการเรียนรู้คู่ชุมชน
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
          {['all', 'biological', 'physical', 'local_wisdom', 'local_culture', 'community_map'].map(type => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`btn ${activeTab === type ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              {getTabIcon(type)}
              <span style={{ marginLeft: '4px' }}>{type === 'all' ? 'ทั้งหมด' : getTypeName(type)}</span>
            </button>
          ))}
        </div>

        {userRole !== 'visitor' && !isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
            <Plus size={16} /> เพิ่มข้อมูลทรัพยากรท้องถิ่น
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">บันทึกข้อมูลทรัพยากรชุมชนและภูมิปัญญา</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">ประเภททรัพยากร</label>
                <select
                  className="form-control"
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                >
                  <option value="biological">ทรัพยากรชีวภาพ (สัตว์, พืชนอกโรงเรียน)</option>
                  <option value="physical">ทรัพยากรกายภาพ (แร่ดิน, ลำน้ำ, ป่า)</option>
                  <option value="local_wisdom">ภูมิปัญญาท้องถิ่น (ยาสมุนไพร, การทอผ้า, อาหาร)</option>
                  <option value="local_culture">วัฒนธรรมท้องถิ่น (การแสดง, วิถีชีวิตประจำถิ่น)</option>
                  <option value="community_map">แผนที่ชุมชน / แหล่งเรียนรู้</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ชื่อทรัพยากร / ภูมิปัญญา</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น สมุนไพรนวดลูกประคบยายจันทร์"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">รายละเอียดคำอธิบาย</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="อธิบายรายละเอียด สรรพคุณ วิธีทำ หรือผู้สืบทอด..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">ข้อมูลพิกัดสถานที่ หรือที่มาอ้างอิงเพิ่มเติม</label>
              <input
                type="text"
                className="form-control"
                placeholder="เช่น บ้านเลขที่ 12 หมู่ 4 ต.ในเมือง"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {statusText && (
              <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.1)', color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {statusText}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-secondary">ยกเลิก</button>
              <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      )}

      {/* Directory list of community resources */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลฐานทรัพยากร...</div>
      ) : filteredResources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          ยังไม่มีการลงทะเบียนทรัพยากรประเภทนี้ในฐานข้อมูล
        </div>
      ) : (
        <div className="grid-2">
          {filteredResources.map(res => (
            <div key={res.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="role-badge role-student" style={{ fontSize: '0.75rem' }}>
                  {getTabIcon(res.resource_type)}
                  <span style={{ marginLeft: '4px' }}>{getTypeName(res.resource_type)}</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {res.created_at?.split('T')[0]}
                </span>
              </div>

              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
                {res.name}
              </h4>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', flex: 1, lineHeight: 1.4 }}>
                {res.description}
              </p>

              {res.details && (
                <div style={{
                  marginTop: '12px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)'
                }}>
                  📍 <b>ที่ตั้ง/พิกัดอ้างอิง:</b> {res.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
