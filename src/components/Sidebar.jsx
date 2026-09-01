import { useState } from 'react';
import {
  Home, ChevronDown, ChevronRight, Layers, FileText,
  Sprout, BookOpen, Award, Map, Archive,
  Shield, Menu, X, ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [element2Expanded, setElement2Expanded] = useState(true);

  const navItemStyle = (isActive, isNested = false) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: isNested ? '36px' : '40px',
    padding: isNested ? '0 12px 0 28px' : '0 12px',
    borderRadius: '6px',
    border: 'none',
    borderLeft: isActive ? '3px solid #C5931C' : '3px solid transparent',
    backgroundColor: isActive ? '#F6EEFB' : 'transparent',
    color: isActive ? '#5C1D8D' : '#1F1929',
    fontWeight: isActive ? 700 : 500,
    fontSize: isNested ? '13px' : '14px',
    lineHeight: '1.4',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    textDecoration: 'none'
  });

  return (
    <>
      {/* Mobile Top Bar */}
      <div
        style={{
          display: 'none',
          height: '56px',
          padding: '0 16px',
          background: 'linear-gradient(135deg, #2A084E 0%, #45126B 100%)',
          color: '#fff',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 110,
          borderBottom: '1px solid #E5CA79'
        }}
        className="mobile-only-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="./rspg-logo.png" alt="อพ.สธ." style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <img src="./school-logo.png" alt="โรงเรียนปายวิทยาคาร" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>PWTK GARDEN</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .mobile-only-header {
            display: flex !important;
          }
          .sidebar {
            position: fixed !important;
            top: 56px !important;
            left: 0 !important;
            height: calc(100vh - 56px) !important;
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
            width: 260px !important;
            min-width: 260px !important;
            box-shadow: 0 4px 20px rgba(42, 8, 78, 0.3) !important;
            z-index: 105 !important;
          }
        }
      `}</style>

      {/* Main Administrative Sidebar */}
      <aside className="sidebar">
        {/* Deep Royal Purple Header Card */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(145deg, #230642 0%, #3B0D66 50%, #541682 100%)',
            color: '#FFFFFF',
            padding: '20px 16px 18px',
            textAlign: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            borderBottom: '2px solid #C5931C'
          }}
        >
          {/* Subtle Botanical Sketch Overlay Background */}
          <svg
            style={{ position: 'absolute', right: '-15px', bottom: '-20px', width: '130px', height: '130px', opacity: 0.15, pointerEvents: 'none' }}
            viewBox="0 0 100 100"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="1.5"
          >
            <path d="M50 95 C50 60, 20 40, 20 20 C35 20, 50 35, 50 50 C50 35, 65 20, 80 20 C80 40, 50 60, 50 95 Z" />
            <path d="M50 50 Q30 70 15 75" />
            <path d="M50 40 Q70 60 85 65" />
            <circle cx="50" cy="20" r="12" strokeDasharray="3 3" />
          </svg>

          {/* Logos Row */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#FFFFFF', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1.5px solid #E5CA79' }}>
              <img src="./rspg-logo.png" alt="อพ.สธ." style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#FFFFFF', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1.5px solid #E5CA79' }}>
              <img src="./school-logo.png" alt="ปายวิทยาคาร" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF', lineHeight: 1.2 }}>
            PWTK GARDEN
          </div>
          <div style={{ fontSize: '11px', color: '#F3E8C8', marginTop: '4px', fontWeight: 500 }}>
            ศูนย์กลางงานสวนพฤกษศาสตร์
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '1px', fontWeight: 400 }}>
            โรงเรียนปายวิทยาคาร
          </div>
        </div>

        {/* Navigation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

          {/* 1. ภาพรวม (Dashboard) */}
          <button
            onClick={() => { setActiveTab('dashboard'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'dashboard')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Home size={18} color={activeTab === 'dashboard' ? '#5C1D8D' : '#584F66'} />
              <span>ภาพรวม</span>
            </div>
          </button>

          {/* 2. งานสวนพฤกษศาสตร์ */}
          <button
            onClick={() => { setActiveTab('plant-registry'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'plant-registry' || activeTab === 'banners-config')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sprout size={18} color={activeTab === 'plant-registry' ? '#7137A8' : '#6F6A78'} />
              <span>งานสวนพฤกษศาสตร์</span>
            </div>
            <ChevronRight size={15} color="#8E8A95" />
          </button>

          {/* Group 1: ด้านการดำเนินงาน */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8E8A95', letterSpacing: '0.04em', padding: '12px 12px 4px 12px' }}>
            ด้านการดำเนินงาน
          </div>

          {/* ด้านที่ 1 */}
          <button
            onClick={() => { setActiveTab('admin-management'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'admin-management')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <ShieldCheck size={16} color={activeTab === 'admin-management' ? '#7137A8' : '#6F6A78'} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ด้านที่ 1 การบริหารและการจัดการ</span>
            </div>
          </button>

          {/* ด้านที่ 2 (Collapsible parent) */}
          <button
            onClick={() => {
              setActiveTab('elements-management');
              setElement2Expanded(!element2Expanded);
            }}
            style={navItemStyle(activeTab === 'elements-management' || activeTab.startsWith('element-'))}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} color={activeTab === 'elements-management' ? '#7137A8' : '#6F6A78'} />
              <span>ด้านที่ 2 การดำเนินงาน</span>
            </div>
            {element2Expanded ? <ChevronDown size={14} color="#8E8A95" /> : <ChevronRight size={14} color="#8E8A95" />}
          </button>

          {/* Nested องค์ประกอบ 1-5 */}
          {element2Expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <button
                onClick={() => { setActiveTab('plant-tags'); setIsOpen(false); }}
                style={navItemStyle(activeTab === 'plant-tags', true)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>องค์ประกอบที่ 1 จัดทำป้ายชื่อพรรณไม้</span>
              </button>

              <button
                onClick={() => { setActiveTab('plant-registry'); setIsOpen(false); }}
                style={navItemStyle(activeTab === 'plant-registry-sub', true)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>องค์ประกอบที่ 2 รวบรวมพรรณไม้เข้าปลูก</span>
              </button>

              <button
                onClick={() => { setActiveTab('plant-study'); setIsOpen(false); }}
                style={navItemStyle(activeTab === 'plant-study', true)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>องค์ประกอบที่ 3 ศึกษาข้อมูลด้านต่าง ๆ</span>
              </button>

              <button
                onClick={() => { setActiveTab('student-portfolios'); setIsOpen(false); }}
                style={navItemStyle(activeTab === 'student-portfolios', true)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>องค์ประกอบที่ 4 รายงานผลการเรียนรู้</span>
              </button>

              <button
                onClick={() => { setActiveTab('k7003-docs'); setIsOpen(false); }}
                style={navItemStyle(activeTab === 'k7003-docs', true)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>องค์ประกอบที่ 5 นำไปใช้ประโยชน์</span>
              </button>
            </div>
          )}

          {/* ด้านที่ 3 */}
          <button
            onClick={() => { setActiveTab('teacher-learning'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'teacher-learning')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={16} color={activeTab === 'teacher-learning' ? '#7137A8' : '#6F6A78'} />
              <span>ด้านที่ 3 ผลการดำเนินงาน</span>
            </div>
          </button>

          {/* ด้านที่ 4 */}
          <button
            onClick={() => { setActiveTab('readiness-check'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'readiness-check')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} color={activeTab === 'readiness-check' ? '#7137A8' : '#6F6A78'} />
              <span>ด้านที่ 4 ความถูกต้องทางวิชาการ</span>
            </div>
          </button>

          {/* Group 2: สาระการเรียนรู้ */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8E8A95', letterSpacing: '0.04em', padding: '12px 12px 4px 12px' }}>
            สาระการเรียนรู้
          </div>

          <button
            onClick={() => { setActiveTab('online-worksheets'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'online-worksheets')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={16} color={activeTab === 'online-worksheets' ? '#7137A8' : '#6F6A78'} />
              <span>สาระที่ 1 ธรรมชาติแห่งชีวิต</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('evidence-mapping'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'evidence-mapping')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} color={activeTab === 'evidence-mapping' ? '#7137A8' : '#6F6A78'} />
              <span>สาระที่ 2 สรรพสิ่งล้วนพันเกี่ยว</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('local-resources'); setIsOpen(false); }}
            style={navItemStyle(activeTab === 'local-resources')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Map size={16} color={activeTab === 'local-resources' ? '#7137A8' : '#6F6A78'} />
              <span>สาระที่ 3 ประโยชน์แท้แก่มหาชน</span>
            </div>
          </button>

          {/* ตรวจหลักฐาน */}
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => { setActiveTab('evidence-vault'); setIsOpen(false); }}
              style={navItemStyle(activeTab === 'evidence-vault')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Archive size={16} color={activeTab === 'evidence-vault' ? '#7137A8' : '#6F6A78'} />
                <span>ตรวจหลักฐาน</span>
              </div>
            </button>
          </div>

        </div>

        {/* Footer: Version */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #E7E4EA', display: 'flex', alignItems: 'center', gap: '6px', color: '#8E8A95', fontSize: '11px', flexShrink: 0 }}>
          <Shield size={13} color="#8E8A95" />
          <span>เวอร์ชัน 1.0.0</span>
        </div>
      </aside>
    </>
  );
}
