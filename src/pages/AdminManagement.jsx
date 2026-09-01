import React, { useEffect, useState } from 'react';
import { db, storage, isFirebaseConfigured, compressImage } from '../firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  ShieldCheck, Plus, Trash2, Edit3, Save, X, Upload, ExternalLink,
  Calendar, Users, Award, Image, UserCheck, Search, Filter, CheckCircle,
  AlertCircle, Shield, Key, Mail, GraduationCap, School
} from 'lucide-react';

export const ROLE_OPTIONS = [
  { value: 'admin', label: '1. ผู้ดูแลระบบ (Admin)', badgeStyle: { background: '#F6EEFB', color: '#5C1D8D', border: '1px solid #E5D0F5' } },
  { value: 'rspg_board', label: '2. คณะกรรมการ อพ.สธ. (RSPG Board)', badgeStyle: { background: '#FDF6E2', color: '#94690A', border: '1px solid #F3DEA2' } },
  { value: 'teacher', label: '3. ครูผู้รับผิดชอบ (Teacher)', badgeStyle: { background: '#EAF7ED', color: '#1E6B37', border: '1px solid #C2E7CD' } },
  { value: 'project_advisor', label: '4. ครูที่ปรึกษาโครงงาน (Advisor)', badgeStyle: { background: '#EAF7ED', color: '#1E6B37', border: '1px solid #C2E7CD' } },
  { value: 'student', label: '5. นักเรียน (Student)', badgeStyle: { background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB' } },
  { value: 'doc_officer', label: '6. เจ้าหน้าที่งานเอกสาร (Doc Officer)', badgeStyle: { background: '#E0F2F1', color: '#00695C', border: '1px solid #B2DFDB' } },
  { value: 'executive', label: '7. ผู้บริหารสถานศึกษา (Executive)', badgeStyle: { background: '#FDF6E2', color: '#94690A', border: '1px solid #F3DEA2' } },
  { value: 'evaluator', label: '8. กรรมการประเมินภายนอก (Evaluator)', badgeStyle: { background: '#ECEFF1', color: '#455A64', border: '1px solid #CFD8DC' } }
];

export default function AdminManagement({ userRole }) {
  // Main Section Tab: 'users' (จัดการบทบาทสมาชิก) | 'docs' (เอกสารและคำสั่งแต่งตั้ง)
  const [activeAdminTab, setActiveAdminTab] = useState('users');

  // Member & Roles Management States
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Add/Edit Member Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRoleSelection, setUserRoleSelection] = useState('student');
  const [userClassroom, setUserClassroom] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Administrative Documents States (Original Feature)
  const [docsList, setDocsList] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [documentType, setDocumentType] = useState('คำสั่งแต่งตั้งคณะกรรมการ');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const documentTypes = [
    'คำสั่งแต่งตั้งคณะกรรมการ',
    'แผนงาน/โครงการ',
    'ปฏิทินดำเนินงาน',
    'รายงานการประชุม',
    'ภาพกิจกรรม'
  ];

  // ----------------------------------------------------
  // Fetch Data: Users & Admin Documents
  // ----------------------------------------------------
  const fetchUsers = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || data.fullName || data.email?.split('@')[0] || 'ผู้ใช้งาน',
          email: data.email || d.id,
          role: data.role || 'student',
          classroom: data.classroom || '',
          created_at: data.created_at || data.updatedAt || '-'
        });
      });

      // Include default Admin if not in list
      const hasAdmin = list.some(u => u.email.toLowerCase() === 'jenprapa@pwtk.ac.th');
      if (!hasAdmin) {
        list.unshift({
          id: 'jenprapa@pwtk.ac.th',
          name: 'ครูเจนประภา เรือนคำ',
          email: 'jenprapa@pwtk.ac.th',
          role: 'admin',
          classroom: 'ผู้ดูแลระบบหลัก',
          created_at: 'ระบบตั้งต้น'
        });
      }

      setUsersList(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDocs = async () => {
    if (!isFirebaseConfigured() || !db) {
      setLoadingDocs(false);
      return;
    }
    setLoadingDocs(true);
    try {
      const snap = await getDocs(collection(db, 'rspg_admin_management'));
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setDocsList(list);
    } catch (err) {
      console.error('Error fetching admin docs:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDocs();
  }, []);

  // ----------------------------------------------------
  // User Role Management Handlers
  // ----------------------------------------------------
  const handleRoleChange = async (userId, userEmail, newRole) => {
    if (userRole !== 'admin') {
      alert('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้งานได้');
      return;
    }

    setUpdatingUserId(userId);
    try {
      const targetDocId = userEmail ? userEmail.trim().toLowerCase() : userId;
      const userRef = doc(db, 'users', targetDocId);
      await setDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update in local state
      setUsersList(prev => prev.map(u => (u.id === userId || u.email === userEmail) ? { ...u, role: newRole } : u));

      const roleObj = ROLE_OPTIONS.find(r => r.value === newRole);
      setFeedbackMsg({
        type: 'success',
        text: `✓ อัปเดตสิทธิ์ของ "${userEmail}" เป็น "${roleObj?.label || newRole}" สำเร็จเรียบร้อยแล้ว`
      });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Role update error:', err);
      setFeedbackMsg({
        type: 'error',
        text: `❌ เกิดข้อผิดพลาดในการอัปเดตสิทธิ์: ${err.message}`
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenUserModal = (userObj = null) => {
    if (userObj) {
      setEditingUser(userObj);
      setUserFullName(userObj.name || '');
      setUserEmail(userObj.email || '');
      setUserRoleSelection(userObj.role || 'student');
      setUserClassroom(userObj.classroom || '');
    } else {
      setEditingUser(null);
      setUserFullName('');
      setUserEmail('');
      setUserRoleSelection('student');
      setUserClassroom('');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return;
    setSavingUser(true);

    const emailClean = userEmail.trim().toLowerCase();
    try {
      const payload = {
        name: userFullName,
        email: emailClean,
        role: userRoleSelection,
        classroom: userClassroom,
        updatedAt: new Date().toISOString()
      };

      if (!editingUser) {
        payload.created_at = new Date().toISOString().split('T')[0];
      }

      await setDoc(doc(db, 'users', emailClean), payload, { merge: true });

      setFeedbackMsg({
        type: 'success',
        text: `✓ ${editingUser ? 'แก้ไขข้อมูล' : 'เพิ่มสมาชิกใหม่'} "${userFullName}" (${emailClean}) สำเร็จ!`
      });
      setIsUserModalOpen(false);
      fetchUsers();
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail, userName) => {
    if (userRole !== 'admin') return;
    if (userEmail.toLowerCase() === 'jenprapa@pwtk.ac.th') {
      alert('ไม่สามารถลบบัญชีผู้ดูแลระบบหลักได้');
      return;
    }

    if (window.confirm(`ยืนยันที่จะลบบัญชีผู้ใช้งาน "${userName}" (${userEmail}) ออกจากระบบ?`)) {
      try {
        const targetDocId = userEmail ? userEmail.trim().toLowerCase() : userId;
        await deleteDoc(doc(db, 'users', targetDocId));
        setUsersList(prev => prev.filter(u => u.id !== userId && u.email !== userEmail));
        setFeedbackMsg({
          type: 'success',
          text: `✓ ลบบัญชีผู้ใช้งาน "${userName}" เรียบร้อยแล้ว`
        });
        setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
      } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
      }
    }
  };

  // ----------------------------------------------------
  // Documents Management Handlers (Original Feature)
  // ----------------------------------------------------
  const handleOpenDocModal = (docObj = null) => {
    if (docObj) {
      setEditingDoc(docObj);
      setDocumentType(docObj.document_type || 'คำสั่งแต่งตั้งคณะกรรมการ');
      setTitle(docObj.title || '');
      setDescription(docObj.description || '');
      setResponsiblePerson(docObj.responsible_person || '');
      setAttachmentUrl(docObj.attachment_url || '');
    } else {
      setEditingDoc(null);
      setDocumentType('คำสั่งแต่งตั้งคณะกรรมการ');
      setTitle('');
      setDescription('');
      setResponsiblePerson('');
      setAttachmentUrl('');
    }
    setUploadFile(null);
    setIsDocModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`ไฟล์ "${file.name}" มีขนาดเกิน 10 MB`);
        e.target.value = '';
        setUploadFile(null);
        return;
      }
    }
    setUploadFile(file);
  };

  const handleFileUpload = async (file) => {
    if (!storage) return '';
    try {
      const processedFile = await compressImage(file);
      const ext = processedFile.name.split('.').pop();
      const path = documentType === 'ภาพกิจกรรม' ? 'images' : 'admin';
      const fileName = `${path}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const fileRef = ref(storage, fileName);
      const snapshot = await uploadBytes(fileRef, processedFile);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + err.message);
      return '';
    }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'visitor') return;
    setSavingDoc(true);

    try {
      let finalUrl = attachmentUrl;
      if (uploadFile) {
        finalUrl = await handleFileUpload(uploadFile);
      }

      const payload = {
        document_type: documentType,
        title: title,
        description: description,
        responsible_person: responsiblePerson,
        attachment_url: finalUrl,
        created_at: editingDoc?.created_at || new Date().toISOString().split('T')[0]
      };

      if (editingDoc) {
        await setDoc(doc(db, 'rspg_admin_management', editingDoc.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'rspg_admin_management'), payload);
      }

      setIsDocModalOpen(false);
      fetchDocs();
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (userRole === 'visitor') return;
    if (window.confirm('ยืนยันที่จะลบเอกสารหลักฐานชิ้นนี้?')) {
      try {
        await deleteDoc(doc(db, 'rspg_admin_management', id));
        fetchDocs();
      } catch (err) {
        alert('ลบไม่สำเร็จ: ' + err.message);
      }
    }
  };

  const getDocIcon = (type) => {
    switch (type) {
      case 'คำสั่งแต่งตั้งคณะกรรมการ': return <Users size={18} color="#5C1D8D" />;
      case 'แผนงาน/โครงการ': return <Award size={18} color="#C5931C" />;
      case 'ปฏิทินดำเนินงาน': return <Calendar size={18} color="#7B1FA2" />;
      case 'ภาพกิจกรรม': return <Image size={18} color="#0288D1" />;
      default: return <ShieldCheck size={18} color="#5C1D8D" />;
    }
  };

  // Filtered users list
  const filteredUsers = usersList.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.classroom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // User Counts
  const countAdmin = usersList.filter(u => u.role === 'admin').length;
  const countTeacher = usersList.filter(u => u.role === 'teacher' || u.role === 'project_advisor').length;
  const countStudent = usersList.filter(u => u.role === 'student').length;
  const countBoard = usersList.filter(u => ['rspg_board', 'executive', 'doc_officer', 'evaluator'].includes(u.role)).length;

  return (
    <div>
      {/* Introduction Header Card */}
      <div className="card glass-panel" style={{ marginBottom: '1.5rem', border: '1.5px solid #E5CA79' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2A084E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} color="#5C1D8D" />
              ด้านที่ 1: การบริหารและการจัดการ (จัดการบทบาทสมาชิก & คำสั่งแต่งตั้ง)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#584F66', marginTop: '4px', margin: 0 }}>
              ระบบควบคุมสิทธิ์ผู้ใช้งาน (RBAC) การปรับเปลี่ยนบทบาทสมาชิก อพ.สธ. และคลังคำสั่งแต่งตั้งคณะกรรมการดำเนินงาน
            </p>
          </div>

          {userRole === 'admin' && activeAdminTab === 'users' && (
            <button
              onClick={() => handleOpenUserModal()}
              className="btn btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.86rem' }}
            >
              <Plus size={16} /> เพิ่มสมาชิก / มอบหมายสิทธิ์
            </button>
          )}

          {userRole !== 'visitor' && activeAdminTab === 'docs' && (
            <button
              onClick={() => handleOpenDocModal()}
              className="btn btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.86rem' }}
            >
              <Plus size={16} /> บันทึกคำสั่ง/เอกสารใหม่
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackMsg.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: feedbackMsg.type === 'success' ? '#EAF7ED' : '#FDEAEA',
          border: `1.5px solid ${feedbackMsg.type === 'success' ? '#B8E5C4' : '#F5C2C2'}`,
          color: feedbackMsg.type === 'success' ? '#1E6B37' : '#D32F2F',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Admin Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E5CA79',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(42, 8, 78, 0.05)'
      }}>
        <button
          onClick={() => setActiveAdminTab('users')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '8px',
            border: activeAdminTab === 'users' ? '1.5px solid #ECC85B' : '1px solid transparent',
            background: activeAdminTab === 'users' ? 'linear-gradient(135deg, #2A084E 0%, #5C1D8D 100%)' : 'transparent',
            color: activeAdminTab === 'users' ? '#FFFFFF' : '#4A3E56',
            fontWeight: activeAdminTab === 'users' ? 700 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeAdminTab === 'users' ? '0 4px 12px rgba(42, 8, 78, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <UserCheck size={18} color={activeAdminTab === 'users' ? '#ECC85B' : '#5C1D8D'} />
          <span>จัดการสมาชิกและบทบาท ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('docs')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            borderRadius: '8px',
            border: activeAdminTab === 'docs' ? '1.5px solid #ECC85B' : '1px solid transparent',
            background: activeAdminTab === 'docs' ? 'linear-gradient(135deg, #2A084E 0%, #5C1D8D 100%)' : 'transparent',
            color: activeAdminTab === 'docs' ? '#FFFFFF' : '#4A3E56',
            fontWeight: activeAdminTab === 'docs' ? 700 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeAdminTab === 'docs' ? '0 4px 12px rgba(42, 8, 78, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={18} color={activeAdminTab === 'docs' ? '#ECC85B' : '#5C1D8D'} />
          <span>คำสั่งแต่งตั้งและเอกสาร ({docsList.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER ROLES & MEMBERS MANAGEMENT */}
      {/* ======================================================== */}
      {activeAdminTab === 'users' && (
        <div>
          {/* Member Statistics Summary Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '1.5rem'
          }}>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #5C1D8D' }}>
              <div style={{ fontSize: '0.8rem', color: '#584F66', fontWeight: 600 }}>👑 ผู้ดูแลระบบ (Admin)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#5C1D8D', marginTop: '2px' }}>{countAdmin}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #1E6B37' }}>
              <div style={{ fontSize: '0.8rem', color: '#584F66', fontWeight: 600 }}>🎓 ครูผู้รับผิดชอบ / ที่ปรึกษา</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E6B37', marginTop: '2px' }}>{countTeacher}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #1565C0' }}>
              <div style={{ fontSize: '0.8rem', color: '#584F66', fontWeight: 600 }}>🌿 นักเรียน (Students)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1565C0', marginTop: '2px' }}>{countStudent}</div>
            </div>
            <div className="card" style={{ padding: '14px', borderLeft: '4px solid #C5931C' }}>
              <div style={{ fontSize: '0.8rem', color: '#584F66', fontWeight: 600 }}>🏛️ คณะกรรมการ / ผู้บริหาร</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C5931C', marginTop: '2px' }}>{countBoard}</div>
            </div>
          </div>

          {/* Search and Role Filter Bar */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search Box */}
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 ค้นหาด้วยชื่อ, อีเมล, หรือห้องเรียน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', fontSize: '0.88rem' }}
                />
                <Search size={16} color="#7B1FA2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              {/* Role Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="#5C1D8D" />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#4A3E56' }}>กรองบทบาท:</span>
                <select
                  className="form-control"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: '7px 12px', fontSize: '0.85rem', width: 'auto' }}
                >
                  <option value="all">ทุกบทบาท ({usersList.length})</option>
                  <option value="admin">1. ผู้ดูแลระบบ ({countAdmin})</option>
                  <option value="teacher">3. ครูผู้รับผิดชอบ ({usersList.filter(u => u.role === 'teacher').length})</option>
                  <option value="project_advisor">4. ครูที่ปรึกษา ({usersList.filter(u => u.role === 'project_advisor').length})</option>
                  <option value="student">5. นักเรียน ({countStudent})</option>
                  <option value="rspg_board">2. คณะกรรมการ อพ.สธ.</option>
                  <option value="doc_officer">6. เจ้าหน้าที่เอกสาร</option>
                  <option value="executive">7. ผู้บริหาร</option>
                  <option value="evaluator">8. ผู้ประเมินภายนอก</option>
                </select>
              </div>
            </div>
          </div>

          {/* Members Table */}
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#5C1D8D' }}>กำลังดาวน์โหลดข้อมูลสมาชิกและบทบาท...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#827891' }}>
              ไม่พบรายชื่อสมาชิกที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            <div className="admin-table-container card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>อีเมลผู้ใช้งาน</th>
                    <th>สังกัด / ห้องเรียน</th>
                    <th>บทบาทในระบบ (คลิกเพื่อเปลี่ยนสิทธิ์)</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userObj, idx) => {
                    const currentRole = ROLE_OPTIONS.find(r => r.value === userObj.role) || ROLE_OPTIONS[4];
                    const isUpdating = updatingUserId === userObj.id;

                    return (
                      <tr key={userObj.id || idx} style={{ borderBottom: '1px solid #F0EDF3' }}>
                        <td style={{ textAlign: 'center', color: '#827891', fontSize: '0.8rem' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1F1929', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {userObj.role === 'admin' && <span>👑</span>}
                            {userObj.name}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.84rem', color: '#584F66' }}>{userObj.email}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#6E647D' }}>{userObj.classroom || '-'}</span>
                        </td>
                        <td>
                          {/* Role Selection Dropdown (Only Admin can change) */}
                          {userRole === 'admin' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                value={userObj.role}
                                onChange={(e) => handleRoleChange(userObj.id, userObj.email, e.target.value)}
                                disabled={isUpdating}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  ...currentRole.badgeStyle
                                }}
                              >
                                {ROLE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#FFFFFF', color: '#1F1929' }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && <span style={{ fontSize: '0.75rem', color: '#5C1D8D' }}>กำลังบันทึก...</span>}
                            </div>
                          ) : (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-block',
                              ...currentRole.badgeStyle
                            }}>
                              {currentRole.label}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {userRole === 'admin' && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenUserModal(userObj)}
                                className="icon-btn"
                                title="แก้ไขข้อมูลสมาชิก"
                                style={{ width: '28px', height: '28px', backgroundColor: '#F6EEFB' }}
                              >
                                <Edit3 size={13} color="#5C1D8D" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(userObj.id, userObj.email, userObj.name)}
                                className="icon-btn"
                                title="ลบสมาชิก"
                                disabled={userObj.email.toLowerCase() === 'jenprapa@pwtk.ac.th'}
                                style={{ width: '28px', height: '28px', backgroundColor: '#FFF5F5' }}
                              >
                                <Trash2 size={13} color="#D32F2F" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADMINISTRATIVE ORDERS & DOCUMENTS (ORIGINAL) */}
      {/* ======================================================== */}
      {activeAdminTab === 'docs' && (
        <div>
          {loadingDocs ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>กำลังดาวน์โหลดข้อมูลงานบริหารและคำสั่งแต่งตั้ง...</div>
          ) : docsList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              ไม่พบรายการเอกสารในด้านที่ 1
            </div>
          ) : (
            <div className="grid-2">
              {docsList.map(docObj => (
                <div key={docObj.id} className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span className="role-badge role-teacher" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', backgroundColor: 'rgba(186,85,211,0.06)', color: 'var(--color-primary)' }}>
                      {getDocIcon(docObj.document_type)}
                      {docObj.document_type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 บันทึกเมื่อ {docObj.created_at}</span>
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', paddingRight: '60px' }}>
                    {docObj.title}
                  </h4>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, flex: 1, marginBottom: '12px' }}>
                    {docObj.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      👤 <b>ผู้รับผิดชอบ:</b> {docObj.responsible_person || 'คณะทำงาน อพ.สธ.'}
                    </span>

                    {docObj.attachment_url && (
                      <a
                        href={docObj.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {docObj.document_type === 'ภาพกิจกรรม' ? 'ดูรูปภาพ' : 'เปิดเอกสาร'} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {userRole !== 'visitor' && (
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleOpenDocModal(docObj)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-main)' }}>
                        <Edit3 size={12} color="var(--color-primary)" />
                      </button>
                      {userRole === 'admin' && (
                        <button onClick={() => handleDeleteDoc(docObj.id)} className="icon-btn" style={{ width: '28px', height: '28px', backgroundColor: 'var(--bg-main)' }}>
                          <Trash2 size={12} color="var(--color-danger)" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT USER ROLE MODAL */}
      {/* ======================================================== */}
      {isUserModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '16px', border: '1.5px solid #E5CA79' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2A084E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#5C1D8D" />
                {editingUser ? 'แก้ไขข้อมูลและสิทธิ์สมาชิก' : 'เพิ่มสมาชิกใหม่และกำหนดสิทธิ์'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>ชื่อ-นามสกุลจริง</label>
                <input
                  type="text"
                  className="form-control"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="เช่น นายรักชาติ อนุรักษ์ไทย หรือ ครูสมใจ ใฝ่รู้"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>อีเมลผู้ใช้งาน (Email)</label>
                <input
                  type="email"
                  className="form-control"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@pwtk.ac.th หรือ sample@gmail.com"
                  required
                  disabled={editingUser && editingUser.email === 'jenprapa@pwtk.ac.th'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>กำหนดบทบาทในระบบ (Role Assignment)</label>
                <select
                  className="form-control"
                  value={userRoleSelection}
                  onChange={(e) => setUserRoleSelection(e.target.value)}
                  required
                  style={{ fontWeight: 600, color: '#5C1D8D' }}
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>สังกัด / ห้องเรียน (ถ้ามี)</label>
                <input
                  type="text"
                  className="form-control"
                  value={userClassroom}
                  onChange={(e) => setUserClassroom(e.target.value)}
                  placeholder="เช่น ม.4/1, หมวดวิชาวิทยาศาสตร์, คณะกรรมการสถานศึกษา"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-gold" disabled={savingUser}>
                  {savingUser ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสมาชิก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT ADMINISTRATIVE DOCUMENT MODAL */}
      {/* ======================================================== */}
      {isDocModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', borderRadius: '16px', border: '1.5px solid #E5CA79' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {editingDoc ? 'แก้ไขข้อมูลหลักฐานด้านที่ 1' : 'บันทึกหลักฐานบริหารจัดการ (ด้านที่ 1)'}
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDocSubmit}>
              <div className="form-group">
                <label className="form-label">ประเภทเอกสารหลักฐาน</label>
                <select
                  className="form-control"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  {documentTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">หัวข้อ / ชื่อเอกสาร</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น คำสั่งแต่งตั้งภาคเรียนที่ 1/2569"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">คำอธิบายรายละเอียด</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดสาระสำคัญ วัตถุประสงค์ หรือสรุปหัวข้อ..."
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">ผู้รับผิดชอบ / คณะทำงาน</label>
                <input
                  type="text"
                  className="form-control"
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder="เช่น ครูเจนประภา เรือนคำ, ผู้อำนวยการโรงเรียน"
                  required
                />
              </div>

              <div className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <label className="form-label">อัปโหลดไฟล์หลักฐาน ({documentType === 'ภาพกิจกรรม' ? 'รูปภาพ JPG/PNG' : 'เอกสาร PDF'})</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                  <input
                    type="file"
                    accept={documentType === 'ภาพกิจกรรม' ? 'image/*' : '.pdf'}
                    id="admin-file-upload"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="admin-file-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> เลือกไฟล์
                  </label>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {uploadFile ? uploadFile.name : attachmentUrl ? 'มีลิงก์ข้อมูลแนบเดิมแล้ว' : 'ยังไม่ได้เลือกไฟล์'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="btn btn-secondary">ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={savingDoc}>
                  {savingDoc ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

