import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import FirebaseWizard from './components/FirebaseWizard';
import Dashboard from './pages/Dashboard';
import PlantRegistry from './pages/PlantRegistry';
import K7003Docs from './pages/K7003Docs';
import EvidenceVault from './pages/EvidenceVault';
import Reports from './pages/Reports';
import PublicPortal from './pages/PublicPortal';
import TeacherLearning from './pages/TeacherLearning';
import BannerConfig from './pages/BannerConfig';
import PlantStudy from './pages/PlantStudy';
import SchoolAssessmentK7009 from './pages/SchoolAssessmentK7009';
import StudentPortfolios from './pages/StudentPortfolios';
import OnlineWorksheets from './pages/OnlineWorksheets';
import EvidenceMapping from './pages/EvidenceMapping';
import SatisfactionSurveyPopup from './components/SatisfactionSurveyPopup';
import ReadinessCheck from './pages/ReadinessCheck';
import UserProfile from './pages/UserProfile';
import LocalResources from './pages/LocalResources';
import AdminManagement from './pages/AdminManagement';
import ElementsManagement from './pages/ElementsManagement';
import SystemAudit from './pages/SystemAudit';
import PlantTagGenerator from './pages/PlantTagGenerator';
import { db, isFirebaseConfigured, auth } from './firebaseClient';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { X, MapPin, Tag, Shield, Calendar, BookOpen, AlertTriangle, Key } from 'lucide-react';

// Central menuItems routing configuration to map mode and allowed roles
const menuItems = [
  { id: 'dashboard', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'banners-config', mode: 'internal', roles: ['admin'] },
  { id: 'plant-registry', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'plant-tags', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'k7003-docs', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
  { id: 'student-portfolios', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
  { id: 'online-worksheets', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'evaluator'] },
  { id: 'plant-study', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'executive', 'evaluator'] },
  { id: 'teacher-learning', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] },
  { id: 'evidence-vault', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'settings', mode: 'internal', roles: ['admin'] },
  { id: 'profile', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'local-resources', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'student', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'admin-management', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'elements-management', mode: 'internal', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },

  { id: 'k7009-form', mode: 'evaluation', roles: ['admin', 'rspg_board', 'executive', 'evaluator'] },
  { id: 'system-audit', mode: 'evaluation', roles: ['admin', 'rspg_board', 'executive', 'evaluator'] },
  { id: 'evidence-mapping', mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'doc_officer', 'executive', 'evaluator'] },
  { id: 'readiness-check', mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] },
  { id: 'evaluation-report', mode: 'evaluation', roles: ['admin', 'rspg_board', 'teacher', 'project_advisor', 'executive', 'evaluator'] }
];

export default function App() {
  const [viewMode, setViewMode] = useState('public'); // public | internal | evaluation
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [userRole, setUserRole] = useState('visitor'); // admin | rspg_board | teacher | student | visitor
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured() && auth ? true : false);

  // Authentication States
  const [authMode, setAuthMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('sample@email.com');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole] = useState('student');
  const [classroom, setClassroom] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspect plant detail modal state
  const [inspectedPlant, setInspectedPlant] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [inspectedPlantK7, setInspectedPlantK7] = useState(null);
  const [inspectedLogs, setInspectedLogs] = useState([]);

  // Listen to switch to internal view event from public portal button
  useEffect(() => {
    const handleSwitchInternal = () => {
      setViewMode('internal');
    };
    window.addEventListener('switch-to-internal', handleSwitchInternal);
    return () => {
      window.removeEventListener('switch-to-internal', handleSwitchInternal);
    };
  }, []);

  // Load login session from Firebase Auth onAuthStateChanged
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const emailClean = firebaseUser.email.trim().toLowerCase();
          const docRef = doc(db, 'users', emailClean);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role;

            const validRoles = [
              'admin', 'rspg_board', 'teacher', 'project_advisor',
              'student', 'doc_officer', 'executive', 'evaluator'
            ];

            if (validRoles.includes(role)) {
              setUserRole(role);
              setIsLoggedIn(true);
              setViewMode('internal');
            } else {
              console.error('Unauthorized role in user profile:', role);
              alert('บทบาทผู้ใช้งานไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ');
              await signOut(auth);
              setIsLoggedIn(false);
              setUserRole('visitor');
            }
          } else {
            console.error('No Firestore user document found for authenticated user:', emailClean);
            alert('ไม่พบบัญชีประวัติผู้ใช้งานในฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ');
            await signOut(auth);
            setIsLoggedIn(false);
            setUserRole('visitor');
          }
        } catch (err) {
          console.error('Error fetching auth user profile:', err);
          alert('เกิดข้อผิดพลาดในการโหลดข้อมูลสิทธิ์การเข้าใช้งาน: ' + err.message);
          await signOut(auth);
          setIsLoggedIn(false);
          setUserRole('visitor');
        }
      } else {
        setIsLoggedIn(false);
        setUserRole('visitor');
        // Switch back to public if user is logged out and currently in a protected mode
        setViewMode(prev => (prev === 'internal' || prev === 'evaluation') ? 'public' : prev);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 10 minutes Satisfaction Survey Timer
  useEffect(() => {
    const surveyTimeout = 10 * 60 * 1000; // 10 minutes
    const isCompleted = localStorage.getItem('rspg_survey_submitted_or_dismissed');
    if (isCompleted === 'true') return;

    let sessionStart = sessionStorage.getItem('rspg_session_start_time');
    if (!sessionStart) {
      sessionStart = Date.now().toString();
      sessionStorage.setItem('rspg_session_start_time', sessionStart);
    }

    const elapsed = Date.now() - parseInt(sessionStart, 10);
    const remaining = surveyTimeout - elapsed;

    let timer;
    if (remaining <= 0) {
      setTimeout(() => {
        setShowSurvey(true);
      }, 0);
    } else {
      timer = setTimeout(() => {
        setShowSurvey(true);
      }, remaining);
    }

    // Dev bypass test mode using ?survey_test=true
    if (window.location.search.includes('survey_test=true')) {
      const testTimer = setTimeout(() => {
        setShowSurvey(true);
      }, 3000);
      return () => {
        clearTimeout(testTimer);
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Sync / Migrate welcome text and banner_url in Firestore document
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) return;
    async function syncDatabaseWelcomeText() {
      try {
        const docRef = doc(db, 'rspg_banners', 'pai_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          let updates = {};
          if (data.welcome_text && data.welcome_text.includes('ให้คงอยู่')) {
            updates.welcome_text = data.welcome_text.replace('ให้คงอยู่', '').trim();
          }
          if (!data.banner_url || data.banner_url === '-' || data.banner_url.includes('unsplash.com')) {
            updates.banner_url = '/school-banner.jpg';
          }
          if (Object.keys(updates).length > 0) {
            await updateDoc(docRef, updates);
          }
        }
      } catch (err) {
        console.error('Error syncing welcome text and banner_url:', err);
      }
    }
    syncDatabaseWelcomeText();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode !== 'public' && userRole === 'admin') {
        const savedChoice = localStorage.getItem('rspg_admin_theme_choice');
        if (savedChoice) {
          setTheme(savedChoice);
        } else {
          setTheme('dark'); // Default to dark for admin
        }
      } else {
        setTheme('light');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [viewMode, userRole]);

  // Apply Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Set dynamic theme colors based on user role to make them distinct from admin
  useEffect(() => {
    const root = document.documentElement;
    if (viewMode === 'public') {
      // Public view uses custom cream and lavender theme
      root.style.setProperty('--color-primary', '#8B5CF6');
      root.style.setProperty('--color-primary-hover', '#7C3AED');
      root.style.setProperty('--bg-sidebar-active', '#8B5CF6');
      return;
    }

    // Role-specific colors for internal management panel
    switch (userRole) {
      case 'admin':
        // Admin uses Purple
        root.style.setProperty('--color-primary', '#BA55D3');
        root.style.setProperty('--color-primary-hover', '#9932CC');
        root.style.setProperty('--bg-sidebar-active', '#BA55D3');
        break;
      case 'teacher':
      case 'project_advisor':
        // Teachers use Green
        root.style.setProperty('--color-primary', '#2E7D32');
        root.style.setProperty('--color-primary-hover', '#1b5e20');
        root.style.setProperty('--bg-sidebar-active', '#2E7D32');
        break;
      case 'student':
        // Students use Blue
        root.style.setProperty('--color-primary', '#0288D1');
        root.style.setProperty('--color-primary-hover', '#01579b');
        root.style.setProperty('--bg-sidebar-active', '#0288D1');
        break;
      case 'rspg_board':
      case 'executive':
      case 'evaluator':
        // Board / Executives / Evaluators use Gold/Amber
        root.style.setProperty('--color-primary', '#FFC107');
        root.style.setProperty('--color-primary-hover', '#FFB300');
        root.style.setProperty('--bg-sidebar-active', '#FFC107');
        break;
      case 'doc_officer':
        // Document officers use Teal
        root.style.setProperty('--color-primary', '#008080');
        root.style.setProperty('--color-primary-hover', '#006666');
        root.style.setProperty('--bg-sidebar-active', '#008080');
        break;
      default:
        // Default fallback (Visitor / General)
        root.style.setProperty('--color-primary', '#7E6C84');
        root.style.setProperty('--color-primary-hover', '#33253a');
        root.style.setProperty('--bg-sidebar-active', '#7E6C84');
        break;
    }
  }, [userRole, viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode === 'public') return;
      const allowed = menuItems.filter(item => item.mode === viewMode && item.roles.includes(userRole));
      const allowedIds = allowed.map(i => i.id);
      if (!allowedIds.includes(activeTab)) {
        setActiveTab(allowedIds[0] || 'dashboard');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [viewMode, userRole, activeTab]);

  const handleInspectPlant = useCallback(async (plant) => {
    setInspectedPlant(plant);
    setInspectedPlantK7(null);
    setInspectedLogs([]);

    if (isFirebaseConfigured() && db) {
      try {
        const k7Query = query(collection(db, 'k7_worksheets'), where('plant_id', '==', plant.id));
        const k7Snap = await getDocs(k7Query);
        if (!k7Snap.empty) {
          const firstK7 = k7Snap.docs[0];
          setInspectedPlantK7({ id: firstK7.id, ...firstK7.data() });
        }

        const logsQuery = query(
          collection(db, 'plant_logs'),
          where('plant_id', '==', plant.id),
          orderBy('created_at', 'desc')
        );
        const logsSnap = await getDocs(logsQuery);
        const logsList = [];
        logsSnap.forEach(docSnap => {
          logsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setInspectedLogs(logsList);
      } catch (err) {
        console.error('Error fetching plant details:', err);
      }
    }
  }, []);

  const fetchAndInspectPlant = useCallback(async (id) => {
    try {
      const docRef = doc(db, 'plants', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        handleInspectPlant({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (err) {
      console.error(err);
    }
  }, [handleInspectPlant]);

  // Handle opening deep linked plants from QR codes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plantId = params.get('plantId');
    if (plantId && isFirebaseConfigured()) {
      const timer = setTimeout(() => {
        fetchAndInspectPlant(plantId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fetchAndInspectPlant]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    if (!isFirebaseConfigured() || !auth) {
      setAuthError('ระบบยืนยันตัวตนยังไม่ได้ตั้งค่าการเชื่อมต่อในหน้าตั้งค่า');
      setIsSubmitting(false);
      return;
    }

    const emailClean = email.trim().toLowerCase();

    if (authMode === 'signup') {
      if (password.length < 6) {
        setAuthError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        setIsSubmitting(false);
        return;
      }

      try {
        // 1. Create user in Firebase Authentication
        await createUserWithEmailAndPassword(auth, emailClean, password);

        // 2. Write profile document in Firestore (role is strictly student)
        const docRef = doc(db, 'users', emailClean);
        const payload = {
          email: emailClean,
          name: fullName,
          role: 'student', // Strictly forced in frontend code
          classroom: classroom,
          created_at: new Date().toISOString()
        };

        await setDoc(docRef, payload);
        setAuthSuccess('สมัครสมาชิกบัญชีผู้ใช้สำเร็จ! กำลังสลับหน้าจอเข้าสู่ระบบ...');
        setTimeout(() => {
          setAuthMode('login');
          setAuthSuccess('');
          setPassword('');
        }, 1500);
      } catch (err) {
        console.error('Sign-up error:', err);
        let localizedError;
        if (err.code === 'auth/email-already-in-use') {
          localizedError = 'อีเมลนี้ได้รับการลงทะเบียนเป็นผู้ใช้แล้ว';
        } else if (err.code === 'auth/invalid-email') {
          localizedError = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (err.code === 'auth/weak-password') {
          localizedError = 'รหัสผ่านอ่อนแอเกินไป รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        } else if (err.code === 'auth/network-request-failed') {
          localizedError = 'การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต';
        } else {
          localizedError = err.message;
        }
        setAuthError(localizedError);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        // Login via Firebase Authentication
        await signInWithEmailAndPassword(auth, emailClean, password);
        setAuthSuccess('เข้าสู่ระบบสำเร็จ!');
      } catch (err) {
        console.error('Login error:', err);
        let localizedError;
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          localizedError = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองอีกครั้ง';
        } else if (err.code === 'auth/invalid-email') {
          localizedError = 'รูปแบบอีเมลไม่ถูกต้อง';
        } else if (err.code === 'auth/user-disabled') {
          localizedError = 'บัญชีผู้ใช้นี้ถูกปิดใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ';
        } else if (err.code === 'auth/too-many-requests') {
          localizedError = 'มีการส่งคำร้องขอมากเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง';
        } else if (err.code === 'auth/network-request-failed') {
          localizedError = 'การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต';
        } else {
          localizedError = err.message;
        }
        setAuthError(localizedError);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleForgotVerifyEmail = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    if (!isFirebaseConfigured() || !auth) {
      setAuthError('ระบบยืนยันตัวตนยังไม่ได้ตั้งค่า');
      setIsSubmitting(false);
      return;
    }

    const emailClean = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, emailClean);
      // We display generic success message to prevent user enumeration
      setAuthSuccess('หากอีเมลนี้มีบัญชีอยู่ในระบบ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้ทางอีเมลเรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความของท่าน');
      setEmail('');
    } catch (err) {
      console.error('Password reset request error:', err);
      if (err.code === 'auth/invalid-email') {
        setAuthError('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (err.code === 'auth/network-request-failed') {
        setAuthError('การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต');
      } else {
        // Fallback to generic message to prevent account enumeration
        setAuthSuccess('หากอีเมลนี้มีบัญชีอยู่ในระบบ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้ทางอีเมลเรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความของท่าน');
        setEmail('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      setIsLoggedIn(false);
      setUserRole('visitor');
      setViewMode('public');
      localStorage.removeItem('rspg_user_display_cache');
      setEmail('');
      setPassword('');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      if (viewMode !== 'public' && userRole === 'admin') {
        localStorage.setItem('rspg_admin_theme_choice', nextTheme);
      }
      return nextTheme;
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userRole={userRole} onSelectPlant={handleInspectPlant} setActiveTab={setActiveTab} />;
      case 'banners-config':
        return <BannerConfig userRole={userRole} />;
      case 'plant-registry':
        return <PlantRegistry onSelectPlant={handleInspectPlant} onPrintLabel={() => setActiveTab('evaluation-report')} userRole={userRole} />;
      case 'plant-tags':
        return <PlantTagGenerator userRole={userRole} />;
      case 'k7003-docs':
        return <K7003Docs userRole={userRole} />;
      case 'student-portfolios':
        return <StudentPortfolios userRole={userRole} />;
      case 'online-worksheets':
        return <OnlineWorksheets userRole={userRole} />;
      case 'plant-study':
        return <PlantStudy userRole={userRole} />;
      case 'teacher-learning':
        return <TeacherLearning userRole={userRole} />;
      case 'evidence-vault':
        return <EvidenceVault userRole={userRole} />;
      case 'k7009-form':
        return <SchoolAssessmentK7009 userRole={userRole} />;
      case 'evidence-mapping':
        return <EvidenceMapping userRole={userRole} />;
      case 'readiness-check':
        return <ReadinessCheck userRole={userRole} />;
      case 'evaluation-report':
        return <Reports userRole={userRole} />;
      case 'settings':
        return <FirebaseWizard />;
      case 'profile':
        return <UserProfile />;
      case 'local-resources':
        return <LocalResources userRole={userRole} />;
      case 'admin-management':
        return <AdminManagement userRole={userRole} />;
      case 'elements-management':
        return <ElementsManagement userRole={userRole} />;
      case 'system-audit':
        return <SystemAudit />;
      default:
        return <Dashboard userRole={userRole} onSelectPlant={handleInspectPlant} setActiveTab={setActiveTab} />;
    }
  };

  const defaultImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%232E7D32" opacity="0.1"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="40">🌿</text></svg>`;

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--bg-sidebar)', borderTop: '4px solid var(--color-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'Outfit, Inter, Sans-Serif' }}>กำลังตรวจสอบข้อมูลการเข้าสู่ระบบ...</span>
      </div>
    );
  }

  return (
    <div className={`app-container ${viewMode === 'public' ? 'public-portal-theme' : ''}`}>

      {/* RENDER PUBLIC PORTAL MODE */}
      {viewMode === 'public' ? (
        <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar activeTab="" userRole="visitor" viewMode={viewMode} setViewMode={setViewMode} />
          <main style={{ flex: 1, backgroundColor: 'var(--bg-main)' }}>
            <PublicPortal
              onSelectPlant={handleInspectPlant}
              isLoggedIn={isLoggedIn}
              userRole={userRole}
              setActiveTab={setActiveTab}
              setViewMode={setViewMode}
            />
          </main>
        </div>
      ) : (
        /* RENDER INTERNAL MANAGEMENT PANEL MODE */
        <>
          {!isLoggedIn ? (
            /* Login Screen */
            <div style={{
              display: 'flex',
              width: '100%',
              minHeight: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-main)',
              backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(186, 85, 211, 0.05) 0%, transparent 40%)'
            }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              minHeight: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-main)',
              backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(186, 85, 211, 0.05) 0%, transparent 40%)',
              padding: '1.5rem'
            }}>
              <div className="card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '105px',
                    height: '105px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
                    padding: '0px',
                    overflow: 'hidden'
                  }}>
                    <img src="./rspg-logo.png" alt="อพ.สธ. ปายวิทยาคาร" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <img
                    src="./school-logo.png"
                    alt="โรงเรียนปายวิทยาคาร"
                    style={{
                      width: '85px',
                      height: '85px',
                      objectFit: 'contain',
                      boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)'
                    }}
                  />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', textAlign: 'center', margin: '0 0 4px 0' }}>ระบบงานสวนพฤกษศาสตร์ อพ.สธ.</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
                  โรงเรียนปายวิทยาคาร จังหวัดแม่ฮ่องสอน
                </p>

                {/* Tab selector */}
                {authMode !== 'forgot' && (
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: authMode === 'login' ? 'var(--color-primary)' : 'transparent',
                        color: authMode === 'login' ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔑 เข้าสู่ระบบ
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: authMode === 'signup' ? 'var(--color-primary)' : 'transparent',
                        color: authMode === 'signup' ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                    >
                      📝 สมัครสมาชิก
                    </button>
                  </div>
                )}

                {/* Error/Success alerts */}
                {authError && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(211,47,47,0.06)', border: '1px solid rgba(211,47,47,0.15)', color: 'var(--color-danger)', fontSize: '0.78rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠ {authError}</span>
                  </div>
                )}
                {authSuccess && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(46,125,50,0.06)', border: '1px solid rgba(46,125,50,0.15)', color: 'var(--color-success)', fontSize: '0.78rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓ {authSuccess}</span>
                  </div>
                )}

                {/* Form fields */}
                {authMode === 'forgot' ? (
                  <form onSubmit={handleForgotVerifyEmail}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1rem', textAlign: 'center' }}>
                      🔑 รีเซ็ตรหัสผ่านใหม่
                    </h3>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>ระบุอีเมลผู้ใช้งานที่ลงทะเบียนไว้</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="เช่น jenprapa@pwtk.ac.th"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                      style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                    >
                      <Key size={14} />
                      <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</span>
                    </button>

                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        ย้อนกลับไปหน้าเข้าสู่ระบบ
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleAuthSubmit}>
                    {authMode === 'signup' && (
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>ชื่อ-นามสกุลจริง</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="เช่น ครูวิทยาวุฒิ ดีเลิศ"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>อีเมลผู้ใช้งาน</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="sample@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>รหัสผ่าน</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="ป้อนรหัสผ่านของคุณ"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>

                    {authMode === 'login' && (
                      <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        <button
                          type="button"
                          onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}
                          style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          ลืมรหัสผ่าน?
                        </button>
                      </div>
                    )}

                    {authMode === 'signup' && (
                      <>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>เลือกบทบาทในระบบ</label>
                          <select
                            className="form-control"
                            value="student"
                            disabled
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-main)', cursor: 'not-allowed' }}
                          >
                            <option value="student">5. นักเรียน (Student)</option>
                          </select>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                            *หมายเหตุ: สิทธิ์สมัครสมาชิกตั้งต้นคือ "นักเรียน" เท่านั้น สำหรับอาจารย์และบทบาทอื่น กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์ใช้งานในภายหลัง
                          </p>
                        </div>

                        {selectedRole === 'student' && (
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>ห้องเรียน (สำหรับนักเรียน)</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="เช่น ม.3/2 หรือ ม.6/1"
                              value={classroom}
                              onChange={(e) => setClassroom(e.target.value)}
                              required
                              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                      style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}
                    >
                      <Key size={14} />
                      <span>{isSubmitting ? 'กำลังดำเนินการ...' : authMode === 'login' ? 'เข้าสู่ระบบ' : 'ลงทะเบียนสมัครสมาชิก'}</span>
                    </button>
                  </form>
                )}

              </div>
            </div>
            </div>
          ) : (
            /* Inside Administration Shell */
            <>
              <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
                toggleTheme={toggleTheme}
                userRole={userRole}
                setUserRole={setUserRole}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onLogout={handleLogout}
              />

              <div className="main-content">
                <Navbar activeTab={activeTab} userRole={userRole} viewMode={viewMode} setViewMode={setViewMode} onLogout={handleLogout} />

                <main className="content-body">
                  {renderTabContent()}
                </main>
              </div>
            </>
          )}
        </>
      )}

      {/* Deep Inspection Modal */}
      {inspectedPlant && (
        <div className="modal-overlay" onClick={() => setInspectedPlant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                🔍 ข้อมูลการจำแนกพืช: {inspectedPlant.thai_name}
              </h3>
              <button onClick={() => setInspectedPlant(null)} className="modal-close">
                <X size={24} />
              </button>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
              <div>
                <img
                  src={inspectedPlant.image_url || defaultImage}
                  alt={inspectedPlant.thai_name}
                  style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={14} /> <b>รหัสพรรณไม้:</b> {inspectedPlant.plant_code}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> <b>พิกัด:</b> {inspectedPlant.planting_location}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> <b>วันที่บันทึก:</b> {inspectedPlant.survey_date}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} /> <b>ผู้บันทึก:</b> {inspectedPlant.surveyor}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ชื่อวิทยาศาสตร์ / วงศ์</h4>
                  <p style={{ fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 600, color: 'var(--color-nature)', margin: 0 }}>
                    {inspectedPlant.scientific_name || 'ไม่ระบุ'}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                    วงศ์: {inspectedPlant.family_name || 'ไม่ระบุ'}
                  </p>
                </div>

                <div className="grid-2" style={{ gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ลักษณะวิสัย</h4>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{inspectedPlant.habit || inspectedPlant.plant_type || 'ไม้ต้น'}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>สถานะความปลอดภัย</h4>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-primary)' }}>{inspectedPlant.status || 'สมบูรณ์'}</p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>รายละเอียดคำอธิบาย</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.4, backgroundColor: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                    {inspectedPlant.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </p>
                </div>
              </div>
            </div>

            {/* K.7-003 analysis inside modal */}
            <div style={{ marginTop: '1.5rem', borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-nature)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={18} /> ข้อมูลวิเคราะห์สัณฐานวิทยา (ก.7-003 รายต้น)
              </h4>

              {inspectedPlantK7 ? (
                <div>
                  {/* Photo grid of 6 points */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '1.25rem' }}>
                    {[
                      { l: 'วิสัย', u: inspectedPlantK7.habit_photo_url },
                      { l: 'ลำต้น', u: inspectedPlantK7.stem_photo_url },
                      { l: 'ใบ', u: inspectedPlantK7.leaf_photo_url },
                      { l: 'ดอก', u: inspectedPlantK7.flower_photo_url },
                      { l: 'ผล', u: inspectedPlantK7.fruit_photo_url },
                      { l: 'เมล็ด', u: inspectedPlantK7.seed_photo_url }
                    ].map((ph, idx) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)', marginBottom: '2px' }}>{ph.l}</span>
                        {ph.u ? (
                          <img src={ph.u} alt={ph.l} style={{ width: '100%', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '4px', fontSize: '0.55rem', color: 'var(--text-muted)' }}>ไม่มี</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div><b>ลำต้นและราก:</b> {inspectedPlantK7.stem_detail || '-'}</div>
                      <div><b>ลักษณะใบ:</b> {inspectedPlantK7.leaf_detail || '-'}</div>
                      <div><b>ลักษณะดอก:</b> {inspectedPlantK7.flower_detail || '-'}</div>
                      <div><b>ผลและเมล็ด:</b> {inspectedPlantK7.fruit_detail || '-'} / {inspectedPlantK7.seed_detail || '-'}</div>

                      <div style={{ padding: '8px', backgroundColor: 'var(--bg-nature-soft)', borderRadius: '6px', borderLeft: '3px solid var(--color-nature)', marginTop: '6px' }}>
                        <div><b>ประโยชน์:</b> {inspectedPlantK7.botanical_data || '-'}</div>
                        <div><b>ภูมิปัญญาท้องถิ่น:</b> {inspectedPlantK7.local_wisdom || '-'}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div><b>ผู้บันทึก:</b> {inspectedPlantK7.recorder || '-'}</div>
                      <div><b>ห้องเรียน:</b> {inspectedPlantK7.classroom || '-'}</div>
                      <div style={{ marginTop: '5px' }}><b>ครูผู้ตรวจ:</b> {inspectedPlantK7.checker_teacher || '-'}</div>
                      <div style={{ fontWeight: 'bold', color: inspectedPlantK7.status === 'ผ่าน' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        สถานะ: {inspectedPlantK7.status || 'รอตรวจ'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ยังไม่มีการสำรวจข้อมูลวิเคราะห์สัณฐานวิทยาสำหรับต้นไม้นี้
                </p>
              )}
            </div>

            {/* Change logs */}
            {inspectedLogs.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} /> บันทึกประวัติบำรุงรักษาและการแจ้งเตือน
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inspectedLogs.map(log => (
                    <div key={log.id} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 600, marginRight: '8px', color: log.log_type === 'change_alert' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {log.log_type === 'change_alert' ? 'เปลี่ยนสถานะ' : 'ดูแลรักษา'}
                        </span>
                        <span>{log.description}</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>{log.created_at?.split('T')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showSurvey && <SatisfactionSurveyPopup onClose={() => setShowSurvey(false)} userRole={userRole} />}
    </div>
  );
}
