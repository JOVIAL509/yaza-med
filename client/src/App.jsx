import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Atom, BookOpen, Bookmark, Brain, Check, ChevronDown, CircleHelp, Clock3, FlaskConical, GraduationCap, LayoutDashboard, LogOut, Menu, Moon, Search, ShieldCheck, Sigma, Sparkles, Sun, X, Laptop, Languages, LockKeyhole, Mail } from 'lucide-react';
import { api } from './api.js';
import Nyani from './Nyani.jsx';
import AiQuiz from './AiQuiz.jsx';
import { createOfficeViewerUrl } from './officeViewer.js';
import './learningFeatures.css';

const subjects = [
  { name: 'Biology', icon: Brain, color: 'mint', topics: 'Cell biology · Genetics · Human physiology' },
  { name: 'Chemistry', icon: FlaskConical, color: 'coral', topics: 'Atoms · Reactions · Organic chemistry' },
  { name: 'Physics', icon: Atom, color: 'blue', topics: 'Mechanics · Waves · Electricity' },
  { name: 'Mathematics', icon: Sigma, color: 'yellow', topics: 'Algebra · Calculus · Statistics' },
  { name: 'Language', icon: Languages, color: 'purple', topics: 'Reading · Writing · Communication' },
  { name: 'ICT', icon: Laptop, color: 'pink', topics: 'Digital literacy · Data · Computing' }
];
const sections = [
  { slug: 'quick-lesson', name: 'Kuyaza in 15 minutes', small: 'Quick lessons', desc: 'Big ideas, clearly explained in a short study session.', icon: Clock3, tint: 'tint-lime', label: '15 MIN READ' },
  { slug: 'note', name: 'The notes library', small: 'Notes', desc: 'Build a strong foundation, one topic at a time.', icon: BookOpen, tint: 'tint-blue', label: 'STUDY NOTES' },
  { slug: 'practice', name: 'Practice questions', small: 'Practice', desc: 'Test yourself and learn from every answer.', icon: CircleHelp, tint: 'tint-coral', label: 'QUESTION BANK' },
  { slug: 'ai-quiz', name: 'Yaza Med AI quiz', small: 'Yaza Med AI', desc: 'Turn your study materials into a scored practice session.', icon: Brain, tint: 'tint-violet', label: 'AI STUDY' },
  { slug: 'high-yield', name: 'Nyani & high-yield', small: 'High-yield', desc: 'Keep the essential ideas close before exam day.', icon: Sparkles, tint: 'tint-violet', label: 'EXAM FOCUS' }
];
const dashboardFeatures = [
  { title: 'Quick lessons', description: 'Access concise learning materials and important concepts.', icon: Clock3, href: '/learn?type=quick-lesson', tint: 'tint-lime', action: 'Explore lessons' },
  { title: 'Notes', description: 'Open lecture notes, PDFs and study materials by subject.', icon: BookOpen, href: '/learn?type=note', tint: 'tint-blue', action: 'Browse notes' },
  { title: 'Practice questions', description: 'Test your understanding and learn from each answer.', icon: CircleHelp, href: '/learn?type=practice', tint: 'tint-coral', action: 'Start practising' },
  { title: 'AI study quiz', description: 'Create a practice quiz from your own study material.', icon: Brain, href: '/learn?type=ai-quiz', tint: 'tint-violet', action: 'Build a quiz' },
  { title: 'Study resources', description: 'Browse past papers and revision files in the Nyani library.', icon: Sparkles, href: '/nyani', tint: 'tint-lime', action: 'Browse resources' },
  { title: 'My learning progress', description: 'Review your practice activity, accuracy and saved items.', icon: Activity, href: '/dashboard#progress', tint: 'tint-blue', action: 'View progress' }
];
const learningFeatureHref = slug => slug === 'high-yield' ? '/nyani' : `/learn?type=${slug}`;
const officeDocument = name => /\.(docx?|pptx?|xlsx?)$/i.test(name);

function authErrorMessage(error, fallback) {
  if (error.apiHint) return error.apiHint;
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response) {
    return import.meta.env.DEV
      ? 'Could not reach the local API at http://localhost:4000. Start the server and check the MongoDB connection.'
      : 'Could not reach the deployed API. Check VITE_API_URL, the API health endpoint, and the backend CORS origin list.';
  }
  return fallback;
}

function ErrorNotice({ message, onRetry }) {
  return <div className={`error-message${onRetry ? ' load-error' : ''}`} role="alert">
    <span>{message}</span>
    {onRetry&&<button className="button-outline" onClick={onRetry}>Try again</button>}
  </div>;
}

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('yaza-user')); } catch { return null; } });
  const [theme, setTheme] = useState(() => localStorage.getItem('yaza-theme') || 'light');
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('yaza-theme', theme); }, [theme]);
  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, [location.hash, location.pathname]);
  const signOut = () => { localStorage.removeItem('yaza-token'); localStorage.removeItem('yaza-user'); setUser(null); navigate('/'); };
  const login = data => { localStorage.setItem('yaza-token', data.token); localStorage.setItem('yaza-user', JSON.stringify(data.user)); setUser(data.user); navigate('/dashboard'); };
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span><span>yaza<span className="brand-light">med</span></span></Link>
      <nav className="top-links" aria-label="Main navigation">
        <Link to="/#subjects">Subjects</Link>
        <Link to="/#how">How it works</Link>
      </nav>
      <div className="top-actions">
        <button className="theme-btn" aria-label="Toggle theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}</button>
        {user ? <><Link className="top-login" to="/dashboard">My learning</Link><button className="top-signup" onClick={signOut}>Sign out</button></> : <><Link className="top-login" to="/login">Log in</Link><Link className="top-signup" to="/register">Get started <ArrowRight size={18}/></Link></>}
        <button className="mobile-menu" aria-label="Toggle menu" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      </div>
    </header>
    {menu && <nav className="mobile-dropdown" id="mobile-navigation" aria-label="Mobile navigation">
      {dashboardFeatures.map(feature=>{
        const FeatureIcon=feature.icon;
        return <Link key={feature.title} to={feature.href} onClick={()=>setMenu(false)}><FeatureIcon size={20} aria-hidden="true"/><span>{feature.title}</span></Link>;
      })}
      {user ? <Link to="/dashboard" onClick={() => setMenu(false)}>My learning</Link> : <Link to="/login" onClick={() => setMenu(false)}>Log in</Link>}
    </nav>}
    <Routes><Route path="/" element={<Home user={user}/>}/><Route path="/login" element={<Auth mode="login" onLogin={login}/>}/><Route path="/register" element={<Auth mode="register" onLogin={login}/>}/><Route path="/forgot-password" element={<Auth mode="forgot" onLogin={login}/>}/><Route path="/dashboard" element={user ? <Dashboard user={user}/> : <Auth mode="login" onLogin={login}/>}/><Route path="/learn" element={user ? <Learn user={user}/> : <Auth mode="login" onLogin={login}/>}/><Route path="/nyani" element={user ? <Nyani/> : <Auth mode="login" onLogin={login}/>}/><Route path="/admin" element={user?.role === 'admin' ? <Admin/> : <Auth mode="login" onLogin={login}/>}/><Route path="*" element={<Home user={user}/>}/></Routes>
    <footer className="footer"><Link to="/" className="brand"><span className="brand-symbol"><span></span><span></span><span></span></span><span>yaza<span className="brand-light">med</span></span></Link><span>A clearer path to medical school.</span><span>Made for Malawi 🇲🇼</span></footer></div>;
}

function Home({ user }) {
  return <><main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> A new way to prepare for what’s next</div><h1>Your future in<br/>medicine starts <i>here.</i></h1><p className="hero-sub">A clearer, more confident way to prepare for medical school. Learn at your pace, practise with purpose, and see how far you’ve come.</p><div className="hero-cta"><Link to={user ? '/dashboard' : '/register'} className="button-primary">Start learning <ArrowRight size={16}/></Link><a href="#how" className="button-text">Explore the platform <ArrowDownRight size={15}/></a></div><div className="hero-proof"><div className="avatar-stack"><b>JM</b><b>TM</b><b>CK</b><b>+</b></div><span><strong>Built for the way you learn</strong><br/>Steady progress, one day at a time</span></div></div><div className="hero-visual"><div className="visual-backdrop"></div><div className="floating-pill"><span className="pill-icon"><Activity size={15}/></span><span><b>Small steps add up</b><small>Your learning, in motion</small></span><span className="pill-check"><Check size={13}/></span></div><div className="study-card"><div className="study-top"><span className="study-kicker">TODAY’S FOCUS</span><span className="study-dot"><span></span><span></span><span></span></span></div><div className="study-subject"><div className="tiny-subject-icon"><Brain size={18}/></div><div><b>Human physiology</b><small>Biology · 12 min read</small></div><span className="study-arrow"><ArrowRight size={15}/></span></div><div className="study-rule"></div><div className="study-progress-label"><span>WEEKLY GOAL</span><b>4 of 5 days</b></div><div className="week-bars"><div><i className="done"></i><small>M</small></div><div><i className="done"></i><small>T</small></div><div><i className="done"></i><small>W</small></div><div><i className="today"></i><small>T</small></div><div><i></i><small>F</small></div><div><i></i><small>S</small></div><div><i></i><small>S</small></div></div><div className="study-footer"><span><span className="green-star">✦</span> Nice rhythm — keep it going</span><span className="study-streak">4 day streak <span>↗</span></span></div></div><div className="visual-stamp"><div>Learn<br/>with<br/><i>purpose.</i></div><span>Y · M</span></div><div className="visual-leaf leaf-a">✳</div><div className="visual-leaf leaf-b">✣</div></div></section>
      <section className="trust-strip"><span>BUILT AROUND YOUR GOALS</span><div><i>Learn clearly</i><i>Practise confidently</i><i>Progress steadily</i></div><span>ONE GOOD SESSION AT A TIME ↗</span></section>
      <section className="section-block subjects-section" id="subjects"><div className="section-heading"><div><div className="eyebrow muted">YOUR FOUNDATION, COVERED</div><h2>Six subjects. <i>One clear path.</i></h2><p>Everything you need to build strong foundations, organized around how you actually study.</p></div><span className="section-index">01 <span>—</span> 06</span></div><div className="subject-grid">{subjects.map((s,i)=><Link key={s.name} to={user ? `/learn?subject=${s.name}` : '/register'} className="subject-card"><div className="subject-card-top"><span className={`subject-icon ${s.color}`}><s.icon size={19}/></span><span className="subject-number">0{i+1}</span></div><h3>{s.name}</h3><p>{s.topics}</p><span className="card-link">Explore subject <ArrowRight size={14}/></span></Link>)}</div></section>
      <section className="feature-section" id="how"><div className="feature-intro"><div className="eyebrow muted">A STUDY SPACE THAT GETS YOU</div><h2>Study your way.<br/><i>Make it count.</i></h2><p>From first concepts to final revision, the right tools make it easier to keep showing up.</p><Link to={user ? '/dashboard' : '/register'} className="text-link">Find your starting point <ArrowRight size={15}/></Link><div className="hand-note">No rush. Just forward. <span>↗</span></div></div><div className="feature-list">{sections.map((s,i)=><Link to={user ? s.slug === 'practice' ? '/learn?type=practice' : s.slug === 'high-yield' ? '/nyani' : `/learn?type=${s.slug}` : '/register'} className="feature-row" key={s.slug}><span className={`feature-icon ${s.tint}`}><s.icon size={19}/></span><span className="feature-copy"><small>0{i+1} / {s.label}</small><b>{s.name}</b><span>{s.desc}</span></span><span className="feature-arrow"><ArrowRight size={17}/></span></Link>)}</div></section>
      <section className="bottom-cta"><div className="cta-flower">✳</div><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS SMALL</div><h2>A little progress goes<br/><i>a long way.</i></h2><p>Pick a subject. Find your rhythm. We’ll be here for the next step.</p><Link to={user ? '/dashboard' : '/register'} className="button-dark">{user ? 'Go to my dashboard' : 'Create your free account'} <ArrowRight size={16}/></Link></div><div className="cta-orbit"><div className="orbit-ring"></div><div className="orbit-center"><GraduationCap size={26}/></div><div className="orbit-note">Future<br/>doctor ↗</div><div className="orbit-dot"></div></div></section></main></>;
}

function Auth({ mode, onLogin }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', gender: '', email: '', password: '', confirmPassword: '' });
  const [verification, setVerification] = useState(null);
  const [resetRequest, setResetRequest] = useState(null);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  useEffect(() => {
    if (!verification && !resetRequest) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [verification, resetRequest]);
  const remaining = (date) => Math.max(0, Math.ceil((new Date(date).getTime() - now) / 1000));
  const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const requestCode = async () => {
    const { data } = await api.post('/auth/register', {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(),
      gender: form.gender, email: form.email.trim(), password: form.password
    });
    setNow(Date.now());
    setCode('');
    setVerification(data);
  };
  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (isRegister) {
        if (form.password !== form.confirmPassword) throw new Error('Your passwords do not match.');
        await requestCode();
      } else if (isForgot) {
        const { data } = await api.post('/auth/forgot-password', { email: form.email.trim() });
        setNow(Date.now());
        setCode('');
        setResetRequest({
          email: data.email,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 60 * 1000).toISOString()
        });
      } else {
        const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
        onLogin(data);
      }
    } catch (err) { setError(authErrorMessage(err, err.message || 'Could not complete your request. Please try again.')); }
    finally { setBusy(false); }
  };
  const verify = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email: verification.email, code });
      onLogin(data);
    } catch (err) { setError(authErrorMessage(err, 'Could not verify your email. Please try again.')); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setError(''); setBusy(true);
    try {
      if (remaining(verification.expiresAt) === 0) await requestCode();
      else {
        const { data } = await api.post('/auth/resend-verification', { email: verification.email });
        setNow(Date.now()); setVerification(data); setCode('');
      }
    } catch (err) { setError(authErrorMessage(err, 'Could not send another code. Please try again.')); }
    finally { setBusy(false); }
  };
  const resetPassword = async event => {
    event.preventDefault(); setError('');
    if (remaining(resetRequest.expiresAt) === 0) {
      setError('This reset code has expired. Request a fresh one to continue.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: resetRequest.email,
        code,
        password: form.password
      });
      setResetRequest(null);
      setForm(current => ({ ...current, password: '', confirmPassword: '' }));
      setError('');
      window.alert(data.message);
    } catch (err) { setError(authErrorMessage(err, 'Could not reset your password. Please try again.')); }
    finally { setBusy(false); }
  };
  const resendResetCode = async () => {
    setError(''); setBusy(true);
    try {
      if (remaining(resetRequest.expiresAt) === 0) {
        setResetRequest(null);
        setCode('');
        return;
      }
      const { data } = await api.post('/auth/resend-password-reset', { email: resetRequest.email });
      setNow(Date.now());
      setResetRequest(data);
      setCode('');
    } catch (err) { setError(authErrorMessage(err, 'Could not send another reset code. Please try again.')); }
    finally { setBusy(false); }
  };

  if (isForgot && resetRequest) {
    const resendSeconds = remaining(resetRequest.resendAvailableAt);
    const expiresSeconds = remaining(resetRequest.expiresAt);
    return <main className="verify-screen"><div className="verify-wordmark">yaza<span>med</span></div><div className="verify-caption">RESET YOUR ACCOUNT PASSWORD</div><section className="verify-card"><div className="verify-sent"><Check size={16}/> Reset code sent to <strong>{resetRequest.email}</strong></div><div className="verify-icon"><LockKeyhole size={22}/></div><h1>Set a new password</h1><p>Enter the 6-digit code and choose a secure password.</p><form onSubmit={resetPassword}><label className="sr-only" htmlFor="reset-code">6-digit password reset code</label><input id="reset-code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required/><div className="code-expiry">{expiresSeconds > 0 ? `Code expires in ${formatTime(expiresSeconds)}` : 'This code has expired. Request a fresh one.'}</div><div className="reset-password-fields"><label>New password<input name="password" type="password" value={form.password} onChange={update} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters"/></label><label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Re-enter your password"/></label></div>{form.confirmPassword && form.password !== form.confirmPassword && <div className="error-message" role="status">Your passwords do not match.</div>}{error && <div className="error-message" role="alert">{error}</div>}<button className="button-primary auth-submit verify-submit" disabled={busy}>{busy ? 'Resetting password…' : 'Reset password'} <ArrowRight size={15}/></button></form><button className="resend-code" onClick={resendResetCode} disabled={busy || resendSeconds > 0}>{resendSeconds > 0 ? `Resend code (${resendSeconds}s)` : expiresSeconds > 0 ? 'Resend code' : 'Request a fresh code'}</button><button className="change-signup" onClick={() => { setResetRequest(null); setError(''); setCode(''); }}>← Back to password recovery</button></section></main>;
  }

  if (isRegister && verification) {
    const resendSeconds = remaining(verification.resendAvailableAt);
    const expiresSeconds = remaining(verification.expiresAt);
    return <main className="verify-screen"><div className="verify-wordmark">yaza<span>med</span></div><div className="verify-caption">CREATE AN ACCOUNT TO GET STARTED</div><section className="verify-card"><div className="verify-sent"><Check size={16}/> Verification code sent to <strong>{verification.email}</strong></div><div className="verify-icon"><Mail size={22}/></div><h1>Verify your email</h1><p>Enter the 6-digit code sent to your inbox.</p><form onSubmit={verify}><label className="sr-only" htmlFor="verification-code">6-digit verification code</label><input id="verification-code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required/><div className="code-expiry">{expiresSeconds > 0 ? `Code expires in ${formatTime(expiresSeconds)}` : 'This code has expired. Request a fresh one.'}</div>{error && <div className="error-message" role="alert">{error}</div>}<button className="button-primary auth-submit verify-submit" disabled={busy || code.length !== 6 || expiresSeconds === 0}>{busy ? 'Checking code…' : 'Verify & finish'} <ArrowRight size={15}/></button></form><button className="resend-code" onClick={resend} disabled={busy || resendSeconds > 0}>{resendSeconds > 0 ? `Resend code (${resendSeconds}s)` : expiresSeconds > 0 ? 'Resend code' : 'Send a fresh code'}</button><button className="change-signup" onClick={() => { setVerification(null); setError(''); setCode(''); }}>← Back to signup</button></section></main>;
  }

  return <main className="auth-layout">
    <div className="auth-aside"><span className="auth-mark"><GraduationCap size={24}/></span><div className="eyebrow">YOUR NEXT CHAPTER</div><h1>Keep learning.<br/><i>Keep becoming.</i></h1><p>Build your foundations at your own pace, with a study space designed around your goals.</p><span className="aside-line"></span><small>Yaza Med · Malawi</small></div>
    <form className="auth-form" onSubmit={submit}>
      <div className="eyebrow muted">{isForgot ? 'ACCOUNT RECOVERY' : isRegister ? 'A GOOD PLACE TO START' : 'WELCOME BACK'}</div>
      <h2>{isForgot ? 'Reset your password.' : isRegister ? 'Make space to grow.' : 'Sign in to learn.'}</h2>
      <p>{isForgot ? 'Enter your email and we’ll send you a 6-digit reset code.' : isRegister ? 'Create your profile. We’ll email you a code to verify your account.' : 'Pick up right where you left off.'}</p>
      {isRegister && <><div className="signup-name-row"><label>First name<input name="firstName" value={form.firstName} onChange={update} required maxLength={60} autoComplete="given-name" placeholder="First name"/></label><label>Last name<input name="lastName" value={form.lastName} onChange={update} required maxLength={60} autoComplete="family-name" placeholder="Last name"/></label></div><label>WhatsApp number <span className="optional-label">(optional)</span><input name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" placeholder="+265 88 123 4567"/></label><label>Gender<select name="gender" value={form.gender} onChange={update} required><option value="" disabled>Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="prefer-not-to-say">Prefer not to say</option></select></label></>}
      <label>Email address<input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" placeholder="you@example.com"/></label>
      {!isForgot && <label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength={8} maxLength={128} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 8 characters' : 'Your password'}/></label>}
      {isRegister && <label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Re-enter your password"/></label>}
      {!isRegister && !isForgot && <Link className="forgot-password-link" to="/forgot-password">Forgot password?</Link>}
      {error && <div className="error-message" role="alert">{error}</div>}
      <button className="button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isForgot ? 'Send reset code' : isRegister ? 'Create account' : 'Sign in'} <ArrowRight size={15}/></button>
      <div className="auth-switch">{isForgot ? <>Remember your password? <Link to="/login">Sign in</Link></> : isRegister ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New to Yaza Med? <Link to="/register">Create an account</Link></>}</div>
      <div className="secure-note"><LockKeyhole size={13}/> Your learning space is private and secure.</div>
    </form>
  </main>;
}
function Dashboard({user}) {
  const [data,setData]=useState({subjects:[],attempts:[],bookmarks:[]});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let active=true;
    setLoading(true);
    setError('');
    Promise.all([api.get('/subjects'),api.get('/progress')])
      .then(([subjectsResponse,progressResponse])=>{
        if(active)setData({subjects:subjectsResponse.data,...progressResponse.data});
      })
      .catch(()=>{if(active)setError('Your progress could not be loaded. You can still explore lessons, notes and practice below.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[reload]);
  const score=data.attempts?.length?Math.round(data.attempts.reduce((total,attempt)=>total+(attempt.score/(attempt.total||1)*100),0)/data.attempts.length):0;
  const firstName=user.name?.trim().split(/\s+/)[0]||'there';
  const today=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date());
  return <main className="workspace">
    <aside className="side-nav" aria-label="Learning space navigation">
      <Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link>
      <small>YOUR SPACE</small>
      <NavLink to="/dashboard"><LayoutDashboard size={20}/> Overview</NavLink>
      <NavLink to="/learn?type=note"><BookOpen size={20}/> Notes</NavLink>
      <NavLink to="/learn?type=quick-lesson"><Clock3 size={20}/> Quick lessons</NavLink>
      <NavLink to="/learn?type=practice"><CircleHelp size={20}/> Practice questions</NavLink>
      <NavLink to="/learn?type=ai-quiz"><Brain size={20}/> AI study quiz</NavLink>
      <NavLink to="/nyani"><Sparkles size={20}/> Study resources</NavLink>
      <small>ACCOUNT</small>
      <Link to="/dashboard#subjects"><GraduationCap size={20}/> My subjects</Link>
      {user.role==='admin'&&<NavLink to="/admin"><ShieldCheck size={20}/> Admin studio</NavLink>}
      <div className="side-user"><span className="user-avatar" aria-hidden="true">{firstName.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>{user.role==='admin'?'Administrator':'Student'}</small></span></div>
    </aside>
    <section className="workspace-main dashboard-main">
      <div className="workspace-top"><span>{today}<span className="breadcrumb-dot"> · </span>Your learning space</span><Link to="/learn" className="button-primary small-button">Find something to learn <ArrowRight size={18}/></Link></div>
      <header className="dashboard-welcome">
        <div><div className="eyebrow muted">YOUR LEARNING SPACE</div><h1>Welcome back, <i>{firstName}.</i></h1><p>Choose a starting point, or continue building your knowledge one session at a time.</p></div>
        <Link to="/learn?type=quick-lesson" className="welcome-action"><span className="feature-icon tint-lime"><Clock3 size={24}/></span><span><b>New here?</b><small>Start with a quick lesson</small></span><ArrowRight size={20}/></Link>
      </header>
      {error&&<div className="error-message dashboard-load-error" role="alert"><span>{error}</span><button className="button-outline" onClick={()=>setReload(value=>value+1)}>Try again</button></div>}
      <section aria-labelledby="dashboard-features-title">
        <div className="dash-section-head dashboard-section-heading"><div><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h2 id="dashboard-features-title">What would you like to <i>learn?</i></h2><p>Choose a tool that fits your study goal today.</p></div></div>
        <div className="dashboard-feature-grid">{dashboardFeatures.map(feature=><Link key={feature.title} className="dashboard-feature-card" to={feature.href}><span className={`feature-icon ${feature.tint}`}><feature.icon size={25} aria-hidden="true"/></span><span className="dashboard-feature-copy"><b>{feature.title}</b><span>{feature.description}</span></span><span className="dashboard-feature-action">{feature.action}<ArrowRight size={18}/></span></Link>)}</div>
      </section>
      <section id="subjects" className="dashboard-subject-section" aria-labelledby="dashboard-subjects-title">
        <div className="dash-section-head dashboard-section-heading"><div><div className="eyebrow muted">YOUR LEARNING MAP</div><h2 id="dashboard-subjects-title">Explore by <i>subject.</i></h2><p>Find lessons, questions and notes for your course.</p></div><span>6 SUBJECTS</span></div>
        <div className="dash-subjects">{subjects.map(subject=><Link key={subject.name} to={`/learn?subject=${encodeURIComponent(subject.name)}`} className="dash-subject"><span className={`subject-icon ${subject.color}`}><subject.icon size={22} aria-hidden="true"/></span><span><b>{subject.name}</b><small>{data.subjects?.find(item=>item.title===subject.name)?.description||subject.topics}</small></span><ArrowRight size={19} aria-hidden="true"/></Link>)}</div>
      </section>
      <section className="stat-grid dashboard-stats" aria-label="Your learning at a glance">
        {loading?<div className="loading-row dashboard-progress-loading" role="status">Loading your progress…</div>:<>
          <article className="stat-card"><span className="stat-label">PRACTICE ACCURACY</span><b>{score}%</b><span>{data.attempts?.length?`${data.attempts.length} practice sessions completed`:'Your first practice session is a great place to start'}</span><div className="stat-meter" role="progressbar" aria-label="Average practice accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow={score}><i style={{width:`${score}%`}}/></div></article>
          <article className="stat-card"><span className="stat-label">SAVED FOR LATER</span><b>{data.bookmarks?.length||0}</b><span>Learning resources on your reading list</span><Link to="/learn?view=materials" className="stat-foot"><Bookmark size={18}/> Browse learning materials</Link></article>
          <article className="stat-card goal-stat"><span className="stat-label">TODAY’S INTENTION</span><b>One good session.</b><span>Choose something small and make it yours.</span><Link to="/learn" className="stat-foot">Choose a study activity <ArrowRight size={18}/></Link></article>
        </>}
      </section>
      <section className="recent-section" id="progress" aria-labelledby="recent-practice-title">
        <div className="dash-section-head dashboard-section-heading"><div><div className="eyebrow muted">YOUR PROGRESS</div><h2 id="recent-practice-title">Continue <i>learning.</i></h2><p>Your recent practice appears here so it is easy to pick up again.</p></div><Link to="/learn?type=practice" className="text-link">Practice questions <ArrowRight size={18}/></Link></div>
        {loading?<div className="loading-row" role="status">Loading recent practice…</div>:error?<div className="empty-state"><div className="empty-spark"><Activity size={22}/></div><div><b>Progress is temporarily unavailable.</b><span>You can still open practice questions and other study tools above.</span></div><Link to="/learn?type=practice" className="button-outline">Practice questions <ArrowRight size={18}/></Link></div>:data.attempts?.length?<div className="attempt-list">{data.attempts.slice(0,4).map((attempt,index)=><div key={attempt._id||index}><span className="attempt-icon"><Activity size={20} aria-hidden="true"/></span><span><b>{attempt.mode==='exam'?'Exam simulation':'Practice session'}</b><small>{attempt.createdAt?new Date(attempt.createdAt).toLocaleDateString():''}</small></span><strong>{attempt.score}/{attempt.total}</strong><i>{attempt.total?Math.round(attempt.score/attempt.total*100):0}%</i></div>)}</div>:<div className="empty-state dashboard-empty-state"><div className="empty-spark"><BookOpen size={22}/></div><div><b>Your learning journey starts with one session.</b><span>No recent practice yet. Try a short set of questions and your activity will show here.</span></div><Link to="/learn?type=practice" className="button-outline">Start practising <ArrowRight size={18}/></Link></div>}
      </section>
    </section>
  </main>;
}

function NotesLibrary({user}) {
  const [availableSubjects,setAvailableSubjects]=useState([]);
  const [selectedSubject,setSelectedSubject]=useState(null);
  const [noteGroups,setNoteGroups]=useState([]);
  const [loadingSubjects,setLoadingSubjects]=useState(true);
  const [loadingNotes,setLoadingNotes]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [retryKind,setRetryKind]=useState('');
  const [subjectsRetry,setSubjectsRetry]=useState(0);
  const [notesRetry,setNotesRetry]=useState(0);

  useEffect(()=>{
    let live=true;
    setLoadingSubjects(true);
    setError('');
    setRetryKind('');
    api.get('/subjects')
      .then(({data})=>{if(live)setAvailableSubjects(data);})
      .catch(e=>{if(live){setError(e.response?.data?.message||'Unable to load subjects. Please try again.');setRetryKind('subjects');}})
      .finally(()=>{if(live)setLoadingSubjects(false);});
    return()=>{live=false;};
  },[subjectsRetry]);

  useEffect(()=>{
    if(!selectedSubject)return;
    let live=true;
    setLoadingNotes(true);
    setError('');
    setRetryKind('');
    setNoteGroups([]);
    api.get('/notes',{params:{subject:selectedSubject.slug,q:query.trim()||undefined}})
      .then(({data})=>{if(live)setNoteGroups(data||[]);})
      .catch(e=>{if(live){setError(e.response?.data?.message||'Unable to load notes. Please try again.');setRetryKind('notes');}})
      .finally(()=>{if(live)setLoadingNotes(false);});
    return()=>{live=false;};
  },[selectedSubject,query,notesRetry]);

  const openStorageNote=async file=>{
    setError('');
    setNotice('');
    const popup=window.open('about:blank','_blank');
    try{
      const {data}=await api.get('/notes/link',{params:{path:file.path,download:'0'}});
      const url=officeDocument(file.name)?createOfficeViewerUrl(data.url):data.url;
      if(popup)popup.location=url;
      else window.location.assign(url);
    }catch(e){
      popup?.close();
      setError(e.response?.data?.message||'Could not open this note online.');
    }
  };

  const downloadStorageNote=async file=>{
    setError('');
    setNotice('');
    try{
      const {data}=await api.get('/notes/link',{params:{path:file.path,download:'1'}});
      const link=document.createElement('a');
      link.href=data.url;
      link.rel='noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice('Download started. Open the file from your Downloads to choose an installed app.');
    }catch(e){
      setError(e.response?.data?.message||'Could not download this note.');
    }
  };

  const files=noteGroups.flatMap(group=>group.files||[]);

  return <main className="workspace">
    <aside className="side-nav">
      <Link to="/dashboard" className="side-brand"><span className="brand-symbol"><span></span><span></span><span></span></span> yaza<span>med</span></Link>
      <small>YOUR SPACE</small>
      <NavLink to="/dashboard"><LayoutDashboard size={17}/> Overview</NavLink>
      {sections.map(section=>section.slug==='high-yield'
        ? <NavLink key={section.slug} to="/nyani"><section.icon size={17}/>Nyani library</NavLink>
        : <Link key={section.slug} to={`/learn?type=${section.slug}`} className={section.slug==='note'?'active':''}><section.icon size={17}/>{section.small}</Link>)}
      <small>ACCOUNT</small>
      <Link to="/dashboard#subjects"><GraduationCap size={17}/> My subjects</Link>
      <div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div>
    </aside>
    <section className="workspace-main learn-main">
      <div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>{selectedSubject?`${selectedSubject.title} notes`:'Notes library'}<i>.</i></h1><p>{selectedSubject?'Choose a file to view online or download.':'Choose a subject to explore its study notes.'}</p></div>
      {notice&&<div className="success-message" role="status">{notice}</div>}
      {error&&<ErrorNotice message={error} onRetry={retryKind==='subjects'?()=>setSubjectsRetry(value=>value+1):retryKind==='notes'?()=>setNotesRetry(value=>value+1):undefined}/>}
      {!selectedSubject
        ? loadingSubjects?<div className="content-skeleton"><i/><i/><i/></div>
          : retryKind==='subjects'?null:availableSubjects.length
            ? <div className="notes-subject-picker">{availableSubjects.map(item=>{
                const subjectInfo=subjects.find(subject=>subject.name===item.title);
                const SubjectIcon=subjectInfo?.icon||BookOpen;
                return <button key={item._id||item.slug} className="notes-subject-option" onClick={()=>{setSelectedSubject(item);setQuery('');setNoteGroups([]);}}>
                  <span className={`subject-icon ${subjectInfo?.color||'blue'}`}><SubjectIcon size={19}/></span>
                  <span><b>{item.title}</b><small>{subjectInfo?.topics||'Explore study notes and course materials.'}</small></span>
                  <ArrowRight size={16}/>
                </button>;
              })}</div>
            : <div className="empty-state"><div className="empty-spark">✳</div><div><b>No subjects are available yet.</b><span>Published subjects will appear here when they are ready.</span></div></div>
        : <>
          <div className="notes-subject-toolbar">
            <button className="button-outline" onClick={()=>{setSelectedSubject(null);setNoteGroups([]);setError('');setQuery('');}}><ArrowLeft size={14}/> All subjects</button>
            <label><Search size={15}/><input aria-label="Search notes" placeholder="Search notes" value={query} onChange={event=>setQuery(event.target.value)}/></label>
          </div>
          {loadingNotes?<div className="content-skeleton"><i/><i/><i/></div>
            : retryKind==='notes'?null:files.length
              ? <div className="note-file-grid">{files.map(file=><article className="material-card note-file-card" key={file.path}>
                  <div className="material-card-top"><span className="material-type">{file.contentType?.includes('pdf')||/\.pdf$/i.test(file.name)?'PDF NOTE':'STUDY FILE'}</span><span className="note-topic">{file.topic}</span></div>
                  <h3>{file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</h3>
                  <p>{file.path}</p>
                  <div className="note-actions"><button className="button-outline" onClick={()=>openStorageNote(file)}>View online</button><button className="button-primary" onClick={()=>downloadStorageNote(file)}>Download</button></div>
                </article>)}</div>
              : <div className="empty-state"><div className="empty-spark">✳</div><div><b>No notes found for {selectedSubject.title} yet.</b><span>Try another subject, or start with lessons and practice while notes are being added.</span></div><button className="button-outline" onClick={()=>{setSelectedSubject(null);setNoteGroups([]);setError('');setQuery('');}}>Browse subjects <ArrowRight size={18}/></button><Link className="button-outline" to="/learn?type=quick-lesson">Explore lessons <ArrowRight size={18}/></Link></div>}
        </>}
    </section>
  </main>;
}

function LearningFeatureDirectory({user}) {
  return <main className="workspace"><aside className="side-nav" aria-label="Learning space navigation"><Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link><small>YOUR SPACE</small><NavLink to="/dashboard"><LayoutDashboard size={20}/> Overview</NavLink>{sections.map(section=><NavLink key={section.slug} to={learningFeatureHref(section.slug)}><section.icon size={20}/>{section.small}</NavLink>)}<small>ACCOUNT</small><Link to="/dashboard#subjects"><GraduationCap size={20}/> My subjects</Link><div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div></aside><section className="workspace-main learn-main"><div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>Explore learning<i>.</i></h1><p>Choose a feature to start studying. You can also browse all published materials.</p></div><div className="material-grid learning-feature-grid">{sections.map(section=><Link className="material-card learning-feature-card" key={section.slug} to={learningFeatureHref(section.slug)}><div className="material-card-top"><span className="material-type">{section.label}</span><span className={`feature-icon ${section.tint}`}><section.icon size={22}/></span></div><h3>{section.name}</h3><p>{section.desc}</p><div className="material-card-foot"><span>Open feature</span><ArrowRight size={18}/></div></Link>)}<Link className="material-card learning-feature-card" to="/learn?view=materials"><div className="material-card-top"><span className="material-type">STUDY LIBRARY</span><span className="feature-icon tint-lime"><BookOpen size={22}/></span></div><h3>Browse all materials</h3><p>Search published lessons, notes, and high-yield resources across subjects.</p><div className="material-card-foot"><span>Explore materials</span><ArrowRight size={18}/></div></Link></div></section></main>;
}

function Learn({user}) {
  const [params,setParams]=useSearchParams(); const type=params.get('type')||''; const initialSubject=params.get('subject')||''; const view=params.get('view')||''; const showFeatureDirectory=!type&&!initialSubject&&view!=='materials';
  const [subject,setSubject]=useState(initialSubject); const [items,setItems]=useState([]); const [noteGroups,setNoteGroups]=useState([]); const [questions,setQuestions]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [loadError,setLoadError]=useState(false); const [reload,setReload]=useState(0); const [q,setQ]=useState(''); const [page,setPage]=useState(1); const [responses,setResponses]=useState({}); const [result,setResult]=useState(null); const [detail,setDetail]=useState(null); const [saved,setSaved]=useState({});
  useEffect(()=>{
    if(showFeatureDirectory||type==='note'||type==='ai-quiz')return;
    let live=true;
    setLoading(true);
    setError('');
    setLoadError(false);
    setResult(null);
    if(type==='practice')setQuestions([]);
    else setItems([]);
    const fetch=async()=>{
      try{
        if(type==='practice'){
          const {data}=await api.get('/questions',{params:{subject,page,limit:10}});
          if(live)setQuestions(data);
        }else{
          const query={page,limit:9};
          if(type)query.type=type;
          if(subject)query.subject=subject;
          if(q.trim())query.q=q.trim();
          const {data}=await api.get('/content',{params:query});
          if(live)setItems(data.items||[]);
        }
      }catch(e){
        if(live){setError(e.response?.data?.message||'Unable to load learning materials. Please try again.');setLoadError(true);}
      }finally{
        if(live)setLoading(false);
      }
    };
    fetch();
    return()=>{live=false;};
  },[showFeatureDirectory,type,subject,page,q,reload]);
  const title=type==='quick-lesson'?'Kuyaza in 15 minutes':type==='note'?'Notes library':type==='high-yield'?'Nyani & high-yield':type==='practice'?'Practice questions':'Explore learning';
  const chooseType=t=>{setParams(t?{type:t}:{view:'materials'});setPage(1);setResponses({});setResult(null);};
  const submit=async()=>{try{const {data}=await api.post('/attempts',{mode:'practice',responses:Object.entries(responses).map(([question,answer])=>({question,answer}))});setResult(data);}catch(e){setError(e.response?.data?.message||'Your answers could not be submitted.');}};
  const bookmark=async item=>{try{await api.post('/bookmarks',{material:item._id,materialType:item.type});setSaved({...saved,[item._id]:true});}catch(e){setError(e.response?.data?.message||'Could not save this item.');}};
  const openItem=async item=>{try{const {data}=await api.get(`/content/${item._id}`);setDetail(data);}catch(e){setError(e.response?.data?.message||'Could not open this learning resource.');}};
  const openStorageNote=async file=>{try{const {data}=await api.get('/notes/link',{params:{path:file.path,download:'1'}});const link=document.createElement('a');link.href=data.url;link.rel='noreferrer';document.body.appendChild(link);link.click();link.remove();}catch(e){setError(e.response?.data?.message||'Could not download this note.');}};
  if(showFeatureDirectory)return <LearningFeatureDirectory user={user}/>;
  if(type==='note')return <NotesLibrary user={user}/>;
  if(type==='ai-quiz')return <AiQuiz user={user}/>;
  return <main className="workspace"><aside className="side-nav" aria-label="Learning space navigation"><Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link><small>YOUR SPACE</small><NavLink to="/dashboard"><LayoutDashboard size={20}/> Overview</NavLink>{sections.map(s=>s.slug==='high-yield'?<NavLink key={s.slug} to='/nyani'><s.icon size={20}/>Nyani library</NavLink>:<button key={s.slug} className={type===s.slug?'side-active':''} onClick={()=>chooseType(s.slug)}><s.icon size={20}/>{s.small}</button>)}<small>ACCOUNT</small><Link to="/dashboard#subjects"><GraduationCap size={20}/> My subjects</Link><div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div></aside><section className="workspace-main learn-main"><div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>{title}<i>.</i></h1><p>Small, steady steps make a strong foundation.</p></div><div className="learn-controls"><div className="filter-tabs"><button className={!type?'selected':''} onClick={()=>chooseType('')}>Everything</button>{sections.filter(s=>s.slug!=='practice').map(s=><button key={s.slug} className={type===s.slug?'selected':''} onClick={()=>chooseType(s.slug)}>{s.small}</button>)}<button className={type==='practice'?'selected':''} onClick={()=>chooseType('practice')}>Practice</button></div><div className="learn-filters"><label><Search size={15}/><input placeholder="Search materials" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setPage(1)}/><button className="search-submit" onClick={()=>{setPage(1);document.activeElement.blur()}}>Go</button></label><select aria-label="Filter subject" value={subject} onChange={e=>{setSubject(e.target.value);setPage(1)}}><option value="">All subjects</option>{subjects.map(s=><option value={s.name} key={s.name}>{s.name}</option>)}</select></div></div>{error&&<ErrorNotice message={error} onRetry={loadError?()=>setReload(value=>value+1):undefined}/>}{loading?<div className="content-skeleton"><i/><i/><i/></div>:type==='practice'?<><div className="quiz-help"><span><CircleHelp size={18}/></span><div><b>Learn from every answer.</b><small>Your choices stay private. When you submit, you’ll see the correct answers and explanations.</small></div><span className="quiz-count">{questions.length} QUESTIONS</span></div>{questions.length?<div className="question-list">{questions.map((item,i)=><article className="question-card" key={item._id}><div className="question-meta"><span>QUESTION {String(i+1).padStart(2,'0')}</span><span>{item.difficulty||'medium'} · {item.topic?.title||'Core concepts'}</span></div><h3>{item.prompt}</h3><div className="option-list">{(item.options||[]).map((option,index)=><label key={index} className={responses[item._id]===index?'option-selected':''}><input type="radio" name={item._id} checked={responses[item._id]===index} onChange={()=>setResponses({...responses,[item._id]:index})}/><span className="option-letter">{String.fromCharCode(65+index)}</span>{option}</label>)}</div>{result&&<div className={`answer-feedback ${result.explanations.find(x=>x.question===item._id)?.correct?'good':'needs-work'}`}><b>{result.explanations.find(x=>x.question===item._id)?.correct?'That’s right.':'Let’s learn from it.'}</b> {result.explanations.find(x=>x.question===item._id)?.explanation}</div>}</article>)}<button className="button-primary submit-quiz" onClick={submit} disabled={Object.keys(responses).length===0}>Check my answers <ArrowRight size={15}/></button>{result&&<div className="quiz-result"><Check size={19}/><div><b>{result.percentage}% — a solid step forward.</b><span>You got {result.attempt.score} of {result.attempt.total} correct.</span></div></div>}</div>:loadError?null:<div className="empty-state"><div className="empty-spark">✳</div><div><b>There aren’t any published questions here yet.</b><span>Choose another subject or return soon. Your first practice set is on its way.</span></div><Link to="/learn?type=quick-lesson" className="button-outline">Explore quick lessons <ArrowRight size={18}/></Link></div>}</>:type==='note'?noteGroups.length?<div className="note-subject-list">{noteGroups.map(group=><section className="note-subject" key={group.slug}><div className="dash-section-head"><div><div className="eyebrow muted">COURSE OUTLINE</div><h2>{group.title} <i>notes</i></h2></div><span>{group.files.length} FILES</span></div><div className="note-file-grid">{group.files.map(file=><article className="material-card note-file-card" key={file.path}><div className="material-card-top"><span className="material-type">{file.contentType?.includes('pdf')||/\.pdf$/i.test(file.name)?'PDF NOTE':'STUDY FILE'}</span><span className="note-topic">{file.topic}</span></div><h3>{file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</h3><p>{file.path}</p><div className="note-actions"><button className="button-outline" onClick={()=>openStorageNote(file)}>View <ArrowRight size={14}/></button><button className="button-primary" onClick={()=>openStorageNote(file,true)}>Download</button></div></article>)}</div></section>)}</div>:<div className="empty-state"><div className="empty-spark">✳</div><div><b>No notes found for this subject yet.</b><span>Study files in Supabase Storage appear here when they are placed in subject folders and the course outline is available.</span></div><Link to="/learn?type=quick-lesson" className="button-outline">Explore lessons <ArrowRight size={18}/></Link></div>:items.length?<><div className="material-grid">{items.map(item=><article className="material-card" key={item._id}><div className="material-card-top"><span className="material-type">{item.type==='quick-lesson'?'15 MIN LESSON':item.type==='high-yield'?'HIGH-YIELD':'STUDY NOTE'}</span><button className={`bookmark-btn ${saved[item._id]?'is-saved':''}`} aria-label="Save for later" onClick={()=>bookmark(item)}>{saved[item._id]?<Check size={18}/>:<Bookmark size={18}/>}</button></div><h3>{item.title}</h3><p>{item.body?.replace(/<[^>]*>/g,'').slice(0,155)||'Open this learning resource to explore the topic and build your understanding.'}{item.body?.length>155?'…':''}</p><div className="material-card-foot"><span>{item.subject?.title||'Learning resource'} {item.duration?`· ${item.duration} min`:''}</span><button onClick={()=>openItem(item)}>Read <ArrowRight size={18}/></button></div></article>)}</div><div className="pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}>← Previous</button><span>Page {page}</span><button disabled={items.length<9} onClick={()=>setPage(page+1)}>Next →</button></div></>:loadError?null:<div className="empty-state"><div className="empty-spark">✳</div><div><b>No published resources in this view yet.</b><span>Try a different study area or choose another subject. Your learning dashboard will point you to available activities.</span></div><Link to={type==='quick-lesson'?'/dashboard':'/learn?type=quick-lesson'} className="button-outline">{type==='quick-lesson'?'Return to dashboard':'Explore quick lessons'} <ArrowRight size={18}/></Link><Link to="/learn?type=practice" className="button-outline">Practice questions <ArrowRight size={18}/></Link></div>}{detail&&<div className="modal-backdrop" onClick={()=>setDetail(null)}><article className="reader-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setDetail(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow muted">{detail.type==='quick-lesson'?'Kuyaza in 15 minutes':detail.type==='high-yield'?'Nyani & high-yield':'Notes library'}</div><h2>{detail.title}</h2><div className="reader-subtitle">{detail.subject?.title||'Study resource'} {detail.duration?`· ${detail.duration} minute read`:''}</div>{detail.objectives?.length>0&&<div className="reader-objectives"><b>By the end, you’ll be able to</b>{detail.objectives.map((o,i)=><span key={i}><Check size={14}/>{o}</span>)}</div>}<div className="reader-body">{detail.body?.split('\n').map((line,i)=>line?<p key={i}>{line}</p>:<br key={i}/>)}</div>{detail.pdfUrl&&<a className="button-outline" href={detail.pdfUrl} target="_blank" rel="noreferrer">Open PDF <ArrowRight size={14}/></a>}</article></div>}</section></main>;
}

function Admin() {
  const [items,setItems]=useState([]),[subjectsData,setSubjectsData]=useState([]),[form,setForm]=useState({type:'note',title:'',body:'',subject:'',status:'draft'}),[message,setMessage]=useState(''),[error,setError]=useState('');
  const refresh=()=>api.get('/admin/content').then(r=>setItems(r.data)).catch(e=>setError(e.response?.data?.message||'Unable to load content.'));
  useEffect(()=>{refresh();api.get('/subjects').then(r=>setSubjectsData(r.data)).catch(()=>{});},[]);
  const submit=async e=>{e.preventDefault();setMessage('');setError('');try{await api.post('/admin/content',form);setMessage('Draft created. Publish it when it’s ready for students.');setForm({...form,title:'',body:''});refresh();}catch(e){setError(e.response?.data?.message||'Could not save your draft.');}};
  const publish=async item=>{try{await api.patch(`/admin/content/${item._id}`,{status:item.status==='published'?'draft':'published'});refresh();}catch(e){setError(e.response?.data?.message||'Could not update this resource.');}};
  const remove=async item=>{try{await api.delete(`/admin/content/${item._id}`);refresh();}catch(e){setError(e.response?.data?.message||'Could not remove this resource.');}};
  return <main className="workspace"><aside className="side-nav"><Link to="/dashboard" className="side-brand"><span className="brand-symbol"><span></span><span></span><span></span></span> yaza<span>med</span></Link><small>ADMIN STUDIO</small><NavLink to="/admin"><ShieldCheck size={17}/> Content studio</NavLink><NavLink to="/dashboard"><LayoutDashboard size={17}/> Student view</NavLink></aside><section className="workspace-main"><div className="workspace-top">Administrator workspace</div><div className="learn-heading"><div className="eyebrow muted">MAKE ROOM FOR LEARNING</div><h1>Content <i>studio.</i></h1><p>Create drafts, organize resources, and publish when you’re ready.</p></div>{message&&<div className="success-message"><Check size={16}/>{message}</div>}{error&&<div className="error-message">{error}</div>}<div className="admin-layout"><form className="admin-form" onSubmit={submit}><h2>Create a learning resource</h2><p>Draft content is visible to administrators only.</p><label>Resource type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="note">Study note</option><option value="quick-lesson">15 min lesson</option><option value="high-yield">High-yield topic</option></select></label><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength="180"/></label><label>Subject<select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} required><option value="">Choose a subject</option>{subjectsData.map(s=><option key={s._id} value={s._id}>{s.title}</option>)}</select></label><label>Lesson content<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} required rows="9" placeholder="Write a clear explanation…"/></label>{form.type==='quick-lesson'&&<label>Duration in minutes<input type="number" min="1" max="60" value={form.duration||15} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></label>}<button className="button-primary">Save as draft <ArrowRight size={14}/></button></form><div className="admin-list"><div className="admin-list-heading"><div><h2>Learning resources</h2><p>{items.length} resources in your studio</p></div><span>ALL SUBJECTS</span></div>{items.length?items.map(item=><article key={item._id} className="admin-item"><div><span className="admin-status">{item.status}</span><b>{item.title}</b><small>{item.type} · {item.subject?.title||'Subject'}</small></div><button className="button-outline" onClick={()=>publish(item)}>{item.status==='published'?'Unpublish':'Publish'}</button><button className="admin-delete" aria-label="Delete resource" onClick={()=>remove(item)}><X size={15}/></button></article>):<div className="empty-state"><div className="empty-spark">✳</div><div><b>Your studio is ready.</b><span>Resources you create will appear here.</span></div></div>}</div></div></section></main>;
}
export default App;
