const API = 'https://win-or-lose.jaidenkumar14-469.workers.dev';

const MAX_WAGER_PCT  = 100;
const MIN_SCORE      = 1;

// --- nothing below here needs changing ---
let questions = [];
let qIndex=0, score=1000, wager=0;
let timerInt=null, timerSecs=30, answered=false, recap=[];

function getMaxWagerPct() {
  if (score < 0) {
    
  }
  return MAX_WAGER_PCT;
}

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+id).classList.add('active');
}
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3000);
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

async function startSolo() {
  const res = await mpApi('GET', { type: 'questions' });
  if (!res.success) return toast('Could not load questions');
  questions  = res.questions;
  timerSecs  = res.timerSecs;
  qIndex     = 0;
  score      = res.startingScore;
  recap      = [];
  showWager();
}

function showWager(){
  const pct      = getMaxWagerPct();
const maxWager = Math.floor(Math.abs(score) * (pct / 100));
  const half     = Math.floor(maxWager / 2);
  document.getElementById('w-count').textContent=`${qIndex+1} / ${questions.length}`;
  document.getElementById('w-score').textContent=score.toLocaleString();
  document.getElementById('w-progress').style.width=((qIndex/questions.length)*100)+'%';
  const rng=document.getElementById('w-range'), num=document.getElementById('w-num');
  rng.max=maxWager; rng.value=half;
  num.max=maxWager; num.value=half;
  document.getElementById('w-disp').textContent=half;
  wager=half; 
  document.getElementById('w-max-hint').textContent=`max ${pct}% = ${maxWager.toLocaleString()}`;
  show('wager');
}

function syncW(val,from){
  const max=parseInt(document.getElementById('w-range').max)||score;
  val=Math.max(0,Math.min(max,parseInt(val)||0));
  if(from!=='r')document.getElementById('w-range').value=val;
  if(from!=='n')document.getElementById('w-num').value=val;
  document.getElementById('w-disp').textContent=val;
  wager=val;
}

function lockWager(){
  const maxWager=Math.floor(Math.abs(score)*(getMaxWagerPct()/100));
  wager=Math.max(0,Math.min(maxWager,parseInt(document.getElementById('w-num').value)||0));
  showQuestion();
}

function showQuestion(){
  answered=false;
  const q=questions[qIndex], lets=['A','B','C','D','E'];
  document.getElementById('q-count').textContent=`${qIndex+1} / ${questions.length}`;
  document.getElementById('q-text').textContent=q.question;
  document.getElementById('q-opts').innerHTML=q.options.map((o,i)=>`
    <div class="opt" id="opt-${i}" onclick="pick(${i})">
      <span class="opt-letter">${lets[i]}</span><span>${esc(o)}</span>
    </div>`).join('');
  startTimer(timerSecs); show('question');
}

function startTimer(secs){
  clearInterval(timerInt);
  let left=secs;
  const fill=document.getElementById('t-fill'), num=document.getElementById('t-num');
  fill.style.width='100%'; fill.style.background='var(--accent)';
  num.style.color='var(--accent)'; num.textContent=left;
  timerInt=setInterval(()=>{
    left--;
    const pct=(left/secs)*100;
    const col=pct>40?'var(--accent)':pct>20?'#f0a030':'var(--danger)';
    fill.style.width=pct+'%'; fill.style.background=col;
    num.style.color=col; num.textContent=left;
    if(left<=0){clearInterval(timerInt); timeUp();}
  },1000);
}

function timeUp(){
  if(answered)return;
  answered=true;
  document.querySelectorAll('.opt').forEach(o=>o.classList.add('locked'));
  resolve(-1);
}

function pick(i){
  if(answered)return;
  answered=true; clearInterval(timerInt);
  document.querySelectorAll('.opt').forEach(o=>o.classList.add('locked'));
  document.getElementById('opt-'+i).classList.add('picked');
  resolve(i);
}

function resolve(picked){
  const q=questions[qIndex];
  const correct=picked===q.correctIndex;
  const delta=correct?wager:-wager;
  score=Math.max(MIN_SCORE,score+delta);
  recap.push({question:q.question,correct,wager,delta});
  setTimeout(()=>showResult(correct,delta,picked,q),600);
}

function showResult(correct,delta,picked,q){
  const lets=['A','B','C','D','E'];
  const label=picked===-1?'TIME UP':correct?'CORRECT':'WRONG';
  document.getElementById('r-word').textContent=label;
  document.getElementById('r-word').className='result-word '+(correct?'win':'lose');
  document.getElementById('r-delta').textContent=(delta>=0?'+':'')+delta.toLocaleString();
  document.getElementById('r-delta').className='delta '+(delta>=0?'pos':'neg');
  document.getElementById('r-score').textContent=score.toLocaleString();
  document.getElementById('r-opts').innerHTML=q.options.map((o,i)=>`
    <div class="opt locked ${i===q.correctIndex?'correct':(i===picked&&!correct?'wrong':'')}">
      <span class="opt-letter">${lets[i]}</span><span>${esc(o)}</span>
    </div>`).join('');
  const last=qIndex>=questions.length-1;
  document.getElementById('r-next').textContent=last?'See Results':'Next Question';
  show('result');
}

function nextQuestion(){
  qIndex++;
  if(qIndex>=questions.length) showEnd(); else showWager();
}

function showEnd(){
  document.getElementById('end-score').textContent=score.toLocaleString();
  document.getElementById('end-recap').innerHTML=recap.map((r,i)=>`
    <div class="recap-row" style="animation-delay:${i*.05}s">
      <div class="recap-num">${i+1}</div>
      <div class="recap-q">${esc(r.question.length>50?r.question.slice(0,50)+'…':r.question)}</div>
      <div class="recap-delta ${r.delta>=0?'pos':'neg'}">${r.delta>=0?'+':''}${r.delta.toLocaleString()}</div>
    </div>`).join('');
  show('end');
}

async function playAgain() {
  const res = await mpApi('GET', { type: 'questions' });
  if (!res.success) return toast('Could not load questions');
  questions = res.questions;
  timerSecs = res.timerSecs;
  qIndex    = 0;
  score     = res.startingScore;
  recap     = [];
  show('home');
}

/* ============================================================
   MULTIPLAYER
   ============================================================ */

const MP = {
  token:      null,
  code:       null,
  isHost:     false,
  isSpectator:false,
  pollTimer:  null,
  lastStatus: null,
  myAnswer:   null,
  wagerLocked:false,
  timerAnim:  null,
};

let mpHostRole = 'player';
let mpJoinRole = 'player';

// ── API ───────────────────────────────────────────────────

async function mpApi(method, params={}) {
  try {
    if (method === 'GET') {
      const r = await fetch(`${API}?${new URLSearchParams(params)}`);
      return r.json();
    }
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return r.json();
  } catch { toast('Connection error'); return { success: false }; }
}

// ── Session ───────────────────────────────────────────────

function mpSaveSession() {
  localStorage.setItem('riskit_token', MP.token || '');
  localStorage.setItem('riskit_code',  MP.code  || '');
}

function mpClearSession() {
  MP.token = null; MP.code = null;
  localStorage.removeItem('riskit_token');
  localStorage.removeItem('riskit_code');
}

function mpInit() {
  MP.token = localStorage.getItem('riskit_token') || null;
  MP.code  = localStorage.getItem('riskit_code')  || null;
  if (MP.token && MP.code) {
    mpApi('GET', { type: 'game', token: MP.token, code: MP.code }).then(res => {
      if (res.success) { MP.isHost = res.isHost; MP.isSpectator = res.isSpectator; mpStartPolling(); }
      else { mpClearSession(); }
    });
  }
}

// ── Screens ───────────────────────────────────────────────

function showScreen(id) { show(id); }

// ── Role toggles ──────────────────────────────────────────

function setRole(r) {
  mpHostRole = r;
  document.getElementById('role-player').classList.toggle('active', r === 'player');
  document.getElementById('role-spectator').classList.toggle('active', r === 'spectator');
}

function setJoinRole(r) {
  mpJoinRole = r;
  document.getElementById('join-role-player').classList.toggle('active', r === 'player');
  document.getElementById('join-role-spectator').classList.toggle('active', r === 'spectator');
}

// ── Create ────────────────────────────────────────────────

async function createGame() {
  const nickname = document.getElementById('host-nickname').value.trim();
  if (!nickname) return toast('Enter a nickname');
  const res = await mpApi('POST', { type: 'create', nickname, asSpectator: mpHostRole === 'spectator' });
  if (!res.success) return toast(res.message);
  MP.token = res.token; MP.code = res.code;
  MP.isHost = true; MP.isSpectator = mpHostRole === 'spectator';
  mpSaveSession();
  mpEnterLobby();
}

// ── Join ──────────────────────────────────────────────────

async function joinGame() {
  const code     = document.getElementById('join-code').value.trim().toUpperCase();
  const nickname = document.getElementById('join-nickname').value.trim();
  if (!code)     return toast('Enter the game code');
  if (!nickname) return toast('Enter a nickname');

  const check = await mpApi('GET', { type: 'check-code', code });
  if (!check.success) return toast(check.message);

  const res = await mpApi('POST', { type: 'join', code, nickname, asSpectator: mpJoinRole === 'spectator' });
  if (!res.success) return toast(res.message);

  MP.token = res.token; MP.code = res.code;
  MP.isHost = false; MP.isSpectator = mpJoinRole === 'spectator';
  mpSaveSession();
  mpEnterLobby();
}

// ── Lobby ─────────────────────────────────────────────────

function mpEnterLobby() {
  document.getElementById('lobby-code').textContent = MP.code;
  document.getElementById('host-start-wrap').style.display = MP.isHost ? 'flex' : 'none';
  document.getElementById('lobby-wait').style.display      = MP.isHost ? 'none' : 'block';
  show('lobby');
  mpStartPolling();
}

function mpRenderLobby(players) {
  const list  = document.getElementById('lobby-players');
  const count = document.getElementById('lobby-count');
  count.textContent = `${players.length} player${players.length !== 1 ? 's' : ''}`;
  list.innerHTML = players.map(p => `
    <div class="player-item">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="player-name">${esc(p.nickname)}</span>
        ${p.isHost       ? '<span class="player-badge">Host</span>'      : ''}
        ${p.isSpectator  ? '<span class="player-badge spectator">Spectating</span>' : ''}
      </div>
      ${MP.isHost && !p.isHost ? `<button class="btn btn-danger" style="width:auto;padding:6px 14px;font-size:14px" onclick="kickPlayer('${esc(p.nickname)}')">Kick</button>` : ''}
    </div>
  `).join('');
}

async function startGame() {
  const res = await mpApi('POST', { type: 'start', token: MP.token, code: MP.code });
  if (!res.success) toast(res.message);
}

async function kickPlayer(nick) {
  const res = await mpApi('POST', { type: 'kick', token: MP.token, code: MP.code, targetNickname: nick });
  if (!res.success) toast(res.message);
}

// ── Wager ─────────────────────────────────────────────────

function mpEnterWager(g) {
  MP.wagerLocked = g.myWager !== null;
  const s = g.myScore;

  document.getElementById('mp-w-count').textContent    = `${g.questionIndex + 1} / ${g.totalQuestions}`;
  document.getElementById('mp-w-score').textContent    = s.toLocaleString();
  document.getElementById('mp-w-progress').style.width = ((g.questionIndex / g.totalQuestions) * 100) + '%';

  const rng = document.getElementById('mp-w-range');
  const num = document.getElementById('mp-w-num');
  const def = Math.floor(s / 2);
  rng.max = s; rng.value = MP.wagerLocked ? g.myWager : def;
  num.max = s; num.value = rng.value;
  document.getElementById('mp-w-disp').textContent = rng.value;

  document.getElementById('mp-wager-card').style.display    = (MP.isSpectator || MP.wagerLocked) ? 'none' : 'flex';
  document.getElementById('mp-wager-locked').style.display  = (!MP.isSpectator && MP.wagerLocked) ? 'block' : 'none';
  document.getElementById('mp-spectator-msg').style.display = MP.isSpectator ? 'block' : 'none';
  document.getElementById('mp-reveal-wrap').style.display   = (MP.isHost && MP.wagerLocked) ? 'flex' : 'none';

  mpRenderDots(g.players, 'hasWagered', 'mp-wager-dots');
  show('mp-wager');
}

function mpSyncW(val, from) {
  if (MP.wagerLocked) return;
  const max = parseInt(document.getElementById('mp-w-range').max) || 0;
  val = Math.max(0, Math.min(max, parseInt(val) || 0));
  if (from !== 'r') document.getElementById('mp-w-range').value = val;
  if (from !== 'n') document.getElementById('mp-w-num').value   = val;
  document.getElementById('mp-w-disp').textContent = val;
}

async function submitWager() {
  const wager = parseInt(document.getElementById('mp-w-range').value);
  const res = await mpApi('POST', { type: 'wager', token: MP.token, code: MP.code, wager });
  if (!res.success) return toast(res.message);
  MP.wagerLocked = true;
  document.getElementById('mp-wager-card').style.display   = 'none';
  document.getElementById('mp-wager-locked').style.display = 'block';
  if (MP.isHost) document.getElementById('mp-reveal-wrap').style.display = 'flex';
}

async function revealQuestion() {
  const res = await mpApi('POST', { type: 'reveal', token: MP.token, code: MP.code });
  if (!res.success) toast(res.message);
}

// ── Question ──────────────────────────────────────────────

function mpEnterQuestion(g) {
  MP.myAnswer = g.myAnswer;
  const q = g.currentQuestion, lets = ['A','B','C','D','E'];

  document.getElementById('mp-q-count').textContent = `${g.questionIndex + 1} / ${g.totalQuestions}`;
  document.getElementById('mp-q-text').textContent  = q.question;
  document.getElementById('mp-q-opts').innerHTML    = q.options.map((o, i) => `
    <div class="opt ${(MP.myAnswer !== null || MP.isSpectator) ? 'locked' : ''} ${MP.myAnswer === i ? 'picked' : ''}"
         id="mp-opt-${i}" onclick="mpPickAnswer(${i})">
      <span class="opt-letter">${lets[i]}</span><span>${esc(o)}</span>
    </div>`).join('');

  document.getElementById('mp-close-wrap').style.display = MP.isHost ? 'flex' : 'none';
  mpRenderDots(g.players, 'hasAnswered', 'mp-answer-dots');
  mpStartTimer(q.timerEnd);
  show('mp-question');
}

function mpStartTimer(timerEnd) {
  clearInterval(MP.timerAnim);
  if (!timerEnd) return;
  const end     = new Date(timerEnd).getTime();
  const totalMs = end - Date.now();
  if (totalMs <= 0) return;

  const fill = document.getElementById('mp-t-fill');
  const num  = document.getElementById('mp-t-num');

  MP.timerAnim = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    const pct  = (left / totalMs) * 100;
    const col  = pct > 40 ? 'var(--accent)' : pct > 20 ? '#f0a030' : 'var(--danger)';
    fill.style.width      = pct + '%';
    fill.style.background = col;
    num.style.color       = col;
    num.textContent       = Math.ceil(left / 1000);
    if (left <= 0) clearInterval(MP.timerAnim);
  }, 100);
}

async function mpPickAnswer(i) {
  if (MP.myAnswer !== null || MP.isSpectator) return;
  const res = await mpApi('POST', { type: 'answer', token: MP.token, code: MP.code, answerIndex: i });
  if (!res.success) return toast(res.message);
  MP.myAnswer = i;
  document.querySelectorAll('.opt').forEach(o => o.classList.add('locked'));
  document.getElementById('mp-opt-' + i).classList.add('picked');
}

async function closeQuestion() {
  const res = await mpApi('POST', { type: 'close', token: MP.token, code: MP.code });
  if (!res.success) toast(res.message);
}

// ── Results ───────────────────────────────────────────────

function mpEnterResults(g) {
  clearInterval(MP.timerAnim);
  const q       = g.currentQuestion;
  const correct = MP.myAnswer === q.correctIndex;
  const wager   = g.myWager ?? 0;
  const delta   = correct ? wager : -wager;
  const lets    = ['A','B','C','D','E'];

  if (!MP.isSpectator) {
    document.getElementById('mp-r-word').textContent  = correct ? 'CORRECT' : (MP.myAnswer === -1 ? 'TIME UP' : 'WRONG');
    document.getElementById('mp-r-word').className    = `result-word ${correct ? 'win' : 'lose'}`;
    document.getElementById('mp-r-delta').textContent = (delta >= 0 ? '+' : '') + delta.toLocaleString();
    document.getElementById('mp-r-delta').className   = `delta ${delta >= 0 ? 'pos' : 'neg'}`;
  } else {
    document.getElementById('mp-r-word').textContent = 'RESULTS';
    document.getElementById('mp-r-word').className   = 'result-word';
    document.getElementById('mp-r-delta').textContent = '';
  }

  document.getElementById('mp-r-score').textContent = g.myScore.toLocaleString();

  document.getElementById('mp-r-opts').innerHTML = q.options.map((o, i) => `
    <div class="opt locked ${i === q.correctIndex ? 'correct' : (i === MP.myAnswer && !correct ? 'wrong' : '')}">
      <span class="opt-letter">${lets[i]}</span><span>${esc(o)}</span>
    </div>`).join('');

  const sorted = [...g.players].filter(p => !p.kicked && !p.isSpectator).sort((a, b) => b.score - a.score);
  document.getElementById('mp-r-players').innerHTML = sorted.map(p => `
    <div class="player-item">
      <span class="player-name">${esc(p.nickname)}</span>
      <span class="player-score">${p.score.toLocaleString()}</span>
    </div>`).join('');

  document.getElementById('mp-next-wrap').style.display = MP.isHost ? 'flex' : 'none';
  document.getElementById('mp-r-wait').style.display    = MP.isHost ? 'none' : 'block';

  const isLast = g.questionIndex >= g.totalQuestions - 1;
  document.getElementById('mp-next-btn').textContent = isLast ? 'See Leaderboard' : 'Next Question';

  show('mp-results');
}

async function nextMpQuestion() {
  const res = await mpApi('POST', { type: 'next', token: MP.token, code: MP.code });
  if (!res.success) toast(res.message);
}

// ── End ───────────────────────────────────────────────────

function mpEnterEnd(g) {
  mpStopPolling();
  const medals = ['1ST','2ND','3RD'];
  document.getElementById('mp-lb-list').innerHTML = (g.leaderboard || []).map((e, i) => `
    <div class="lb-entry" style="animation-delay:${i * .05}s">
      <div class="lb-rank">${medals[i] ?? '#' + e.rank}</div>
      <div class="lb-name">${esc(e.nickname)}</div>
      <div class="lb-score">${e.score.toLocaleString()}</div>
    </div>`).join('');

  document.getElementById('mp-end-host').style.display = MP.isHost ? 'flex' : 'none';
  show('mp-end');
}

async function endGameEarly() {
  const res = await mpApi('POST', { type: 'end', token: MP.token, code: MP.code });
  if (!res.success) toast(res.message);
}

async function deleteGame() {
  await mpApi('POST', { type: 'delete', token: MP.token, code: MP.code });
  mpClearSession();
  mpStopPolling();
  show('home');
}

async function leaveGame() {
  mpClearSession();
  mpStopPolling();
  show('home');
}

// ── Poll ──────────────────────────────────────────────────

function mpStartPolling() { mpStopPolling(); MP.pollTimer = setInterval(mpPoll, 1500); mpPoll(); }
function mpStopPolling()  { clearInterval(MP.pollTimer); }

async function mpPoll() {
  if (!MP.token || !MP.code) return;
  const res = await mpApi('GET', { type: 'game', token: MP.token, code: MP.code });
  if (!res.success) return;
  if (res.kicked) { toast('You were kicked'); mpClearSession(); mpStopPolling(); show('home'); return; }

  MP.isHost     = res.isHost;
  MP.isSpectator = res.isSpectator;
  const status  = res.status;

  if (status === 'waiting') {
    mpRenderLobby(res.players);
    if (MP.lastStatus !== 'waiting') show('lobby');
  } else if (status === 'wagering') {
    if (MP.lastStatus !== 'wagering') { MP.wagerLocked = false; MP.myAnswer = null; }
    mpEnterWager(res);
    mpRenderDots(res.players, 'hasWagered', 'mp-wager-dots');
    if (MP.isHost && MP.wagerLocked) document.getElementById('mp-reveal-wrap').style.display = 'flex';
  } else if (status === 'question') {
    if (MP.lastStatus !== 'question') mpEnterQuestion(res);
    mpRenderDots(res.players, 'hasAnswered', 'mp-answer-dots');
  } else if (status === 'results') {
    if (MP.lastStatus !== 'results') mpEnterResults(res);
  } else if (status === 'ended') {
    mpStopPolling(); mpEnterEnd(res);
  }

  MP.lastStatus = status;
}

// ── Util ──────────────────────────────────────────────────

function mpRenderDots(players, key, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = players.filter(p => !p.kicked && !p.isSpectator).map(p => `
    <div class="status-dot">
      <span class="dot ${p[key] ? 'done' : 'waiting'}"></span>
      ${esc(p.nickname)}
    </div>`).join('');
}

mpInit();
show('home');
