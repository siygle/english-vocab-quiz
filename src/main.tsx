import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { speakWord, stopSpeech } from './audio';
import { buildQuestions, gradeAnswer, maskWord, parseBank, type Answer, type Question, type QuizMode } from './quizEngine';
import './styles.css';

const sample = `apple,蘋果
beautiful,美麗的;漂亮的
library,圖書館
important,重要的
remember,記得;想起
question,問題;題目
language,語言
exercise,練習;運動
weather,天氣
journey,旅行;旅程`;

type Screen = 'setup' | 'quiz' | 'result';

function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [title, setTitle] = useState('Vocabulary Quiz');
  const [minutes, setMinutes] = useState(10);
  const [questionCount, setQuestionCount] = useState(10);
  const [maskRatio, setMaskRatio] = useState(0.45);
  const [speechRate, setSpeechRate] = useState(0.8);
  const [speechRepeat, setSpeechRepeat] = useState(2);
  const [modes, setModes] = useState<QuizMode[]>(['card', 'audio']);
  const [bankText, setBankText] = useState(sample);
  const [message, setMessage] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerEn, setAnswerEn] = useState('');
  const [answerZh, setAnswerZh] = useState('');
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const current = questions[index];
  const wrongQuestions = useMemo(() => answers.filter((answer) => !answer.ok).map(({ word, zh, mode }) => ({ word, zh, mode })), [answers]);

  useEffect(() => {
    if (screen !== 'quiz' || !endAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endAt, screen]);

  useEffect(() => {
    if (screen === 'quiz' && endAt && now >= endAt) finishQuiz();
  }, [endAt, now, screen]);

  useEffect(() => {
    if (screen !== 'quiz' || current?.mode !== 'audio') {
      stopSpeech();
      return;
    }

    void speakWord(current.word, speechRepeat, speechRate);
    return () => stopSpeech();
  }, [current?.mode, current?.word, index, screen]);

  function toggleMode(mode: QuizMode) {
    setModes((value) => (value.includes(mode) ? value.filter((item) => item !== mode) : [...value, mode]));
  }

  function startQuiz(pool?: Question[]) {
    try {
      const bank = parseBank(bankText);
      if (!bank.length) throw new Error('請先匯入題庫。');
      if (!modes.length) throw new Error('至少選擇一種出題方式。');

      const nextQuestions = pool ?? buildQuestions(bank, modes, questionCount);
      setQuestions(nextQuestions);
      setIndex(0);
      setAnswers([]);
      setAnswerEn('');
      setAnswerZh('');
      setEndAt(minutes > 0 ? Date.now() + minutes * 60 * 1000 : null);
      setNow(Date.now());
      setMessage('');
      setScreen('quiz');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function submitAnswer() {
    if (!current) return;
    const graded = gradeAnswer(current, answerEn.trim(), answerZh.trim());
    setAnswers((value) => [...value, graded]);
    setAnswerEn('');
    setAnswerZh('');

    if (index + 1 >= questions.length) {
      setScreen('result');
    } else {
      setIndex((value) => value + 1);
    }
  }

  function finishQuiz() {
    setScreen('result');
  }

  function retryWrong() {
    if (!wrongQuestions.length) {
      alert('沒有錯題可以重測。');
      return;
    }
    startQuiz(wrongQuestions);
  }

  const left = endAt ? Math.max(0, endAt - now) : null;
  const timeText = left === null ? '不限時' : `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  const score = answers.filter((answer) => answer.ok).length;

  return (
    <main className="app">
      {screen === 'setup' && (
        <section className="panel">
          <h1>英文單字隨機測驗</h1>
          <p className="hint">匯入題庫、設定題數與時間後，系統會隨機抽考。支援「缺字單字卡」與「聽讀音作答」。</p>

          <div className="grid two">
            <label>
              測驗標題
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              答題時間（分鐘，0 = 不限時）
              <input type="number" min={0} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
            </label>
            <label>
              抽題數（0 = 全部）
              <input type="number" min={0} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} />
            </label>
            <label>
              缺字比例
              <select value={maskRatio} onChange={(event) => setMaskRatio(Number(event.target.value))}>
                <option value={0.3}>30%</option>
                <option value={0.45}>45%</option>
                <option value={0.6}>60%</option>
              </select>
            </label>
            <label>
              發音速度
              <select value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))}>
                <option value={0.65}>慢速</option>
                <option value={0.8}>清楚</option>
                <option value={1}>正常</option>
              </select>
            </label>
            <label>
              讀音重複次數
              <select value={speechRepeat} onChange={(event) => setSpeechRepeat(Number(event.target.value))}>
                <option value={1}>1 次</option>
                <option value={2}>2 次</option>
                <option value={3}>3 次</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend>出題方式</legend>
            <label className="check"><input checked={modes.includes('card')} type="checkbox" onChange={() => toggleMode('card')} /> 缺字單字卡：填完整英文 + 中文</label>
            <label className="check"><input checked={modes.includes('audio')} type="checkbox" onChange={() => toggleMode('audio')} /> 讀音：聽發音後填英文 + 中文</label>
          </fieldset>

          <label>
            題庫（CSV：english,chinese；或 JSON 陣列）
            <textarea rows={10} spellCheck={false} value={bankText} onChange={(event) => setBankText(event.target.value)} />
          </label>
          <div className="actions">
            <input type="file" accept=".csv,.json,.txt" onChange={(event) => void event.target.files?.[0]?.text().then(setBankText)} />
            <button type="button" onClick={() => setBankText(sample)}>載入範例</button>
            <button type="button" className="primary" onClick={() => startQuiz()}>開始測驗</button>
          </div>
          <p className="msg">{message}</p>
        </section>
      )}

      {screen === 'quiz' && current && (
        <section className="panel">
          <div className="topbar">
            <div>
              <h2>{title}</h2>
              <p className="hint">第 {index + 1} / {questions.length} 題</p>
            </div>
            <div className="timer">{timeText}</div>
          </div>

          <div className="question">
            <div className="badge">{current.mode === 'audio' ? '聽讀音作答' : '缺字單字卡'}</div>
            <div className="prompt">{current.mode === 'audio' ? '🔊' : maskWord(current.word, maskRatio)}</div>
            {current.mode === 'audio' && <button type="button" onClick={() => void speakWord(current.word, speechRepeat, speechRate)}>🔊 再聽一次</button>}
          </div>

          <div className="grid two">
            <label>
              英文答案
              <input autoComplete="off" autoCapitalize="none" spellCheck={false} value={answerEn} onChange={(event) => setAnswerEn(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitAnswer(); }} />
            </label>
            <label>
              中文意思（接近即可）
              <input autoComplete="off" value={answerZh} onChange={(event) => setAnswerZh(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitAnswer(); }} />
            </label>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={submitAnswer}>送出 / 下一題</button>
            <button type="button" onClick={finishQuiz}>提早交卷</button>
          </div>
        </section>
      )}

      {screen === 'result' && (
        <section className="panel">
          <h2>測驗結果</h2>
          <div className="score">{score} / {answers.length} 題正確（{answers.length ? Math.round((score / answers.length) * 100) : 0}%）</div>
          <div className="actions">
            <button type="button" onClick={retryWrong}>錯題重測</button>
            <button type="button" className="primary" onClick={() => setScreen('setup')}>重新設定</button>
          </div>
          <div>
            {answers.map((answer, answerIndex) => (
              <div className="review-item" key={`${answer.word}-${answerIndex}`}>
                <div><span className={answer.ok ? 'correct' : 'wrong'}>{answer.ok ? '✓ 正確' : '✗ 需複習'}</span> #{answerIndex + 1} {answer.mode === 'audio' ? '讀音' : '缺字'}</div>
                <div><strong>題目</strong>{answer.word} / {answer.zh}</div>
                <div><strong>作答</strong>{answer.en || '（空白）'} / {answer.zhAnswer || '（空白）'}</div>
                <div><strong>判定</strong>英文 {answer.enOk ? '✓' : '✗'}，中文 {answer.zhOk ? '✓' : '✗'}（中文採寬鬆比對）</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
