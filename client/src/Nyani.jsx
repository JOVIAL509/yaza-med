import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, FileText, Image as ImageIcon, Search, X } from 'lucide-react';
import { NYANI_IMAGE_ANSWERS } from './nyaniAnswers.js';
import { createOfficeViewerUrl } from './officeViewer.js';

const SUBJECTS = ['Biology', 'Chemistry', 'ICT', 'Language', 'Mathematics', 'Physics'];
const SEMESTERS = ['MIDSEM', 'ENDSEM'];

function publicFileUrl(path) {
  return `${window.location.origin}${path}`;
}

export default function Nyani() {
  const [files, setFiles] = useState([]);
  const [subject, setSubject] = useState('Biology');
  const [semester, setSemester] = useState('MIDSEM');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null);
  const [answerFor, setAnswerFor] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch('/nyani/manifest.json')
      .then(response => {
        if (!response.ok) throw new Error('Could not load the Nyani file list.');
        return response.json();
      })
      .then(setFiles)
      .catch(error => setLoadError(error.message));
  }, []);

  const visibleFiles = useMemo(() => files.filter(file =>
    file.subject === subject && file.semester === semester &&
    file.title.toLowerCase().includes(query.trim().toLowerCase())
  ), [files, subject, semester, query]);

  const answers = answerFor ? files.filter(file =>
    file.subject === answerFor.subject && file.semester === answerFor.semester &&
    /answer|solution|soln|key/i.test(`${file.title} ${file.originalName}`)
  ) : [];
  const imageAnswer = answerFor ? NYANI_IMAGE_ANSWERS[answerFor.path] : null;

  const openFile = file => {
    const href = file.type === 'office' ? createOfficeViewerUrl(publicFileUrl(file.path)) : file.path;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return <main className="nyani-page">
    <div className="nyani-breadcrumb"><Link to="/learn?type=note"><ArrowLeft size={15}/> Back to Notes</Link><span> / Nyani library</span></div>
    <header className="nyani-heading">
      <div className="nyani-heading-icon"><BookOpen size={20}/></div>
      <div><div className="eyebrow muted">PAST PAPERS & REVISION</div><h1>Nyani <i>library.</i></h1><p>Browse past papers and revision files by subject and semester.</p></div>
    </header>

    <div className="nyani-filters">
      <div className="nyani-filter-row"><span>Subject</span><div className="nyani-subject-tabs">{SUBJECTS.map(name => <button key={name} className={subject === name ? 'selected' : ''} onClick={() => setSubject(name)}>{name}</button>)}</div></div>
      <div className="nyani-filter-row nyani-term-row"><span>Exam section</span><div className="nyani-term-tabs">{SEMESTERS.map(name => <button key={name} className={semester === name ? 'selected' : ''} onClick={() => setSemester(name)}>{name === 'MIDSEM' ? 'Midsem' : 'End sem'}</button>)}</div>
        <label className="nyani-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a paper" aria-label="Search papers"/></label>
      </div>
    </div>

    <div className="nyani-results-head"><div><div className="eyebrow muted">{subject.toUpperCase()} · {semester === 'MIDSEM' ? 'MIDSEM' : 'END SEM'}</div><h2>{subject} {semester === 'MIDSEM' ? 'Midsem' : 'End sem'}</h2></div><span>{visibleFiles.length} {visibleFiles.length === 1 ? 'FILE' : 'FILES'}</span></div>
    {loadError ? <div className="error-message" role="alert">{loadError}</div> : visibleFiles.length === 0 ? <div className="nyani-empty"><BookOpen size={23}/><b>No files in this section yet.</b><span>Try the other exam section or subject.</span></div> :
      <div className="nyani-grid">{visibleFiles.map(file => <article key={file.id} className={`nyani-card ${file.type === 'image' ? 'nyani-image-card' : ''}`}>
        {file.type === 'image' ? <button className="nyani-image-preview" onClick={() => setPreview(file)} aria-label={`View image ${file.title}`}><img src={file.path} alt={file.title} loading="lazy"/><span><ImageIcon size={14}/> Tap to view</span></button> : <div className="nyani-file-icon"><FileText size={24}/><span>{file.extension.slice(1).toUpperCase()}</span></div>}
        <div className="nyani-card-content"><span className="nyani-kind">{file.type === 'image' ? 'IMAGE' : file.type === 'pdf' ? 'PDF DOCUMENT' : 'OFFICE DOCUMENT'}</span><h3>{file.title}</h3><div className="nyani-card-actions">
          {file.type === 'image' ? <button className="nyani-view-answer" onClick={() => setAnswerFor(file)}>View answer</button> : <button className="nyani-open-file" onClick={() => openFile(file)}>View <ArrowRight size={14}/></button>}
          <a className="nyani-download" href={file.path} download={file.originalName}><ArrowDownToLine size={14}/> Download</a>
        </div></div>
      </article>)}</div>}

    {preview && <div className="nyani-lightbox" role="dialog" aria-modal="true" aria-label={preview.title} onClick={() => setPreview(null)}><button className="nyani-lightbox-close" onClick={() => setPreview(null)} aria-label="Close image"><X/></button><img src={preview.path} alt={preview.title}/><div>{preview.title}</div></div>}
    {answerFor && <div className="modal-backdrop" onClick={() => setAnswerFor(null)}><section className="nyani-answer-dialog" role="dialog" aria-modal="true" aria-labelledby="answer-title" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setAnswerFor(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow muted">ANSWER MATERIAL</div><h2 id="answer-title">{answerFor.title}</h2>{imageAnswer && <><p>Answer key for this image:</p><div className="nyani-answer-key">{imageAnswer}</div></>}{answers.length ? <><p>Related answer documents:</p><ul>{answers.map(file => <li key={file.id}><span>{file.title}</span><button className="nyani-open-file" onClick={() => openFile(file)}>Open <ArrowRight size={14}/></button></li>)}</ul></> : !imageAnswer && <p>No answer key is available for this image yet.</p>}<button className="button-outline" onClick={() => setAnswerFor(null)}>Close</button></section></div>}
  </main>;
}
