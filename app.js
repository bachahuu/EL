const SUPABASE_URL = 'https://djqomavgdkbywotltjee.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PLnvs7zUHpdInIqb8ursQw_C1Q0v5i_';
const TABLE = 'toeic_questions';
const LETTERS = ['A', 'B', 'C', 'D'];

const app = document.querySelector('#app');
let bank = [];
let currentSession = null;

const state = { view: 'home' };

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadQuestions() {
  app.innerHTML = document.querySelector('#loading-template').innerHTML;
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=part.asc,set_no.asc,question_number.asc`;
  const response = await fetch(url, { headers: { apikey: SUPABASE_KEY, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  bank = await response.json();
  renderHome();
}

function groupsByPart() {
  const groups = new Map();
  for (let p = 1; p <= 7; p++) groups.set(p, []);
  bank.forEach(q => groups.get(q.part)?.push(q));
  return groups;
}

function getSets(part) {
  return [...new Set(bank.filter(q => q.part === part).map(q => q.set_no))].sort((a,b) => a-b);
}

function renderHome() {
  state.view = 'home';
  currentSession = null;
  const byPart = groupsByPart();
  const total = bank.length;
  const availableParts = [...byPart.entries()].filter(([,qs]) => qs.length).length;
  const history = getHistory();
  const last = history[0];

  app.innerHTML = `
    <section class="hero">
      <div class="hero-card">
        <div class="eyebrow">TOEIC PERSONAL PRACTICE</div>
        <h1>Mỗi lần học là một đề mới.</h1>
        <p>Câu hỏi được đảo thứ tự, các lựa chọn A/B/C/D cũng được đảo độc lập nhưng nội dung đáp án đúng vẫn được giữ nguyên. Làm xong có thể chấm ngay, xem đúng/sai theo màu.</p>
        <div class="hero-actions">
          <button class="btn primary" data-action="start-exam">Bắt đầu thi thử</button>
          <button class="btn outline" data-action="random-practice">Học ngẫu nhiên 1 Part</button>
        </div>
      </div>
      <div class="stats-card">
        <div class="stat-line"><span>Ngân hàng hiện có</span><strong>${total} câu</strong></div>
        <div class="stat-line"><span>Part đã có dữ liệu</span><strong>${availableParts}/7</strong></div>
        <div class="stat-line"><span>Lần gần nhất</span><strong>${last ? `${last.score}/${last.total}` : 'Chưa có'}</strong></div>
      </div>
    </section>

    <div class="section-title">
      <div><h2>Học theo Part</h2><p>Chọn cả Part hoặc một bộ nhỏ. Mỗi lần mở sẽ tự xáo trộn lại.</p></div>
    </div>
    <section class="parts-grid">
      ${[1,2,3,4,5,6,7].map(part => renderPartCard(part, byPart.get(part))).join('')}
    </section>
  `;
}

function renderPartCard(part, questions) {
  const count = questions.length;
  const sets = getSets(part);
  const titles = {
    1: 'Photographs', 2: 'Question–Response', 3: 'Conversations', 4: 'Talks',
    5: 'Incomplete Sentences', 6: 'Text Completion', 7: 'Reading Comprehension'
  };
  if (!count) {
    return `<article class="part-card locked">
      <div class="part-head"><span class="part-number">Part ${part}</span><span class="badge muted">Chưa có data</span></div>
      <h3>${titles[part]}</h3><p>Web sẽ tự nhận khi dữ liệu Part ${part} được thêm vào bảng chung.</p>
      <div class="part-actions"><button class="btn ghost" disabled>Chưa khả dụng</button></div>
    </article>`;
  }
  return `<article class="part-card available">
    <div class="part-head"><span class="part-number">Part ${part}</span><span class="badge">${count} câu</span></div>
    <h3>${titles[part]}</h3><p>${sets.length} bộ dữ liệu hiện có.</p>
    <div class="part-actions">
      <button class="btn primary" data-action="practice-part" data-part="${part}">Học toàn bộ Part ${part}</button>
      <div class="set-row">${sets.map(s => `<button class="set-chip" data-action="practice-set" data-part="${part}" data-set="${s}">Bộ ${s}</button>`).join('')}</div>
    </div>
  </article>`;
}

function normalizeQuestion(row) {
  const options = LETTERS
    .map(letter => ({ original: letter, text: row[`option_${letter.toLowerCase()}`] }))
    .filter(o => o.text && String(o.text).trim());
  const shuffled = shuffle(options).map((o, idx) => ({ ...o, display: LETTERS[idx] }));
  const correct = shuffled.find(o => o.original === row.correct_answer);
  return {
    id: row.id,
    part: row.part,
    setNo: row.set_no,
    originalNumber: row.question_number,
    text: row.question_text,
    options: shuffled,
    correctDisplay: correct?.display,
    answer: null,
  };
}

function createSession(rows, mode, label) {
  const grouped = mode === 'exam'
    ? [1,2,3,4,5,6,7].flatMap(part => shuffle(rows.filter(q => q.part === part)))
    : shuffle(rows);
  return {
    mode,
    label,
    submitted: false,
    startedAt: Date.now(),
    questions: grouped.map(normalizeQuestion),
  };
}

function startPractice(part, setNo = null) {
  const rows = bank.filter(q => q.part === part && (setNo == null || q.set_no === setNo));
  if (!rows.length) return;
  const label = setNo == null ? `Luyện Part ${part}` : `Part ${part} · Bộ ${setNo}`;
  currentSession = createSession(rows, 'practice', label);
  renderQuiz();
}

function startExam() {
  if (!bank.length) return;
  currentSession = createSession(bank, 'exam', 'Thi thử TOEIC · dữ liệu hiện có');
  renderQuiz();
}

function renderQuiz() {
  state.view = 'quiz';
  const s = currentSession;
  const answered = s.questions.filter(q => q.answer).length;
  const pct = Math.round(answered / s.questions.length * 100);
  const result = s.submitted ? getResult(s) : null;
  app.innerHTML = `
    ${s.submitted ? renderResult(result) : ''}
    <section class="quiz-layout">
      <div class="quiz-header">
        <div><h1>${escapeHtml(s.label)}</h1><p>${s.questions.length} câu · câu hỏi và đáp án đã được xáo trộn cho lượt này</p></div>
        <button class="btn ghost" data-action="home">Thoát</button>
      </div>
      <div class="quiz-main">
        ${s.questions.map((q,i) => renderQuestion(q,i,s.submitted)).join('')}
      </div>
      <aside class="quiz-sidebar">
        <div class="panel">
          <h3>Tiến độ</h3>
          <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="progress-copy"><span>Đã làm ${answered}</span><span>${s.questions.length} câu</span></div>
        </div>
        <div class="panel">
          <h3>Câu hỏi</h3>
          <div class="navigator">
            ${s.questions.map((q,i) => {
              let cls = q.answer ? 'answered' : '';
              if (s.submitted) cls = q.answer === q.correctDisplay ? 'correct' : 'wrong';
              return `<button class="nav-q ${cls}" data-action="jump" data-index="${i}">${i+1}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="panel sidebar-actions">
          ${!s.submitted ? `<button class="btn success" data-action="submit">Chấm bài</button>` : `<button class="btn primary" data-action="reshuffle">Làm lại với đề mới</button>`}
          <button class="btn ghost" data-action="home">Về trang chủ</button>
        </div>
      </aside>
    </section>
  `;
}

function renderQuestion(q, index, submitted) {
  return `<article class="question-card" id="q-${index}">
    <div class="question-meta">
      <span class="question-number">Câu ${index + 1}</span>
      <span>Part ${q.part} · Bộ ${q.setNo} · mã gốc #${q.originalNumber}</span>
    </div>
    <h2 class="question-text">${escapeHtml(q.text)}</h2>
    <div class="options">
      ${q.options.map(opt => {
        let cls = q.answer === opt.display ? 'selected' : '';
        if (submitted && opt.display === q.correctDisplay) cls = 'correct';
        if (submitted && q.answer === opt.display && q.answer !== q.correctDisplay) cls = 'wrong';
        return `<button class="option ${cls}" ${submitted ? 'disabled' : ''} data-action="answer" data-index="${index}" data-letter="${opt.display}">
          <span class="option-letter">${opt.display}</span><span>${escapeHtml(opt.text)}</span>
        </button>`;
      }).join('')}
    </div>
  </article>`;
}

function getResult(session) {
  const correct = session.questions.filter(q => q.answer === q.correctDisplay).length;
  return { correct, total: session.questions.length, percent: Math.round(correct / session.questions.length * 100) };
}

function renderResult(r) {
  return `<section class="result-card">
    <div class="eyebrow" style="color:#93c5fd">KẾT QUẢ</div>
    <div class="score">${r.correct}/${r.total}</div>
    <p>Đúng ${r.percent}% · đáp án đúng được tô xanh, đáp án bạn chọn sai được tô đỏ.</p>
    <div class="result-actions">
      <button class="btn primary" data-action="reshuffle">Làm lại đề mới</button>
      <button class="btn outline" data-action="home">Chọn Part khác</button>
    </div>
  </section>`;
}

function submitSession() {
  const unanswered = currentSession.questions.filter(q => !q.answer).length;
  if (unanswered && !confirm(`Còn ${unanswered} câu chưa trả lời. Vẫn chấm bài?`)) return;
  currentSession.submitted = true;
  const r = getResult(currentSession);
  saveHistory({
    at: new Date().toISOString(),
    label: currentSession.label,
    mode: currentSession.mode,
    score: r.correct,
    total: r.total,
    percent: r.percent,
  });
  renderQuiz();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reshuffle() {
  const old = currentSession;
  let rows;
  if (old.mode === 'exam') rows = bank;
  else {
    const first = old.questions[0];
    const allSameSet = old.questions.every(q => q.part === first.part && q.setNo === first.setNo);
    rows = bank.filter(q => q.part === first.part && (!allSameSet || q.set_no === first.setNo));
  }
  currentSession = createSession(rows, old.mode, old.label);
  renderQuiz();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('toeic-learning-history') || '[]'); }
  catch { return []; }
}
function saveHistory(item) {
  const history = [item, ...getHistory()].slice(0, 30);
  localStorage.setItem('toeic-learning-history', JSON.stringify(history));
}

function renderHistory() {
  state.view = 'history';
  const history = getHistory();
  app.innerHTML = `
    <div class="section-title"><div><h2>Lịch sử làm bài</h2><p>Lưu trên trình duyệt hiện tại.</p></div><button class="btn ghost" data-action="home">Quay lại</button></div>
    ${history.length ? `<div class="history-list">${history.map(h => `<div class="history-item"><div><strong>${escapeHtml(h.label)}</strong><small>${new Date(h.at).toLocaleString('vi-VN')}</small></div><div class="history-score">${h.score}/${h.total} · ${h.percent}%</div></div>`).join('')}</div>` : `<div class="empty">Chưa có lần làm bài nào.</div>`}
  `;
}

function randomPractice() {
  const available = [1,2,3,4,5,6,7].filter(p => bank.some(q => q.part === p));
  if (!available.length) return;
  startPractice(available[Math.floor(Math.random() * available.length)]);
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'home') return renderHome();
  if (action === 'history') return renderHistory();
  if (action === 'start-exam') return startExam();
  if (action === 'random-practice') return randomPractice();
  if (action === 'practice-part') return startPractice(Number(el.dataset.part));
  if (action === 'practice-set') return startPractice(Number(el.dataset.part), Number(el.dataset.set));
  if (action === 'answer' && currentSession && !currentSession.submitted) {
    currentSession.questions[Number(el.dataset.index)].answer = el.dataset.letter;
    return renderQuiz();
  }
  if (action === 'jump') return document.querySelector(`#q-${el.dataset.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (action === 'submit') return submitSession();
  if (action === 'reshuffle') return reshuffle();
});

document.querySelector('.topbar').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'home') renderHome();
  if (el.dataset.action === 'history') renderHistory();
  if (el.dataset.action === 'start-exam') startExam();
});

loadQuestions().catch(err => {
  console.error(err);
  app.innerHTML = `<section class="center-card"><h2>Không tải được dữ liệu</h2><p>${escapeHtml(err.message)}</p><button class="btn primary" onclick="location.reload()">Thử lại</button></section>`;
});
