import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured, auth } from '../firebaseClient';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Star, X, CheckCircle2, Heart } from 'lucide-react';

export default function SatisfactionSurveyPopup({ onClose, userRole }) {
  // Form states
  const [satisfaction, setSatisfaction] = useState(0);
  const [interest, setInterest] = useState(0);
  const [comments, setComments] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(userRole || 'visitor');
  const [hoverSat, setHoverSat] = useState(0);
  const [hoverInt, setHoverInt] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        setEmail(currentUser.email);
        setRole(userRole || 'visitor');
        if (isFirebaseConfigured() && db) {
          try {
            const docSnap = await getDoc(doc(db, 'users', currentUser.email.trim().toLowerCase()));
            if (docSnap.exists()) {
              setName(docSnap.data().name || '');
            }
          } catch (e) {
            console.error('Error fetching survey user profile:', e);
          }
        }
      } else {
        setEmail('');
        setName('');
        setRole('visitor');
      }
    };
    loadUserData();
  }, [userRole]);

  const rolesMap = {
    admin: 'ผู้ดูแลระบบ (Admin)',
    rspg_board: 'คณะกรรมการ อพ.สธ.',
    teacher: 'ครูผู้สอน',
    project_advisor: 'ครูที่ปรึกษาโครงงาน',
    student: 'นักเรียน',
    doc_officer: 'เจ้าหน้าที่งานเอกสาร',
    executive: 'ผู้บริหาร',
    evaluator: 'กรรมการประเมิน',
    visitor: 'บุคคลทั่วไป (Visitor)'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (satisfaction === 0 || interest === 0) {
      alert('กรุณาเลือกดาวความพึงพอใจและความสนใจเรียนรู้ก่อนส่งแบบประเมิน');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        submitted_at: new Date().toISOString(),
        user_name: name.trim() || 'ผู้ใช้ไม่ประสงค์ออกนาม',
        user_email: email.trim() || 'visitor@email.com',
        user_role: role,
        satisfaction_score: satisfaction,
        interest_score: interest,
        comments: comments.trim()
      };

      if (isFirebaseConfigured() && db) {
        await addDoc(collection(db, 'rspg_satisfaction_surveys'), payload);
      } else {
        console.warn('Firebase not configured. Payload simulated:', payload);
      }

      // Mark as completed in localStorage so user isn't prompted again
      localStorage.setItem('rspg_survey_submitted_or_dismissed', 'true');
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting survey:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    // Dismiss permanently so user isn't annoyed
    localStorage.setItem('rspg_survey_submitted_or_dismissed', 'true');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(15, 10, 25, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .star-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.1s ease;
        }
        .star-btn:hover {
          transform: scale(1.2);
        }
      `}</style>

      <div style={{
        backgroundColor: 'var(--bg-sidebar)',
        border: '1px solid rgba(177, 91, 227, 0.25)',
        boxShadow: '0 15px 40px rgba(132, 59, 206, 0.25)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        position: 'relative',
        color: '#fff',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="ปิดหน้าต่างนี้"
        >
          <X size={18} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={64} color="#a855f7" style={{ marginBottom: '1.25rem', display: 'inline-block' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '8px' }}>ขอบพระคุณสำหรับข้อมูลประเมิน!</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>ระบบได้นำส่งแบบสำรวจของคุณเพื่อใช้ปรับปรุงพัฒนาแอปพลิเคชันแล้ว</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Heart size={28} color="#a855f7" fill="#a855f7" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold)', margin: 0 }}>
                สำรวจความสนใจและความพึงพอใจ 🌸
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              เนื่องจากคุณได้ใช้งานแอปสวนพฤกษศาสตร์มาระยะหนึ่งแล้ว กรุณาช่วยให้ความคิดเห็นสั้น ๆ เพื่อช่วยให้คณะกรรมการ อพ.สธ. ปรับปรุงระบบการจัดการเรียนรู้ให้ดียิ่งขึ้นครับ
            </p>

            {/* Satisfaction Rating */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#eae6ff' }}>
                1. ความพึงพอใจต่อหน้าตาและการออกแบบแอปพลิเคชัน (1-5 ดาว)
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hoverSat || satisfaction);
                  return (
                    <button
                      key={star}
                      type="button"
                      className="star-btn"
                      onClick={() => setSatisfaction(star)}
                      onMouseEnter={() => setHoverSat(star)}
                      onMouseLeave={() => setHoverSat(0)}
                    >
                      <Star
                        size={28}
                        color={filled ? '#eab308' : 'rgba(255,255,255,0.2)'}
                        fill={filled ? '#eab308' : 'transparent'}
                      />
                    </button>
                  );
                })}
                {satisfaction > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', marginLeft: '8px' }}>
                    {satisfaction} / 5 คะแนน
                  </span>
                )}
              </div>
            </div>

            {/* Botanical Interest Rating */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#eae6ff' }}>
                2. ระดับความสนใจในการเรียนรู้พฤกษศาสตร์ผ่านแอปนี้ (1-5 ดาว)
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hoverInt || interest);
                  return (
                    <button
                      key={star}
                      type="button"
                      className="star-btn"
                      onClick={() => setInterest(star)}
                      onMouseEnter={() => setHoverInt(star)}
                      onMouseLeave={() => setHoverInt(0)}
                    >
                      <Star
                        size={28}
                        color={filled ? '#eab308' : 'rgba(255,255,255,0.2)'}
                        fill={filled ? '#eab308' : 'transparent'}
                      />
                    </button>
                  );
                })}
                {interest > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 'bold', marginLeft: '8px' }}>
                    {interest} / 5 คะแนน
                  </span>
                )}
              </div>
            </div>

            {/* Comments suggestions */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: '#eae6ff' }}>
                3. ข้อเสนอแนะ หรือคำติชมเพิ่มเติม
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="เช่น การแสดงผลรวดเร็วและสวยงามมาก, อยากให้เพิ่มระบบใบความรู้ ฯลฯ"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Demographics / Identity Info */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(0,0,0,0.18)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--color-gold)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
                📋 ข้อมูลผู้ประเมิน ({auth.currentUser ? 'ดึงจากบัญชีปัจจุบัน' : 'กรุณากรอกข้อมูล'})
              </div>
              <div className="grid-2" style={{ gap: '8px', gridTemplateColumns: '1.2fr 0.8fr' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px', fontSize: '0.75rem' }}>ชื่อผู้ประเมิน:</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      padding: '4px 8px'
                    }}
                    required
                  />
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px', fontSize: '0.75rem' }}>บทบาท:</span>
                  {auth.currentUser ? (
                    <span style={{ fontWeight: 'bold', color: '#fff', display: 'block', paddingTop: '4px' }}>
                      {rolesMap[role] || role}
                    </span>
                  ) : (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '0.78rem',
                        padding: '4px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="visitor" style={{ color: '#000' }}>บุคคลทั่วไป</option>
                      <option value="student" style={{ color: '#000' }}>นักเรียน</option>
                      <option value="teacher" style={{ color: '#000' }}>ครูผู้สอน</option>
                    </select>
                  )}
                </div>
              </div>
              {!auth.currentUser && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '2px', fontSize: '0.75rem' }}>อีเมลผู้ประเมิน (ทางเลือก):</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น somchai@email.com"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      padding: '4px 8px'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'transparent',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ไม่สะดวกตอนนี้
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
