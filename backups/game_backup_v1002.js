// ======================================================
// 운빨 아발론 - 5:5 AOS 게임 엔진 v4.0 (뱀서라이크 패시브 스킬 시스템)
// 부드러운 사운드, BGM 수정, 밸런스 패치, 뱀서라이크 패시브 스킬 등
// ======================================================

'use strict';

// ============ 오디오 시스템 ============
const BGM_URLS = [
    "https://t1.daumcdn.net/cfile/tistory/99BA0B385DABEEE101",
    "https://t1.daumcdn.net/cfile/tistory/99261E4C5DAFED0725",
    "https://t1.daumcdn.net/cfile/tistory/99400B3C5DB076032C",
    "https://t1.daumcdn.net/cfile/tistory/99340A365DB5D4AA02"
];
let currentBgmIndex = 0;
let bgmAudio = new Audio();
bgmAudio.volume = 0.3;
function playNextBGM() {
    bgmAudio.src = BGM_URLS[currentBgmIndex];
    let playPromise = bgmAudio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('BGM playing:', BGM_URLS[currentBgmIndex]);
        }).catch(e => {
            console.warn('BGM Play failed:', e);
            // 만약 오디오 객체가 실패하면 iframe 방식으로 강제 재생 시도
            let fallback = document.getElementById('bgmFallback');
            if(fallback) fallback.src = BGM_URLS[currentBgmIndex];
        });
    }
    bgmAudio.onended = () => {
        currentBgmIndex = (currentBgmIndex + 1) % BGM_URLS.length;
        playNextBGM();
    };
}

let audioCtx = null;
function initAudio() {
    try {
        if(!audioCtx) {
            let AudioContext = window.AudioContext || window.webkitAudioContext;
            if(AudioContext) {
                audioCtx = new AudioContext();
                playNextBGM();
            }
        } else if(audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch(e) {
        console.warn('Audio Context initialization failed:', e);
    }
}

function playSFX(type) {
    if(!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    let now = audioCtx.currentTime;
    
    // 경박한 소리(square/sawtooth) 대신 부드러운 소리(sine/triangle) 사용
    if(type === 'hit') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(80, now+0.1);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1);
        osc.start(now); osc.stop(now+0.1);
    } else if(type === 'shoot') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(200, now+0.15);
        gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.15);
        osc.start(now); osc.stop(now+0.15);
    } else if(type === 'heal') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(600, now+0.3);
        gain.gain.setValueAtTime(0.08, now); gain.gain.linearRampToValueAtTime(0, now+0.3);
        osc.start(now); osc.stop(now+0.3);
    } else if(type === 'tower') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.3);
        osc.start(now); osc.stop(now+0.3);
    }
}

// ============ 설정 상수 ============
const MAP_SIZE = 3000;
const SUDDEN_DEATH_TIME = 20 * 60; // 20분
const DRAGON_SPAWN_TIME = 5 * 60;  // 5분마다
const GOLD_GOBLIN_TIME  = 8 * 60;  // 8분
const MID_BOSS_TIMES    = [5*60, 10*60, 15*60]; // 5, 10, 15분 중간보스
const MINION_INTERVAL   = 15;      // 15초마다 (단축)
const REGEN_DELAY       = 5.0;     // 5초 비전투 후
const REGEN_RATE        = 0.05;    // 초당 5%
const WARMOG_REGEN      = 0.10;    // 워모그 초당 10%

// ============ 영웅 템플릿 (근접/원거리 밸런스 전면 수정) ============
const HERO_TMPL = {
    BERSERKER: { name:"광전사", color:"#ef4444", hp:2200, atk:60, aspd:1.5, move:190, range:90, type:"melee", skill1:{name:"회전 참격", cd:5}, skill2:{name:"도약 강타", cd:8}, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'berserker') },
    ARCHER: { name:"궁수", color:"#10b981", hp:950, atk:35, aspd:1.2, move:150, range:450, type:"ranged", skill1:{name:"화살 폭우", cd:6}, skill2:{name:"백스텝", cd:10}, critChance:0.1, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'archer') },
    NECROMANCER: { name:"네크로맨서", color:"#a855f7", hp:1000, atk:25, aspd:1.0, move:140, range:360, type:"ranged", skill1:{name:"해골 소환", cd:8}, skill2:{name:"저주 역병", cd:12}, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'necromancer') },
    MECHANIC: { name:"메카닉", color:"#f59e0b", hp:1100, atk:40, aspd:0.8, move:130, range:300, type:"ranged", skill1:{name:"터렛 설치", cd:12}, skill2:{name:"긴급 수리", cd:15}, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'mechanic') },
    VAMPIRE: { name:"뱀파이어", color:"#f43f5e", hp:2000, atk:45, aspd:1.3, move:180, range:100, type:"melee", skill1:{name:"흡혈 파동", cd:8}, skill2:{name:"박쥐 강습", cd:10}, lifeSteal:0.25, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'vampire') },
    THOR: { name:"토르", color:"#60a5fa", hp:2500, atk:70, aspd:0.9, move:180, range:90, type:"melee", skill1:{name:"번개 강타", cd:10}, skill2:{name:"충격파", cd:12}, draw:(ctx,x,y,r,dir,f)=>drawBlockyHero(ctx,x,y,r,dir,f,'thor') }
};

// ============ 아이템 ============
const BASE_ITEMS = [
    { id:'atk', name:'공격력 강화', cost:300, stat:'atk', val:15, icon:'⚔️' },
    { id:'aspd', name:'공속 강화', cost:350, stat:'aspd', val:0.15, icon:'🗡️' },
    { id:'hp', name:'체력 강화', cost:250, stat:'hp', val:150, icon:'❤️' },
    { id:'move', name:'이속 강화', cost:250, stat:'move', val:15, icon:'🥾' },
    { id:'crit', name:'크리티컬', cost:500, stat:'crit', val:0.075, icon:'💥' },
    { id:'lifesteal', name:'흡혈', cost:600, stat:'lifesteal', val:0.15, icon:'🩸' },
    { id:'reflect', name:'피해반사', cost:400, stat:'reflect', val:0.15, icon:'🛡️' },
    { id:'burn', name:'화염검', cost:450, stat:'burn', val:15, icon:'🔥' },
    { id:'stun', name:'기절무기', cost:700, stat:'stun', val:0.075, icon:'⚡' },
];
const ENHANCE_RATES = [1,1,1,0.6,0.5,0.4,0.3,0.2,0.1];

// ============ 뱀서라이크 패시브 스킬 ============
const PASSIVE_SKILLS = [
    { id:'lightning', name:'낙뢰', icon:'⚡', desc:'타격 시 확률로 하늘에서 낙뢰 낙하', maxLv:5 },
    { id:'chainLightning', name:'체인 라이트닝', icon:'🔗', desc:'타격 시 확률로 주변 적에게 연쇄 번개', maxLv:3 },
    { id:'fireRing', name:'화염의 고리', icon:'🔥', desc:'몸 주변 화염 고리가 적에게 지속 피해', maxLv:5 },
    { id:'frost', name:'빙결의 손길', icon:'❄️', desc:'타격 시 확률로 적 이동속도 감소', maxLv:3 },
    { id:'soulHarvest', name:'영혼 수확', icon:'👻', desc:'적 처치 시 HP 회복 + 공격력 일시 증가', maxLv:4 },
    { id:'meteor', name:'유성우', icon:'☄️', desc:'주기적으로 주변에 유성 낙하', maxLv:4 },
    { id:'thornArmor', name:'가시 갑옷', icon:'🛡️', desc:'피격 시 데미지의 일부를 반사', maxLv:4 },
    { id:'ironHealth', name:'강철 체력', icon:'💪', desc:'최대 HP 15% 증가', maxLv:5 },
    { id:'berserkerSoul', name:'광전사의 혼', icon:'💀', desc:'HP가 낮을수록 공격력 증가', maxLv:3 },
    { id:'shadowClone', name:'분신술', icon:'👥', desc:'주기적으로 분신 소환', maxLv:3 },
    { id:'swiftWind', name:'질풍', icon:'💨', desc:'이동속도/공격속도 증가', maxLv:4 },
    { id:'poisonCloud', name:'독안개', icon:'☠️', desc:'주기적으로 주변에 독구름 생성', maxLv:4 }
];

// ============ 전역 상태 ============
let GS = { status:'TITLE', platform:'PC', faction:'BLUE', hero:'BERSERKER', time:0, lastFrame:0, paused:false };
let camera = { x:1500, y:2500, zoom:0.65 };
let player = null;
let entities = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];
let environments = []; // 나무, 바위 등
let slashEffects = [];
let aoeEffects = [];

const keys = { w:false, a:false, s:false, d:false };
const joy  = { active:false, id:null, ox:0, oy:0, dx:0, dy:0 };

let minionTimer = 0; let dragonTimer = 0; let goblinSpawned = false; let suddenDeathTriggered = false;
let midBossSpawned = [false, false, false];

// ============ 유틸 ============
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const rand = (a,b) => Math.random()*(b-a)+a;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function addText(x,y,text,color,size=16){ floatingTexts.push({x,y,text,color,size,life:1.0,vy:-60}); }
function spawnParticles(x,y,color,n=8,spd=120,life=0.4, shape='circle'){
    for(let i=0;i<n;i++){ let a=rand(0,Math.PI*2); particles.push({x,y,vx:Math.cos(a)*rand(spd*0.3,spd),vy:Math.sin(a)*rand(spd*0.3,spd),life,maxLife:life,color,size:rand(2,5),shape}); }
}
function spawnSlash(x,y,angle,color,r=60){ slashEffects.push({x,y,angle,color,r,life:0.25,maxLife:0.25}); }
function spawnAOE(x,y,r,color,life=0.6){ aoeEffects.push({x,y,r,color,life,maxLife:life}); }
function showBanner(text,icon='⚔️',isBlue=true){
    const banner=document.getElementById('systemKillBanner');
    document.getElementById('killBannerText').textContent=text;
    document.getElementById('killBannerIcon').textContent=icon;
    document.getElementById('killBannerBox').className='bg-gradient-to-r border px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 '+(isBlue?'from-emerald-900 to-slate-900 border-emerald-500':'from-purple-900 to-slate-900 border-purple-500');
    banner.style.opacity='1'; banner.style.transform='translateX(-50%) scale(1)';
    setTimeout(()=>{banner.style.opacity='0';banner.style.transform='translateX(-50%) scale(0.95)';},3000);
}

// ============ 2.5D SVG 캐릭터 렌더링 ============
function drawBlockyHero(ctx, x, y, r, dir, faction, type) {
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.8, r*0.7, r*0.25, 0, 0, Math.PI*2); ctx.fill();
    
    let anim = Math.sin(performance.now()/150);
    let lx = anim * r * 0.2;
    
    ctx.save();
    if(dir < 0) { ctx.translate(x*2, 0); ctx.scale(-1, 1); } // 좌우 반전

    // 팀 식별띠
    let fCol = faction === 'BLUE' ? '#3b82f6' : '#ef4444';

    // 기본 바디 그리기 함수
    const drawBody = (skin, shirt, pants) => {
        // 다리
        ctx.fillStyle = pants;
        ctx.fillRect(x-r*0.3+lx, y+r*0.3, r*0.2, r*0.5); // 왼다리
        ctx.fillRect(x+r*0.1-lx, y+r*0.3, r*0.2, r*0.5); // 오른다리
        // 몸통
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y+r*0.4); ctx.lineTo(x+r*0.4, y+r*0.4); ctx.lineTo(x+r*0.45, y-r*0.3); ctx.lineTo(x-r*0.45, y-r*0.3); ctx.closePath(); ctx.fill();
        // 머리
        ctx.fillStyle = skin;
        ctx.fillRect(x-r*0.4, y-r*0.9, r*0.8, r*0.65);
        // 눈
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x-r*0.2, y-r*0.7, r*0.1, r*0.1); ctx.fillRect(x+r*0.1, y-r*0.7, r*0.1, r*0.1);
        // 팀 뱃지
        ctx.fillStyle = fCol; ctx.beginPath(); ctx.arc(x, y-r*0.1, r*0.15, 0, Math.PI*2); ctx.fill();
    };

    if(type === 'berserker') {
        drawBody('#fca5a5', '#475569', '#1e293b'); // 바바리안/기사 느낌
        // 철 투구
        ctx.fillStyle = '#64748b'; ctx.fillRect(x-r*0.45, y-r*1.0, r*0.9, r*0.3);
        ctx.fillRect(x-r*0.1, y-r*0.7, r*0.2, r*0.4); // 코보호대
        // 대검
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(x+r*0.5, y-r*0.6, r*0.2, r*1.2);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(x+r*0.4, y, r*0.4, r*0.1); // 크로스가드
    } else if(type === 'archer') {
        drawBody('#fde047', '#22c55e', '#14532d');
        // 초록 후드
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.6); ctx.lineTo(x+r*0.5, y-r*0.6); ctx.lineTo(x, y-r*1.2); ctx.closePath(); ctx.fill();
        // 활
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x+r*0.6, y, r*0.5, -Math.PI*0.3, Math.PI*0.3); ctx.stroke();
    } else if(type === 'necromancer') {
        drawBody('#e9d5ff', '#7c3aed', '#4c1d95');
        // 보라 마법사 모자
        ctx.fillStyle = '#6d28d9'; ctx.fillRect(x-r*0.6, y-r*0.9, r*1.2, r*0.15);
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9); ctx.lineTo(x+r*0.4, y-r*0.9); ctx.lineTo(x, y-r*1.5); ctx.closePath(); ctx.fill();
        // 지팡이
        ctx.fillStyle = '#475569'; ctx.fillRect(x+r*0.5, y-r*0.8, r*0.1, r*1.3);
        ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(x+r*0.55, y-r*0.9, r*0.2, 0, Math.PI*2); ctx.fill();
    } else if(type === 'mechanic') {
        drawBody('#fed7aa', '#d97706', '#78350f');
        // 고글
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x-r*0.4, y-r*0.75, r*0.8, r*0.2);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x-r*0.25, y-r*0.72, r*0.15, r*0.14); ctx.fillRect(x+r*0.1, y-r*0.72, r*0.15, r*0.14);
        // 총/렌치
        ctx.fillStyle = '#475569'; ctx.fillRect(x+r*0.4, y-r*0.1, r*0.6, r*0.2);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x+r*0.8, y-r*0.15, r*0.3, r*0.3);
    } else if(type === 'vampire') {
        drawBody('#fecdd3', '#1c1917', '#0c0a09');
        // 망토
        ctx.fillStyle = '#9f1239'; ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.3); ctx.lineTo(x-r*0.8, y+r*0.8); ctx.lineTo(x-r*0.2, y+r*0.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.4, y-r*0.3); ctx.lineTo(x+r*0.8, y+r*0.8); ctx.lineTo(x+r*0.2, y+r*0.5); ctx.closePath(); ctx.fill();
        // 눈 빨갛게
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x-r*0.2, y-r*0.7, r*0.1, r*0.1); ctx.fillRect(x+r*0.1, y-r*0.7, r*0.1, r*0.1);
    } else if(type === 'thor') {
        drawBody('#bfdbfe', '#2563eb', '#1e3a8a');
        // 헬멧 (날개)
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x-r*0.4, y-r*0.9, r*0.8, r*0.2);
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9); ctx.lineTo(x-r*0.7, y-r*1.1); ctx.lineTo(x-r*0.4, y-r*0.7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.4, y-r*0.9); ctx.lineTo(x+r*0.7, y-r*1.1); ctx.lineTo(x+r*0.4, y-r*0.7); ctx.closePath(); ctx.fill();
        // 묠니르
        ctx.fillStyle = '#475569'; ctx.fillRect(x+r*0.5, y-r*0.2, r*0.1, r*0.8);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(x+r*0.3, y-r*0.5, r*0.5, r*0.3);
    }
    
    ctx.restore();
}

// 환경 오브젝트 생성
function generateEnv() {
    environments = [];
    for(let i=0; i<150; i++) {
        let x = rand(100, MAP_SIZE-100);
        let y = rand(100, MAP_SIZE-100);
        // 길 침범 방지 대략적 필터 (탑, 미드, 바텀 길목)
        let onTop = (x < 500 || y < 500);
        let onBot = (x > 2500 || y > 2500);
        let onMid = Math.abs(x + y - 3000) < 400; // 대각선 미드라인
        let onBase = (dist({x,y}, {x:300,y:2700}) < 600) || (dist({x,y}, {x:2700,y:300}) < 600);
        if(!onTop && !onBot && !onMid && !onBase) {
            environments.push({x, y, type: Math.random()>0.5?'tree':(Math.random()>0.5?'rock':'bush'), size: rand(15,35)});
        }
    }
}

function drawEnv(ctx) {
    environments.forEach(env => {
        ctx.save(); ctx.translate(env.x, env.y);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, env.size*0.8, env.size*0.7, env.size*0.3, 0, 0, Math.PI*2); ctx.fill();
        if(env.type === 'tree') {
            ctx.fillStyle = '#78350f'; ctx.fillRect(-env.size*0.1, 0, env.size*0.2, env.size);
            ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.arc(0, -env.size*0.5, env.size*0.8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(0, -env.size*0.8, env.size*0.6, 0, Math.PI*2); ctx.fill();
        } else if(env.type === 'rock') {
            ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(-env.size, env.size*0.5); ctx.lineTo(env.size, env.size*0.5); ctx.lineTo(env.size*0.5, -env.size*0.5); ctx.lineTo(-env.size*0.5, -env.size*0.8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.moveTo(-env.size*0.5, env.size*0.5); ctx.lineTo(env.size*0.5, env.size*0.5); ctx.lineTo(env.size*0.2, -env.size*0.4); ctx.closePath(); ctx.fill();
        } else if(env.type === 'bush') {
            ctx.fillStyle = '#065f46'; ctx.beginPath(); ctx.arc(-env.size*0.5, 0, env.size*0.6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(env.size*0.5, 0, env.size*0.6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -env.size*0.4, env.size*0.7, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    });
}

// ============ 엔티티 클래스 ============
class Entity {
    constructor(x, y, faction, type){
        this.x=x; this.y=y; this.faction=faction; this.type=type;
        this.hp=100; this.maxHp=100; this.isDead=false;
        this.atk=10; this.aspd=1.0; this.moveSpd=0; this.range=50;
        this.vx=0; this.vy=0; this.radius=15;
        this.attackTimer=0; this.stunTimer=0;
        this.burnTicks=[];
        this.nonCombatTimer=0; this.lastAttackedTimer=0;
        this.isBuilding=false; this.reflectRate=0; this.lifeSteal=0;
        this.kills=0; this.totalDmg=0;
        this.animPhase=Math.random()*Math.PI*2;
        this.slowTimer=0; this.slowRate=0;
    }
    update(dt){
        if(this.isDead) return;
        if(this.stunTimer>0){ this.stunTimer-=dt; return; }
        let spdMult = (this.slowTimer > 0) ? (1 - this.slowRate) : 1;
        this.x=clamp(this.x+this.vx*dt*spdMult, 10, MAP_SIZE-10);
        this.y=clamp(this.y+this.vy*dt*spdMult, 10, MAP_SIZE-10);
        this.attackTimer-=dt;
        this.lastAttackedTimer=Math.max(0, this.lastAttackedTimer-dt);
        this.animPhase+=dt*3;
        if(this.slowTimer > 0) this.slowTimer -= dt;

        let isMoving = this.vx!==0||this.vy!==0;
        let inCombat = this.lastAttackedTimer>0;
        if(!this.isBuilding && !inCombat && !isMoving) { this.nonCombatTimer+=dt; } else if(inCombat) { this.nonCombatTimer=0; }
        
        // 피회복 및 이펙트 (14번 요구사항)
        if(!this.isBuilding && this.nonCombatTimer>=REGEN_DELAY && this.hp < this.maxHp) {
            let rate = this.hasWarmog ? WARMOG_REGEN : REGEN_RATE;
            let healAmt = this.maxHp*rate*dt;
            this.hp = Math.min(this.maxHp, this.hp + healAmt);
            if(Math.random() < 0.1) spawnParticles(this.x+rand(-10,10), this.y-this.radius-10, '#22c55e', 1, 50, 0.5, 'plus');
        }

        if(this.stunTimer>0) this.nonCombatTimer=0;

        for(let i=this.burnTicks.length-1;i>=0;i--){
            let b=this.burnTicks[i]; b.timer-=dt;
            if(b.timer<=0){ this.applyRawDamage(b.dmg, b.src, false); b.ticks--; b.timer=1.0; if(b.ticks<=0) this.burnTicks.splice(i,1); }
        }
    }
    applyRawDamage(amount, attacker, triggerEffects=true){
        if(this.isDead) return 0;
        this.lastAttackedTimer=REGEN_DELAY+0.5; this.nonCombatTimer=0;
        let dmg=Math.max(1, Math.floor(amount));
        this.hp-=dmg;
        
        // 정글몹 어그로 반격 로직 추가
        if(this.type === 'jungle' && attacker && !attacker.isBuilding) this.aggroTarget = attacker;

        if(triggerEffects && this.reflectRate>0 && attacker && !attacker.isBuilding){
            let ref=dmg*this.reflectRate; attacker.hp-=ref; addText(attacker.x, attacker.y-25, Math.floor(ref), '#e879f9', 12);
        }
        
        let color = attacker===player?'#fbbf24':(attacker&&attacker.faction==='BLUE'?'#60a5fa':'#f87171');
        spawnParticles(this.x, this.y-this.radius*0.5, color, 5, 80, 0.3);
        
        let isCrit = amount > (attacker?attacker.atk*1.5:0);
        addText(this.x+rand(-15,15), this.y-this.radius-10, isCrit?'\u{1F4A5}'+dmg:dmg, attacker===player?'#fbbf24':'#f8fafc', isCrit?18:14);

        if(this.hp<=0){ this.hp=0; this.isDead=true; if(attacker&&attacker.onKill) attacker.onKill(this); this.onDeath(attacker); }
        playSFX('hit');
        return dmg;
    }
    onDeath(attacker){}
    draw(ctx){}
}

// ============ 영웅 클래스 ============
class Hero extends Entity {
    constructor(x, y, faction, heroKey, isPlayer=false, laneRole='mid'){
        super(x,y,faction,'hero');
        this.heroKey=heroKey; this.isPlayer=isPlayer; this.laneRole = laneRole;
        let t=HERO_TMPL[heroKey];
        this.maxHp=t.hp; this.hp=t.hp; this.baseAtk=t.atk; this.atk=t.atk;
        this.baseAspd=t.aspd; this.aspd=t.aspd; this.baseMoveSpd=t.move; this.moveSpd=t.move;
        this.range=t.range; this.radius=22;
        this.level=1; this.exp=0; this.maxExp=100; this.gold=300;
        this.inventory=[];
        this.heroSkill1Timer=0; this.heroSkill2Timer=0;
        // 뱀서라이크 패시브 스킬 시스템
        this.passiveSkills = {};
        this.passiveTimers = { fireRing:0, meteor:0, shadowClone:0, poisonCloud:0 };
        this.shadowClones = [];
        this.poisonZones = [];
        this.soulBuffTimer = 0;
        this.soulAtkBonus = 0;
        this.pendingLevelUp = false;
        this.critChance=t.critChance||0; this.lifeSteal=t.lifeSteal||0;
        this.reflectRate=0; this.burnDmg=0; this.stunChance=0;
        this.borkActive=false; this.hasWarmog=false;
        this.isRetreating=false; this.aiShopTimer=rand(5,15);
        this.facingDir=1;
    }
    update(dt){
        // 초당 골드 자동 획득 (패시브)
        if(!this.isDead) this.gold += dt * 3;
        
        if(this.isDead){
            this.respawnTimer-=dt;
            if(this.respawnTimer<=0){
                this.isDead=false; this.hp=this.maxHp;
                let sp=this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
                this.x=sp.x+rand(-60,60); this.y=sp.y+rand(-60,60);
                if(this.isPlayer){ document.getElementById('respawnOverlay').classList.add('hidden'); }
                if(!this.isPlayer) this.aiShopAI(); // 부활시 쇼핑
            }
            if(this.isPlayer) document.getElementById('respawnTimeText').textContent=Math.max(0,this.respawnTimer).toFixed(1);
            return;
        }
        this.heroSkill1Timer-=dt; this.heroSkill2Timer-=dt;
        if(this.isPlayer) this.handlePlayerInput(dt); else this.handleAI(dt);
        super.update(dt);
        this.autoAttack();
        this.autoUseHeroSkills();
        this.updatePassives(dt);
    }
    handlePlayerInput(dt){
        this.vx=0; this.vy=0;
        if(GS.platform==='PC'){
            if(keys.w) this.vy-=this.moveSpd; if(keys.s) this.vy+=this.moveSpd;
            if(keys.a){ this.vx-=this.moveSpd; this.facingDir=-1; }
            if(keys.d){ this.vx+=this.moveSpd; this.facingDir=1; }
        } else {
            if(joy.active){ this.vx=(joy.dx/50)*this.moveSpd; this.vy=(joy.dy/50)*this.moveSpd; if(joy.dx<0) this.facingDir=-1; else if(joy.dx>0) this.facingDir=1; }
        }
        let len=Math.hypot(this.vx,this.vy); if(len>this.moveSpd){ this.vx=this.vx/len*this.moveSpd; this.vy=this.vy/len*this.moveSpd; }
    }
    handleAI(dt){
        // 본진 귀환 시 쇼핑
        if(dist(this, this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300}) < 400) {
            this.aiShopTimer-=dt; if(this.aiShopTimer<=0){ this.aiShopAI(); this.aiShopTimer=5; }
        }

        let hpRatio=this.hp/this.maxHp;
        if(hpRatio<=0.3) this.isRetreating=true;
        if(hpRatio>=0.8) this.isRetreating=false;

        let myBase=this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
        if(this.isRetreating){
            let d = dist(this, myBase);
            if(d < 150) {
                this.vx = 0; this.vy = 0; // 본진 도착 시 멈춰서 회복
            } else {
                let a=Math.atan2(myBase.y-this.y, myBase.x-this.x);
                this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; 
                this.facingDir = myBase.x < this.x ? -1 : 1;
            }
            return;
        }
        
        let best=null, bestScore=-9999;
        entities.forEach(e=>{
            if(e===this||e.faction===this.faction||e.isDead) return;
            let d=dist(this,e); if(d>1000) return;
            if(e.type==='hero'||e.type==='minion'){
                let nearEnemyTower=entities.some(t=>(t.type==='tower'||t.type==='nexus_turret')&&t.faction!==this.faction&&!t.isDead&&dist(t,e)<t.range+50);
                if(nearEnemyTower&&(this.hp/this.maxHp)<0.7) return; // 타워 다이브 방지
            }
            let score=-d+(1-e.hp/e.maxHp)*50;
            if(e.type==='hero') score+=100;
            if(e.type==='nexus'||e.type==='tower'||e.type==='nexus_turret') score+=50;
            if(score>bestScore){ bestScore=score; best=e; }
        });
        this.target=best;
        
        // 정상 진행
        if(true) {
            // 적 대상이 있을 때: 추격
            if(this.target){
                let d=dist(this,this.target);
                if(d>this.range*0.85){
                    let a=Math.atan2(this.target.y-this.y, this.target.x-this.x);
                    this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd;
                    this.facingDir = this.target.x<this.x ? -1 : 1;
                } else { this.vx=0; this.vy=0; }
            } 
            // 적이 없을 때: 라인으로 이동
            else {
                // 0.2% 확률로 자율적인 라인 변경 (최대치 자율성)
                if(Math.random() < 0.002) {
                    let rList = ['top', 'mid', 'bot', 'jungle'];
                    this.laneRole = rList[Math.floor(Math.random()*rList.length)];
                }

                // 라인 기반 이동 (Top, Mid, Bot, Jungle)
                let tx = 1500, ty = 1500; // default mid
                if(this.laneRole === 'top') { tx = 300; ty = 300; }
                else if(this.laneRole === 'bot') { tx = 2700; ty = 2700; }
                else if(this.laneRole === 'jungle') {
                    if(!this.jungleTarget || this.jungleTarget.isDead) {
                        let camps = entities.filter(e=>e.type==='jungle'&&!e.isDead);
                        if(camps.length>0) this.jungleTarget = camps[Math.floor(Math.random()*camps.length)];
                    }
                    if(this.jungleTarget) { tx = this.jungleTarget.x; ty = this.jungleTarget.y; }
                }
                
                // 목표(코너/미드)에 도착했으면 적 본진으로 목표 변경
                if(this.laneRole !== 'jungle' && dist(this, {x:tx, y:ty}) < 400) {
                    let enemyBase = this.faction === 'BLUE' ? {x:2700, y:300} : {x:300, y:2700};
                    tx = enemyBase.x; ty = enemyBase.y;
                }

                let a=Math.atan2(ty-this.y, tx-this.x);
                this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd;
                this.facingDir = tx<this.x ? -1 : 1;
            }
        }
    }
    autoAttack(){
        if(this.attackTimer>0) return;
        let target=null, minD=this.range;
        entities.forEach(e=>{
            if(e.faction!==this.faction&&!e.isDead){
                let d=dist(this,e); if(d<=this.range&&d<minD){minD=d;target=e;}
            }
        });
        if(!target) return;

        this.attackTimer=1.0/this.aspd;
        let dmg=this.atk;
        let isCrit=Math.random()<this.critChance; if(isCrit) dmg*=2;
        if(this.borkActive&&!target.isBuilding) dmg+=target.hp*0.08;

        if(HERO_TMPL[this.heroKey].type==='ranged'){
            projectiles.push(new Projectile(this.x, this.y-this.radius, target, dmg, this, isCrit));
            playSFX('shoot');
        } else {
            let dealt=target.applyRawDamage(dmg, this); this.totalDmg+=dealt;
            this.triggerOnHitPassives(target);
            if(this.lifeSteal>0) { this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal); playSFX('heal'); }
            if(this.burnDmg>0&&!target.isBuilding) target.burnTicks.push({dmg:this.burnDmg,ticks:3,timer:1.0,src:this});
            if(this.stunChance>0&&Math.random()<this.stunChance&&!target.isBuilding) target.stunTimer=1.0;
            let a=Math.atan2(target.y-this.y,target.x-this.x);
            spawnSlash(this.x+Math.cos(a)*this.range*0.5, this.y+Math.sin(a)*this.range*0.5, a, isCrit?'#fbbf24':HERO_TMPL[this.heroKey].color);
        }
    }
    onKill(target){
        this.kills++;
        this.triggerOnKillPassives(target);
        if(target.type==='hero'){
            this.gold+=300; this.gainExp(50);
            if(target.faction!=='BLUE') GS.scoreBlue++; else GS.scoreRed++;
            document.getElementById('scoreBlue').textContent=GS.scoreBlue; document.getElementById('scoreRed').textContent=GS.scoreRed;
            showBanner(HERO_TMPL[target.heroKey].name + ' \uCC98\uCE58!', '\u2694\uFE0F', this.faction==='BLUE');
            if(this.isPlayer) addText(this.x, this.y-40, '+300G / 50XP', '#fbbf24', 16);
        } else if(target.type==='minion'){ 
            this.gold+=50; this.gainExp(15);
            if(this.isPlayer) addText(this.x, this.y-40, '+50G', '#fbbf24', 16);
        } else if(target.type==='jungle'){ 
            this.gold+=150; this.gainExp(40);
            if(this.isPlayer) addText(this.x, this.y-40, '+150G / 40XP', '#fbbf24', 18);
        } else if(target.type.startsWith('boss')){ 
            this.gold+=500; this.gainExp(100); showBanner('\uBCF4\uC2A4 \uCC98\uCE58!', '\uD83D\uDC51', this.faction==='BLUE'); 
            if(this.isPlayer) addText(this.x, this.y-40, '+500G / 100XP', '#fbbf24', 18);
        }
    }
    gainExp(amt){
        this.exp+=amt;
        while(this.exp>=this.maxExp){
            this.exp-=this.maxExp; this.level++; this.maxExp=Math.floor(this.maxExp*1.25);
            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            if(c==='atk') { this.baseAtk+=5; statMsg = '\uACF5\uACA9\uB825 +5'; }
            if(c==='hp') { this.maxHp+=50; this.hp+=50; statMsg = '\uCCB4\uB825 +50'; }
            if(c==='move') { this.baseMoveSpd+=2.0; statMsg = '\uC774\uB3D9\uC18D\uB3C4 \uC99D\uAC00'; }
            if(c==='aspd') { this.baseAspd+=0.1; statMsg = '\uACF5\uACA9\uC18D\uB3C4 \uC99D\uAC00'; }
            this.applyStats();
            if(this.isPlayer){
                addText(this.x,this.y-60,'LEVEL UP!','#fcd34d',22);
                setTimeout(()=>addText(this.x,this.y-80,'\uC6B4\uBE68 \uC2A4\uD0EF: '+statMsg+'!', '#a78bfa', 16), 300);
                playSFX('heal');
                setTimeout(() => this.showSkillSelection(), 500);
            } else {
                this.aiSelectSkill();
            }
        }
    }
    onDeath(attacker){
        this.respawnTimer = 3 + this.level; // 부활 대기시간 단축
        if(this.isPlayer) document.getElementById('respawnOverlay').classList.replace('hidden', 'flex');
        spawnParticles(this.x,this.y,HERO_TMPL[this.heroKey].color,20,200,1.0);
    }
    aiShopAI(){
        let item=BASE_ITEMS[Math.floor(Math.random()*BASE_ITEMS.length)];
        if(this.gold >= item.cost) this.buyItem(item.id);
    }
    buyItem(id){
        let item=BASE_ITEMS.find(i=>i.id===id); if(!item||this.gold<item.cost) return;
        let slot=this.inventory.find(i=>i.id===id);
        if(slot){
            if(slot.upgrade>=9) return;
            this.gold-=item.cost; if(Math.random()<ENHANCE_RATES[slot.upgrade]){ slot.upgrade++; if(this.isPlayer) addText(this.x,this.y-50,'+'+slot.upgrade+' \uC131\uACF5!','#f59e0b'); }
        } else {
            if(this.inventory.length>=8) return;
            this.gold-=item.cost; this.inventory.push({id:item.id,upgrade:0,stat:item.stat,val:item.val});
        }
        this.applyStats(); renderShop();
    }
    applyStats(){
        let t=HERO_TMPL[this.heroKey];
        this.atk=this.baseAtk; this.aspd=this.baseAspd; this.moveSpd=this.baseMoveSpd;
        this.critChance=t.critChance||0; this.lifeSteal=t.lifeSteal||0;
        this.reflectRate=0; this.burnDmg=0; this.stunChance=0;
        this.inventory.forEach(i=>{
            let m=1+(i.upgrade*0.5);
            if(i.stat==='atk') this.atk+=i.val*m; if(i.stat==='hp') this.maxHp+=i.val*m;
            if(i.stat==='move') this.moveSpd+=i.val*m; if(i.stat==='aspd') this.aspd+=i.val*m;
            if(i.stat==='crit') this.critChance+=i.val*m; if(i.stat==='lifesteal') this.lifeSteal+=i.val*m;
            if(i.stat==='reflect') this.reflectRate+=i.val*m; if(i.stat==='burn') this.burnDmg+=i.val*m;
            if(i.stat==='stun') this.stunChance+=i.val*m;
        });
        // 패시브 스킬 스탯
        let ihLv = this.passiveSkills['ironHealth'] || 0;
        if(ihLv > 0) this.maxHp += t.hp * ihLv * 0.15;
        let swLv = this.passiveSkills['swiftWind'] || 0;
        if(swLv > 0) { this.moveSpd += this.baseMoveSpd * swLv * 0.06; this.aspd += this.baseAspd * swLv * 0.04; }
        let bsLv = this.passiveSkills['berserkerSoul'] || 0;
        if(bsLv > 0 && this.hp/this.maxHp < 0.5) {
            this.atk += this.baseAtk * (0.15 + (bsLv-1)*0.10) * (1 - (this.hp/this.maxHp)*2);
        }
        let taLv = this.passiveSkills['thornArmor'] || 0;
        if(taLv > 0) this.reflectRate += 0.08 + (taLv-1)*0.08;
        if(this.soulAtkBonus > 0) this.atk += this.soulAtkBonus;
        this.hp=Math.min(this.hp, this.maxHp);
    }
    autoUseHeroSkills(){
        let k = this.heroKey;
        let sl = Math.floor((this.level - 1) / 3) + 1;
        let skillDmg = this.atk * (1.5 + sl * 0.5);
        let nearEnemies = (cx,cy,r) => entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist({x:cx,y:cy},e)<=r);
        // Skill 1
        if(this.heroSkill1Timer <= 0) {
            let cd = Math.max(2, HERO_TMPL[k].skill1.cd - sl*0.5);
            let targets = nearEnemies(this.x, this.y, 400);
            if(targets.length > 0) {
                this.heroSkill1Timer = cd;
                if(k==='BERSERKER' || k==='THOR'){
                    nearEnemies(this.x,this.y,250).forEach(e=>{e.applyRawDamage(skillDmg,this);e.stunTimer=1;});
                    spawnAOE(this.x,this.y,250,HERO_TMPL[k].color+'88',0.5);
                } else {
                    let t=targets.sort((a,b)=>dist(this,a)-dist(this,b))[0];
                    if(HERO_TMPL[k].type==='ranged') { for(let i=0;i<3+sl;i++) setTimeout(()=>{if(!t.isDead) projectiles.push(new Projectile(this.x,this.y,t,skillDmg*0.5,this,false));}, i*100); }
                    else { this.x=t.x+rand(-40,40); this.y=t.y+rand(-40,40); t.applyRawDamage(skillDmg*1.5,this); spawnParticles(this.x,this.y,HERO_TMPL[k].color,20,150,0.5); }
                }
                addText(this.x,this.y-50,HERO_TMPL[k].skill1.name,HERO_TMPL[k].color); playSFX('shoot');
            }
        }
        // Skill 2
        if(this.heroSkill2Timer <= 0) {
            let cd = Math.max(2, HERO_TMPL[k].skill2.cd - sl*0.5);
            let targets = nearEnemies(this.x, this.y, 400);
            if(targets.length > 0) {
                this.heroSkill2Timer = cd;
                if(k==='BERSERKER' || k==='THOR'){
                    nearEnemies(this.x,this.y,250).forEach(e=>{e.applyRawDamage(skillDmg,this);e.stunTimer=1;});
                    spawnAOE(this.x,this.y,250,HERO_TMPL[k].color+'88',0.5);
                } else {
                    let t=targets.sort((a,b)=>dist(this,a)-dist(this,b))[0];
                    if(HERO_TMPL[k].type==='ranged') { for(let i=0;i<3+sl;i++) setTimeout(()=>{if(!t.isDead) projectiles.push(new Projectile(this.x,this.y,t,skillDmg*0.5,this,false));}, i*100); }
                    else { this.x=t.x+rand(-40,40); this.y=t.y+rand(-40,40); t.applyRawDamage(skillDmg*1.5,this); spawnParticles(this.x,this.y,HERO_TMPL[k].color,20,150,0.5); }
                }
                addText(this.x,this.y-50,HERO_TMPL[k].skill2.name,HERO_TMPL[k].color); playSFX('shoot');
            }
        }
    }
    updatePassives(dt) {
        // 화염의 고리
        let frLv = this.passiveSkills['fireRing'] || 0;
        if(frLv > 0) {
            this.passiveTimers.fireRing += dt;
            if(this.passiveTimers.fireRing >= 0.5) {
                this.passiveTimers.fireRing = 0;
                let radius = 80 + (frLv-1)*20;
                let dmg = this.atk * (0.15 + frLv*0.08);
                entities.forEach(e => { if(e.faction!==this.faction && !e.isDead && dist(this,e)<=radius) e.applyRawDamage(dmg,this); });
            }
        }
        // 유성우
        let mtLv = this.passiveSkills['meteor'] || 0;
        if(mtLv > 0) {
            this.passiveTimers.meteor += dt;
            if(this.passiveTimers.meteor >= 8-(mtLv-1)) {
                this.passiveTimers.meteor = 0;
                let targets = entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<=500);
                for(let i=0; i<Math.min(mtLv, targets.length); i++) {
                    let t=targets[Math.floor(Math.random()*targets.length)];
                    setTimeout(()=>{ if(!t.isDead){ t.applyRawDamage(this.atk*1.2,this); spawnAOE(t.x,t.y,60,'#f97316aa',0.5); spawnParticles(t.x,t.y,'#f97316',15,150,0.5); addText(t.x,t.y-30,'\u2604\uFE0F','#f97316',20); } }, i*300);
                }
            }
        }
        // 분신술
        let scLv = this.passiveSkills['shadowClone'] || 0;
        if(scLv > 0) {
            this.passiveTimers.shadowClone += dt;
            if(this.passiveTimers.shadowClone >= 10) {
                this.passiveTimers.shadowClone = 0;
                for(let i=0;i<scLv;i++) this.shadowClones.push({x:this.x+rand(-50,50),y:this.y+rand(-50,50),life:5+(scLv-1)*2,atk:this.atk*0.3,animPhase:Math.random()*Math.PI*2});
                addText(this.x,this.y-50,'\uBD84\uC2E0 \uC18C\uD658!','#a78bfa',16);
            }
            for(let i=this.shadowClones.length-1;i>=0;i--) {
                let c=this.shadowClones[i]; c.life-=dt; c.animPhase+=dt*4;
                if(c.life<=0){this.shadowClones.splice(i,1);continue;}
                let tgt=null,minD=200;
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){let d=dist(c,e);if(d<minD){minD=d;tgt=e;}}});
                if(tgt){
                    if(minD>50){let a=Math.atan2(tgt.y-c.y,tgt.x-c.x);c.x+=Math.cos(a)*150*dt;c.y+=Math.sin(a)*150*dt;}
                    else if(Math.sin(c.animPhase*3)>0.8) tgt.applyRawDamage(c.atk,this);
                } else { let a=Math.atan2(this.y-c.y,this.x-c.x); if(dist(c,this)>80){c.x+=Math.cos(a)*120*dt;c.y+=Math.sin(a)*120*dt;} }
            }
        }
        // 독안개
        let pcLv = this.passiveSkills['poisonCloud'] || 0;
        if(pcLv > 0) {
            this.passiveTimers.poisonCloud += dt;
            if(this.passiveTimers.poisonCloud >= 6-(pcLv-1)*0.5) {
                this.passiveTimers.poisonCloud = 0;
                this.poisonZones.push({x:this.x,y:this.y,radius:100+(pcLv-1)*30,life:3+(pcLv-1),maxLife:3+(pcLv-1),dmg:this.atk*(0.15+pcLv*0.08),tick:0});
            }
            for(let i=this.poisonZones.length-1;i>=0;i--) {
                let pz=this.poisonZones[i]; pz.life-=dt;
                if(pz.life<=0){this.poisonZones.splice(i,1);continue;}
                pz.tick+=dt;
                if(pz.tick>=0.5) { pz.tick=0; entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead&&dist(pz,e)<=pz.radius) e.applyRawDamage(pz.dmg*0.5,this);}); }
            }
        }
        // 영혼 수확 버프
        if(this.soulBuffTimer>0){this.soulBuffTimer-=dt; if(this.soulBuffTimer<=0) this.soulAtkBonus=0;}
    }
    triggerOnHitPassives(target) {
        if(!target||target.isDead) return;
        // 낙뢰
        let ltLv=this.passiveSkills['lightning']||0;
        if(ltLv>0 && Math.random()<0.08+(ltLv-1)*0.02) {
            let targets=entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<=400).sort(()=>Math.random()-0.5).slice(0,ltLv);
            targets.forEach((t,idx)=>setTimeout(()=>{if(!t.isDead){t.applyRawDamage(this.atk*0.8,this);spawnLightningEffect(t.x,t.y);addText(t.x,t.y-30,'\u26A1','#fbbf24',22);}},idx*100));
        }
        // 체인 라이트닝
        let clLv=this.passiveSkills['chainLightning']||0;
        if(clLv>0 && Math.random()<0.08+(clLv-1)*0.03) {
            let dmg=this.atk*0.6, hit=[target], cur=target;
            for(let i=0;i<clLv;i++) {
                let next=null,minD=300;
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead&&!hit.includes(e)){let d=dist(cur,e);if(d<minD){minD=d;next=e;}}});
                if(!next) break; hit.push(next);
                let s=cur,tg=next,ii=i;
                setTimeout(()=>{if(!tg.isDead){tg.applyRawDamage(dmg*Math.pow(0.8,ii),this);spawnChainEffect(s.x,s.y,tg.x,tg.y);}}, (i+1)*150);
                cur=next;
            }
        }
        // 빙결의 손길
        let fLv=this.passiveSkills['frost']||0;
        if(fLv>0 && Math.random()<0.08+(fLv-1)*0.04 && !target.isBuilding) {
            target.slowTimer=2+(fLv-1); target.slowRate=0.4+(fLv-1)*0.1;
            spawnParticles(target.x,target.y,'#93c5fd',10,80,0.5); addText(target.x,target.y-20,'\u2744\uFE0F','#93c5fd',16);
        }
    }
    triggerOnKillPassives(target) {
        let shLv=this.passiveSkills['soulHarvest']||0;
        if(shLv>0) {
            this.hp=Math.min(this.maxHp,this.hp+this.maxHp*(0.05+(shLv-1)*0.03));
            this.soulAtkBonus=this.baseAtk*(0.08+(shLv-1)*0.06); this.soulBuffTimer=5;
            spawnParticles(this.x,this.y,'#a78bfa',15,100,0.5); addText(this.x,this.y-40,'\uD83D\uDC7B \uC601\uD63C \uC218\uD655!','#a78bfa',16); playSFX('heal');
        }
    }
    showSkillSelection() {
        let available = PASSIVE_SKILLS.filter(s=>(this.passiveSkills[s.id]||0)<s.maxLv);
        if(available.length===0) return;
        available.sort(()=>Math.random()-0.5);
        let choices = available.slice(0, Math.min(3, available.length));
        this.pendingLevelUp = true; GS.paused = true;
        let overlay = document.getElementById('skillSelectionOverlay');
        let container = document.getElementById('skillCards');
        overlay.classList.remove('hidden');
        container.innerHTML = '';
        for(let si=0; si<choices.length; si++) {
            let skill = choices[si];
            let curLv = this.passiveSkills[skill.id] || 0;
            let card = document.createElement('div');
            card.className = 'skill-card';
            let lvText = curLv > 0 ? 'Lv.' + curLv + ' \u2192 Lv.' + (curLv+1) : 'NEW! Lv.1';
            let lvClass = curLv > 0 ? 'text-emerald-400' : 'text-amber-400';
            card.innerHTML = '<div class="text-4xl mb-2">' + skill.icon + '</div>' +
                '<div class="text-sm font-bold text-white mb-1">' + skill.name + '</div>' +
                '<div class="text-[10px] text-slate-300 mb-2 leading-tight">' + skill.desc + '</div>' +
                '<div class="text-[10px] font-bold ' + lvClass + '">' + lvText + '</div>';
            card.setAttribute('data-skill-id', skill.id);
            card.onclick = function() { player.selectPassiveSkill(skill.id); };
            container.appendChild(card);
        }
    }
    selectPassiveSkill(skillId) {
        this.passiveSkills[skillId] = (this.passiveSkills[skillId]||0) + 1;
        this.applyStats();
        document.getElementById('skillSelectionOverlay').classList.add('hidden');
        this.pendingLevelUp = false; GS.paused = false;
        let sk = PASSIVE_SKILLS.find(s=>s.id===skillId);
        addText(this.x,this.y-60, sk.icon+' '+sk.name+' Lv.'+this.passiveSkills[skillId]+'!', '#fcd34d', 18);
        playSFX('heal');
    }
    aiSelectSkill() {
        let available = PASSIVE_SKILLS.filter(s=>(this.passiveSkills[s.id]||0)<s.maxLv);
        if(available.length===0) return;
        let pick = available[Math.floor(Math.random()*available.length)];
        this.passiveSkills[pick.id] = (this.passiveSkills[pick.id]||0) + 1;
        this.applyStats();
    }
    draw(ctx){
        if(this.isDead) return;
        let t=HERO_TMPL[this.heroKey];
        if(this.stunTimer>0){ ctx.strokeStyle='#fbbf24'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(this.x, this.y-this.radius, this.radius*1.4, 0, Math.PI*2); ctx.stroke(); }
        t.draw(ctx, this.x, this.y, this.radius, this.facingDir, this.faction);
        
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius+4, 0, Math.PI*2);
        ctx.strokeStyle=this.isPlayer?'#fcd34d':(this.faction==='BLUE'?'#3b82f6':'#ef4444'); ctx.lineWidth=this.isPlayer?3:2; ctx.stroke();
        
        let bw=50, bh=6, bx=this.x-bw/2, by=this.y-this.radius-20;
        ctx.fillStyle='#1e293b'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle=this.hp/this.maxHp>0.5?'#22c55e':'#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
        ctx.fillStyle='#fbbf24'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.fillText('Lv'+this.level, this.x, by-2);
        if(this.isPlayer) { ctx.fillText('\u25B6 YOU', this.x, by-15); }
        // 화염 고리 렌더링
        if((this.passiveSkills['fireRing']||0) > 0) {
            let frLv = this.passiveSkills['fireRing'];
            let frR = 80 + (frLv-1)*20;
            let tt = performance.now()/500;
            ctx.save(); ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3 + frLv;
            ctx.beginPath(); ctx.arc(this.x, this.y, frR, tt, tt+Math.PI*1.5); ctx.stroke();
            ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.x, this.y, frR-5, tt+Math.PI, tt+Math.PI*2.3); ctx.stroke();
            ctx.globalAlpha = 1; ctx.restore();
        }
        // 슬로우 표시
        if(this.slowTimer > 0) {
            ctx.fillStyle = '#93c5fd'; ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius+8, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

// ============ 타워 / 넥서스 / 수호탑 ============
class Building extends Entity {
    constructor(x,y,faction,btype){
        super(x,y,faction,btype);
        this.isBuilding=true;
        if(btype==='nexus'){ this.maxHp=5000; this.atk=0; this.range=0; this.radius=50; }
        else if(btype==='nexus_turret') { this.maxHp=3000; this.atk=300; this.aspd=1.5; this.range=350; this.radius=20; }
        else { this.maxHp=5000; this.atk=250; this.aspd=1.2; this.range=350; this.radius=28; } // 타워 버프
        this.hp=this.maxHp;
    }
    update(dt){
        if(this.isDead) return;
        super.update(dt);
        if(this.atk > 0 && this.attackTimer<=0){
            let target=null, minD=this.range;
            for(let ptype of ['minion','hero','jungle']){
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){let d=dist(this,e);if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}}});
                if(target) break;
            }
            if(target){
                this.attackTimer=1/this.aspd;
                let dmg = this.atk;
                if(target.type === 'jungle') dmg = Math.floor(dmg * 0.5); // 타워가 필드몹 타격 시 50% 감소
                // 쌍발 투사체 (9번 요구사항)
                projectiles.push(new Projectile(this.x,this.y-this.radius,target,dmg,this,false,'tower'));
                setTimeout(() => { if(!this.isDead && !target.isDead) projectiles.push(new Projectile(this.x,this.y-this.radius,target,dmg,this,false,'tower')); }, 150);
                playSFX('tower');
            }
        }
    }
    onDeath(attacker){
        if(this.type==='nexus'){
            GS.status='GAMEOVER'; document.getElementById('gameOverScreen').classList.remove('hidden');
            let win=this.faction!=='BLUE'; document.getElementById('txtGameResult').textContent=win?'VICTORY':'DEFEAT';
        }
        spawnParticles(this.x,this.y,'#f59e0b',30,300,1.5);
    }
    draw(ctx){
        if(this.isDead) return;
        let c=this.faction==='BLUE'?'#1d4ed8':'#b91c1c', cl=this.faction==='BLUE'?'#3b82f6':'#ef4444';
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+this.radius*0.5,this.radius*1.5,this.radius*0.5,0,0,Math.PI*2); ctx.fill();
        
        if(this.type==='nexus'){
            ctx.shadowColor=cl; ctx.shadowBlur=20; ctx.fillStyle=c; ctx.fillRect(this.x-this.radius,this.y-this.radius*1.2,this.radius*2,this.radius*1.5);
            ctx.fillStyle=cl; ctx.beginPath(); ctx.moveTo(this.x, this.y-this.radius*2); ctx.lineTo(this.x-this.radius*0.8, this.y-this.radius*1.2); ctx.lineTo(this.x+this.radius*0.8, this.y-this.radius*1.2); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        } else {
            ctx.fillStyle=c; ctx.fillRect(this.x-this.radius*0.7,this.y-this.radius*1.5,this.radius*1.4,this.radius*1.8);
            ctx.fillStyle=cl; ctx.beginPath(); ctx.moveTo(this.x, this.y-this.radius*2.2); ctx.lineTo(this.x-this.radius*0.8, this.y-this.radius*1.5); ctx.lineTo(this.x+this.radius*0.8, this.y-this.radius*1.5); ctx.closePath(); ctx.fill();
            if(this.type==='nexus_turret') { ctx.fillStyle='#fcd34d'; ctx.beginPath(); ctx.arc(this.x, this.y-this.radius*2.2, 5, 0, Math.PI*2); ctx.fill(); }
        }
        
        let bw=this.radius*2, bh=8, bx=this.x-bw/2, by=this.y-this.radius*2.5;
        ctx.fillStyle='#1e293b'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle='#22c55e'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
    }
}

// ============ 미니언 ============
class Minion extends Entity {
    constructor(x,y,faction,lane){
        super(x,y,faction,'minion'); this.lane=lane;
        // 미니언 성장 스케일 강화 (300초마다 2배)
        let scale=1+GS.time/300; this.maxHp=Math.floor(400*scale); this.hp=this.maxHp; this.atk=Math.floor(15*scale); this.aspd=1.0; this.moveSpd=120; this.range=30; this.radius=10;
        
        let bTop=[{x:300,y:2700},{x:300,y:300},{x:2700,y:300}], bMid=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}], bBot=[{x:300,y:2700},{x:2700,y:2700},{x:2700,y:300}];
        let rTop=[{x:2700,y:300},{x:300,y:300},{x:300,y:2700}], rMid=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}], rBot=[{x:2700,y:300},{x:2700,y:2700},{x:300,y:2700}];
        this.waypoints = faction==='BLUE' ? (lane==='top'?bTop:lane==='mid'?bMid:bBot) : (lane==='top'?rTop:lane==='mid'?rMid:rBot);
        this.wpIdx=1; this.animPhase=Math.random()*Math.PI*2;
    }
    update(dt){
        if(this.isDead) return; super.update(dt);
        let target=null, minD=150;
        entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){let d=dist(this,e);if(d<minD){minD=d;target=e;}}});
        if(target){
            if(minD>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
            else { this.vx=0; this.vy=0; if(this.attackTimer<=0){ this.attackTimer=1/this.aspd; target.applyRawDamage(this.atk,this); playSFX('hit'); spawnSlash(this.x,this.y-this.radius,Math.atan2(target.y-this.y,target.x-this.x),'#64748b',20); } }
        } else {
            if(this.wpIdx<this.waypoints.length){
                let wp=this.waypoints[this.wpIdx]; let d=dist(this,wp);
                if(d<30) this.wpIdx++; else { let a=Math.atan2(wp.y-this.y,wp.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
            }
        }
    }
    draw(ctx){
        if(this.isDead) return;
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+this.radius*0.8,this.radius,this.radius*0.4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444';
        let ly = Math.sin(this.animPhase)*this.radius*0.3;
        ctx.fillRect(this.x-this.radius*0.6, this.y-this.radius+ly, this.radius*1.2, this.radius*1.5);
        ctx.fillStyle='#fca5a5'; ctx.fillRect(this.x-this.radius*0.4, this.y-this.radius*0.8+ly, this.radius*0.8, this.radius*0.5);
        ctx.fillStyle='#1e293b'; ctx.fillRect(this.x-this.radius*0.2, this.y-this.radius*0.6+ly, 2, 2); ctx.fillRect(this.x+this.radius*0.1, this.y-this.radius*0.6+ly, 2, 2);
        let bw=24,bh=4,bx=this.x-bw/2,by=this.y-this.radius-10; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
    }
}

class Monster extends Entity {
    constructor(x,y,mtype){
        super(x,y,'NEUTRAL','jungle'); this.mtype=mtype; this.home={x,y};
        this.maxHp = mtype.includes('boss') ? 5000 : 1500; this.hp=this.maxHp;
        this.atk = mtype.includes('boss') ? 150 : 40; this.aspd=0.8; this.moveSpd=80; this.range=50; this.radius = mtype.includes('boss') ? 40 : 18;
        this.respawnTimer=0;
    }
    update(dt){
        if(this.isDead){ if(!this.mtype.includes('boss')) { this.respawnTimer-=dt; if(this.respawnTimer<=0){ this.isDead=false; this.hp=this.maxHp; this.x=this.home.x; this.y=this.home.y; this.aggroTarget=null; } } return; }
        super.update(dt);
        let target = this.aggroTarget;
        
        // 어그로 대상이 죽었거나 자기 집에서 너무 멀어지면 어그로 해제
        if(target && (target.isDead || dist(this.home, this) > 600)) {
            this.aggroTarget = null;
            target = null;
            this.hp = this.maxHp; // 어그로 풀리면 체력 초기화
        }

        if(target){
            if(dist(this,target)>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
            else { this.vx=0; this.vy=0; if(this.attackTimer<=0){this.attackTimer=1/this.aspd; target.applyRawDamage(this.atk,this);} }
        } else if(dist(this,this.home)>50){ let a=Math.atan2(this.home.y-this.y,this.home.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
        else { this.vx=0; this.vy=0; }
    }
    onDeath(attacker){ this.respawnTimer=15; if(this.mtype==='boss_dragon'){ showBanner('\uB4DC\uB798\uACE4 \uCC98\uCE58!','\uD83D\uDC32', attacker.faction==='BLUE'); } }
    draw(ctx){
        if(this.isDead) return;
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+this.radius*0.8,this.radius,this.radius*0.4,0,0,Math.PI*2); ctx.fill();
        
        // 몬스터 타입에 따른 다양한 색상과 모양 (5종류)
        if(this.mtype === 'wolf') ctx.fillStyle = '#475569';
        else if(this.mtype === 'bear') ctx.fillStyle = '#78350f';
        else if(this.mtype === 'golem') ctx.fillStyle = '#94a3b8';
        else if(this.mtype === 'skeleton') ctx.fillStyle = '#f8fafc';
        else if(this.mtype === 'slime') ctx.fillStyle = '#22c55e';
        else ctx.fillStyle = '#991b1b'; // Boss

        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius*0.8, 0, 0, Math.PI*2); ctx.fill();
        
        // 눈 포인트
        ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(this.x-this.radius*0.3, this.y-this.radius*0.2, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x+this.radius*0.3, this.y-this.radius*0.2, 3, 0, Math.PI*2); ctx.fill();

        let bw=this.radius*2,bh=6,bx=this.x-bw/2,by=this.y-this.radius-15; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle='#f97316'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
    }
}

// ============ 투사체 ============
class Projectile {
    constructor(x,y,target,dmg,attacker,isCrit,ptype='arrow'){
        this.x=x; this.y=y; this.target=target; this.dmg=dmg; this.attacker=attacker; this.isCrit=isCrit; this.ptype=ptype;
        this.speed=ptype==='tower'?550:400; this.isDead=false;
    }
    update(dt){
        if(this.target.isDead){this.isDead=true;return;}
        if(dist(this,this.target)<15){
            this.target.applyRawDamage(this.dmg,this.attacker);
            if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(this.target);
            if(this.attacker.lifeSteal>0&&this.attacker.type==='hero') { this.attacker.hp=Math.min(this.attacker.maxHp,this.attacker.hp+this.dmg*this.attacker.lifeSteal); playSFX('heal'); }
            if(this.attacker.burnDmg>0&&!this.target.isBuilding) this.target.burnTicks.push({dmg:this.attacker.burnDmg,ticks:3,timer:1.0,src:this.attacker});
            if(this.attacker.stunChance>0&&Math.random()<this.attacker.stunChance&&!this.target.isBuilding) this.target.stunTimer=1.0;
            spawnParticles(this.target.x,this.target.y-this.target.radius*0.5, this.isCrit?'#ff6b35':'#fbbf24', 8, 120, 0.3);
            this.isDead=true;
        } else {
            let a=Math.atan2(this.target.y-this.y,this.target.x-this.x);
            this.x+=Math.cos(a)*this.speed*dt; this.y+=Math.sin(a)*this.speed*dt;
        }
    }
    draw(ctx){
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.atan2(this.target.y-this.y,this.target.x-this.x));
        if(this.ptype==='arrow'){ ctx.fillStyle='#92400e'; ctx.fillRect(-10,-1.5,14,3); }
        else { ctx.shadowColor='#fbbf24'; ctx.shadowBlur=10; ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
        ctx.restore();
    }
}

// ============ 패시브 스킬 시각 효과 ============
function spawnLightningEffect(x, y) {
    for(let i=0;i<5;i++) particles.push({x:x+rand(-15,15),y:y-i*60,vx:rand(-20,20),vy:rand(-30,10),life:0.3,maxLife:0.3,color:'#fbbf24',size:rand(3,8),shape:'circle'});
    spawnParticles(x,y,'#fde68a',12,100,0.3); playSFX('tower');
}
function spawnChainEffect(x1,y1,x2,y2) {
    for(let i=0;i<=5;i++){let t=i/5; particles.push({x:x1+(x2-x1)*t+rand(-10,10),y:y1+(y2-y1)*t+rand(-10,10),vx:rand(-15,15),vy:rand(-15,15),life:0.3,maxLife:0.3,color:'#60a5fa',size:rand(2,5),shape:'circle'});}
}

// ============ 입력 이벤트 & 줌 ============
window.addEventListener('keydown',e=>{ let k=e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k]=true; });
window.addEventListener('keyup',e=>{ let k=e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k]=false; });
window.addEventListener('wheel', e => { camera.zoom -= e.deltaY * 0.001; camera.zoom = clamp(camera.zoom, 0.3, 2.0); });

let initPinchD = null, initZoom = 1.0;
window.addEventListener('touchstart',e=>{
    initAudio();
    if(e.touches.length === 2) { initPinchD = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); initZoom = camera.zoom; }
    else if(GS.platform==='MOBILE'&&e.touches[0].clientX<window.innerWidth/2){ joy.active=true; joy.id=e.touches[0].identifier; joy.ox=e.touches[0].clientX; joy.oy=e.touches[0].clientY; }
});
window.addEventListener('touchmove',e=>{
    if(e.touches.length === 2 && initPinchD) { let d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); camera.zoom = clamp(initZoom * (d/initPinchD), 0.3, 2.0); }
    else if(joy.active) { for(let t of e.changedTouches) if(t.identifier===joy.id){ let dx=t.clientX-joy.ox, dy=t.clientY-joy.oy, d=Math.hypot(dx,dy); if(d>50){dx=dx/d*50;dy=dy/d*50;} joy.dx=dx; joy.dy=dy; } }
});
window.addEventListener('touchend',e=>{ if(e.touches.length<2) initPinchD=null; for(let t of e.changedTouches) if(t.identifier===joy.id){joy.active=false;joy.dx=0;joy.dy=0;} });

// ============ UI ============
window.selectPlatform=p=>{ GS.platform=p; document.getElementById('btnPlatPC').className=p==='PC'?"px-4 py-2.5 rounded-xl font-bold bg-indigo-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; document.getElementById('btnPlatMobile').className=p==='MOBILE'?"px-4 py-2.5 rounded-xl font-bold bg-emerald-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; };
window.selectFaction=f=>{ GS.faction=f; document.getElementById('btnFactionBlue').className=f==='BLUE'?"py-3 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; document.getElementById('btnFactionRed').className=f==='RED'?"py-3 px-3 rounded-xl border-2 border-fuchsia-500 bg-fuchsia-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; };
window.selectHero=h=>{ GS.hero=h; Object.keys(HERO_TMPL).forEach(hk=>{ document.getElementById('btnHero'+hk).className='py-2 px-1 rounded-xl border-2 '+(hk===h?'border-emerald-500 bg-slate-800/80':'border-transparent bg-slate-800/60')+' flex flex-col items-center transition-all'; });
    document.getElementById('heroDescription').innerHTML='<div class="text-amber-400 font-bold mb-0.5">['+HERO_TMPL[h].name+'] <span class="text-[10px] text-emerald-400 font-bold ml-1">\uACE0\uC720 \uD328\uC2DC\uBE0C \uC2A4\uD0AC</span></div>' +
        '<div class="text-white bg-slate-900 p-1 rounded mt-1 text-[10px]">\uD83D\uDD04\uD328\uC2DC\uBE0C1: <span class="text-emerald-300 font-bold">'+HERO_TMPL[h].skill1.name+'</span> (\uC790\uB3D9\uBC1C\uB3D9 '+HERO_TMPL[h].skill1.cd+'\uCD08)<br/> \uD83D\uDD04\uD328\uC2DC\uBE0C2: <span class="text-indigo-300 font-bold">'+HERO_TMPL[h].skill2.name+'</span> (\uC790\uB3D9\uBC1C\uB3D9 '+HERO_TMPL[h].skill2.cd+'\uCD08)</div>' +
        '<div class="text-[9px] text-slate-400 mt-1">\u203B \uB808\uBCA8\uC5C5\uB9C8\uB2E4 \uBB40\uC11C\uB77C\uC774\uD06C \uC2A4\uD0AC \uC120\uD0DD! 12\uC885 \uC911 \uD0DD1</div>';
};

window.startGame=()=>{
    initAudio();
    document.getElementById('titleScreen').classList.add('hidden'); document.getElementById('gameHUD').classList.remove('hidden'); document.getElementById('gameHUD').classList.add('flex');
    if(GS.platform==='MOBILE') document.getElementById('pcGuideText').classList.add('hidden');
    generateEnv();

    // 완벽한 초기화
    entities=[]; projectiles=[]; particles=[]; floatingTexts=[]; slashEffects=[]; aoeEffects=[];
    GS.scoreBlue=0; GS.scoreRed=0; GS.time=0; GS.paused=false; minionTimer=MINION_INTERVAL-2;
    document.getElementById('scoreBlue').textContent='0'; document.getElementById('scoreRed').textContent='0';

    // 건물 세팅 (3라인 + 수호타워)
    entities.push(new Building(300,2700,'BLUE','nexus')); entities.push(new Building(2700,300,'RED','nexus'));
    // 수호 타워 (Nexus Turrets)
    entities.push(new Building(300,2550,'BLUE','nexus_turret')); entities.push(new Building(450,2700,'BLUE','nexus_turret')); entities.push(new Building(150,2700,'BLUE','nexus_turret')); entities.push(new Building(300,2850,'BLUE','nexus_turret'));
    entities.push(new Building(2700,450,'RED','nexus_turret')); entities.push(new Building(2550,300,'RED','nexus_turret')); entities.push(new Building(2850,300,'RED','nexus_turret')); entities.push(new Building(2700,150,'RED','nexus_turret'));
    // 탑
    entities.push(new Building(300,1500,'BLUE','tower')); entities.push(new Building(300,800,'BLUE','tower')); entities.push(new Building(1500,300,'RED','tower')); entities.push(new Building(800,300,'RED','tower'));
    // 바텀
    entities.push(new Building(1500,2700,'BLUE','tower')); entities.push(new Building(2200,2700,'BLUE','tower')); entities.push(new Building(2700,1500,'RED','tower')); entities.push(new Building(2700,2200,'RED','tower'));
    // 미드
    entities.push(new Building(1000,2000,'BLUE','tower')); entities.push(new Building(1300,1700,'BLUE','tower')); entities.push(new Building(2000,1000,'RED','tower')); entities.push(new Building(1700,1300,'RED','tower'));

    // 정글 몹 스폰 (5종류, 수량 25개로 대폭 증가)
    let mTypes = ['wolf', 'bear', 'golem', 'skeleton', 'slime'];
    for(let i=0;i<25;i++) {
        let type = mTypes[Math.floor(Math.random() * mTypes.length)];
        // 맵 전체에 랜덤 배치하되 완전 외곽 제외
        entities.push(new Monster(rand(400,2600), rand(400,2600), type));
    }

    let allRoles = ['top', 'mid', 'bot', 'jungle'];
    player=new Hero(GS.faction==='BLUE'?300:2700, GS.faction==='BLUE'?2700:300, GS.faction, GS.hero, true, 'mid');
    entities.push(player);

    let allKeys=Object.keys(HERO_TMPL).filter(h=>h!==GS.hero); allKeys.sort(()=>Math.random()-0.5);
    let bc=0, rc=0;
    for(let i=0;i<9;i++){
        let hk=allKeys[i%allKeys.length]; let f=bc<4?'BLUE':'RED';
        let role = allRoles[Math.floor(Math.random()*allRoles.length)];
        if(f==='BLUE') bc++; else rc++;
        entities.push(new Hero(f==='BLUE'?300:2700, f==='BLUE'?2700:300, f, hk, false, role));
    }

    GS.status='PLAYING'; GS.lastFrame=performance.now(); 
    
    // UI 업데이트 복구
    document.getElementById('hudHeroName').textContent=HERO_TMPL[GS.hero].name;
    
    renderShop(); requestAnimationFrame(gameLoop);
};
window.toggleShop=()=>{ document.getElementById('shopUI').classList.toggle('hidden'); renderShop(); };
window.buyItemUI=id=>{ if(player) player.buyItem(id); };

function renderShop(){
    const cont=document.getElementById('shopItemContainer'); cont.innerHTML='';
    if(!player) return; document.getElementById('hudGoldText').textContent=Math.floor(player.gold)+'G';
    BASE_ITEMS.forEach(i=>{
        let slot=player.inventory.find(inv=>inv.id===i.id); let lv=slot?'<span class="text-rose-400 font-bold">+'+slot.upgrade+'</span>':'';
        let canBuy=player.gold>=i.cost&&(slot||player.inventory.length<8);
        cont.innerHTML+='<div class="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center"><div class="flex items-center gap-2"><div class="text-xl">'+i.icon+'</div><div class="leading-tight"><div class="text-[10px] font-bold text-slate-100">'+i.name+' '+lv+'</div><div class="text-[9px] text-amber-400">'+i.cost+'G</div></div></div><button onclick="buyItemUI(\''+i.id+'\')" class="'+(canBuy?'bg-amber-500 text-slate-950 active:scale-95':'bg-slate-700 text-slate-500')+' text-[9px] px-2 py-1 rounded font-bold">'+(slot?'\uAC15\uD654':'\uAD6C\uB9E4')+'</button></div>';
    });
}

// ============ 메인 루프 ============
const canvas=document.getElementById('gameCanvas'); const ctx=canvas.getContext('2d');
const mCanvas=document.getElementById('minimapCanvas'); const mCtx=mCanvas.getContext('2d');

function gameLoop(now){
    if(GS.status!=='PLAYING') return;
    // dt 클램프 완화: 프레임 드랍이 생겨도 최대 0.2초(5 FPS) 분량의 시간을 한 번에 처리해 현실 시간과 싱크를 맞춤
    let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;
    if(!GS.paused) {
        GS.time+=dt;

        minionTimer+=dt;
        if(minionTimer>=MINION_INTERVAL){
            minionTimer=0;
            for(let i=0;i<5;i++){
                ['top','mid','bot'].forEach(lane => {
                    entities.push(new Minion(300+i*20,2700,'BLUE',lane)); entities.push(new Minion(2700-i*20,300,'RED',lane));
                });
            }
        }
        
        // 미드 보스 (5분, 10분, 15분)
        for(let i=0; i<3; i++) {
            if(!midBossSpawned[i] && GS.time >= MID_BOSS_TIMES[i]) {
                midBossSpawned[i] = true;
                entities.push(new Monster(1500, 1500, 'boss_dragon'));
                showBanner('\uC2DC\uAC04 \uACBD\uACFC! \uAC70\uB300 \uBAC0\uC2A4\uD130 \uCD9C\uD604!', '\uD83D\uDC09', true);
            }
        }

        entities.forEach(e=>e.update(dt)); projectiles.forEach(p=>p.update(dt));
        for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
        for(let i=floatingTexts.length-1;i>=0;i--){let ft=floatingTexts[i];ft.y+=ft.vy*dt;ft.life-=dt;if(ft.life<=0)floatingTexts.splice(i,1);}
        for(let i=slashEffects.length-1;i>=0;i--){slashEffects[i].life-=dt;if(slashEffects[i].life<=0)slashEffects.splice(i,1);}
        for(let i=aoeEffects.length-1;i>=0;i--){aoeEffects[i].life-=dt;if(aoeEffects[i].life<=0)aoeEffects.splice(i,1);}

        entities=entities.filter(e=>!e.isDead||e.type==='hero'||e.type==='jungle'); projectiles=projectiles.filter(p=>!p.isDead);
        if(player&&!player.isDead){ camera.x+=(player.x-camera.x)*0.1; camera.y+=(player.y-camera.y)*0.1; }
    }

    draw(); updateUI(); requestAnimationFrame(gameLoop);
}

// ============ 렌더 ============
function draw(){
    canvas.width=window.innerWidth; canvas.height=window.innerHeight;
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.save(); ctx.translate(canvas.width/2, canvas.height/2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);

    // 바닥
    let grad=ctx.createLinearGradient(0,0,MAP_SIZE,MAP_SIZE); grad.addColorStop(0,'#1a2744'); grad.addColorStop(1,'#2a1a44'); ctx.fillStyle=grad; ctx.fillRect(0,0,MAP_SIZE,MAP_SIZE);
    
    // 3라인 길 그리기
    ctx.fillStyle='rgba(139,90,43,0.35)';
    ctx.fillRect(200,200,200,2700-400); ctx.fillRect(200,200,2700-400,200); // 탑
    ctx.fillRect(200,2700-400,2700-400,200); ctx.fillRect(2700-400,200,200,2700-400); // 바텀
    ctx.save(); ctx.translate(1500,1500); ctx.rotate(-Math.PI/4); ctx.fillRect(-1700, -100, 3400, 200); ctx.restore(); // 미드

    ctx.fillStyle='rgba(20,83,45,0.18)'; ctx.fillRect(400,400,2200,2200);
    ctx.strokeStyle='rgba(255,255,255,0.03)'; for(let i=0;i<=MAP_SIZE;i+=200){ ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,MAP_SIZE);ctx.stroke(); ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(MAP_SIZE,i);ctx.stroke(); }
    drawEnv(ctx);

    let all=[...entities, ...projectiles].filter(e=>!e.isDead||e.type==='jungle'); all.sort((a,b)=>a.y-b.y); all.forEach(e=>e.draw(ctx));

    // 분신 렌더링
    entities.forEach(e => {
        if(e.type==='hero' && e.shadowClones) {
            e.shadowClones.forEach(c => {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = e.faction==='BLUE'?'#3b82f6':'#ef4444';
                ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1;
            });
        }
        if(e.type==='hero' && e.poisonZones) {
            e.poisonZones.forEach(pz => {
                ctx.globalAlpha = 0.15 * (pz.life/pz.maxLife);
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(pz.x, pz.y, pz.radius, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1;
            });
        }
    });

    aoeEffects.forEach(ae=>{ let r=ae.life/ae.maxLife; ctx.globalAlpha=r*0.5; ctx.fillStyle=ae.color; ctx.beginPath(); ctx.arc(ae.x,ae.y,ae.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; });
    slashEffects.forEach(se=>{ let r=se.life/se.maxLife; ctx.globalAlpha=r*0.9; ctx.strokeStyle=se.color; ctx.lineWidth=4*r+1; ctx.save(); ctx.translate(se.x,se.y); ctx.rotate(se.angle); ctx.beginPath(); ctx.arc(0,0,se.r,Math.PI*0.2,Math.PI*0.8); ctx.stroke(); ctx.restore(); ctx.globalAlpha=1; });
    
    particles.forEach(p=>{
        ctx.globalAlpha=Math.max(0,p.life/p.maxLife); ctx.fillStyle=p.color;
        if(p.shape==='plus') { ctx.font='bold 20px monospace'; ctx.fillText('+', p.x, p.y); }
        else { ctx.beginPath(); ctx.arc(p.x,p.y,p.size*Math.max(0,p.life/p.maxLife),0,Math.PI*2); ctx.fill(); }
    }); ctx.globalAlpha=1;

    floatingTexts.forEach(ft=>{ ctx.globalAlpha=Math.max(0,ft.life); ctx.fillStyle=ft.color; ctx.font='bold '+ft.size+'px monospace'; ctx.textAlign='center'; ctx.fillText(ft.text, ft.x, ft.y); }); ctx.globalAlpha=1;

    if(GS.platform==='MOBILE'&&joy.active){ ctx.restore(); ctx.save(); ctx.globalAlpha=0.4; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(joy.ox,joy.oy,50,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=0.7; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(joy.ox+joy.dx,joy.oy+joy.dy,20,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.restore(); return; }
    ctx.restore(); drawMinimap();
}

function drawMinimap(){
    mCanvas.width=mCanvas.clientWidth; mCanvas.height=mCanvas.clientHeight; mCtx.fillStyle='#0f172a'; mCtx.fillRect(0,0,mCanvas.width,mCanvas.height);
    let sx=mCanvas.width/MAP_SIZE, sy=mCanvas.height/MAP_SIZE;
    mCtx.fillStyle='rgba(139,90,43,0.4)'; mCtx.fillRect(200*sx,200*sy,200*sx,(2700-400)*sy); mCtx.fillRect(200*sx,200*sy,(2700-400)*sx,200*sy); mCtx.fillRect(200*sx,(2700-400)*sy,(2700-400)*sx,200*sy); mCtx.fillRect((2700-400)*sx,200*sy,200*sx,(2700-400)*sy);
    mCtx.save(); mCtx.translate(1500*sx,1500*sy); mCtx.rotate(-Math.PI/4); mCtx.fillRect(-1700*sx, -100*sy, 3400*sx, 200*sy); mCtx.restore();

    entities.forEach(e=>{
        if(e.isDead&&e.type!=='jungle') return;
        let col=e.faction==='BLUE'?'#3b82f6':e.faction==='RED'?'#ef4444':'#f59e0b';
        if(e.type==='nexus'||e.type.includes('tower')) col=e.faction==='BLUE'?'#60a5fa':'#f87171';
        mCtx.fillStyle=col; let r=e.type==='hero'?4:e.type==='nexus'?6:e.type.includes('tower')?4:2;
        if(e===player){ mCtx.fillStyle='#fcd34d'; r=5; }
        mCtx.beginPath(); mCtx.arc(e.x*sx,e.y*sy,r,0,Math.PI*2); mCtx.fill();
    });
    mCtx.strokeStyle='rgba(255,255,255,0.7)'; mCtx.strokeRect(camera.x*sx-(window.innerWidth/camera.zoom*sx)/2, camera.y*sy-(window.innerHeight/camera.zoom*sy)/2, window.innerWidth/camera.zoom*sx, window.innerHeight/camera.zoom*sy);
}

function updateUI(){
    if(!player) return; let m=Math.floor(GS.time/60), s=Math.floor(GS.time%60); document.getElementById('gameTimer').textContent=m.toString().padStart(2,'0')+':'+s.toString().padStart(2,'0');
    document.getElementById('hudLevelBadge').textContent='Lv.'+player.level; document.getElementById('hudKDA').textContent='K:'+player.kills;
    document.getElementById('hudHpBar').style.width=(player.hp/player.maxHp)*100+'%'; document.getElementById('hudHpText').textContent=Math.floor(player.hp)+' / '+Math.floor(player.maxHp); document.getElementById('hudXpBar').style.width=(player.exp/player.maxExp)*100+'%';
    const inv=document.getElementById('inventorySlots'); inv.innerHTML='';
    for(let i=0;i<8;i++){ let item=player.inventory[i]; let bi=item?BASE_ITEMS.find(b=>b.id===item.id):null; let content=item?'<span class="text-sm">'+(bi?bi.icon:'?')+'</span>'+(item.upgrade>0?'<span class="absolute -top-1 -right-1 text-[7px] bg-rose-600 text-white rounded px-0.5 font-bold">+'+item.upgrade+'</span>':''):''; inv.innerHTML+='<div class="relative w-6 h-6 md:w-8 md:h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">'+content+'</div>'; }
    // 히어로 패시브 쿨다운 표시
    let m1=document.getElementById('maskSkill1'), m2=document.getElementById('maskSkill2');
    if(m1) { if(player.heroSkill1Timer>0){m1.classList.remove('hidden');m1.textContent=player.heroSkill1Timer.toFixed(1);}else m1.classList.add('hidden'); }
    if(m2) { if(player.heroSkill2Timer>0){m2.classList.remove('hidden');m2.textContent=player.heroSkill2Timer.toFixed(1);}else m2.classList.add('hidden'); }
    // 패시브 스킬 표시
    let pBar = document.getElementById('passiveSkillBar');
    if(pBar) {
        pBar.innerHTML = '';
        PASSIVE_SKILLS.forEach(s => {
            let lv = player.passiveSkills[s.id] || 0;
            if(lv > 0) {
                pBar.innerHTML += '<div class="flex flex-col items-center bg-slate-900 rounded px-1 py-0.5 border border-slate-700"><span class="text-sm">' + s.icon + '</span><span class="text-[7px] text-amber-400 font-bold">Lv.' + lv + '</span></div>';
            }
        });
    }
}
selectHero('BERSERKER');
