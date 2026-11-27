import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, Atom, BookOpen, Bookmark, Brain, Check, ChevronDown, CircleHelp, FlaskConical, GraduationCap, LayoutDashboard, LogIn, Menu, Moon, Search, ShieldCheck, Sigma, Sparkles, Sun, X, Laptop, Languages, LockKeyhole, Mail, Clock3, FileText, BarChart3, LogOut } from 'lucide-react';
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
  { slug: 'note', name: 'The notes library', small: 'Notes', desc: 'Build a strong foundation, one topic at a time.', icon: BookOpen, tint: 'tint-blue', label: 'STUDY NOTES' },
  { slug: 'practice', name: 'Practice questions', small: 'Practice', desc: 'Test yourself and learn from every answer.', icon: CircleHelp, tint: 'tint-coral', label: 'QUESTION BANK' },
  { slug: 'ai-quiz', name: 'Yaza Med AI quiz', small: 'Yaza Med AI', desc: 'Turn your study materials into a scored practice session.', icon: Brain, tint: 'tint-violet', label: 'AI STUDY' },
  { slug: 'high-yield', name: 'Nyani & high-yield', small: 'High-yield', desc: 'Keep the essential ideas close before exam day.', icon: Sparkles, tint: 'tint-violet', label: 'EXAM FOCUS' }
];
const dashboardFeatures = [
  { title: 'Notes', description: 'Open lecture notes, PDFs and study materials by subject.', icon: BookOpen, href: '/learn?type=note', tint: 'tint-blue', action: 'Browse notes' },
  { title: 'Practice questions', description: 'Test your understanding and learn from each answer.', icon: CircleHelp, href: '/learn?type=practice', tint: 'tint-coral', action: 'Start practising' },
  { title: 'AI study quiz', description: 'Create a practice quiz from your own study material.', icon: Brain, href: '/learn?type=ai-quiz', tint: 'tint-violet', action: 'Build a quiz' },
  { title: 'Study resources', description: 'Browse past papers and revision files in the Nyani library.', icon: Sparkles, href: '/nyani', tint: 'tint-lime', action: 'Browse resources' }
];
const learningFeatureHref = slug => slug === 'high-yield' ? '/nyani' : `/learn?type=${slug}`;
const officeDocument = name => /\.(docx?|pptx?|xlsx?)$/i.test(name);
const notePreviewMimeTypes = {
  '.csv': 'text/csv',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.md': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.htm': 'text/plain',
  '.html': 'text/plain'
};
const notePreviewMimeType = file => {
  const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase();
  const inferred = notePreviewMimeTypes[extension];
  if (inferred) return inferred;
  const reported = file.contentType?.split(';')[0].toLowerCase();
  return ['application/pdf', 'application/json', 'image/gif', 'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'text/plain'].includes(reported) ? reported : null;
};

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
  const touchStart = useRef(null);
  const handleTouchStart = event => {
    const target = event.target;
    if (event.touches.length !== 1 || target.closest('a,button,input,textarea,select,[contenteditable="true"],.side-nav,.modal-backdrop')) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const handleTouchEnd = event => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - start.x;
    const deltaY = event.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) < 70 || Math.abs(deltaY) > 50 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.3) return;

    const params = new URLSearchParams(location.search);
    const currentSlug = location.pathname === '/nyani'
      ? 'high-yield'
      : location.pathname === '/learn'
        ? params.get('type')
        : null;
    const currentIndex = sections.findIndex(section => section.slug === currentSlug);
    if (currentIndex < 0) return;
    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = (currentIndex + direction + sections.length) % sections.length;
    navigate(learningFeatureHref(sections[nextIndex].slug));
  };
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('yaza-theme', theme); }, [theme]);
  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, [location.hash, location.pathname]);
  const signOut = () => { localStorage.removeItem('yaza-token'); localStorage.removeItem('yaza-user'); setUser(null); navigate('/'); };
  const login = data => { localStorage.setItem('yaza-token', data.token); localStorage.setItem('yaza-user', JSON.stringify(data.user)); setUser(data.user); navigate('/learn?type=note'); };
  return <div className="app-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span><span>yaza<span className="brand-light">med</span></span></Link>
      <nav className="top-links" aria-label="Main navigation">
        <Link to="/#subjects">Subjects</Link>
        <Link to="/#how">How it works</Link>
      </nav>
      <div className="top-actions">
        <button className="theme-btn" aria-label="Toggle theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}</button>
        {user ? <><Link className="top-login" to="/dashboard">Dashboard</Link><button className="top-signup" onClick={signOut}>Sign out</button></> : <><Link className="top-login" to="/login">Log in</Link><Link className="top-signup" to="/register">Get started <ArrowRight size={18}/></Link></>}
        <button className="mobile-menu" aria-label="Toggle menu" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      </div>
    </header>
    {menu && <>
      <button className="mobile-menu-backdrop" type="button" aria-label="Close navigation menu" onClick={()=>setMenu(false)}/>
      <nav className="mobile-dropdown" id="mobile-navigation" aria-label="Mobile navigation">
        {dashboardFeatures.map(feature=>{
          const FeatureIcon=feature.icon;
          return <Link key={feature.title} to={feature.href} onClick={()=>setMenu(false)}><FeatureIcon size={20} aria-hidden="true"/><span>{feature.title}</span></Link>;
        })}
        {!user && <Link to="/login" onClick={()=>setMenu(false)}><LogIn size={20} aria-hidden="true"/><span>Log in</span></Link>}
      </nav>
    </>}
    <Routes><Route path="/" element={<Home user={user}/>}/><Route path="/login" element={<Auth mode="login" onLogin={login}/>}/><Route path="/register" element={<Auth mode="register" onLogin={login}/>}/><Route path="/forgot-password" element={<Auth mode="forgot" onLogin={login}/>}/><Route path="/dashboard" element={user ? <Dashboard user={user} onSignOut={signOut}/> : <Auth mode="login" onLogin={login}/>}/><Route path="/learn" element={user ? <Learn user={user}/> : <Auth mode="login" onLogin={login}/>}/><Route path="/nyani" element={user ? <Nyani/> : <Auth mode="login" onLogin={login}/>}/><Route path="/admin" element={user?.role === 'admin' ? <Admin/> : <Auth mode="login" onLogin={login}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>
    <footer className="footer"><Link to="/" className="brand"><span className="brand-symbol"><span></span><span></span><span></span></span><span>yaza<span className="brand-light">med</span></span></Link><span>A clearer path to medical school.</span><span>Made for Malawi 🇲🇼</span></footer></div>;
}

function Home({ user }) {
  return <><main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="pulse"></span> A new way to prepare for what’s next</div><h1>Your future in<br/>medicine starts <i>here.</i></h1><p className="hero-sub">A clearer, more confident way to prepare for medical school. Learn at your pace, practise with purpose, and see how far you’ve come.</p><div className="hero-cta"><Link to={user ? '/dashboard' : '/register'} className="button-primary">Start learning <ArrowRight size={16}/></Link><a href="#how" className="button-text">Explore the platform <ArrowDownRight size={15}/></a></div><div className="hero-proof"><div className="avatar-stack"><b>JM</b><b>TM</b><b>CK</b><b>+</b></div><span><strong>Built for the way you learn</strong><br/>Steady progress, one day at a time</span></div></div><div className="hero-visual"><div className="visual-backdrop"></div><div className="floating-pill"><span className="pill-icon"><Activity size={15}/></span><span><b>Small steps add up</b><small>Your learning, in motion</small></span><span className="pill-check"><Check size={13}/></span></div><div className="study-card"><div className="study-top"><span className="study-kicker">SAMPLE RESOURCE</span><span className="study-dot"><span></span><span></span><span></span></span></div><div className="study-subject"><div className="tiny-subject-icon"><Brain size={18}/></div><div><b>Human physiology</b><small>Biology · 12 min read</small></div><span className="study-arrow"><ArrowRight size={15}/></span></div><div className="study-rule"></div><div className="study-progress-label"><span>A STUDY ROUTINE</span><b>Choose your pace</b></div><div className="week-bars"><div><i className="done"></i><small>M</small></div><div><i className="done"></i><small>T</small></div><div><i className="done"></i><small>W</small></div><div><i className="today"></i><small>T</small></div><div><i></i><small>F</small></div><div><i></i><small>S</small></div><div><i></i><small>S</small></div></div><div className="study-footer"><span><span className="green-star">✦</span> Build a steady routine</span><span className="study-streak">Your pace, your plan <span>↗</span></span></div></div><div className="visual-stamp"><div>Learn<br/>with<br/><i>purpose.</i></div><span>Y · M</span></div><div className="visual-leaf leaf-a">✳</div><div className="visual-leaf leaf-b">✣</div></div></section>
      <section className="trust-strip"><span>BUILT AROUND YOUR GOALS</span><div><i>Learn clearly</i><i>Practise confidently</i><i>Progress steadily</i></div><span>ONE GOOD SESSION AT A TIME ↗</span></section>
      <section className="section-block subjects-section" id="subjects"><div className="section-heading"><div><div className="eyebrow muted">YOUR FOUNDATION, COVERED</div><h2>Six subjects. <i>One clear path.</i></h2><p>Everything you need to build strong foundations, organized around how you actually study.</p></div><span className="section-index">01 <span>—</span> 06</span></div><div className="subject-grid">{subjects.map((s,i)=><Link key={s.name} to={user ? `/learn?subject=${s.name}` : '/register'} className="subject-card"><div className="subject-card-top"><span className={`subject-icon ${s.color}`}><s.icon size={19}/></span><span className="subject-number">0{i+1}</span></div><h3>{s.name}</h3><p>{s.topics}</p><span className="card-link">Explore subject <ArrowRight size={14}/></span></Link>)}</div></section>
      <section className="feature-section" id="how"><div className="feature-intro"><div className="eyebrow muted">A STUDY SPACE THAT GETS YOU</div><h2>Study your way.<br/><i>Make it count.</i></h2><p>From first concepts to final revision, the right tools make it easier to keep showing up.</p><Link to={user ? '/dashboard' : '/register'} className="text-link">Find your starting point <ArrowRight size={15}/></Link><div className="hand-note">No rush. Just forward. <span>↗</span></div></div><div className="feature-list">{sections.map((s,i)=><Link to={user ? s.slug === 'practice' ? '/learn?type=practice' : s.slug === 'high-yield' ? '/nyani' : `/learn?type=${s.slug}` : '/register'} className="feature-row" key={s.slug}><span className={`feature-icon ${s.tint}`}><s.icon size={19}/></span><span className="feature-copy"><small>0{i+1} / {s.label}</small><b>{s.name}</b><span>{s.desc}</span></span><span className="feature-arrow"><ArrowRight size={17}/></span></Link>)}</div></section>
      <section className="bottom-cta"><div className="cta-flower">✳</div><div><div className="eyebrow">YOUR NEXT CHAPTER STARTS SMALL</div><h2>A little progress goes<br/><i>a long way.</i></h2><p>Pick a subject. Find your rhythm. We’ll be here for the next step.</p><Link to={user ? '/dashboard' : '/register'} className="button-dark">{user ? 'Go to my dashboard' : 'Create your free account'} <ArrowRight size={16}/></Link></div><div className="cta-orbit"><div className="orbit-ring"></div><div className="orbit-center"><GraduationCap size={26}/></div><div className="orbit-note">Future<br/>doctor ↗</div><div className="orbit-dot"></div></div></section></main></>;
}

const RECENT_NOTES_KEY = 'yaza-recent-notes';
function rememberNote(file, subject) {
  try {
    const previous = JSON.parse(localStorage.getItem(RECENT_NOTES_KEY) || '[]');
    const next = [{ name: file.name, path: file.path, subject: subject?.title || 'Study notes', subjectSlug: subject?.slug || '', topic: file.topic || '', openedAt: Date.now() }, ...previous.filter(item => item.path !== file.path)].slice(0, 5);
    localStorage.setItem(RECENT_NOTES_KEY, JSON.stringify(next));
  } catch { /* Recent files are a convenience and never block opening a note. */ }
}

function Dashboard({ user, onSignOut }) {
  const [progress, setProgress] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [resources, setResources] = useState([]);
  const [notesError, setNotesError] = useState('');
  const [paperFiles, setPaperFiles] = useState([]);
  const [paperSubject, setPaperSubject] = useState('All subjects');
  const [paperSemester, setPaperSemester] = useState('ALL');
  const [paperSearch, setPaperSearch] = useState('');
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quickResult, setQuickResult] = useState(null);
  const [quickError, setQuickError] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';

  useEffect(() => {
    try { setRecentNotes(JSON.parse(localStorage.getItem(RECENT_NOTES_KEY) || '[]')); } catch { setRecentNotes([]); }
    let live = true;
    fetch('/nyani/manifest.json').then(response => {
      if (!response.ok) throw new Error('Past-paper catalogue could not be loaded.');
      return response.json();
    }).then(data => { if (live) setPaperFiles(data); }).catch(() => {});
    api.get('/progress').then(({data})=>{if(live)setProgress(data);}).catch(e=>{if(live)setError(e.response?.data?.message||'Progress details could not be loaded right now.');});
    api.get('/subjects').then(({data})=>{if(live)setSubjectsData(data);}).catch(()=>{});
    api.get('/notes').then(({data})=>{if(live)setResources((data||[]).flatMap(group=>(group.files||[]).map(file=>({...file,subjectSlug:group.slug}))).slice(0,4));}).catch(e=>{if(live)setNotesError(e.response?.data?.message||'The notes service could not be reached.');});
    api.get('/questions',{params:{limit:10}}).then(({data})=>{if(live)setPracticeQuestion(data?.[0]||null);}).catch(e=>{if(live)setQuickError(e.response?.data?.message||'Practice questions could not be loaded.');}).finally(()=>{if(live)setLoadingQuestion(false);});
    return () => { live = false; };
  }, []);

  const attempts = progress?.attempts || [];
  const totalAnswered = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
  const averageScore = totalAnswered ? Math.round(totalCorrect / totalAnswered * 100) : null;
  const paperSubjects = [...new Set(paperFiles.map(file => file.subject))];
  const visiblePapers = paperFiles.filter(file =>
    (paperSubject === 'All subjects' || file.subject === paperSubject) &&
    (paperSemester === 'ALL' || file.semester === paperSemester) &&
    (!paperSearch.trim() || `${file.title} ${file.subject} ${file.semester} ${file.originalName}`.toLowerCase().includes(paperSearch.trim().toLowerCase()))
  );
  const submitSearch = event => { event.preventDefault(); navigate(`/learn?type=note&q=${encodeURIComponent(query.trim())}`); };
  const submitQuickAnswer = async () => {
    if (!practiceQuestion || selectedOption === null) return;
    setSubmittingAnswer(true);
    setQuickError('');
    try {
      const { data } = await api.post('/attempts', { mode: 'practice', responses: [{ question: practiceQuestion._id, answer: selectedOption }] });
      setQuickResult(data);
      api.get('/progress').then(latestProgress => setProgress(latestProgress.data)).catch(() => {});
    } catch (e) {
      setQuickError(e.response?.data?.message || 'Your answer could not be saved. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };
  const links = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
    { label: 'Notes', href: '/learn?type=note', icon: BookOpen },
    { label: 'Practice questions', href: '/learn?type=practice', icon: CircleHelp },
    { label: 'AI study quiz', href: '/learn?type=ai-quiz', icon: Brain },
    { label: 'Past papers', href: '/nyani', icon: FileText }
  ];
  return <main className="workspace dashboard-workspace">
    <aside className="side-nav dashboard-nav" aria-label="Student navigation">
      <Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link>
      <small>YOUR SPACE</small>
      {links.map(({label,href,icon:Icon,active})=><NavLink key={label} to={href} end={active} className={active?'side-active':undefined}><Icon size={19}/>{label}</NavLink>)}
      <a href="#progress" className="dashboard-progress-link"><ChartNoAxesColumnIncreasing size={19}/>Your progress</a>
      <div className="dashboard-nav-bottom"><div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>{user.email}</small></span></div><button className="dashboard-signout" onClick={onSignOut}><LogOut size={17}/> Sign out</button></div>
    </aside>
    <section className="workspace-main dashboard-main">
      <div className="dashboard-topline"><span>Student workspace</span><span className="dashboard-private"><ShieldCheck size={16}/> Your learning space is private</span></div>
      <header className="dashboard-welcome dashboard-real-welcome"><div><div className="eyebrow muted">YOUR NEXT STEP STARTS HERE</div><h1>Good to see you, <i>{firstName}.</i></h1><p>Pick up where you left off or choose something to study today.</p></div><Link to="/learn?type=note" className="button-primary">Browse notes <ArrowRight size={17}/></Link></header>
      <form className="dashboard-search" onSubmit={submitSearch}><Search size={20}/><input aria-label="Search study notes" placeholder="Search note titles or topics" value={query} onChange={event=>setQuery(event.target.value)}/><button type="submit">Search</button></form>
      {error&&<div className="error-message" role="status">{error}</div>}
      <section className="dashboard-actions-section" aria-labelledby="start-heading"><div className="dashboard-section-title"><div><div className="eyebrow muted">STUDY TOOLS</div><h2 id="start-heading">What would you like to do?</h2></div></div>
        <div className="dashboard-action-grid">
          <Link className="dashboard-action-card action-notes" to="/learn?type=note"><span className="dashboard-action-icon"><BookOpen size={22}/></span><b>Find study notes</b><span>Browse course materials by subject and topic.</span><strong>Browse notes <ArrowRight size={16}/></strong></Link>
          <Link className="dashboard-action-card action-practice" to="/learn?type=practice"><span className="dashboard-action-icon"><CircleHelp size={22}/></span><b>Practise questions</b><span>Answer MCQs and review explanations.</span><strong>Start practising <ArrowRight size={16}/></strong></Link>
          <Link className="dashboard-action-card action-ai" to="/learn?type=ai-quiz"><span className="dashboard-action-icon"><Brain size={22}/></span><b>Make an AI quiz</b><span>Generate a scored quiz from your own material.</span><strong>Create a quiz <ArrowRight size={16}/></strong></Link>
          <Link className="dashboard-action-card action-papers" to="/nyani"><span className="dashboard-action-icon"><FileText size={22}/></span><b>Browse past papers</b><span>Find revision files by subject and exam section.</span><strong>Open Nyani library <ArrowRight size={16}/></strong></Link>
        </div>
      </section>
      <section className="dashboard-content-grid dashboard-live-study">
        <div className="dashboard-panel dashboard-question-panel"><div className="dashboard-section-title"><div><div className="eyebrow muted">A QUICK PRACTICE</div><h2>Try a question now</h2></div><CircleHelp size={19}/></div>
          {loadingQuestion ? <p className="dashboard-muted">Loading a published question…</p> : practiceQuestion ? <>
            <p className="dashboard-question-prompt">{practiceQuestion.prompt}</p>
            <div className="dashboard-option-list">{(practiceQuestion.options||[]).map((option,index)=><button type="button" key={index} disabled={Boolean(quickResult)} className={`${selectedOption===index?'selected':''}${quickResult&&quickResult.explanations?.[0]?.answer===index?' correct':''}`} onClick={()=>setSelectedOption(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div>
            {quickResult&&<div className={`dashboard-question-feedback ${quickResult.explanations?.[0]?.correct?'is-correct':'is-incorrect'}`} role="status"><b>{quickResult.explanations?.[0]?.correct?'Correct':'Review this answer'} · {quickResult.attempt.score}/{quickResult.attempt.total}</b><span>{quickResult.explanations?.[0]?.explanation}</span></div>}
            {quickError&&<div className="error-message" role="alert">{quickError}</div>}
            {!quickResult?<button className="button-primary dashboard-answer-button" disabled={selectedOption===null||submittingAnswer} onClick={submitQuickAnswer}>{submittingAnswer?'Saving answer…':'Check answer'} <ArrowRight size={15}/></button>:<Link to="/learn?type=practice" className="dashboard-panel-link">Keep practising <ArrowRight size={15}/></Link>}
          </> : <div className="dashboard-no-question"><p>{quickError||'There are no published MCQs to show here yet.'}</p><Link to="/learn?type=practice" className="button-outline">Open practice questions <ArrowRight size={15}/></Link></div>}
        </div>
        <div className="dashboard-panel dashboard-papers-panel"><div className="dashboard-section-title"><div><div className="eyebrow muted">READY TO STUDY</div><h2>Past papers & revision</h2></div><span className="dashboard-paper-total">{paperFiles.length} files</span></div>
          <div className="dashboard-paper-filters"><label><Search size={16}/><input aria-label="Search past papers" placeholder="Search the paper library" value={paperSearch} onChange={event=>setPaperSearch(event.target.value)}/></label><select aria-label="Filter papers by subject" value={paperSubject} onChange={event=>setPaperSubject(event.target.value)}><option>All subjects</option>{paperSubjects.map(subject=><option key={subject}>{subject}</option>)}</select><select aria-label="Filter papers by exam section" value={paperSemester} onChange={event=>setPaperSemester(event.target.value)}><option value="ALL">All exams</option><option value="MIDSEM">Midsem</option><option value="ENDSEM">End sem</option></select></div>
          {visiblePapers.length ? <div className="dashboard-paper-list">{visiblePapers.slice(0,4).map(file=>{
            const officeFile=file.type==='office';
            const fileUrl=new URL(file.path,window.location.origin).toString();
            const viewUrl=officeFile?createOfficeViewerUrl(fileUrl):fileUrl;
            return <article className="dashboard-paper-item" key={file.id}><span className="dashboard-paper-icon">{file.type==='image'?<img src={file.path} alt="" loading="lazy"/>:<FileText size={19}/>}</span><span className="dashboard-paper-info"><b>{file.title}</b><small>{file.subject} · {file.semester==='MIDSEM'?'Midsem':'End sem'} · {file.extension.replace('.','').toUpperCase()}</small></span><a className="dashboard-paper-view" href={viewUrl} target="_blank" rel="noreferrer">View</a></article>;
          })}</div> : <p className="dashboard-muted">No papers match those filters. Try another subject or exam section.</p>}
          <Link to="/nyani" className="dashboard-panel-link">Browse the full past-paper library <ArrowRight size={15}/></Link>
        </div>
      </section>
      <section className="dashboard-content-grid">
        <div className="dashboard-panel" id="progress"><div className="dashboard-section-title"><div><div className="eyebrow muted">YOUR ACTIVITY</div><h2>Progress so far</h2></div><BarChart3 size={19}/></div>
          {progress ? <div className="progress-metrics"><div><strong>{attempts.length}</strong><span>recent practice sessions</span></div><div><strong>{totalAnswered}</strong><span>questions answered</span></div><div><strong>{averageScore===null?'—':`${averageScore}%`}</strong><span>accuracy in recent sessions</span></div></div> : <p className="dashboard-muted">Your practice activity will appear here when you complete a question set.</p>}
          {attempts.length>0&&<div className="dashboard-last-session"><span><Clock3 size={17}/></span><div><b>Last practice session</b><small>{new Date(attempts[0].createdAt || attempts[0].completedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {attempts[0].score} of {attempts[0].total} correct</small></div><Link to="/learn?type=practice" aria-label="Continue practising"><ArrowRight size={17}/></Link></div>}
          <Link to="/learn?type=practice" className="dashboard-panel-link">{attempts.length?'Practise again':'Start your first practice set'} <ArrowRight size={15}/></Link>
        </div>
        <div className="dashboard-panel"><div className="dashboard-section-title"><div><div className="eyebrow muted">PICK UP AGAIN</div><h2>Recently opened notes</h2></div><Link to="/learn?type=note">All notes <ArrowRight size={15}/></Link></div>
          {recentNotes.length ? <div className="dashboard-recent-list">{recentNotes.slice(0,3).map(file=><Link key={file.path} to={`/learn?type=note&subject=${encodeURIComponent(file.subjectSlug||'')}&q=${encodeURIComponent(file.topic||'')}`}><span className="recent-file-icon"><FileText size={18}/></span><span><b>{file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</b><small>{file.subject}{file.topic?` · ${file.topic}`:''}</small></span><ArrowRight size={16}/></Link>)}</div> : <p className="dashboard-muted">Notes you open will appear here so you can find them again quickly.</p>}
        </div>
      </section>
      <section className="dashboard-lower-grid">
        <div className="dashboard-panel"><div className="dashboard-section-title"><div><div className="eyebrow muted">YOUR CURRICULUM</div><h2>Browse by subject</h2></div><Link to="/learn?type=note">See all notes <ArrowRight size={15}/></Link></div>
          {subjectsData.length ? <div className="dashboard-subject-list">{subjectsData.slice(0,6).map((item,index)=>{const meta=subjects.find(subject=>subject.name===item.title);const Icon=meta?.icon||BookOpen;return <Link key={item._id||item.slug} to={`/learn?type=note&subject=${encodeURIComponent(item.slug||item.title)}`}><span className={`subject-icon ${meta?.color||'blue'}`}><Icon size={18}/></span><b>{item.title}</b><span>{String(index+1).padStart(2,'0')}</span><ArrowRight size={15}/></Link>;})}</div> : <p className="dashboard-muted">Published subjects will appear here when they are available.</p>}
        </div>
        <div className="dashboard-panel dashboard-resource-panel"><div className="dashboard-section-title"><div><div className="eyebrow muted">STUDY MATERIALS</div><h2>Available study notes</h2></div></div>
          {resources.length ? <div className="dashboard-resource-list">{resources.slice(0,3).map(item=><Link key={item.path} to={`/learn?type=note&subject=${encodeURIComponent(item.subjectSlug)}`}><span className="recent-file-icon"><BookOpen size={18}/></span><span><b>{item.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</b><small>{item.subject}{item.topic?` · ${item.topic}`:''}</small></span><ArrowRight size={16}/></Link>)}</div> : <p className="dashboard-muted">{notesError?`Notes are temporarily unavailable. ${notesError}`:'No study files are listed yet.'} <Link to="/learn?type=note">Open notes library</Link></p>}
        </div>
      </section>
      <section className="dashboard-coming-soon"><span><Sparkles size={19}/></span><div><b>Quick Lessons</b><p>This feature is not available yet. For a short study session, try a practice set or create an AI quiz from your notes.</p></div><Link to="/learn?type=practice">Try practice <ArrowRight size={15}/></Link></section>
      <nav className="dashboard-mobile-nav" aria-label="Quick navigation">{links.slice(0,4).map(({label,href,icon:Icon,active})=><NavLink key={label} to={href} end={active}><Icon size={19}/><span>{label==='Practice questions'?'Practice':label==='AI study quiz'?'AI quiz':label}</span></NavLink>)}<NavLink to="/nyani"><FileText size={19}/><span>Past papers</span></NavLink></nav>
    </section>
  </main>;
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
function NotesLibrary({user}) {
  const [availableSubjects,setAvailableSubjects]=useState([]);
  const [selectedSubject,setSelectedSubject]=useState(null);
  const [noteGroups,setNoteGroups]=useState([]);
  const [loadingSubjects,setLoadingSubjects]=useState(true);
  const [loadingNotes,setLoadingNotes]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [searchParams]=useSearchParams();
  const [query,setQuery]=useState(()=>searchParams.get('q')||'');
  const [retryKind,setRetryKind]=useState('');
  const [subjectsRetry,setSubjectsRetry]=useState(0);
  const [notesRetry,setNotesRetry]=useState(0);
  const requestedSubject=searchParams.get('subject');

  useEffect(()=>{
    let live=true;
    setLoadingSubjects(true);
    setError('');
    setRetryKind('');
    api.get('/subjects')
      .then(({data})=>{if(live){setAvailableSubjects(data);if(requestedSubject){const match=data.find(item=>item.slug?.toLowerCase()===requestedSubject.toLowerCase()||item.title?.toLowerCase()===requestedSubject.toLowerCase());if(match)setSelectedSubject(match);}}})
      .catch(e=>{if(live){setError(e.response?.data?.message||'Unable to load subjects. Please try again.');setRetryKind('subjects');}})
      .finally(()=>{if(live)setLoadingSubjects(false);});
    return()=>{live=false;};
  },[subjectsRetry,requestedSubject]);

  useEffect(()=>{
    if(!selectedSubject&&!query.trim()){setNoteGroups([]);setLoadingNotes(false);return;}
    let live=true;
    setLoadingNotes(true);
    setError('');
    setRetryKind('');
    setNoteGroups([]);
    api.get('/notes',{params:{subject:selectedSubject?.slug,q:query.trim()||undefined}})
      .then(({data})=>{if(live)setNoteGroups(data||[]);})
      .catch(e=>{if(live){setError(e.response?.data?.message||'Unable to load notes. Please try again.');setRetryKind('notes');}})
      .finally(()=>{if(live)setLoadingNotes(false);});
    return()=>{live=false;};
  },[selectedSubject,query,notesRetry]);

  const openStorageNote=async (file,subjectContext=selectedSubject)=>{
    setError('');
    setNotice('');
    const officeFile=officeDocument(file.name);
    const mimeType=notePreviewMimeType(file);
    if(!officeFile&&!mimeType){
      setError('Online preview is not available for this file type. Use Download instead.');
      return;
    }
    const popup=window.open('about:blank','_blank');
    try{
      const {data}=await api.get('/notes/link',{params:{path:file.path,download:'0'}});
      let url;
      if(officeFile){
        url=createOfficeViewerUrl(data.url);
      }else{
        const response=await fetch(data.url);
        if(!response.ok)throw new Error('Could not load this file for online preview.');
        const blob=new Blob([await response.blob()],{type:mimeType});
        url=URL.createObjectURL(blob);
        window.setTimeout(()=>URL.revokeObjectURL(url),30*60*1000);
      }
      if(popup)popup.location=url;
      else window.location.assign(url);
      rememberNote(file,subjectContext);
    }catch(e){
      popup?.close();
      setError(e.response?.data?.message||e.message||'Could not open this note online.');
    }
  };

  const downloadStorageNote=async (file,subjectContext=selectedSubject)=>{
    setError('');
    setNotice('');
    try{
      const {data}=await api.get('/notes/link',{params:{path:file.path,download:'1'}});
      const link=document.createElement('a');
      link.href=data.url;
      link.download=file.name;
      link.rel='noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      rememberNote(file,subjectContext);
      setNotice('Download started. Open the file from your Downloads to choose an installed app.');
    }catch(e){
      setError(e.response?.data?.message||'Could not download this note.');
    }
  };

  const files=noteGroups.flatMap(group=>group.files||[]);

  return <main className="workspace">
    <aside className="side-nav">
      <small>YOUR SPACE</small>
      <NavLink to="/dashboard"><LayoutDashboard size={17}/> Dashboard</NavLink>
      {sections.map(section=>section.slug==='high-yield'
        ? <NavLink key={section.slug} to="/nyani"><section.icon size={17}/>Nyani library</NavLink>
        : <Link key={section.slug} to={`/learn?type=${section.slug}`} className={section.slug==='note'?'active':''}><section.icon size={17}/>{section.small}</Link>)}
      <small>ACCOUNT</small>
      <div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div>
    </aside>
    <section className="workspace-main learn-main">
      <div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>{selectedSubject?`${selectedSubject.title} notes`:'Notes library'}<i>.</i></h1><p>{query.trim()&&!selectedSubject?'Search results across your notes library.':selectedSubject?'Choose a file to view online or download.':'Choose a subject to explore its study notes.'}</p></div>
      {notice&&<div className="success-message" role="status">{notice}</div>}
      {error&&<ErrorNotice message={error} onRetry={retryKind==='subjects'?()=>setSubjectsRetry(value=>value+1):retryKind==='notes'?()=>setNotesRetry(value=>value+1):undefined}/>}
      {query.trim()&&!selectedSubject&&<div className="notes-subject-toolbar"><button className="button-outline" onClick={()=>{setQuery('');setNoteGroups([]);}}><ArrowLeft size={14}/> Browse subjects</button><label><Search size={15}/><input aria-label="Search all notes" placeholder="Search note titles or topics" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>}
      {query.trim()&&!selectedSubject
        ? loadingSubjects||loadingNotes?<div className="content-skeleton"><i/><i/><i/></div>
          : retryKind==='notes'?null
          : noteGroups.length?<div className="note-subject-list">{noteGroups.map(group=><section className="note-subject" key={group.slug}><div className="dash-section-head"><div><div className="eyebrow muted">{group.title.toUpperCase()} · SEARCH RESULTS</div><h2>{group.title} <i>notes</i></h2></div><span>{group.files.length} FILES</span></div><div className="note-file-grid">{group.files.map(file=><article className="material-card note-file-card" key={file.path}><div className="material-card-top"><span className="material-type">{file.contentType?.includes('pdf')||/\.pdf$/i.test(file.name)?'PDF NOTE':'STUDY FILE'}</span><span className="note-topic">{file.topic}</span></div><h3>{file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</h3><p>{file.path}</p><div className="note-actions"><button className="button-outline" onClick={()=>openStorageNote(file,{title:group.title,slug:group.slug})}>View online</button><button className="button-primary" onClick={()=>downloadStorageNote(file,{title:group.title,slug:group.slug})}>Download</button></div></article>)}</div></section>)}</div>
          : <div className="empty-state"><div className="empty-spark">✳</div><div><b>No notes match “{query}”.</b><span>Try a different subject or search term, or browse all notes.</span></div><button className="button-outline" onClick={()=>setQuery('')}>Browse subjects <ArrowRight size={18}/></button></div>
        : !selectedSubject
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
              : <div className="empty-state"><div className="empty-spark">✳</div><div><b>{query.trim()?`No notes match “${query}” in ${selectedSubject.title}.`:`No notes found for ${selectedSubject.title} yet.`}</b><span>{query.trim()?'Try a different search term.':'Try another subject, or practice questions while notes are being added.'}</span></div><button className="button-outline" onClick={()=>{setSelectedSubject(null);setNoteGroups([]);setError('');setQuery('');}}>Browse subjects <ArrowRight size={18}/></button><Link className="button-outline" to="/learn?type=practice">Practice questions <ArrowRight size={18}/></Link></div>}
        </>}
    </section>
  </main>;
}

function LearningFeatureDirectory({user}) {
  return <main className="workspace">
    <aside className="side-nav" aria-label="Learning space navigation">
      <Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link>
      <small>YOUR SPACE</small>
      {sections.map(section=><NavLink key={section.slug} to={learningFeatureHref(section.slug)}><section.icon size={20}/>{section.small}</NavLink>)}
      <div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div>
    </aside>
    <section className="workspace-main learn-main">
      <div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>Explore learning<i>.</i></h1><p>Choose a feature to start studying.</p></div>
      <div className="material-grid learning-feature-grid">{sections.map(section=><Link className="material-card learning-feature-card" key={section.slug} to={learningFeatureHref(section.slug)}><div className="material-card-top"><span className="material-type">{section.label}</span><span className={`feature-icon ${section.tint}`}><section.icon size={22}/></span></div><h3>{section.name}</h3><p>{section.desc}</p><div className="material-card-foot"><span>Open feature</span><ArrowRight size={18}/></div></Link>)}</div>
    </section>
  </main>;
}

function Learn({user}) {
  const [params,setParams]=useSearchParams(); const type=params.get('type')||''; const initialSubject=params.get('subject')||''; const view=params.get('view')||''; const showFeatureDirectory=!type&&!initialSubject&&view!=='materials';
  const [subject,setSubject]=useState(initialSubject); const [items,setItems]=useState([]); const [noteGroups,setNoteGroups]=useState([]); const [questions,setQuestions]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [loadError,setLoadError]=useState(false); const [reload,setReload]=useState(0); const [q,setQ]=useState(''); const [page,setPage]=useState(1); const [responses,setResponses]=useState({}); const [result,setResult]=useState(null); const [detail,setDetail]=useState(null); const [saved,setSaved]=useState({});
  useEffect(()=>{
    if(showFeatureDirectory||view==='materials'||type==='note'||type==='ai-quiz'||type==='quick-lesson')return;
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
  },[showFeatureDirectory,view,type,subject,page,q,reload]);
  const title=type==='note'?'Notes library':type==='high-yield'?'Nyani & high-yield':type==='practice'?'Practice questions':'Explore learning';
  const chooseType=t=>{setParams(t?{type:t}:{view:'materials'});setPage(1);setResponses({});setResult(null);};
  const submit=async()=>{try{const {data}=await api.post('/attempts',{mode:'practice',responses:Object.entries(responses).map(([question,answer])=>({question,answer}))});setResult(data);}catch(e){setError(e.response?.data?.message||'Your answers could not be submitted.');}};
  const bookmark=async item=>{try{await api.post('/bookmarks',{material:item._id,materialType:item.type});setSaved({...saved,[item._id]:true});}catch(e){setError(e.response?.data?.message||'Could not save this item.');}};
  const openItem=async item=>{try{const {data}=await api.get(`/content/${item._id}`);setDetail(data);}catch(e){setError(e.response?.data?.message||'Could not open this learning resource.');}};
  const openStorageNote=async file=>{
    setError('');
    const officeFile=officeDocument(file.name);
    const mimeType=notePreviewMimeType(file);
    if(!officeFile&&!mimeType){setError('Online preview is not available for this file type. Use Download instead.');return;}
    const popup=window.open('about:blank','_blank');
    try{
      const {data}=await api.get('/notes/link',{params:{path:file.path,download:'0'}});
      let url;
      if(officeFile)url=createOfficeViewerUrl(data.url);
      else{
        const response=await fetch(data.url);
        if(!response.ok)throw new Error('Could not load this file for online preview.');
        url=URL.createObjectURL(new Blob([await response.blob()],{type:mimeType}));
        window.setTimeout(()=>URL.revokeObjectURL(url),30*60*1000);
      }
      if(popup)popup.location=url;
      else window.location.assign(url);
    }catch(e){popup?.close();setError(e.response?.data?.message||e.message||'Could not open this note online.');}
  };
  const downloadStorageNote=async file=>{try{const {data}=await api.get('/notes/link',{params:{path:file.path,download:'1'}});const link=document.createElement('a');link.href=data.url;link.download=file.name;link.rel='noreferrer';document.body.appendChild(link);link.click();link.remove();}catch(e){setError(e.response?.data?.message||'Could not download this note.');}};
  if(view==='materials')return null;
  if(type==='quick-lesson')return <Navigate to="/learn?type=note" replace/>;
  if(showFeatureDirectory)return <LearningFeatureDirectory user={user}/>;
  if(type==='note')return <NotesLibrary user={user}/>;
  if(type==='ai-quiz')return <AiQuiz user={user}/>;
  return <main className="workspace"><aside className="side-nav" aria-label="Learning space navigation"><Link to="/dashboard" className="side-brand"><span className="brand-symbol" aria-hidden="true"><span></span><span></span><span></span></span> yaza<span>med</span></Link><small>YOUR SPACE</small>{sections.map(s=>s.slug==='high-yield'?<NavLink key={s.slug} to='/nyani'><s.icon size={20}/>Nyani library</NavLink>:<button key={s.slug} className={type===s.slug?'side-active':''} onClick={()=>chooseType(s.slug)}><s.icon size={20}/>{s.small}</button>)}<small>ACCOUNT</small><div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div></aside><section className="workspace-main learn-main"><div className="learn-heading"><div className="eyebrow muted">A GOOD PLACE TO BEGIN</div><h1>{title}<i>.</i></h1><p>Small, steady steps make a strong foundation.</p></div><div className="learn-controls"><div className="learn-filters"><label><Search size={15}/><input placeholder="Search materials" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setPage(1)}/><button className="search-submit" onClick={()=>{setPage(1);document.activeElement.blur()}}>Go</button></label><select aria-label="Filter subject" value={subject} onChange={e=>{setSubject(e.target.value);setPage(1)}}><option value="">All subjects</option>{subjects.map(s=><option value={s.name} key={s.name}>{s.name}</option>)}</select></div></div>{error&&<ErrorNotice message={error} onRetry={loadError?()=>setReload(value=>value+1):undefined}/>}{loading?<div className="content-skeleton"><i/><i/><i/></div>:type==='practice'?<><div className="quiz-help"><span><CircleHelp size={18}/></span><div><b>Learn from every answer.</b><small>Your choices stay private. When you submit, you’ll see the correct answers and explanations.</small></div><span className="quiz-count">{questions.length} QUESTIONS</span></div>{questions.length?<div className="question-list">{questions.map((item,i)=><article className="question-card" key={item._id}><div className="question-meta"><span>QUESTION {String(i+1).padStart(2,'0')}</span><span>{item.difficulty||'medium'} · {item.topic?.title||'Core concepts'}</span></div><h3>{item.prompt}</h3><div className="option-list">{(item.options||[]).map((option,index)=><label key={index} className={responses[item._id]===index?'option-selected':''}><input type="radio" name={item._id} checked={responses[item._id]===index} onChange={()=>setResponses({...responses,[item._id]:index})}/><span className="option-letter">{String.fromCharCode(65+index)}</span>{option}</label>)}</div>{result&&<div className={`answer-feedback ${result.explanations.find(x=>x.question===item._id)?.correct?'good':'needs-work'}`}><b>{result.explanations.find(x=>x.question===item._id)?.correct?'That’s right.':'Let’s learn from it.'}</b> {result.explanations.find(x=>x.question===item._id)?.explanation}</div>}</article>)}<button className="button-primary submit-quiz" onClick={submit} disabled={Object.keys(responses).length===0}>Check my answers <ArrowRight size={15}/></button>{result&&<div className="quiz-result"><Check size={19}/><div><b>{result.percentage}% — a solid step forward.</b><span>You got {result.attempt.score} of {result.attempt.total} correct.</span></div></div>}</div>:loadError?null:<div className="empty-state"><div className="empty-spark">✳</div><div><b>There aren’t any published questions here yet.</b><span>Choose another subject or return soon. Your first practice set is on its way.</span></div><Link to="/learn?type=note" className="button-outline">Browse notes <ArrowRight size={18}/></Link></div>}</>:type==='note'?noteGroups.length?<div className="note-subject-list">{noteGroups.map(group=><section className="note-subject" key={group.slug}><div className="dash-section-head"><div><div className="eyebrow muted">COURSE OUTLINE</div><h2>{group.title} <i>notes</i></h2></div><span>{group.files.length} FILES</span></div><div className="note-file-grid">{group.files.map(file=><article className="material-card note-file-card" key={file.path}><div className="material-card-top"><span className="material-type">{file.contentType?.includes('pdf')||/\.pdf$/i.test(file.name)?'PDF NOTE':'STUDY FILE'}</span><span className="note-topic">{file.topic}</span></div><h3>{file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}</h3><p>{file.path}</p><div className="note-actions"><button className="button-outline" onClick={()=>openStorageNote(file)}>View online <ArrowRight size={14}/></button><button className="button-primary" onClick={()=>downloadStorageNote(file)}>Download</button></div></article>)}</div></section>)}</div>:<div className="empty-state"><div className="empty-spark">✳</div><div><b>No notes found for this subject yet.</b><span>Study files in Supabase Storage appear here when they are placed in subject folders and the course outline is available.</span></div><Link to="/learn?type=practice" className="button-outline">Practice questions <ArrowRight size={18}/></Link></div>:items.length?<><div className="material-grid">{items.map(item=><article className="material-card" key={item._id}><div className="material-card-top"><span className="material-type">{item.type==='high-yield'?'HIGH-YIELD':'STUDY NOTE'}</span><button className={`bookmark-btn ${saved[item._id]?'is-saved':''}`} aria-label="Save for later" onClick={()=>bookmark(item)}>{saved[item._id]?<Check size={18}/>:<Bookmark size={18}/>}</button></div><h3>{item.title}</h3><p>{item.body?.replace(/<[^>]*>/g,'').slice(0,155)||'Open this learning resource to explore the topic and build your understanding.'}{item.body?.length>155?'…':''}</p><div className="material-card-foot"><span>{item.subject?.title||'Learning resource'} {item.duration?`· ${item.duration} min`:''}</span><button onClick={()=>openItem(item)}>Read <ArrowRight size={18}/></button></div></article>)}</div><div className="pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}>← Previous</button><span>Page {page}</span><button disabled={items.length<9} onClick={()=>setPage(page+1)}>Next →</button></div></>:loadError?null:<div className="empty-state"><div className="empty-spark">✳</div><div><b>No published resources in this view yet.</b><span>Try a different study area or choose another subject. Your learning dashboard will point you to available activities.</span></div><Link to="/learn?type=note" className="button-outline">Browse notes <ArrowRight size={18}/></Link><Link to="/learn?type=practice" className="button-outline">Practice questions <ArrowRight size={18}/></Link></div>}{detail&&<div className="modal-backdrop" onClick={()=>setDetail(null)}><article className="reader-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setDetail(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow muted">{detail.type==='high-yield'?'Nyani & high-yield':'Notes library'}</div><h2>{detail.title}</h2><div className="reader-subtitle">{detail.subject?.title||'Study resource'} {detail.duration?`· ${detail.duration} minute read`:''}</div>{detail.objectives?.length>0&&<div className="reader-objectives"><b>By the end, you’ll be able to</b>{detail.objectives.map((o,i)=><span key={i}><Check size={14}/>{o}</span>)}</div>}<div className="reader-body">{detail.body?.split('\n').map((line,i)=>line?<p key={i}>{line}</p>:<br key={i}/>)}</div>{detail.pdfUrl&&<a className="button-outline" href={detail.pdfUrl} target="_blank" rel="noreferrer">Open PDF <ArrowRight size={14}/></a>}</article></div>}</section></main>;
}

function Admin() {
  const [items,setItems]=useState([]),[subjectsData,setSubjectsData]=useState([]),[form,setForm]=useState({type:'note',title:'',body:'',subject:'',status:'draft'}),[message,setMessage]=useState(''),[error,setError]=useState('');
  const refresh=()=>api.get('/admin/content').then(r=>setItems(r.data)).catch(e=>setError(e.response?.data?.message||'Unable to load content.'));
  useEffect(()=>{refresh();api.get('/subjects').then(r=>setSubjectsData(r.data)).catch(()=>{});},[]);
  const submit=async e=>{e.preventDefault();setMessage('');setError('');try{await api.post('/admin/content',form);setMessage('Draft created. Publish it when it’s ready for students.');setForm({...form,title:'',body:''});refresh();}catch(e){setError(e.response?.data?.message||'Could not save your draft.');}};
  const publish=async item=>{try{await api.patch(`/admin/content/${item._id}`,{status:item.status==='published'?'draft':'published'});refresh();}catch(e){setError(e.response?.data?.message||'Could not update this resource.');}};
  const remove=async item=>{try{await api.delete(`/admin/content/${item._id}`);refresh();}catch(e){setError(e.response?.data?.message||'Could not remove this resource.');}};
  return <main className="workspace"><aside className="side-nav"><Link to="/dashboard" className="side-brand"><span className="brand-symbol"><span></span><span></span><span></span></span> yaza<span>med</span></Link><small>ADMIN STUDIO</small><NavLink to="/admin"><ShieldCheck size={17}/> Content studio</NavLink><NavLink to="/dashboard"><LayoutDashboard size={17}/> Student view</NavLink></aside><section className="workspace-main"><div className="workspace-top">Administrator workspace</div><div className="learn-heading"><div className="eyebrow muted">MAKE ROOM FOR LEARNING</div><h1>Content <i>studio.</i></h1><p>Create drafts, organize resources, and publish when you’re ready.</p></div>{message&&<div className="success-message"><Check size={16}/>{message}</div>}{error&&<div className="error-message">{error}</div>}<div className="admin-layout"><form className="admin-form" onSubmit={submit}><h2>Create a learning resource</h2><p>Draft content is visible to administrators only.</p><label>Resource type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="note">Study note</option><option value="high-yield">High-yield topic</option></select></label><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength="180"/></label><label>Subject<select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} required><option value="">Choose a subject</option>{subjectsData.map(s=><option key={s._id} value={s._id}>{s.title}</option>)}</select></label><label>Lesson content<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} required rows="9" placeholder="Write a clear explanation…"/></label><button className="button-primary">Save as draft <ArrowRight size={14}/></button></form><div className="admin-list"><div className="admin-list-heading"><div><h2>Learning resources</h2><p>{items.length} resources in your studio</p></div><span>ALL SUBJECTS</span></div>{items.length?items.map(item=><article key={item._id} className="admin-item"><div><span className="admin-status">{item.status}</span><b>{item.title}</b><small>{item.type} · {item.subject?.title||'Subject'}</small></div><button className="button-outline" onClick={()=>publish(item)}>{item.status==='published'?'Unpublish':'Publish'}</button><button className="admin-delete" aria-label="Delete resource" onClick={()=>remove(item)}><X size={15}/></button></article>):<div className="empty-state"><div className="empty-spark">✳</div><div><b>Your studio is ready.</b><span>Resources you create will appear here.</span></div></div>}</div></div></section></main>;
}
export default App;
