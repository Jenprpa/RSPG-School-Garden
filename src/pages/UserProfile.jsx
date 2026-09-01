import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured, auth } from '../firebaseClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Shield, Key, Check, AlertTriangle, User } from 'lucide-react';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClassroom, setEditClassroom] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchUserData = async (email) => {
    if (!isFirebaseConfigured() || !db) return;
    try {
      const docRef = doc(db, 'users', email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUser(docSnap.data());
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        await fetchUserData(currentUser.email);
      } else {
        const savedUser = localStorage.getItem('rspg_user_display_cache');
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            if (u.email) {
              await fetchUserData(u.email);
            }
          } catch (e) {
            console.error('Error parsing user display cache:', e);
          }
        }
      }
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!editName.trim()) {
      setProfileError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    setSavingProfile(true);
    try {
      const docRef = doc(db, 'users', user.email);
      const updates = { name: editName };
      if (user.role === 'student') {
        updates.classroom = editClassroom;
      }

      await updateDoc(docRef, updates);

      const cacheObj = {
        email: user.email,
        name: editName,
        classroom: user.role === 'student' ? editClassroom : ''
      };
      localStorage.setItem('rspg_user_display_cache', JSON.stringify(cacheObj));

      setUser(prev => ({
        ...prev,
        name: editName,
        classroom: user.role === 'student' ? editClassroom : prev.classroom
      }));

      setProfileSuccess('อัปเดตข้อมูลส่วนตัวสำเร็จแล้ว!');
      setIsEditing(false);
    } catch (err) {
      setProfileError('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('ไม่พบเซสชันการเข้าสู่ระบบปัจจุบัน กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password in Firebase Auth
      await updatePassword(currentUser, newPassword);

      setSuccess('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      let localizedError;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        localizedError = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
      } else if (err.code === 'auth/weak-password') {
        localizedError = 'รหัสผ่านใหม่มีความปลอดภัยไม่เพียงพอ รหัสต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      } else if (err.code === 'auth/requires-recent-login') {
        localizedError = 'กรุณาออกจากระบบและเข้าสู่ระบบใหม่อีกครั้ง เพื่อดำเนินการขั้นตอนด้านความปลอดภัย';
      } else if (err.code === 'auth/network-request-failed') {
        localizedError = 'การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต';
      } else {
        localizedError = err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '1. ผู้ดูแลระบบ (Admin)';
      case 'rspg_board': return '2. คณะกรรมการ อพ.สธ.';
      case 'teacher': return '3. ครูผู้สอน';
      case 'project_advisor': return '4. ครูที่ปรึกษาโครงงาน';
      case 'student': return '5. นักเรียน';
      case 'doc_officer': return '6. เจ้าหน้าที่งานเอกสาร';
      case 'executive': return '7. ผู้บริหาร';
      case 'evaluator': return '8. กรรมการประเมิน (Read-Only)';
      default: return 'ผู้ใช้ทั่วไป';
    }
  };

  if (!user) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังดาวน์โหลดข้อมูลผู้ใช้...</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>

      {isEditing ? (
        /* Profile Card (Edit Mode) */
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-gold)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> แก้ไขข้อมูลส่วนตัว
          </h3>

          {profileError && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(211,47,47,0.06)', border: '1px solid rgba(211,47,47,0.15)', color: 'var(--color-danger)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>อีเมลผู้ใช้งาน (ไม่สามารถแก้ไขได้)</label>
              <input
                type="text"
                className="form-control"
                value={user.email}
                disabled
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem', backgroundColor: 'var(--bg-main)', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ชื่อ-นามสกุล</label>
              <input
                type="text"
                className="form-control"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              />
            </div>

            {user.role === 'student' && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ห้องเรียน</label>
                <input
                  type="text"
                  className="form-control"
                  value={editClassroom}
                  onChange={(e) => setEditClassroom(e.target.value)}
                  required
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
                style={{ flex: 1, padding: '0.6rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsEditing(false); setProfileError(''); }}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Profile Card (View Mode) */
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.25rem' }}>
            <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(46, 125, 50, 0.1)', color: 'var(--color-primary)' }}>
              <User size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{user.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{user.email}</p>
            </div>
            <button
              onClick={() => { setEditName(user.name || ''); setEditClassroom(user.classroom || ''); setIsEditing(true); setProfileSuccess(''); }}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              แก้ไขข้อมูล
            </button>
          </div>

          {profileSuccess && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.15)', color: 'var(--color-success)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>บทบาทในระบบ:</span>
              <span className={`role-badge role-${user.role}`} style={{ display: 'inline-flex', fontSize: '0.78rem', padding: '2px 8px' }}>
                <Shield size={12} style={{ marginRight: '4px' }} />
                {getRoleLabel(user.role)}
              </span>
            </div>
            {user.classroom && (
              <div>
                <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>ห้องเรียน:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{user.classroom}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={18} /> เปลี่ยนรหัสผ่านส่วนตัว
        </h3>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(211,47,47,0.06)', border: '1px solid rgba(211,47,47,0.15)', color: 'var(--color-danger)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.15)', color: 'var(--color-success)', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>รหัสผ่านปัจจุบัน (เพื่อความปลอดภัย)</label>
            <input
              type="password"
              className="form-control"
              placeholder="ป้อนรหัสผ่านเดิมของคุณ"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>รหัสผ่านใหม่ (ต้องมีความยาว 6 ตัวอักษรขึ้นไป)</label>
            <input
              type="password"
              className="form-control"
              placeholder="กำหนดรหัสผ่านใหม่"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              className="form-control"
              placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.6rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem' }}
          >
            <Key size={14} />
            <span>{loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}</span>
          </button>
        </form>
      </div>

    </div>
  );
}
