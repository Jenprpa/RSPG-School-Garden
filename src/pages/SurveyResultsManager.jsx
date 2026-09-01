import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Star, Trash2, Search, Heart, RefreshCw, Users, Clock } from 'lucide-react';

export default function SurveyResultsManager({ userRole }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusMsg, setStatusMsg] = useState('');

  const rolesMap = {
    admin: 'ผู้ดูแลระบบ',
    rspg_board: 'กรรมการ อพ.สธ.',
    teacher: 'ครูผู้สอน',
    project_advisor: 'ครูที่ปรึกษา',
    student: 'นักเรียน',
    doc_officer: 'เจ้าหน้าที่เอกสาร',
    executive: 'ผู้บริหาร',
    evaluator: 'กรรมการประเมิน',
    visitor: 'บุคคลทั่วไป'
  };

  const fetchSurveys = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_satisfaction_surveys'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort by submitted_at descending
      list.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
      setSurveys(list);
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSurveys();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบข้อมูลผลสำรวจได้');
      return;
    }
    if (!window.confirm('คุณแน่ใจว่าต้องการลบผลสำรวจชิ้นนี้อย่างถาวรหรือไม่?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'rspg_satisfaction_surveys', id));
      setStatusMsg('✅ ลบรายการสำรวจเรียบร้อยแล้ว!');
      setTimeout(() => setStatusMsg(''), 3000);
      fetchSurveys();
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  // Compute stats
  const totalCount = surveys.length;
  const avgSatisfaction = totalCount > 0
    ? (surveys.reduce((sum, s) => sum + Number(s.satisfaction_score || 0), 0) / totalCount).toFixed(1)
    : '0.0';
  const avgInterest = totalCount > 0
    ? (surveys.reduce((sum, s) => sum + Number(s.interest_score || 0), 0) / totalCount).toFixed(1)
    : '0.0';

  // Filters
  const filtered = surveys.filter(s => {
    const matchSearch = s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
                        s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
                        s.comments?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.user_role === roleFilter;
    return matchSearch && matchRole;
  });

  const renderStars = (score) => {
    return (
      <div style={{ display: 'flex', gap: '2px', color: '#eab308' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={13}
            fill={star <= score ? '#eab308' : 'transparent'}
            color={star <= score ? '#eab308' : 'rgba(0,0,0,0.15)'}
          />
        ))}
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังดาวน์โหลดผลสำรวจ...</div>;

  return (
    <div>
      <div className="card glass-panel" style={{ marginBottom: '2rem', border: '1px solid rgba(177, 91, 227, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Heart size={28} color="var(--color-primary)" fill="var(--color-primary)" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                ผลการสำรวจความพึงพอใจและความสนใจของผู้ใช้งาน 📊
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                สถิติการประเมินจากระบบป๊อบอัพที่แสดงผลหลังจากเปิดใช้งานครบ 10 นาที
              </p>
            </div>
          </div>
          <button
            onClick={fetchSurveys}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            <RefreshCw size={14} /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid-3" style={{ marginTop: '1.5rem', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(186,85,211,0.08)', padding: '10px', borderRadius: '50%', color: 'var(--color-primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>จำนวนผู้ตอบแบบสอบถาม</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalCount} รายการ</span>
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(234,179,8,0.08)', padding: '10px', borderRadius: '50%', color: '#eab308' }}>
              <Star size={20} fill="#eab308" />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>เฉลี่ยความพึงพอใจดีไซน์แอป</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {avgSatisfaction} <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ 5</span>
              </span>
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(93,175,105,0.08)', padding: '10px', borderRadius: '50%', color: 'var(--color-nature)' }}>
              <Heart size={20} fill="var(--color-nature)" />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>เฉลี่ยความพึงพอใจการเรียนรู้</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-nature)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {avgInterest} <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ 5</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Filters and Message */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '280px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล หรือคำแนะนำ..."
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control"
              style={{ width: '180px', fontSize: '0.82rem', padding: '0.35rem 0.65rem', cursor: 'pointer' }}
            >
              <option value="all">แสดงทุกบทบาทผู้ใช้</option>
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="teacher">ครูผู้สอน</option>
              <option value="student">นักเรียน</option>
              <option value="visitor">บุคคลทั่วไป</option>
            </select>
          </div>

          {statusMsg && (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
              {statusMsg}
            </span>
          )}
        </div>

        {/* Table View */}
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            ไม่พบข้อมูลแบบสำรวจที่ตรงตามข้อกำหนดค้นหา
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px' }}>วันเวลาที่ส่ง</th>
                  <th style={{ padding: '10px' }}>ผู้ประเมิน</th>
                  <th style={{ padding: '10px' }}>บทบาท</th>
                  <th style={{ padding: '10px' }}>ความพึงพอใจ</th>
                  <th style={{ padding: '10px' }}>ความสนใจเรียนรู้</th>
                  <th style={{ padding: '10px', width: '35%' }}>ข้อเสนอแนะเพิ่มเติม</th>
                  {userRole === 'admin' && <th style={{ padding: '10px', textAlign: 'center' }}>ลบ</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {item.submitted_at?.replace('T', ' ').substring(0, 16)}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600 }}>{item.user_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.user_email}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: item.user_role === 'student' ? 'rgba(186,85,211,0.08)' :
                                         item.user_role === 'teacher' || item.user_role === 'admin' ? 'rgba(234,179,8,0.08)' :
                                         'rgba(0,0,0,0.05)',
                        color: item.user_role === 'student' ? 'var(--color-primary)' :
                               item.user_role === 'teacher' || item.user_role === 'admin' ? 'var(--color-gold)' :
                               'var(--text-muted)'
                      }}>
                        {rolesMap[item.user_role] || item.user_role}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {renderStars(item.satisfaction_score)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {renderStars(item.interest_score)}
                    </td>
                    <td style={{ padding: '10px', fontStyle: item.comments ? 'normal' : 'italic', color: item.comments ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {item.comments ? item.comments : 'ไม่ได้ระบุข้อคิดเห็นเพิ่มเติม'}
                    </td>
                    {userRole === 'admin' && (
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="ลบข้อมูลชิ้นนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
