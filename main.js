const TIMER_SECS = 30; // seconds per question
const MAX_WAGER_PCT  = 75
const STARTING_SCORE = 1000
const MIN_SCORE      = 0;

const QUESTIONS = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
    correctIndex: 2
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    correctIndex: 1
  },
  {
    question: "What is 12 × 12?",
    options: ["124", "144", "132", "148"],
    correctIndex: 1
  }
];

// --- nothing below here needs changing ---
let questions = QUESTIONS;
let qIndex=0, score=1000, wager=0;
let timerInt=null, timerSecs=TIMER_SECS, answered=false, recap=[];

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

function startGame(){
  qIndex=0; score=1000; recap=[]; showWager();
}

function showWager(){
  const maxWager = Math.floor(score * (MAX_WAGER_PCT / 100));
  const half     = Math.floor(maxWager / 2);
  document.getElementById('w-count').textContent=`${qIndex+1} / ${questions.length}`;
  document.getElementById('w-score').textContent=score.toLocaleString();
  document.getElementById('w-progress').style.width=((qIndex/questions.length)*100)+'%';
  const rng=document.getElementById('w-range'), num=document.getElementById('w-num');
  rng.max=maxWager; rng.value=half;
  num.max=maxWager; num.value=half;
  document.getElementById('w-disp').textContent=half;
  wager=half; 
  document.getElementById('w-max-hint').textContent=`max ${MAX_WAGER_PCT}% = ${maxWager.toLocaleString()}`;
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
  const maxWager=Math.floor(score*(MAX_WAGER_PCT/100));
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

function playAgain(){ qIndex=0; score=1000; recap=[]; show('home'); }

show('home');
