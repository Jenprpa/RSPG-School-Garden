import React, { useState } from 'react';
import { 
  LayoutDashboard, FileSpreadsheet, Layers, BookOpen, 
  ClipboardList, Archive, Award, Shield, Menu, X, Settings, Image, CheckSquare, Wrench, RefreshCw, User, Map, Landmark,
  ShieldCheck, ShieldAlert, Tag
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, userRole, setUserRole, viewMode, setViewMode, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    // Mode 2: Internal Operations
    { id: 'dashboard', name: '1. แดชบอร์ดดำเนินงาน', icon: LayoutDashboard, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'admin-management', name: '2. การบริหารจัดการ (ด้านที่ 1)', icon: ShieldCheck, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'elements-management', name: '3. การดำเนินงาน 5 องค์ประกอบ', icon: Layers, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'banners-config', name: '4. Website Banner', icon: Image, mode: 'internal', roles: ['admin'] },
    { id: 'plant-registry', name: '5. ทะเบียนพรรณไม้', icon: ClipboardList, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'plant-tags', name: '6. ออกแบบป้ายชื่อ อพ.สธ.', icon: Tag, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'k7003-docs', name: '7. เอกสาร ก.7-003', icon: BookOpen, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
    { id: 'student-portfolios', name: '8. ผลงานนักเรียน ก.7-003', icon: Award, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
    { id: 'online-worksheets', name: '9. ใบงานออนไลน์ อพ.สธ.', icon: FileSpreadsheet, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
    { id: 'plant-study', name: '10. พืชศึกษา (องค์ประกอบที่ 3)', icon: Layers, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'executive', 'evaluator'] },
    { id: 'teacher-learning', name: '11. การจัดการเรียนรู้', icon: Award, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] },
    { id: 'local-resources', name: '12. ฐานทรัพยากรท้องถิ่น', icon: Map, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'evidence-vault', name: '13. คลังหลักฐาน', icon: Archive, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'settings', name: '14. ตั้งค่าระบบ', icon: Settings, mode: 'internal', roles: ['admin'] },
    { id: 'profile', name: '15. ข้อมูลส่วนตัว', icon: User, mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },

    // Mode 3: Evaluation
    { id: 'k7009-form', name: '1. แบบประเมิน ก.7-009', icon: FileSpreadsheet, mode: 'evaluation', roles: ['admin', 'rspg_board', 'executive', 'evaluator'] },
    { id: 'evidence-mapping', name: '2. แผนผังหลักฐาน (Mapping)', icon: Layers, mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
    { id: 'readiness-check', name: '3. ตรวจสอบความพร้อม (Audit)', icon: CheckSquare, mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] },
    { id: 'system-audit', name: '4. ตรวจระบบและจุดบกพร่อง', icon: ShieldAlert, mode: 'evaluation', roles: ['admin', 'rspg_board', 'executive', 'evaluator'] },
    { id: 'evaluation-report', name: '5. รายงานและส่งออก', icon: FileSpreadsheet, mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] }
  ];

  // Filter items based on user role and active viewMode
  const displayItems = menuItems.filter(item => item.roles.includes(userRole) && item.mode === (viewMode === 'public' ? 'internal' : viewMode));

  const roles = [
    { id: 'admin', name: '1. ผู้ดูแลระบบ (Admin)' },
    { id: 'rspg_board', name: '2. คณะกรรมการ อพ.สธ.' },
    { id: 'teacher', name: '3. ครูผู้สอน' },
    { id: 'project_advisor', name: '4. ครูที่ปรึกษาโครงงาน' },
    { id: 'student', name: '5. นักเรียน' },
    { id: 'doc_officer', name: '6. เจ้าหน้าที่งานเอกสาร' },
    { id: 'executive', name: '7. ผู้บริหาร (ผอ./รอง ผอ.)' },
    { id: 'evaluator', name: '8. กรรมการประเมิน (Read-Only)' }
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div style={{
        display: 'none',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-sidebar)',
        color: '#fff',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 110,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }} className="mobile-only-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0px', boxShadow: '0 0 5px rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <img src="/rspg-logo.png" alt="อพ.สธ. ปายวิทยาคาร" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <img src="/school-logo.png" alt="โรงเรียนปายวิทยาคาร" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-gold)' }}>ปายวิทยาคาร อพ.สธ.</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* CSS Helper for Mobile Layout */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-only-header {
            display: flex !important;
          }
          .sidebar {
            position: fixed !important;
            top: 50px !important;
            left: 0 !important;
            height: calc(100vh - 50px) !important;
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
            width: 280px !important;
            transition: transform 0.3s ease !important;
            z-index: 105 !important;
          }
        }
      `}</style>

      {/* Main Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center', padding: '1.25rem 1rem' }}>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ 
              width: '95px', 
              height: '95px', 
              backgroundColor: '#fff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
              padding: '0px',
              overflow: 'hidden'
            }}>
              <img src="/rspg-logo.png" alt="อพ.สธ. Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <img 
              src="/school-logo.png" 
              alt="โรงเรียนปายวิทยาคาร" 
              style={{ 
                width: '75px', 
                height: '75px', 
                objectFit: 'contain', 
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)'
              }} 
            />
          </div>
          <div>
            <h1 className="sidebar-title" style={{ fontSize: '1.2rem', color: 'var(--color-gold)', fontWeight: 'bold', margin: 0 }}>ปายวิทยาคาร</h1>
            <p className="sidebar-subtitle" style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>งานสวนพฤกษศาสตร์ อพ.สธ.</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => {
                setViewMode('internal');
                const allowedTabs = menuItems.filter(item => item.roles.includes(userRole) && item.mode === 'internal').map(i => i.id);
                if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
                  setActiveTab(allowedTabs[0]);
                }
              }}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: viewMode === 'internal' ? 'var(--color-primary)' : 'transparent',
                color: '#fff',
                transition: 'all 0.2s'
              }}
            >
              🛠️ ดำเนินงาน
            </button>
            <button
              onClick={() => {
                setViewMode('evaluation');
                const allowedTabs = menuItems.filter(item => item.roles.includes(userRole) && item.mode === 'evaluation').map(i => i.id);
                if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
                  setActiveTab(allowedTabs[0]);
                }
              }}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: viewMode === 'evaluation' ? 'var(--color-primary)' : 'transparent',
                color: '#fff',
                transition: 'all 0.2s'
              }}
            >
              🎓 ประเมินผล
            </button>
          </div>
        </div>

        {/* User Role Quick Switcher */}
        {userRole === 'admin' && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-gold)', marginBottom: '6px', fontWeight: 600 }}>
              <Shield size={12} /> สลับบทบาทผู้ใช้ (Simulated)
            </div>
            <select 
              value={userRole} 
              onChange={(e) => {
                setUserRole(e.target.value);
                // Set fallback tab if selected tab is not allowed for the new role in current mode
                const allowedTabs = menuItems.filter(item => item.roles.includes(e.target.value) && item.mode === (viewMode === 'public' ? 'internal' : viewMode)).map(i => i.id);
                if (!allowedTabs.includes(activeTab)) {
                  setActiveTab(allowedTabs[0] || 'dashboard');
                }
              }}
              style={{
                width: '100%',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: '#fff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id} style={{ color: '#000' }}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="sidebar-menu">
          {displayItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                <Icon className="menu-item-icon" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {/* Admin Light/Dark Mode Switcher */}
            {userRole === 'admin' && (
              <button
                onClick={toggleTheme}
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
              >
                {theme === 'dark' ? '☀️ โหมดสว่าง (Light Mode)' : '🌙 โหมดมืด (Dark Mode)'}
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>โรงเรียนปายวิทยาคาร v2.0</span>
            </div>
            {onLogout && (
              <button 
                onClick={onLogout} 
                style={{
                  border: '1px solid rgba(211,47,47,0.35)',
                  color: '#ff8a80',
                  backgroundColor: 'rgba(211,47,47,0.15)',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
                title="ออกจากระบบ"
              >
                ออกจากระบบ
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
