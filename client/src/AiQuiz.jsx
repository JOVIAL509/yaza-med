import { useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Check, FileText, LoaderCircle, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { api } from './api.js';

const ACCEPTED_FILES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.odg,.rtf,.epub,.txt,.md,.csv,.html,.htm,.tex,.json,.xml,.png,.jpg,.jpeg,.webp,.gif';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_QUESTIONS = 30;
const MAX_SHORT_ANSWERS = 3;

export default function AiQuiz({user}) {
  const fileInput = useRef(null);
  const [file,setFile]=useState(null);
  const [dragging,setDragging]=useState(false);
  const [quiz,setQuiz]=useState(null);
  const [answers,setAnswers]=useState({});
  const [shortAnswers,setShortAnswers]=useState(Array(MAX_SHORT_ANSWERS).fill(''));
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');

  const chooseFile=nextFile=>{
    setError('');
    if(!nextFile)return;
    if(nextFile.size>MAX_FILE_SIZE){setError('Handouts must be 15 MB or smaller.');return;}
    setFile(nextFile);
    setQuiz(null);
    setAnswers({});
    setShortAnswers(Array(MAX_SHORT_ANSWERS).fill(''));
    setResult(null);
  };

  const generate=async()=>{
    if(!file)return;
    setLoading(true);
    setError('');
    try{
      const formData=new FormData();
      formData.append('file',file);
      const {data}=await api.post('/ai-quiz/generate',formData);
      setQuiz(data);
      setAnswers({});
      setShortAnswers(Array(MAX_SHORT_ANSWERS).fill(''));
      setResult(null);
    }catch(e){
      setError(e.response?.data?.message||(e.response?'Yaza Med AI could not create this quiz. Check the API logs and try again.':'Could not reach the Yaza Med API. Check that the server is running, then try again.'));
    }finally{
      setLoading(false);
    }
  };

  const submit=async()=>{
    if(!quiz)return;
    setSubmitting(true);
    setError('');
    try{
      const {data}=await api.post('/ai-quiz/submit',{
        quizToken:quiz.quizToken,
        answers:quiz.questions.map((_,index)=>answers[index]),
        shortAnswers
      });
      setResult(data);
    }catch(e){
      setError(e.response?.data?.message||'Could not score this quiz. Please try again.');
    }finally{
      setSubmitting(false);
    }
  };

  const reset=()=>{
    setFile(null);
    setQuiz(null);
    setAnswers({});
    setShortAnswers(Array(MAX_SHORT_ANSWERS).fill(''));
    setResult(null);
    setError('');
    if(fileInput.current)fileInput.current.value='';
  };

  const completedAnswers=Object.keys(answers).length+shortAnswers.filter(answer=>answer.trim()).length;
  const totalAnswers=MAX_QUESTIONS+MAX_SHORT_ANSWERS;
  return <main className="workspace">
    <aside className="side-nav">
      <small>YOUR SPACE</small>
      <NavLink to="/learn?type=note"><BookOpen size={17}/> Notes</NavLink>
      <NavLink to="/learn?type=ai-quiz" className="side-active"><Sparkles size={17}/> Yaza Med AI quiz</NavLink>
      <NavLink to="/learn?type=practice"><Brain size={17}/> Practice</NavLink>
      <NavLink to="/nyani"><Sparkles size={17}/> Nyani library</NavLink>
      <small>ACCOUNT</small>
      <Link to="/learn?view=materials"><BookOpen size={17}/> My subjects</Link>
      <div className="side-user"><span className="user-avatar">{user.name?.slice(0,1).toUpperCase()}</span><span><b>{user.name}</b><small>Student</small></span></div>
    </aside>
    <section className="workspace-main learn-main ai-quiz-main">
      <div className="learn-heading"><div className="eyebrow muted">EXAMINER-STYLE ASSESSMENT</div><h1>Yaza Med AI <i>quiz.</i></h1><p>Upload study material for 30 original multiple-choice questions and 3 structured short-answer questions.</p></div>
      {error&&<div className="error-message" role="alert">{error}</div>}
      {!quiz&&<section className={`ai-upload-panel ${dragging?'is-dragging':''}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);chooseFile(event.dataTransfer.files?.[0]);}}>
        <input ref={fileInput} type="file" accept={ACCEPTED_FILES} hidden onChange={event=>chooseFile(event.target.files?.[0])}/>
        <div className="ai-upload-icon"><Upload size={23}/></div>
        <h2>{file?'Study material ready':'Drop your study material here'}</h2>
        <p>{file?file.name:'Upload your course material and turn it into a focused practice session.'}</p>
        <button className="button-outline" onClick={()=>file?reset():fileInput.current?.click()}>{file?'Choose a different file':'Browse files'} <ArrowRight size={14}/></button>
        <small>PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, OpenDocument, EPUB, RTF, TXT, Markdown, CSV, JSON, XML, HTML, and PNG/JPG/WEBP/GIF · 15 MB max</small>
        {file&&<button className="button-primary ai-generate-button" disabled={loading} onClick={generate}>{loading?<><LoaderCircle className="ai-spinner" size={16}/> Building your quiz…</>:<>Create my quiz <Sparkles size={15}/></>}</button>}
      </section>}
      {quiz&&!result&&<div className="ai-quiz-content">
        <div className="ai-quiz-toolbar">
          <div><span className="material-type">HANDOUT</span><b><FileText size={15}/>{quiz.fileName}</b>{quiz.cacheHit&&<span className="ai-cache-note"><Check size={13}/> Reused saved questions</span>}</div>
          <span>{completedAnswers} / {totalAnswers} answered</span>
        </div>
        <section className="ai-question-section"><div className="ai-section-title"><span>01</span><div><h2>Multiple choice</h2><p>Choose the best answer for each question.</p></div><b>30 QUESTIONS</b></div>
          {quiz.questions.map((question,index)=><article className="ai-question-card" key={index}>
            <div className="ai-question-number">QUESTION {String(index+1).padStart(2,'0')}</div>
            <h3>{question.prompt}</h3>
            <div className="ai-option-list">{question.options.map((option,optionIndex)=><label key={optionIndex} className={answers[index]===optionIndex?'is-selected':''}>
              <input type="radio" name={`ai-question-${index}`} checked={answers[index]===optionIndex} onChange={()=>setAnswers(current=>({...current,[index]:optionIndex}))}/>
              <span>{String.fromCharCode(65+optionIndex)}</span>{option}
            </label>)}</div>
          </article>)}
        </section>
        <section className="ai-question-section"><div className="ai-section-title"><span>02</span><div><h2>Structured short answer</h2><p>Answer each labeled part; each question is worth 10 marks.</p></div><b>3 QUESTIONS</b></div>
          {quiz.shortAnswerQuestions.map((question,index)=><article className="ai-question-card ai-short-answer-card" key={index}>
            <div className="ai-question-number">QUESTION {String(index+1).padStart(2,'0')}</div>
            <h3>{question.prompt}</h3>
            <textarea value={shortAnswers[index]} maxLength={5000} onChange={event=>setShortAnswers(current=>current.map((answer,i)=>i===index?event.target.value:answer))} placeholder="Answer the labeled parts here…" aria-label={`Short answer ${index+1}`}/>
          </article>)}
        </section>
        <button className="button-primary ai-submit-button" disabled={submitting} onClick={submit}>{submitting?<><LoaderCircle className="ai-spinner" size={16}/> Checking your answers…</>:<>Finish and see my score <ArrowRight size={15}/></>}</button>
      </div>}
      {result&&<section className="ai-results">
        <div className="ai-score-card"><div className="ai-score-icon"><Check size={22}/></div><div className="eyebrow muted">YOUR MULTIPLE-CHOICE SCORE</div><strong>{result.score}<span> / {result.total}</span></strong><p>{result.percentage}% correct · Short answers are ready for self-review below.</p><button className="button-outline" onClick={reset}><RotateCcw size={14}/> Try another handout</button></div>
        <div className="ai-section-title"><span>01</span><div><h2>Multiple-choice review</h2><p>Review the correct option and explanation for each question.</p></div></div>
        {result.questions.map((question,index)=><article className={`ai-review-card ${question.correct?'is-correct':'is-incorrect'}`} key={index}>
          <div className="ai-question-number">QUESTION {String(index+1).padStart(2,'0')} · {question.correct?'CORRECT':'REVIEW'}</div><h3>{question.prompt}</h3>
          <div className="ai-review-answer"><b>Your answer:</b> {question.selectedAnswer===null?'Not answered':question.options[question.selectedAnswer]}</div>
          {!question.correct&&<div className="ai-review-answer"><b>Correct answer:</b> {question.options[question.correctAnswer]}</div>}
          <p>{question.explanation}</p>
        </article>)}
        <div className="ai-section-title ai-saq-review-title"><span>02</span><div><h2>Short-answer review</h2><p>Compare your response with the model answer and 10-mark guide.</p></div></div>
        {result.shortAnswerQuestions.map((question,index)=><article className="ai-review-card ai-saq-review-card" key={index}>
          <div className="ai-question-number">QUESTION {String(index+1).padStart(2,'0')} · 10 MARKS</div><h3>{question.prompt}</h3><div><b>Your response</b><p>{question.response||'No response submitted.'}</p></div><div><b>Model answer</b><p>{question.modelAnswer}</p></div><div><b>Marking guide</b><ul>{question.keyPoints.map((point,pointIndex)=><li key={pointIndex}>{point}</li>)}</ul></div>
        </article>)}
      </section>}
    </section>
  </main>;
}
