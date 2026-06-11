// ======================================================
// 운빨 아발론 - 5:5 AOS 게임 엔진 v4.0 (뱀서라이크 패시브 스킬 시스템)
// 부드러운 사운드, BGM 수정, 밸런스 패치, 뱀서라이크 패시브 스킬 등
// ======================================================

'use strict';

// ============ 오디오 시스템 ============
let audioCtx = null;
function initAudio() {
    try {
        if(!audioCtx) {
            let AudioContext = window.AudioContext || window.webkitAudioContext;
            if(AudioContext) {
                audioCtx = new AudioContext();
            }
        } else if(audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch(e) {
        console.warn('Audio Context initialization failed:', e);
    }
}

let _cachedNoiseBuffer = null;
function createNoiseBuffer(ctx, duration) {
    if (duration <= 0.3 && _cachedNoiseBuffer) return _cachedNoiseBuffer;
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    if (duration <= 0.3) _cachedNoiseBuffer = buf;
    return buf;
}

window.toggleSFX = () => {
    GS.sfxEnabled = !GS.sfxEnabled;
    const btn = document.getElementById('btnToggleSFX');
    if(btn) {
        btn.innerHTML = GS.sfxEnabled ? '🔊' : '🔇';
        btn.style.color = GS.sfxEnabled ? '#34d399' : '#94a3b8';
    }
};

let _lastPlaySFX = {};

function playSFX(type) {
    if (!GS.sfxEnabled || !audioCtx) return;
    
    let nowReal = performance.now();
    if (_lastPlaySFX[type] && nowReal - _lastPlaySFX[type] < 30) return;
    _lastPlaySFX[type] = nowReal;

    if (audioCtx.state === 'suspended') { audioCtx.resume(); return; }

    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.connect(audioCtx.destination);

    const play = (type, freq, endFreq, oType, gainPeak, attack, decay, detune=0) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.connect(g); g.connect(master);
        osc.type = oType; osc.frequency.setValueAtTime(freq, now);
        if (detune) osc.detune.setValueAtTime(detune, now);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + decay);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gainPeak, now + attack);
        g.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
        osc.start(now); osc.stop(now + attack + decay + 0.05);
    };

    const playNoise = (gainPeak, filterFreq, attack, decay, filterType='bandpass') => {
        const buf = createNoiseBuffer(audioCtx, attack + decay + 0.1);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = filterType; filter.frequency.setValueAtTime(filterFreq, now);
        const g = audioCtx.createGain();
        src.connect(filter); filter.connect(g); g.connect(master);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gainPeak, now + attack);
        g.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
        src.start(now); src.stop(now + attack + decay + 0.1);
    };

    if (type === 'hit') {
        // 플레이어가 때릴 때: 묵직하고 짧은 타격음
        master.gain.setValueAtTime(0.45, now);
        play('osc', 180, 60, 'sine', 0.9, 0.004, 0.07);
        playNoise(0.5, 600, 0.003, 0.055, 'bandpass');
    } else if (type === 'hit_receive') {
        // 플레이어가 맞을 때: 약간 다른 느낌 (높은 톤)
        master.gain.setValueAtTime(0.35, now);
        play('osc', 250, 80, 'triangle', 0.7, 0.003, 0.08);
        playNoise(0.4, 1200, 0.002, 0.06, 'bandpass');
    } else if (type === 'hit_critical') {
        master.gain.setValueAtTime(0.7, now);
        play('osc', 300, 80,  'sawtooth', 0.6, 0.002, 0.12);
        play('osc', 150, 50,  'sine',     0.9, 0.004, 0.15);
        playNoise(0.8, 2000,  0.002, 0.10, 'highpass');
        playNoise(0.5, 400,   0.004, 0.12, 'bandpass');
    } else if (type === 'shoot') {
        master.gain.setValueAtTime(0.35, now);
        play('osc', 600, 200, 'sawtooth', 0.5, 0.002, 0.08);
        playNoise(0.4, 3000,  0.001, 0.05, 'highpass');
    } else if (type === 'skill_burst') {
        master.gain.setValueAtTime(0.6, now);
        play('osc', 80,  20,  'sine',    0.9, 0.01,  0.3);
        play('osc', 200, 50,  'square',  0.4, 0.005, 0.25);
        play('osc', 400, 100, 'sawtooth',0.3, 0.003, 0.2);
        playNoise(0.7, 500,   0.008, 0.25, 'bandpass');
    } else if (type === 'skill_magic') {
        master.gain.setValueAtTime(0.4, now);
        play('osc', 880, 1200,'sine',    0.4, 0.01, 0.2);
        play('osc', 660, 900, 'sine',    0.3, 0.02, 0.25, 700);
        play('osc', 440, 600, 'triangle',0.2, 0.03, 0.3);
    } else if (type === 'heal') {
        master.gain.setValueAtTime(0.25, now);
        play('osc', 440, 660, 'sine',    0.4, 0.02, 0.3);
        play('osc', 550, 770, 'sine',    0.2, 0.04, 0.35, 1200);
    } else if (type === 'tower') {
        master.gain.setValueAtTime(0.55, now);
        play('osc', 100, 30,  'sine',    0.8, 0.008, 0.2);
        play('osc', 60,  20,  'sine',    0.6, 0.005, 0.25);
        playNoise(0.9, 300,   0.005, 0.18, 'lowpass');
    } else if (type === 'level_up') {
        master.gain.setValueAtTime(0.4, now);
        [440, 554, 659, 880].forEach((f, i) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g); g.connect(master);
            o.type = 'sine'; o.frequency.setValueAtTime(f, now + i * 0.08);
            g.gain.setValueAtTime(0, now + i * 0.08);
            g.gain.linearRampToValueAtTime(0.5, now + i * 0.08 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
            o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.3);
        });
    } else if (type === 'gold') {
        master.gain.setValueAtTime(0.25, now);
        play('osc', 1200, 1600, 'sine', 0.4, 0.005, 0.12);
        play('osc', 1600, 2000, 'sine', 0.3, 0.01,  0.1, 1200);
    } else if (type === 'death') {
        master.gain.setValueAtTime(0.5, now);
        play('osc', 300, 50,  'sine',    0.7, 0.01, 0.5);
        play('osc', 150, 30,  'sine',    0.5, 0.02, 0.6);
        playNoise(0.4, 200,   0.01, 0.4, 'lowpass');
    } else if (type === 'ui') {
        master.gain.setValueAtTime(0.2, now);
        play('osc', 800, 1200, 'sine', 0.3, 0.005, 0.08);
    } else if (type === 'skill_cast') {
        master.gain.setValueAtTime(0.5, now);
        play('osc', 220, 440, 'sine',     0.6, 0.02, 0.4);
        play('osc', 440, 880, 'sine',     0.3, 0.03, 0.5, 1200);
        play('osc', 660, 990, 'triangle', 0.2, 0.04, 0.6);
    }
}

// ============ 설정 상수 ============
const MAP_SIZE = 3000;
const SUDDEN_DEATH_TIME = 18 * 60; // 18분 (서든데스 단축)
const DRAGON_SPAWN_TIME = 5 * 60;  // 5분마다
const GOLD_GOBLIN_TIME  = 8 * 60;  // 8분
const MID_BOSS_TIMES    = [5*60, 10*60, 15*60]; // 5, 10, 15분 중간보스
const MINION_INTERVAL   = 18;      // 18초마다 (미니언 간격 완화)
const REGEN_DELAY       = 5.0;     // 5초 비전투 후
const REGEN_RATE        = 0.05;    // 초당 5%
const WARMOG_REGEN      = 0.10;    // 워모그 초당 10%

// ============ 영웅 템플릿 (근접/원거리 밸런스 전면 수정) ============
const HERO_TMPL = {
    ARIEL: {
        name:"아리엘", color:"#fef08a",
        hp:2000, atk:45, aspd:1.3, move:170, range:390, type:"ranged", role_desc:"[서포터 / 치유·버프 / 광역 폭발]",
        skill1: { name:"치유의 파동", cd:10, desc:"자신 주변 반경 250의 모든 아군(영웅, 미니언 포함)의 체력을 대폭 회복시킵니다." },
        skill2: { name:"빛의 인도", cd:16, desc:"5초 동안 반경 300 내 모든 아군의 이동 속도 40%, 공격 속도 40%, 방어력 30을 증가시킵니다." },
        draw:(ctx,x,y,r,dir,f,anim,ent) => drawBlockyHero(ctx,x,y,r,dir,f,'ariel',anim,ent)
    },

    CRAG: {
        name:"크래그", color:"#4b5563",
        hp:4500, atk:55, aspd:0.85, move:160, range:100, type:"melee", role_desc:"[탱커 / 근거리 / 오버파워]",
        skill1: { name:"대지 강타", cd:8, desc:"주변 반경 150의 모든 적에게 강한 마법 피해를 입히고 1.5초 기절시킵니다." },
        skill2: { name:"바위 갑옷", cd:15, desc:"5초 동안 최대 체력의 30% 방어막을 얻고 방어력이 대폭 상승합니다." },
        draw:(ctx,x,y,r,dir,f,anim,ent) => drawBlockyHero(ctx,x,y,r,dir,f,'crag',anim,ent)
    },

    BERSERKER: { name:"광전사", color:"#ef4444", hp:2470, atk:52, aspd:1.3, move:185, range:90,  type:"melee", role_desc:"[근접 / 브루저 / 광역 제어]",
        skill1:{name:"회전 참격",cd:5, desc:"주변 반경 내 적들에게 광역 데미지를 주고 0.5초 기절시킵니다."}, 
        skill2:{name:"도약 강타",cd:8, desc:"대상에게 도약하여 주변에 큰 데미지를 주고 1.5초 기절시킵니다."},  
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'berserker',anim,ent) },
    ARCHON:    { name:"아칸",      color:"#3b82f6", hp:1820, atk:60, aspd:1.8, move:150, range:150, type:"ranged", role_desc:"[중거리 / 광역 폭딜 / 제어]",
        skill1:{name:"사이어닉 스톰",cd:6, desc:"지정 범위에 3초간 지속적인 하얀 번개를 내리쳐 광역 피해를 줍니다."}, 
        skill2:{name:"마엘스톰",    cd:12, desc:"지정 범위 내 적을 갈색 원형에 가두어 완전 마비시킵니다."}, 
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'archon',anim,ent) },
    BARBARIAN: { name:"바바리안",  color:"#fb923c", hp:2860, atk:55, aspd:1.3, move:175, range:90,  type:"melee", role_desc:"[근접 / 브루저 / 광역 딜러]",
        skill1:{name:"점프샷",      cd:7, desc:"적진으로 도약하여 넓은 범위의 적들을 느리게 만듭니다."}, 
        skill2:{name:"휠윈드",      cd:10, desc:"3초간 무기를 회전하며 지속 광역 피해를 주고 적을 띄웁니다."}, 
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'barbarian',anim,ent) },
    ARCHER:    { name:"궁수",    color:"#10b981", hp:1690, atk:35, aspd:1.3, move:165, range:420, type:"ranged", role_desc:"[원거리 / 지속 딜러 / 순간 회피]",
        skill1:{name:"블링크",  cd:10, desc:"전방으로 순간이동하며 5초간 공격속도가 50% 증가합니다."}, 
        skill2:{name:"화살 폭우",cd:6, desc:"단일 대상에게 연속으로 화살을 발사하여 큰 데미지를 줍니다."}, 
        critChance:0.12, draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'archer',anim,ent) },
    NECROMANCER:{ name:"네크로맨서",color:"#a855f7",hp:1820, atk:38, aspd:1.0, move:150, range:360, type:"ranged", role_desc:"[원거리 / 마법사 / 소환]",
        skill1:{name:"해골 소환",cd:7, desc:"적의 어그로를 끄는 근접 해골 미니언을 소환합니다."}, 
        skill2:{name:"저주 역병",cd:11, desc:"넓은 범위에 도트 데미지를 주며 이동속도를 크게 감소시킵니다."}, 
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'necromancer',anim,ent) },
    grrr: { name:'그르르', color:"#f59e0b", hp:2080, atk:70, aspd:0.9, move:165, range:80, type:"melee", role_desc:"[근접 / 탱커 / 폭주]",
        skill1:{name:'거대화', type:'self_buff', cd:18, desc:'일정 시간 동안 크기가 커지며 최대 체력/방어/공속/이속이 폭증합니다.'},
        skill2:{name:'포효', type:'aoe_stun', cd:12, desc:'크게 포효하여 주변의 모든 적을 2초간 강력하게 기절시킵니다.'},
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'grrr',anim,ent) },
    VAMPIRE:   { name:"뱀파이어",color:"#f43f5e", hp:2210, atk:45, aspd:1.2, move:175, range:110, type:"melee", role_desc:"[근접 / 암살자 / 피흡]",
        skill1:{name:"흡혈 파동",cd:7, desc:"전방 부채꼴 범위의 적들에게 데미지를 주고 데미지 비례 체력을 회복합니다."}, 
        skill2:{name:"박쥐 강습",cd:9, desc:"적의 배후로 순간이동하며 데미지를 주고 1.5초간 기절시킵니다."},  
        lifeSteal:0.20, draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'vampire',anim,ent) },
    THOR:      { name:"토르",    color:"#60a5fa", hp:2600, atk:58, aspd:0.9, move:175, range:100, type:"melee", role_desc:"[근접 / 마법사 / 광역 폭딜]",
        skill1:{name:"번개 강타",cd:9, desc:"목표물에 번개를 떨어뜨려 주변에 큰 데미지와 스턴을 부여합니다."}, 
        skill2:{name:"충격파",  cd:11, desc:"주변 넓은 범위에 매우 큰 데미지를 주고 적들을 밀어내며 에어본시킵니다."}, 
        draw:(ctx,x,y,r,dir,f,anim,ent)=>drawBlockyHero(ctx,x,y,r,dir,f,'thor',anim,ent) },
    ICEBORN: {
        name:"이스버그", color:"#38bdf8",
        hp:2860, atk:48, aspd:1.24, move:160, range:220, type:"ranged", role_desc:"[중거리 / 마법사 / 빙결 제어]",
        skill1: { name:"빙결 창격", cd:7, desc:"전방 원뿔형 범위에 얼음 창을 투척하여 데미지를 주고 적 이동속도 60% 감소 2.5초" },
        skill2: { name:"얼음 감옥", cd:14, desc:"대상 위치에 얼음 기둥 소환. 반경 100 내 적 2초 완전 빙결(스턴)" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'iceborn',anim)
    },
    JOKER: {
        name:"조커블레이드", color:"#a855f7",
        hp:1820, atk:42, aspd:1.45, move:175, range:360, type:"ranged", role_desc:"[원거리 / 딜러 / 도박]",
        critChance:0.12,
        skill1: { name:"왕의 패", cd:8, desc:"카드 3장을 무작위로 뽑음. 각각 공격/방어/공속 버프 등 무작위 효과 발동" },
        skill2: { name:"전체 배팅", cd:16, desc:"현재 소지 골드에 비례한 막대한 피해량 폭발. (모 아니면 도)" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'joker',anim)
    },
    DARKPRIEST: {
        name:"암흑사제", color:"#7c3aed",
        hp:1950, atk:35, aspd:1.3, move:155, range:380, type:"ranged", role_desc:"[원거리 / 서포터 / 디버퍼]",
        skill1: { name:"영혼 착취", cd:10, desc:"주변 아군 한 명의 체력을 일부 깎는 대신, 적에게 2.5배 강력한 레이저 공격을 뿜어냅니다." },
        skill2: { name:"저주의 낙인", cd:14, desc:"대상 적에게 10초간 낙인 부여. 아군의 모든 공격이 대상에게 30% 추가 피해" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'darkpriest',anim)
    }
};

// ============ 아이템 ============
const BASE_ITEMS = [
    { id:'atk',      name:'전사의 투구', cost:300, stat:'atk',      val:18,   icon:'🪖', desc:'공격력 증가' },
    { id:'hp',       name:'수호자의 방패',cost:300, stat:'hp',       val:180,  icon:'🛡️', desc:'최대 체력 증가' },
    { id:'aspd',     name:'바람의 장화', cost:300, stat:'aspd',     val:0.25, icon:'👢', desc:'공격속도 증가' },
    { id:'crit',     name:'매의 눈물',   cost:300, stat:'crit',     val:0.1,  icon:'🦅', desc:'치명타 확률 증가' },
    { id:'move',     name:'신속의 날개', cost:300, stat:'move',     val:30,   icon:'🪽', desc:'이동속도 증가' },
    { id:'vamp',     name:'피바라기',    cost:400, stat:'vamp',     val:0.12, icon:'🩸', desc:'생명력 흡수 증가' },
    { id:'reflect',  name:'가시 갑옷',   cost:400, stat:'reflect',  val:0.15, icon:'🦔', desc:'피격 시 데미지 반사' },
    { id:'burn',     name:'화염검',      cost:400, stat:'burn',     val:18,   icon:'🔥', desc:'평타 시 화상 피해 추가' },
    { id:'stun',     name:'전투 망치',   cost:400, stat:'stun',     val:0.08, icon:'🔨', desc:'평타 시 기절 확률 추가' },
    { id:'bork',     name:'몰락한 왕의 검',cost:500, stat:'bork',     val:1,    icon:'🗡️', desc:'현재 체력 5% 피해 및 피흡 5% 추가' },
    { id:'warmog',   name:'워모그의 갑옷',cost:500, stat:'warmog',   val:1,    icon:'💚', desc:'비전투 시 초당 최대 체력의 4% 회복' },
    { id:'mage_staff',name:'현자의 지팡이',cost:450, stat:'cdr',      val:0.15, icon:'🔮', desc:'스킬 쿨타임 감소 및 데미지 증가' },
    { id:'hourglass',name:'시공의 모래시계',cost:600, stat:'dodge_heal', val:0.15, icon:'⏳', desc:'피격 시 15% 확률로 피해 무시 및 체력 회복' },
    { id:'giant_slayer',name:'거인 학살자',cost:500, stat:'giant_slayer',val:0.02,icon:'🏹', desc:'나보다 체력 높은 적에게 체력차 비례 추뎀' },
    { id:'legion_shield',name:'군단의 방패',cost:450, stat:'shield',  val:20,   icon:'🔰', desc:'아군 방어력 증가 오라' },
    { id:'tiamat',         name:'티아맷의 도끼',   cost:1600, stat:'tiamat',  val:1, icon:'🪓', desc:'[근거리 전용] 기본 공격 시 주변 120 반경 35% 광역 피해' },
    { id:'frost_gauntlet', name:'서리불꽃 건틀릿', cost:1400, stat:'frost_g', val:1, icon:'🧤', desc:'공격 시 적 이속 둔화 (근거리 50%, 원거리 25%)' },
    { id:'behemoth_armor', name:'괴수의 뼈갑옷',   cost:1800, stat:'behemoth',val:1, icon:'🦴', desc:'[근거리 전용] 받는 피해 15% 감소, 기절 30% 감소' },
    { id:'guardian_angel', name:'수호천사의 은총', cost:2800, stat:'ga',      val:1, icon:'👼', desc:'사망 시 체력 1 생존 + 최대 체력 50% 실드 (쿨 60초)' },
    { id:'hermes_boots',   name:'헤르메스의 장화', cost:1000, stat:'hermes',  val:1, icon:'🥾', desc:'이동속도+45, 비전투 3초 이후 이속 25% 추가 증가' }
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
    { id:'poisonCloud', name:'독안개', icon:'☠️', desc:'주기적으로 주변에 독구름 생성', maxLv:4 },
    { id:'vampireAura', name:'흡혈 오라', icon:'🧛', desc:'주변 적 체력을 초당 흡수', maxLv:3 },
    { id:'bombTrail', name:'폭탄 발자국', icon:'💣', desc:'이동 시 뒤에 폭탄을 흘림', maxLv:3 },
    { id:'mirrorImage', name:'허상 거울', icon:'🪞', desc:'피격 시 일정 확률로 자신을 복제', maxLv:2 },
    { id:'bloodFury', name:'피의 분노', icon:'😡', desc:'처치 시 일시적 공속 50% 폭증', maxLv:3 },
    { id:'stormWalker', name:'폭풍 발걸음', icon:'🌪️', desc:'주변에 지속적인 번개 구름 형성', maxLv:3 },
    { id:'war_anthem', name:'전장의 찬가', icon:'💫', desc:'적 처치/어시 시 주변 아군 이속/공속 증가', maxLv:3 },
    { id:'haste_art', name:'가속의 미학', icon:'⏳', desc:'모든 스킬 쿨타임 레벨당 10% 감소', maxLv:3 },
    { id:'guardian_bond', name:'수호자의 결속', icon:'🛡️', desc:'아군 피해 10% 흡수 및 내 방어력 레벨당 15% 증가', maxLv:3 },
    { id:'healing_spring', name:'치유의 샘', icon:'✨', desc:'주기적으로 최저 체력 아군 대폭 회복', maxLv:4 }
];

// ============ 진화 아이템 (Evolution) ============
const EVOLUTION_ITEMS = [
    { id:'avalon_sword', name:'아발론의 대검', reqItem:'atk', reqPassive:'soulHarvest', desc:'[진화] 공격력 극대화 및 처치 시 데미지 면역', icon:'🗡️', stat:'avalon', val:300 },
    { id:'reaper_blade', name:'사신의 장검', reqItem:'giant_slayer', reqPassive:'bloodFury', desc:'[진화] 적 최대체력 비례 고정 피해', icon:'⚔️', stat:'reaper', val:0.08 },
    { id:'divine_shield', name:'신성한 방패', reqItem:'hp', reqPassive:'guardian_bond', desc:'[진화] 거대 방어막 및 주변 아군 방어력 급격 증가', icon:'🛡️', stat:'divine_shield', val:800 },
    { id:'frozen_heart', name:'얼어붙은 심장', reqItem:'reflect', reqPassive:'frost', desc:'[진화] 피격 시 적의 공속/이속 대폭 감소', icon:'❄️', stat:'frozen_heart', val:0.3 },
    { id:'sunfire_cape', name:'태양불꽃 망토', reqItem:'hp', reqPassive:'fireRing', desc:'[진화] 체력 극대화 및 화염 고리 강화', icon:'🔥', stat:'sunfire', val:3000 },
    { id:'archmage_staff', name:'대마법사의 지팡이', reqItem:'mage_staff', reqPassive:'haste_art', desc:'[진화] 쿨감 극대화 및 스킬 사용 시 이속 폭증', icon:'🔮', stat:'archmage', val:0.35 },
    { id:'zeus_bracelet', name:'번개신의 팔찌', reqItem:'stun', reqPassive:'chainLightning', desc:'[진화] 타격 시 연쇄 번개 강화 및 확정 기절', icon:'⚡', stat:'zeus', val:0.2 },
    { id:'eye_of_storm', name:'폭풍의 눈', reqItem:'move', reqPassive:'stormWalker', desc:'[진화] 이속 극대화 및 번개 구름 아군 이속 버프', icon:'🌪️', stat:'storm_eye', val:60 },
    { id:'vampiric_cloak', name:'흡혈마의 망토', reqItem:'vamp', reqPassive:'healing_spring', desc:'[진화] 흡혈 극대화 및 내 흡혈량으로 아군 회복', icon:'🩸', stat:'vampiric', val:0.3 },
    { id:'phantom_dagger', name:'환영의 단검', reqItem:'crit', reqPassive:'mirrorImage', desc:'[진화] 크리티컬 증가 및 복제본 도발 강화', icon:'🪞', stat:'phantom', val:0.25 },
    { id:'hourglass_fate', name:'운명의 모래시계', reqItem:'hourglass', reqPassive:'meteor', desc:'[진화] 피격 시 25% 확률로 피해 무시, 체력 회복 및 유성우 폭발', icon:'⏳', stat:'fate_dodge', val:0.25 },
    { id:'demonfire_blade', name:'화염마귀의 검', reqItem:'burn', reqPassive:'bombTrail', desc:'[진화] 평타 타격 시 대상 위치 폭탄 폭발', icon:'🧨', stat:'demonfire', val:100 },
    { id:'oracle_glory', name:'오라클의 영광', reqItem:'legion_shield', reqPassive:'war_anthem', desc:'[진화] 방어 오라 극대화 및 1회 부활 지원', icon:'🔰', stat:'oracle_glory', val:30 },
    { id:'berserker_axe', name:'광전사의 도끼', reqItem:'aspd', reqPassive:'ironHealth', desc:'[진화] 잃은 체력 비례 공속 증가 및 피흡', icon:'🪓', stat:'berserker', val:0.5 }
];

// ============ 전역 상태 ============
let GS = { status:'TITLE', platform:'PC', faction:'BLUE', hero:'grrr', time:0, lastFrame:0, paused:false, autoSkill1:false, autoSkill2:false, hitStopTimer:0, sfxEnabled:true };
let camera = { x:1500, y:2500, zoom:0.65 };
let player = null;
window.TEAM_VAULT = { gold: 0 };
window.addGold = function(hero, amount) {
    if(!hero) return;
    if(hero.faction === player?.faction) {
        let tax = amount * 0.03;
        window.TEAM_VAULT.gold += tax;
        hero.gold += (amount - tax);
    } 
            else if(this.heroKey === 'CRAG') {
                spawnSlash(this.x, this.y-this.radius, Math.random()*Math.PI*2, '#78716c', 100);
                spawnParticles(target.x, target.y, '#57534e', 10, 80, 0.5);
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 100);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                });
                if(this.isPlayer) playSFX('hit');
            }
 else {
        hero.gold += amount;
    }
};
let entities = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];
let environments = []; // 나무, 바위 등
let slashEffects = [];
let earthCrackEffects = [];
let rockAuraEffects = [];
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

function spawnEarthCrack(x, y, radius, color) {
    let lines = [];
    for(let i=0; i<7; i++) {
        let angle = (Math.PI*2/7)*i + (Math.random()-0.5);
        let dist = radius * (0.5 + Math.random()*0.5);
        let pts = [{x:0, y:0}];
        let cx=0, cy=0;
        for(let j=0; j<4; j++) {
            cx += Math.cos(angle + (Math.random()-0.5)*1.2) * (dist/4);
            cy += Math.sin(angle + (Math.random()-0.5)*1.2) * (dist/4);
            pts.push({x:cx, y:cy});
        }
        lines.push(pts);
    }
    earthCrackEffects.push({x, y, lines, color, life: 2.5, maxLife: 2.5});
}

function spawnRockAura(x, y, radius) {
    let rocks = [];
    for(let i=0; i<15; i++) {
        let angle = Math.random() * Math.PI * 2;
        let dist = radius * 0.3 + Math.random()*radius*0.7;
        rocks.push({
            angle: angle,
            dist: dist,
            size: 15 + Math.random()*25,
            speedY: -150 - Math.random()*150,
            yOffset: 50 + Math.random()*50
        });
    }
    rockAuraEffects.push({x, y, rocks, life: 2.0, maxLife: 2.0});
}

function spawnAOE(x,y,r,color,life=0.6){ aoeEffects.push({x,y,r,color,life,maxLife:life}); }

let beamEffects = [];    // 빔/번개 효과
let laserEffects = [];
let stormZones = [];
let ringEffects = [];    // 충격파 링
let textureEffects = []; // 특수 형상 이펙트

function spawnRing(x, y, color, maxR=200, life=0.5) {
    ringEffects.push({ x, y, color, r:10, maxR, life, maxLife:life });
}
function spawnBeam(x1, y1, x2, y2, color, life=0.2) {
    beamEffects.push({ x1, y1, x2, y2, color, life, maxLife:life,
        segments: Array.from({length:8}, (_,i) => ({
            ox: rand(-20,20), oy: rand(-20,20)
        }))
    });
}
window.spawnMeteor = function(tx, ty, dmg, attacker) {
    spawnAOE(tx, ty, 55, '#f97316aa', 0.8);
    addText(tx, ty - 30, '☄️', '#f97316', 22);
    
    setTimeout(() => {
        if(attacker && !attacker.isDead) {
            let tgts = entities.filter(e => e.faction !== attacker.faction && !e.isDead && dist({x:tx,y:ty}, e) <= 55);
            tgts.forEach(e => {
                e.applyRawDamage(dmg, attacker);
                spawnParticles(e.x, e.y, '#f97316', 10, 150, 0.5);
            });
            spawnRing(tx, ty, '#f97316', 55, 0.4);
            spawnParticles(tx, ty, '#fbbf24', 20, 180, 0.6);
        }
    }, 800);
};

function spawnSpecial(x, y, color, shape='star', n=12, spd=150, life=0.6) {
    for(let i=0;i<n;i++) {
        let a = (Math.PI*2/n)*i;
        particles.push({x,y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
            life, maxLife:life, color, size:rand(3,8), shape});
    }
}
function showBanner(text,icon='⚔️',isBlue=true){
    const banner=document.getElementById('systemKillBanner');
    document.getElementById('killBannerText').textContent=text;
    document.getElementById('killBannerIcon').textContent=icon;
    document.getElementById('killBannerBox').className='bg-gradient-to-r border px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 '+(isBlue?'from-emerald-900 to-slate-900 border-emerald-500':'from-purple-900 to-slate-900 border-purple-500');
    banner.style.opacity='1'; banner.style.transform='translateX(-50%) scale(1)';
    setTimeout(()=>{banner.style.opacity='0';banner.style.transform='translateX(-50%) scale(0.95)';},3000);
}

// ============ 2.5D SVG 캐릭터 렌더링 ============
function drawBlockyHero(ctx, x, y, r, dir, faction, type, attackAnimTimer = 0, entity = null) {
    let rotDir = dir < 0 ? -1 : 1;
    let t = performance.now();
    let isAttacking = attackAnimTimer > 0;
    
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.8, r*0.7, r*0.25, 0, 0, Math.PI*2); ctx.fill();
    
    // 호흡 및 걷기 애니메이션
    let anim = Math.sin(t/150);
    let lx = anim * r * 0.2; // 다리 이동
    let breath = Math.sin(t/300) * r * 0.05; // 호흡(상하)
    
    ctx.save();
    
    // 뱀파이어 돌진(Dash) 애니메이션 처리
    if(type === 'vampire' && isAttacking) {
        ctx.translate(dir * r * 1.5, 0);
    }
    
    if(dir < 0) { ctx.translate(x*2, 0); ctx.scale(-1, 1); } // 좌우 반전
    
    // 팀 식별 아우라 (희미하게)
    let fCol = faction === 'BLUE' ? '#3b82f6' : '#ef4444';
    ctx.shadowColor = fCol; ctx.shadowBlur = 10;
    
    // 공통 바디 그리기 함수 (더 디테일하게)
    const drawBody = (skin, shirt, pants, eyeColor='#1e293b', hasAura=false) => {
        ctx.save();
        if(hasAura) { ctx.shadowColor = skin; ctx.shadowBlur = 15; }
        
        // 상체 회전 (공격 시)
        if(isAttacking && type !== 'vampire' && type !== 'thor' && type !== 'grrr') {
            ctx.translate(x, y); ctx.rotate((Math.PI/6) * rotDir); ctx.translate(-x, -y);
        }
        
        // 다리
        ctx.fillStyle = pants;
        ctx.fillRect(x-r*0.3+lx, y+r*0.3-breath, r*0.2, r*0.5+breath); // 왼다리
        ctx.fillRect(x+r*0.1-lx, y+r*0.3-breath, r*0.2, r*0.5+breath); // 오른다리
        
        // 몸통 (어깨가 더 넓은 사다리꼴)
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.moveTo(x-r*0.45, y+r*0.4-breath); ctx.lineTo(x+r*0.45, y+r*0.4-breath); 
        ctx.lineTo(x+r*0.55, y-r*0.3-breath); ctx.lineTo(x-r*0.55, y-r*0.3-breath); ctx.closePath(); ctx.fill();
        
        // 머리
        ctx.fillStyle = skin;
        ctx.fillRect(x-r*0.4, y-r*0.9-breath, r*0.8, r*0.7);
        
        // 눈
        ctx.fillStyle = eyeColor;
        ctx.fillRect(x-r*0.2, y-r*0.7-breath, r*0.15, r*0.12); ctx.fillRect(x+r*0.1, y-r*0.7-breath, r*0.15, r*0.12);
        if(eyeColor !== '#1e293b') { // 빛나는 눈 효과
            ctx.shadowColor = eyeColor; ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(x-r*0.18, y-r*0.68-breath, r*0.08, r*0.08); ctx.fillRect(x+r*0.12, y-r*0.68-breath, r*0.08, r*0.08);
            ctx.shadowBlur = 0;
        }
        
        // 팀 뱃지
        ctx.fillStyle = fCol; ctx.beginPath(); ctx.arc(x, y-r*0.1-breath, r*0.15, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    };

    if(type === 'berserker') {
        drawBody('#fca5a5', '#334155', '#0f172a', '#ef4444'); 
        // 헬멧 및 투구
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x-r*0.45, y-r*1.0-breath, r*0.9, r*0.35); // 짙은 투구
        ctx.fillRect(x-r*0.1, y-r*0.7-breath, r*0.2, r*0.4); // 코보호대
        // 뿔
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(x-r*0.45, y-r*0.8-breath); ctx.lineTo(x-r*0.8, y-r*1.2-breath); ctx.lineTo(x-r*0.3, y-r*1.0-breath); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.45, y-r*0.8-breath); ctx.lineTo(x+r*0.8, y-r*1.2-breath); ctx.lineTo(x+r*0.3, y-r*1.0-breath); ctx.fill();

        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.8, y+r*0.4); ctx.rotate(Math.PI * 0.8 * rotDir); // 거대한 회전 내리치기
            // 붉은 궤적 이펙트
            ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; ctx.lineWidth = r*0.5;
            ctx.beginPath(); ctx.arc(-r*0.8, -r*0.5, r*1.5, -Math.PI, 0); ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.translate(x+r*0.5, y-r*0.2); ctx.rotate(-Math.PI * 0.15 * rotDir);
        }
        // 거대 피 묻은 양날 대검
        ctx.fillStyle = '#475569'; ctx.fillRect(-r*0.15, -r*1.8, r*0.3, r*2.4); // 자루 및 칼등
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(0, -r*2.2); ctx.lineTo(r*0.3, -r*1.6); ctx.lineTo(r*0.1, -r*1.6); ctx.lineTo(r*0.1, r*0); ctx.lineTo(-r*0.1, r*0); ctx.lineTo(-r*0.1, -r*1.6); ctx.lineTo(-r*0.3, -r*1.6); ctx.fill(); // 칼날
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-r*0.1, -r*1.9, r*0.2, r*1.5); // 피 묻은 자국
        ctx.fillStyle = '#b45309'; ctx.fillRect(-r*0.5, -r*0.3, r*1.0, r*0.2); // 크로스가드
        ctx.restore();
        
    } else if(type === 'archer') {
        drawBody('#fef08a', '#16a34a', '#14532d', '#1e293b');
        // 엘프 귀
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.6); ctx.lineTo(x-r*0.7, y-r*0.8); ctx.lineTo(x-r*0.3, y-r*0.4); ctx.fill();
        // 초록 후드망토
        ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.6-breath); ctx.lineTo(x+r*0.5, y-r*0.6-breath); ctx.lineTo(x, y-r*1.3-breath); ctx.closePath(); ctx.fill();
        
        ctx.save();
        if (isAttacking) {
            ctx.translate(x+r*0.6, y); ctx.rotate(Math.PI * 0.15); // 활을 높이 듦
        } else {
            ctx.translate(x+r*0.5, y+r*0.1);
        }
        
        // 거대한 디테일 장궁
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 5;
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, r*0.9, -Math.PI*0.45, Math.PI*0.45); ctx.stroke(); // 활대
        
        let pull = isAttacking ? r*1.2 : 0; // 뒤로 팽팽하게 당김
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(-Math.PI*0.45)*r*0.9, Math.sin(-Math.PI*0.45)*r*0.9); ctx.lineTo(-pull, 0); ctx.lineTo(Math.cos(Math.PI*0.45)*r*0.9, Math.sin(Math.PI*0.45)*r*0.9); ctx.stroke(); // 활시위
        
        if(isAttacking) { // 기 모으는 화살
            ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 15;
            ctx.fillStyle = '#4ade80'; ctx.fillRect(-pull, -1, r*1.6, 2);
            ctx.beginPath(); ctx.moveTo(-pull+r*1.6, -3); ctx.lineTo(-pull+r*1.9, 0); ctx.lineTo(-pull+r*1.6, 3); ctx.fill(); // 화살촉
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
    } else if(type === 'necromancer') {
        drawBody('#f3e8ff', '#4c1d95', '#2e1065', '#a855f7', true); // 보라색 아우라 뿜뿜
        // 마법사 모자 챙
        ctx.fillStyle = '#3b0764'; ctx.fillRect(x-r*0.8, y-r*0.9-breath, r*1.6, r*0.15);
        // 모자 위 꼬깔
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9-breath); ctx.lineTo(x+r*0.4, y-r*0.9-breath); ctx.lineTo(x-r*0.2, y-r*1.8-breath); ctx.closePath(); ctx.fill();
        
        // 몸 주위를 도는 원혼(Skull)
        let skullAngle = t/300;
        ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.beginPath(); ctx.arc(x + Math.cos(skullAngle)*r*1.2, y + Math.sin(skullAngle)*r*0.5, r*0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + Math.cos(skullAngle+Math.PI)*r*1.2, y + Math.sin(skullAngle+Math.PI)*r*0.5, r*0.2, 0, Math.PI*2); ctx.fill();

        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.7, y-r*0.4); ctx.rotate((Math.PI/2.5) * rotDir); // 낫을 크게 벰
            ctx.shadowColor = '#9333ea'; ctx.shadowBlur = 20;
            ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)'; ctx.lineWidth = r*0.4;
            ctx.beginPath(); ctx.arc(-r*0.5, -r*0.5, r*1.5, -Math.PI*0.8, 0); ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.translate(x+r*0.5, y-r*0.2); ctx.rotate(-Math.PI*0.1);
        }
        // 거대한 사신의 낫(Scythe)
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-r*0.1, -r*1.8, r*0.2, r*2.8); // 낫 자루
        ctx.fillStyle = '#cbd5e1'; 
        ctx.beginPath(); ctx.moveTo(r*0.1, -r*1.8); ctx.lineTo(r*1.5, -r*1.5); ctx.lineTo(r*1.6, -r*1.2); ctx.lineTo(r*0.5, -r*1.3); ctx.lineTo(-r*0.2, -r*1.5); ctx.fill(); // 날카로운 낫날
        ctx.restore();
        
    } else if(type === 'mechanic') {
        drawBody('#fed7aa', '#b45309', '#78350f');
        // 등에 거대한 코어 백팩
        ctx.fillStyle = '#334155'; ctx.fillRect(x-r*0.8, y-r*0.5-breath, r*0.5, r*1.0);
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10; ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.arc(x-r*0.55, y-breath, r*0.2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        // 고글
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x-r*0.4, y-r*0.75-breath, r*0.8, r*0.25);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x-r*0.25, y-r*0.72-breath, r*0.2, r*0.15); ctx.fillRect(x+r*0.1, y-r*0.72-breath, r*0.2, r*0.15);
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.3, y-r*0.2); ctx.rotate(-Math.PI * 0.1 * rotDir); // 총구 반동
            ctx.translate(-Math.random()*r*0.2, Math.random()*r*0.2); // 진동(Shake)
        } else {
            ctx.translate(x+r*0.4, y-r*0.1);
        }
        // 미니건 (다중 총열)
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, -r*0.1, r*1.2, r*0.4); 
        ctx.fillStyle = '#475569'; ctx.fillRect(0, -r*0.2, r*1.1, r*0.15); ctx.fillRect(0, r*0.25, r*1.1, r*0.15);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(r*1.1, -r*0.25, r*0.2, r*0.7); // 총구 링
        
        if(isAttacking) { // 총구 화염 매우 화려하게
            ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.moveTo(r*1.3, r*0.1); ctx.lineTo(r*2.0, -r*0.3); ctx.lineTo(r*1.8, r*0.1); ctx.lineTo(r*2.2, r*0.2); ctx.lineTo(r*1.8, r*0.3); ctx.lineTo(r*2.0, r*0.7); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
    } else if(type === 'vampire') {
        drawBody('#ffe4e6', '#1c1917', '#0c0a09', '#f43f5e'); // 창백한 피부, 빨간 눈
        // 화려한 백작 망토 (날개처럼 펄럭임)
        let capeSway = isAttacking ? r * 1.2 : Math.sin(t/200)*r*0.2; 
        ctx.fillStyle = '#881337'; // 진홍색 망토 겉면
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.4-breath); ctx.lineTo(x-r*1.2-capeSway, y+r*0.8); ctx.lineTo(x-r*0.6, y+r*1.0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.4, y-r*0.4-breath); ctx.lineTo(x+r*1.2-capeSway, y+r*0.8); ctx.lineTo(x+r*0.6, y+r*1.0); ctx.closePath(); ctx.fill();
        // 뱀파이어 뾰족 이빨
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x+r*0.1, y-r*0.4-breath); ctx.lineTo(x+r*0.15, y-r*0.3-breath); ctx.lineTo(x+r*0.2, y-r*0.4-breath); ctx.fill();

        // 붉은 박쥐 아우라 파티클 효과
        if(Math.random()<0.3) {
            ctx.fillStyle = 'rgba(225, 29, 72, 0.6)';
            ctx.beginPath(); ctx.arc(x + (Math.random()-0.5)*r*3, y + (Math.random()-0.5)*r*3, Math.random()*3+1, 0, Math.PI*2); ctx.fill();
        }

        // 공격 시 거대한 핏빛 갈퀴손톱(Claw) 이펙트
        if(isAttacking) {
            ctx.save();
            ctx.translate(x+r*0.8, y);
            ctx.shadowColor = '#e11d48'; ctx.shadowBlur = 15;
            ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = r*0.15; ctx.lineCap = 'round';
            for(let i=0; i<3; i++) { // 3갈래 손톱 자국
                ctx.beginPath(); 
                ctx.moveTo(-r*0.5 + i*r*0.3, -r*1.0); 
                ctx.quadraticCurveTo(r*1.5 + i*r*0.3, 0, -r*0.2 + i*r*0.3, r*1.0); 
                ctx.stroke();
            }
            ctx.restore();
            // 진홍빛 잔상 효과 추가
            ctx.fillStyle = 'rgba(225, 29, 72, 0.4)'; ctx.beginPath(); ctx.arc(x-dir*r*1.5, y, r, 0, Math.PI*2); ctx.fill();
        }
        
    } else if(type === 'grrr') {
        // 그르르 전용 매우 거대한 몸집
        ctx.save();
        ctx.scale(1.3, 1.3); x/=1.3; y/=1.3; r/=1.3; // 30% 더 크게
        drawBody('#d97706', '#92400e', '#78350f', '#dc2626'); // 짐승 바디
        
        // 사자 갈기 (풍성하게)
        ctx.fillStyle = '#b45309';
        for(let i=0; i<8; i++) {
            let ag = i * (Math.PI/4);
            ctx.beginPath(); ctx.arc(x + Math.cos(ag)*r*0.7, y - r*0.6 + Math.sin(ag)*r*0.7, r*0.4, 0, Math.PI*2); ctx.fill();
        }
        // 이빨
        ctx.fillStyle = '#fef3c7';
        for(let i=0; i<3; i++) {
            ctx.beginPath(); ctx.moveTo(x-r*0.2+i*r*0.2, y-r*0.3-breath); ctx.lineTo(x-r*0.1+i*r*0.2, y-r*0.1-breath); ctx.lineTo(x+i*r*0.2, y-r*0.3-breath); ctx.fill();
        }
        
        // 앞발 공격 애니메이션 (바닥 내리찍기)
        if(isAttacking) {
            ctx.save();
            ctx.translate(x + r*1.2*rotDir, y+r*0.5); // 아래쪽으로 강하게
            ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2); ctx.fill();
            // 맹수의 날카로운 발톱
            ctx.fillStyle = '#fef3c7';
            for(let ci = -1; ci <= 1; ci++) {
                ctx.beginPath(); ctx.moveTo(ci*r*0.3, r*0.5); ctx.lineTo(ci*r*0.3, r*1.0); ctx.lineTo(ci*r*0.3+r*0.1, r*0.5); ctx.fill();
            }
            // 흙먼지 파티클 생성
            if(Math.random()<0.5) spawnParticles(x + r*1.2*dir, y+r*1.0, '#78350f', 3, 40, 0.2);
            ctx.restore();
        } else { // 평소 앞발 대기 자세
            ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(x+r*0.6, y+r*0.2-breath, r*0.4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

    } else if(type === 'thor') {
        drawBody('#bfdbfe', '#1e3a8a', '#0f172a', '#fbbf24', true); // 토르, 눈과 아우라가 노랗게 빛남
        
        // 투구 (날개 장식)
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(x-r*0.45, y-r*1.0-breath, r*0.9, r*0.3);
        ctx.fillStyle = '#cbd5e1'; 
        ctx.beginPath(); ctx.moveTo(x-r*0.45, y-r*0.9-breath); ctx.lineTo(x-r*0.9, y-r*1.3-breath); ctx.lineTo(x-r*0.45, y-r*0.7-breath); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.45, y-r*0.9-breath); ctx.lineTo(x+r*0.9, y-r*1.3-breath); ctx.lineTo(x+r*0.45, y-r*0.7-breath); ctx.closePath(); ctx.fill();
        
        // 수염
        ctx.fillStyle = '#fcd34d'; ctx.fillRect(x-r*0.4, y-r*0.4-breath, r*0.8, r*0.3);
        
        // 몸 주변 상시 노란색 뇌전 효과 (스파크)
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10;
        for(let i=0; i<3; i++) {
            if(Math.random()<0.3) {
                ctx.beginPath(); ctx.moveTo(x+(Math.random()-0.5)*r*2, y+(Math.random()-0.5)*r*2);
                ctx.lineTo(x+(Math.random()-0.5)*r*3, y+(Math.random()-0.5)*r*3); ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;

        // 거대한 묠니르
        ctx.save();
        if(isAttacking) {
            // 공격 시: 머리 위로 번쩍 들었다가 바닥으로 쾅 내리찍음 (시간에 따른 보간)
            let slamAngle = (attackAnimTimer > 0.1) ? Math.PI*0.8 : -Math.PI*0.5; 
            ctx.translate(x+r*1.0, y+r*0.5); ctx.rotate(slamAngle * rotDir);
        } else {
            ctx.translate(x+r*0.6, y-r*0.1); ctx.rotate(-Math.PI*0.1);
        }
        ctx.fillStyle = '#475569'; ctx.fillRect(-r*0.1, -r*0.8, r*0.2, r*1.6); // 자루
        ctx.fillStyle = '#64748b'; ctx.fillRect(-r*0.5, -r*1.4, r*1.0, r*0.7); // 엄청나게 큰 쇳덩이
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(-r*0.4, -r*1.3, r*0.8, r*0.5); // 하이라이트
        
        if(isAttacking) { // 망치 타격 뇌전 폭발
            ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(253, 224, 71, 0.8)';
            ctx.beginPath(); ctx.arc(0, -r*1.0, r*1.5, 0, Math.PI*2); ctx.fill(); // 코어 폭발
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.random()*3+2;
            for(let j=0; j<4; j++) { // 갈라지는 번개 줄기
                ctx.beginPath(); ctx.moveTo(0, -r*1.0); 
                ctx.lineTo((Math.random()-0.5)*r*5, -r*1.0 + (Math.random()-0.5)*r*5); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
    } else if (type === 'iceborn') {
        drawBody('#e0f2fe', '#0284c7', '#082f49', '#38bdf8', true); // 냉기 뿜는 바디
        
        // 얼음 투구 (크리스탈 형태)
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9-breath); ctx.lineTo(x, y-r*1.4-breath); ctx.lineTo(x+r*0.4, y-r*0.9-breath); ctx.fill();
        
        // 빙결 오라
        ctx.fillStyle = 'rgba(186, 230, 253, 0.3)';
        ctx.beginPath(); ctx.arc(x, y, r*1.3 + Math.random()*r*0.2, 0, Math.PI*2); ctx.fill();

        ctx.save();
        if(isAttacking) { // 찌르기 모션
            ctx.translate(x+r*1.2, y); ctx.rotate(Math.PI * 0.4 * rotDir);
        } else {
            ctx.translate(x+r*0.6, y-r*0.2); ctx.rotate(Math.PI * 0.1);
        }
        // 거대한 얼음 창
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#0ea5e9'; ctx.fillRect(-r*0.05, -r*2.0, r*0.1, r*4.0); // 긴 창대
        ctx.fillStyle = '#bae6fd'; 
        ctx.beginPath(); ctx.moveTo(-r*0.3, -r*2.0); ctx.lineTo(r*0.3, -r*2.0); ctx.lineTo(0, -r*3.5); ctx.closePath(); ctx.fill(); // 날카로운 창 끝
        
        // 왼손엔 얼음 방패 (Ice Buckler)
        ctx.translate(-r*1.0, r*1.0); // 창 반대쪽 위치
        ctx.fillStyle = 'rgba(125, 211, 252, 0.7)';
        ctx.beginPath(); ctx.moveTo(0, -r*0.8); ctx.lineTo(r*0.6, 0); ctx.lineTo(0, r*0.8); ctx.lineTo(-r*0.6, 0); ctx.fill(); // 마름모 방패
        ctx.shadowBlur = 0;
        ctx.restore();
        
    } else if (type === 'joker') {
        drawBody('#fdf4ff', '#701a75', '#4a044e', '#d946ef');
        
        // 실크햇 (마술사 모자) 매우 높게
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(x-r*0.7, y-r*0.9-breath, r*1.4, r*0.15); // 챙
        ctx.fillRect(x-r*0.4, y-r*1.8-breath, r*0.8, r*0.9); // 원통
        ctx.fillStyle = '#ec4899'; ctx.fillRect(x-r*0.4, y-r*1.1-breath, r*0.8, r*0.2); // 빨간 띠
        
        // 주변에 부유하는 트럼프 카드들
        for(let i=0; i<3; i++) {
            let cardAngle = t/500 + i*(Math.PI*2/3);
            let cx = x + Math.cos(cardAngle)*r*1.5;
            let cy = y + Math.sin(cardAngle)*r*1.2;
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(t/200);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-r*0.2, -r*0.3, r*0.4, r*0.6);
            ctx.fillStyle = '#ef4444'; ctx.font='bold 10px sans-serif'; ctx.fillText('♦', -4, 4);
            ctx.restore();
        }

        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.8, y-r*0.3); ctx.rotate(Math.PI * 0.4 * rotDir); // 카드를 흩뿌리는 모션
        } else {
            ctx.translate(x+r*0.5, y);
        }
        // 부채꼴로 펼친 트럼프 카드 무기
        for(let j=-2; j<=2; j++) {
            ctx.save();
            ctx.rotate(j * Math.PI*0.1);
            ctx.translate(0, -r*0.6);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-r*0.2, -r*0.4, r*0.4, r*0.8);
            ctx.strokeStyle = '#1e293b'; ctx.lineWidth=1; ctx.strokeRect(-r*0.2, -r*0.4, r*0.4, r*0.8);
            ctx.fillStyle = (j%2===0)?'#ef4444':'#0f172a'; ctx.fillRect(-r*0.1, -r*0.2, r*0.2, r*0.2);
            ctx.restore();
        }
        ctx.restore();
        
    
    } else if(type === 'crag') {
        // 크래그: 거대한 바위 골렘
        ctx.save();
        ctx.translate(x, y);
        if(dir < 0) ctx.scale(-1, 1);
        ctx.scale(1.3, 1.3); // 크기 30% 증가
        
        // 어깨/등 바위 덩어리
        ctx.fillStyle = '#44403c';
        ctx.beginPath(); ctx.arc(0, -r*0.5, r*1.2, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#292524';
        ctx.beginPath(); ctx.arc(-r*0.4, -r*0.6, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.4, -r*0.4, r*0.6, 0, Math.PI*2); ctx.fill();

        // 몸통 (단단한 바위 갑옷)
        ctx.fillStyle = '#57534e';
        ctx.fillRect(-r*0.9, -r*0.2, r*1.8, r*1.4);
        
        // 가슴 중앙 코어 (빛나는 노란색)
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = 15;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r*0.3, r*0.4); ctx.lineTo(0, r*0.8); ctx.lineTo(-r*0.3, r*0.4); ctx.fill();
        ctx.shadowBlur = 0;

        // 머리 (작고 단단한 돌)
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-r*0.4, -r*1.0-breath, r*0.8, r*0.8);
        ctx.fillStyle = '#facc15'; // 빛나는 눈
        ctx.fillRect(-r*0.2, -r*0.8-breath, r*0.4, r*0.15);

        // 거대한 주먹
        ctx.save();
        if(isAttacking) {
            ctx.translate(r*1.2, r*0.5); ctx.rotate(Math.PI * 0.4);
            ctx.fillStyle = '#44403c'; ctx.fillRect(-r*0.8, -r*0.8, r*1.6, r*1.6);
        } else {
            ctx.translate(r*1.0, r*0.6-breath); ctx.rotate(Math.PI * 0.1);
            ctx.fillStyle = '#44403c'; ctx.fillRect(-r*0.6, -r*0.6, r*1.2, r*1.2);
        }
        ctx.restore();
        
        // 뒷손
        ctx.save();
        ctx.translate(-r*1.0, r*0.5+breath); ctx.rotate(-Math.PI * 0.1);
        ctx.fillStyle = '#292524'; ctx.fillRect(-r*0.6, -r*0.6, r*1.2, r*1.2);
        ctx.restore();
        
        ctx.restore();


    } else if(type === 'ariel') {
        // 아리엘: 여신, 화려한 디테일
        ctx.save();
        ctx.translate(x, y);
        if(dir < 0) ctx.scale(-1, 1);
        
        // 등 뒤 황금빛 날개/후광
        ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#facc15';
        for(let i=0; i<6; i++) {
            ctx.save();
            ctx.rotate((Math.PI/6) * (i-2.5) + Math.sin(t/500)*0.1);
            ctx.beginPath(); ctx.moveTo(0, -r*0.5); ctx.lineTo(r*1.5, -r*1.8); ctx.lineTo(r*0.5, -r*0.5); ctx.fill();
            ctx.restore();
        }
        ctx.shadowBlur = 0;

        // 드레스 겹겹이 표현 (다각형 기하학 무늬)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(0, -r*0.2); ctx.lineTo(r*1.2, r*1.5); ctx.lineTo(-r*1.2, r*1.5); ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r*0.8, r*1.6); ctx.lineTo(-r*0.8, r*1.6); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.moveTo(0, r*0.3); ctx.lineTo(r*0.5, r*1.7); ctx.lineTo(-r*0.5, r*1.7); ctx.fill();

        // 상체와 팔
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-r*0.4, -r*0.6, r*0.8, r*0.8);
        ctx.fillStyle = '#fef08a'; // 어깨 장식
        ctx.beginPath(); ctx.moveTo(-r*0.6, -r*0.6); ctx.lineTo(r*0.6, -r*0.6); ctx.lineTo(0, -r*0.2); ctx.fill();

        // 머리카락 (눈부신 금발)
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(0, -r*0.9-breath, r*0.55, Math.PI, 0); ctx.fill();
        ctx.fillRect(-r*0.55, -r*0.9-breath, r*0.3, r*1.2); // 좌측 긴 머리
        ctx.fillRect(r*0.25, -r*0.9-breath, r*0.3, r*1.2); // 우측 긴 머리

        // 얼굴
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath(); ctx.arc(0, -r*0.9-breath, r*0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; // 신비로운 푸른 눈
        ctx.fillRect(-r*0.2, -r*1.0-breath, r*0.15, r*0.1);
        ctx.fillRect(r*0.05, -r*1.0-breath, r*0.15, r*0.1);

        // 태양빛 왕관
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -r*1.2-breath, r*0.3, Math.PI, 0); ctx.stroke();
        for(let i=-2; i<=2; i++) {
            let a = -Math.PI/2 + i*(Math.PI/6);
            ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*0.3, -r*1.2-breath + Math.sin(a)*r*0.3);
            ctx.lineTo(Math.cos(a)*r*0.6, -r*1.2-breath + Math.sin(a)*r*0.6); ctx.stroke();
        }

        // 지팡이 들고 있는 앞 손
        ctx.save();
        if(isAttacking) {
            ctx.translate(r*0.5, -r*0.2); ctx.rotate(Math.PI * 0.3);
        } else {
            ctx.translate(r*0.5, -r*0.2-breath); ctx.rotate(Math.PI * 0.1);
        }
        ctx.fillStyle = '#facc15'; ctx.fillRect(-r*0.1, -r*1.5, r*0.2, r*2.5); // 얇고 긴 지팡이
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15; ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.moveTo(0, -r*1.8); ctx.lineTo(r*0.4, -r*1.5); ctx.lineTo(0, -r*1.2); ctx.lineTo(-r*0.4, -r*1.5); ctx.fill(); // 푸른 보석
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();

    } else if (type === 'darkpriest') {
        drawBody('#f3f4f6', '#1e1b4b', '#0f172a', '#8b5cf6', true); // 공허한 하얀 피부, 검보라색 옷
        
        // 어둠의 후드 (얼굴을 완전히 덮음)
        ctx.fillStyle = '#312e81';
        ctx.beginPath(); ctx.arc(x, y-r*0.8-breath, r*0.6, Math.PI, 0); ctx.fill(); // 둥근 윗부분
        ctx.fillRect(x-r*0.6, y-r*0.8-breath, r*1.2, r*0.5); // 볼 옆으로 내려오는 천
        
        ctx.shadowColor = '#6d28d9'; ctx.shadowBlur = 15;
        // 등 뒤에 떠다니는 거대한 공허 구체(Dark Orb)
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(x-dir*r*0.8, y-r*1.2+Math.sin(t/200)*r*0.2, r*0.6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth=2; 
        ctx.beginPath(); ctx.arc(x-dir*r*0.8, y-r*1.2+Math.sin(t/200)*r*0.2, r*0.7, 0, Math.PI*2); ctx.stroke(); // 오라 링
        ctx.shadowBlur = 0;

        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*1.0, y-r*0.5); ctx.rotate(Math.PI * 0.2 * rotDir); // 손을 뻗어 마법 발사
        } else {
            ctx.translate(x+r*0.6, y-r*0.2);
        }
        // 떠 있는 불길한 마도서 (Grimoire)
        let bookHover = Math.sin(t/150)*r*0.2;
        ctx.translate(0, bookHover);
        ctx.fillStyle = '#4c1d95'; ctx.fillRect(-r*0.4, -r*0.3, r*0.8, r*0.6); // 표지
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-r*0.35, -r*0.25, r*0.7, r*0.5); // 종이
        // 마도서에서 피어오르는 보라색 오라
        ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.beginPath(); ctx.moveTo(-r*0.2, -r*0.3); ctx.lineTo(r*0.2, -r*0.3); ctx.lineTo(0, -r*0.8); ctx.fill();
        
        if(isAttacking) { // 시전 이펙트
            ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(r*0.8, 0, r*0.5, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    } else if (type === 'archon') {
        // 아칸 (로우폴리 크리스탈 & 에너지 구체 모티브)
        ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 20;
        
        // 다면체(로우폴리) 크리스탈 코어
        ctx.fillStyle = '#eff6ff';
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            let a = (Math.PI/3)*i;
            let pr = r*0.7 * (i%2===0 ? 1 : 0.8);
            ctx.lineTo(x + Math.cos(a)*pr, y - r*0.6 - breath + Math.sin(a)*pr);
        }
        ctx.closePath(); ctx.fill();
        
        // 등 뒤에 솟아오른 뾰족한 결정체들 (Polygon spikes)
        ctx.fillStyle = '#60a5fa';
        for(let i=0; i<5; i++) {
            let a = Math.PI*1.2 + i*(Math.PI*0.15); // 위쪽으로 퍼지는 각도
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a)*r*0.4, y - r*0.6 - breath + Math.sin(a)*r*0.4);
            ctx.lineTo(x + Math.cos(a-0.1)*r*1.2, y - r*0.6 - breath + Math.sin(a-0.1)*r*1.2);
            ctx.lineTo(x + Math.cos(a+0.1)*r*1.2, y - r*0.6 - breath + Math.sin(a+0.1)*r*1.2);
            ctx.closePath(); ctx.fill();
        }

        // 주변 소용돌이 크리스탈 파편
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        for(let i=0; i<4; i++) {
            let pAngle = t/300 + i*(Math.PI/2);
            let px = x + Math.cos(pAngle)*r*1.2;
            let py = y - r*0.5 + Math.sin(pAngle)*r*0.4;
            ctx.beginPath(); ctx.moveTo(px, py-r*0.2); ctx.lineTo(px+r*0.2, py); ctx.lineTo(px, py+r*0.2); ctx.lineTo(px-r*0.2, py); ctx.closePath(); ctx.fill();
        }

        // 양팔 (길게 뻗음)
        ctx.save();
        if(isAttacking) {
            ctx.translate(x, y-r*0.6); ctx.rotate(Math.PI * 0.15 * rotDir); // 양손을 앞으로 뻗음
            // 다면체 형태의 거대한 팔뚝
            ctx.fillStyle = '#93c5fd'; 
            ctx.beginPath(); ctx.moveTo(r*0.5, -r*0.2); ctx.lineTo(r*1.8, -r*0.1); ctx.lineTo(r*1.6, r*0.2); ctx.lineTo(r*0.5, r*0.3); ctx.closePath(); ctx.fill();
            // 등쪽 팔
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath(); ctx.moveTo(r*0.4, -r*0.6); ctx.lineTo(r*1.4, -r*0.5); ctx.lineTo(r*1.3, -r*0.2); ctx.lineTo(r*0.4, -r*0.1); ctx.closePath(); ctx.fill();
        } else {
            ctx.translate(x, y-r*0.6);
            ctx.fillStyle = '#93c5fd'; 
            ctx.beginPath(); ctx.moveTo(r*0.4, r*0.2); ctx.lineTo(r*0.9, r*0.4); ctx.lineTo(r*0.7, r*0.6); ctx.lineTo(r*0.3, r*0.5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath(); ctx.moveTo(-r*0.4, r*0.2); ctx.lineTo(-r*0.9, r*0.4); ctx.lineTo(-r*0.7, r*0.6); ctx.lineTo(-r*0.3, r*0.5); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
        
    } else if (type === 'barbarian') {
        // 바바리안 (로우폴리 바이킹 / 디아블로 감성)
        
        // 다리 (가죽 부츠 & 장갑)
        ctx.fillStyle = '#451a03'; // 어두운 가죽
        ctx.beginPath(); ctx.moveTo(x-r*0.4+lx, y+r*0.3); ctx.lineTo(x-r*0.2+lx, y+r*0.9); ctx.lineTo(x-r*0.4+lx, y+r*0.9); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.2-lx, y+r*0.3); ctx.lineTo(x+r*0.4-lx, y+r*0.9); ctx.lineTo(x+r*0.2-lx, y+r*0.9); ctx.closePath(); ctx.fill();
        
        // 치마 (털가죽 로인클로스)
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.moveTo(x-r*0.5, y); ctx.lineTo(x+r*0.5, y); ctx.lineTo(x+r*0.6, y+r*0.5); ctx.lineTo(x, y+r*0.6); ctx.lineTo(x-r*0.6, y+r*0.5); ctx.closePath(); ctx.fill();
        // 금속 버클
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(x, y+r*0.1); ctx.lineTo(x+r*0.2, y+r*0.3); ctx.lineTo(x, y+r*0.5); ctx.lineTo(x-r*0.2, y+r*0.3); ctx.closePath(); ctx.fill();

        // 윗몸 (근육질 맨몸)
        ctx.fillStyle = '#d97706'; // 구릿빛 피부
        // 역삼각형 갑빠
        ctx.beginPath(); ctx.moveTo(x-r*0.7, y-r*0.5-breath); ctx.lineTo(x+r*0.7, y-r*0.5-breath); ctx.lineTo(x+r*0.4, y); ctx.lineTo(x-r*0.4, y); ctx.closePath(); ctx.fill();
        
        // 가슴 가로지르는 가죽 끈
        ctx.fillStyle = '#451a03'; 
        ctx.beginPath(); ctx.moveTo(x-r*0.6, y-r*0.5-breath); ctx.lineTo(x+r*0.4, y); ctx.lineTo(x+r*0.2, y); ctx.lineTo(x-r*0.4, y-r*0.5-breath); ctx.closePath(); ctx.fill();
        
        // 얼굴
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x-r*0.3, y-r*1.0-breath, r*0.6, r*0.6);
        
        // 바이킹 뿔 투구
        ctx.fillStyle = '#334155'; // 쇠투구
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9-breath); ctx.lineTo(x+r*0.4, y-r*0.9-breath); ctx.lineTo(x, y-r*1.3-breath); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e2e8f0'; // 뿔
        ctx.beginPath(); ctx.moveTo(x-r*0.3, y-r*1.0-breath); ctx.lineTo(x-r*0.8, y-r*1.4-breath); ctx.lineTo(x-r*0.1, y-r*1.2-breath); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.3, y-r*1.0-breath); ctx.lineTo(x+r*0.8, y-r*1.4-breath); ctx.lineTo(x+r*0.1, y-r*1.2-breath); ctx.closePath(); ctx.fill();
        
        // 회색 덥수룩한 수염
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.5-breath); ctx.lineTo(x+r*0.4, y-r*0.5-breath); ctx.lineTo(x, y-r*0.1-breath); ctx.closePath(); ctx.fill();

        // 휠윈드 회전 효과 (스킬 발동 시)
        let isWW = entity && entity.whirlwindTimer > 0;
        
        // 쌍도끼 (Dual Axes)
        ctx.save();
        if(isWW) {
            ctx.translate(x, y); ctx.rotate(t/50); // 빠르게 회전
            x=0; y=0; // 로컬 좌표계
            // 회오리 바람 이펙트 (반투명 원)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath(); ctx.arc(0, 0, r*2.0, 0, Math.PI*2); ctx.fill();
        }
        
        // 오른손 도끼
        ctx.save();
        if(isAttacking && !isWW) {
            ctx.translate(x+r*0.6, y-r*0.2); ctx.rotate(Math.PI * 0.4 * rotDir); // 도끼를 크게 휘두름
        } else {
            ctx.translate(x+r*0.6, y-r*0.1); ctx.rotate(-Math.PI * 0.2 * rotDir);
        }
        ctx.fillStyle = '#451a03'; ctx.fillRect(-r*0.1, -r*1.2, r*0.2, r*2.0); // 자루
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(r*0.1, -r*1.0); ctx.lineTo(r*0.6, -r*1.2); ctx.lineTo(r*0.8, -r*0.8); ctx.lineTo(r*0.6, -r*0.4); ctx.closePath(); ctx.fill(); // 다면체 날
        ctx.restore();
        
        // 왼손 도끼
        ctx.save();
        if(isAttacking && !isWW) {
            ctx.translate(x-r*0.6, y-r*0.2); ctx.rotate(-Math.PI * 0.4 * rotDir); // 교차 휘두르기
        } else {
            ctx.translate(x-r*0.6, y-r*0.1); ctx.rotate(Math.PI * 0.2 * rotDir);
        }
        ctx.fillStyle = '#451a03'; ctx.fillRect(-r*0.1, -r*1.2, r*0.2, r*2.0); // 자루
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-r*0.1, -r*1.0); ctx.lineTo(-r*0.6, -r*1.2); ctx.lineTo(-r*0.8, -r*0.8); ctx.lineTo(-r*0.6, -r*0.4); ctx.closePath(); ctx.fill(); // 날 반대편
        ctx.restore();
        
        ctx.restore(); // 휠윈드 회전 종료
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
        this.hitFlashTimer=0;
        this.curseTimer=0;
        this.invincibleTimer=0;
        this.defense=0;
        this.damageContributors=[];
        this.airborneTimer=0;
        this.isFrozen=false;
    }
    update(dt){
        if(this.isDead) return;
        if(this.invincibleTimer>0) {
            this.invincibleTimer-=dt;
            if(this.stunTimer > 0) this.stunTimer-=dt;
            this.vx=0; this.vy=0;
            return;
        }
        if(this.hitFlashTimer>0) this.hitFlashTimer-=dt;
        if(this.curseTimer>0) this.curseTimer-=dt;
        if(this.airborneTimer>0) this.airborneTimer-=dt;
        if(this.slowTimer > 0) this.slowTimer -= dt;
        if(this.gaTimer > 0) this.gaTimer -= dt; // 수호천사 쿨다운 감소
        if(this.arielBuffTimer > 0) {
            this.arielBuffTimer -= dt;
            if(Math.random()<0.05) spawnParticles(this.x, this.y, '#fef08a', 1, 30, 0.3);
            if(this.arielBuffTimer <= 0 && this.arielBuffActive) {
                this.arielBuffActive = false;
                this.moveSpd /= 1.4;
                this.aspd /= 1.4;
                this.defense -= 30;
            }
        }

        if(this.defBuffTimer > 0) this.defBuffTimer -= dt;
        if(this.stunTimer>0){ 
            this.stunTimer-=dt; 
            if(this.stunTimer<=0) this.isFrozen=false;
            return; 
        }
        let spdMult = (this.slowTimer > 0) ? (1 - this.slowRate) : 1;
        if (!this.isBuilding) {
            this.x=clamp(this.x+this.vx*dt*spdMult, 10, MAP_SIZE-10);
            this.y=clamp(this.y+this.vy*dt*spdMult, 10, MAP_SIZE-10);
        } else {
            this.vx = 0; this.vy = 0;
        }
        if(GS.status !== 'COUNTDOWN') this.attackTimer-=dt;
        this.lastAttackedTimer=Math.max(0, this.lastAttackedTimer-dt);
        this.animPhase+=dt*3; if(this.emoteTimer>0){this.emoteTimer-=dt; if(this.emoteTimer<=0)this.emote=null;}
        
        let home = this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
        if(dist(this, home) < 400 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * dt);
            if(Math.random()<0.05) { spawnParticles(this.x,this.y-10,'#22c55e',3,50,0.5); addText(this.x,this.y-this.radius-20,'\u2795','#22c55e',20); }
            if(Math.random()<0.01 && !this.emote) { this.emote = ['🤤','👼','💖'][Math.floor(Math.random()*3)]; this.emoteTimer=2; }
        }

        let inCombat = this.lastAttackedTimer > 0;
        if(!this.isBuilding) {
            if (!inCombat) {
                this.nonCombatTimer += dt;
            } else {
                this.nonCombatTimer = 0;
            }
        }
        
        // 피회복 및 이펙트 (14번 요구사항)
        if(!this.isBuilding && this.nonCombatTimer>=REGEN_DELAY && this.hp < this.maxHp) {
            let rate = this.hasWarmog ? 0.04 : REGEN_RATE;
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
        if(this.isDead || this.invincibleTimer > 0) return 0;
        if(this.type === 'nexus' && entities.some(t=>t.type==='nexus_turret' && t.faction===this.faction && !t.isDead)) return 0;
        
        if (this.type === 'hero' && this.inventory) {
            let hasFate = this.inventory.some(i=>i.id==='hourglass_fate');
            let hasTime = !hasFate && this.inventory.some(i=>i.id==='hourglass');
            if (hasFate && Math.random() < 0.25) {
                spawnParticles(this.x, this.y, '#fef08a', 20, 100, 2.0);
                addText(this.x, this.y-40, '⏳ 운명의 시간!', '#fef08a', 16);
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp*0.1);
                if (attacker) entities.push(new Projectile(attacker.x, attacker.y-400, attacker.x, attacker.y, 400, 100, this, 'meteor_strike'));
                return 0;
            } else if (hasTime && Math.random() < 0.15) {
                spawnParticles(this.x, this.y, '#fef08a', 10, 80, 1.5);
                addText(this.x, this.y-40, '⏳ 시간 역행!', '#fef08a', 16);
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp*0.05);
                return 0;
            }
        }
        
        if(typeof amount !== 'number' || isNaN(amount)) amount = 1;
        
        // Track contributors for assists
        if(this.type === 'hero' && attacker && attacker.type === 'hero' && attacker.faction !== this.faction) {
            let now = Date.now();
            this.damageContributors = this.damageContributors.filter(c => now - c.time < 10000);
            let exist = this.damageContributors.find(c => c.attacker === attacker);
            if(exist) exist.time = now;
            else this.damageContributors.push({attacker: attacker, time: now});
        }

        // ★ 넥서스 보호막: 수호탑(nexus_turret)이 하나라도 살아있으면 넥서스 무적
        if (this.type === 'nexus') {
            const guardTurretsAlive = entities.filter(
                e => e.type === 'nexus_turret' && e.faction === this.faction && !e.isDead
            ).length;
            if (guardTurretsAlive > 0) {
                // 피해 흡수 시각 효과
                spawnParticles(this.x + rand(-30,30), this.y - 20, '#60a5fa', 3, 60, 0.3);
                addText(this.x, this.y - 60, '🛡️ 보호됨', '#60a5fa', 12);
                return 0;
            }
        }

        this.lastAttackedTimer=REGEN_DELAY+0.5; this.nonCombatTimer=0;
        let dmg=Math.max(1, Math.floor(amount));
        if(this.damageReduction) dmg = Math.max(1, dmg * (1 - this.damageReduction));
        let effDef = this.defense + ((this.defBuffTimer > 0 && this.defBuffAmount) ? this.defBuffAmount : 0);
        if(effDef > 0) dmg = dmg * (100 / (100 + effDef));
        
        if(this.shield > 0) {
            let absorbed = Math.min(this.shield, dmg);
            this.shield -= absorbed;
            dmg -= absorbed;
            if(absorbed > 0) addText(this.x, this.y-this.radius-10, '🔰'+Math.floor(absorbed), '#60a5fa', 12);
            if(dmg <= 0) return 0;
        }

        // 괴수의 뼈갑옷: 근거리 전용 최종 데미지 15% 감소
        if(this.type === 'hero' && this.hasBehemoth && HERO_TMPL[this.heroKey] && HERO_TMPL[this.heroKey].type === 'melee') {
            dmg = Math.max(1, dmg * 0.85);
        }
        if(this.curseTimer > 0) dmg *= 1.3;
        // 수호천사의 은총: 치명적 피해 시 체력 1 생존 + 50% 실드
        if(this.hp - dmg <= 0 && this.type === 'hero' && this.hasGA && (this.gaTimer === undefined || this.gaTimer <= 0)) {
            this.hp = 1;
            this.shield = (this.shield || 0) + (this.maxHp * 0.5);
            this.gaTimer = 60.0;
            spawnRing(this.x, this.y, '#fbbf24', 220, 0.9);
            spawnParticles(this.x, this.y, '#fbbf24', 40, 200, 1.2);
            addText(this.x, this.y - 65, '👼 수호천사 발동!', '#fef08a', 24);
            return 0; // 사망 방지
        }
        this.hp-=dmg;
        
        if (this.passiveSkills && this.passiveSkills['mirrorImage'] > 0) {
            if(Math.random() < 0.15 + (this.passiveSkills['mirrorImage']-1)*0.05) {
                this.shadowClones = this.shadowClones || [];
                this.shadowClones.push({x:this.x+rand(-50,50),y:this.y+rand(-50,50),life:5,atk:this.atk*0.5,animPhase:Math.random()*Math.PI*2});
            }
        }
        
        // 정글몹 어그로 반격 로직 추가
        if(this.type === 'jungle' && attacker && !attacker.isBuilding) this.aggroTarget = attacker;

        if(triggerEffects && this.reflectRate > 0 && attacker && !attacker.isBuilding){
            let ref = dmg * this.reflectRate;
            if (typeof attacker.applyRawDamage === 'function') {
                attacker.applyRawDamage(ref, this, false);
            }
        }
        
        let color = attacker===player?'#fbbf24':(attacker&&attacker.faction==='BLUE'?'#60a5fa':'#f87171');
        spawnParticles(this.x, this.y-this.radius*0.5, color, 5, 80, 0.3);
        
        let isCrit = amount > (attacker?attacker.atk*1.5:0);
        
        addText(this.x+rand(-15,15), this.y-this.radius-10, isCrit?'\u{1F4A5}'+Math.floor(dmg)+'!':Math.floor(dmg), isCrit?'#ef4444':(attacker===player?'#fbbf24':'#f8fafc'), isCrit?28:14);

        // 히트 플래시 (번쩍임 효과)
        this.hitFlashTimer = 0.1;

        if(this.hp<=0){ this.hp=0; this.isDead=true;
            if ((this.type === 'minion' || this.type === 'jungle') && this.faction !== player?.faction) {
                
            } if(attacker&&attacker.onKill) attacker.onKill(this); this.onDeath(attacker); }
        if (triggerEffects && (attacker === player || this === player)) {
            playSFX(attacker === player ? 'hit' : 'hit_receive');
        }
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
        this.baseMaxHp=t.hp; this.maxHp=t.hp; this.hp=t.hp; this.baseAtk=t.atk; this.atk=t.atk;
        this.baseAspd=t.aspd*1.3; this.aspd=t.aspd*1.3; this.baseMoveSpd=t.move*0.7; this.moveSpd=t.move*0.7;
        this.range=t.range; this.radius=22;
        this.level=1; this.exp=0; this.maxExp=100; this.gold=300;
        this.deaths = 0;
        this.assists = 0;
        this.attackAnimTimer = 0;
        this.inventory=[];
        this.heroSkill1Timer=0; this.heroSkill2Timer=0;
        this.pendingSkillLevels = 0;
        // 뱀서라이크 패시브 스킬 시스템
        this.passiveSkills = {};
        this.passiveTimers = { fireRing:0, meteor:0, shadowClone:0, poisonCloud:0 };
        this.shadowClones = [];
        this.poisonZones = [];
        this.soulBuffTimer = 0;
        this.soulAtkBonus = 0;
        this.pendingLevelUp = false;
        this.pendingSkillLevels = 0;
        this.critChance=t.critChance||0; this.lifeSteal=t.lifeSteal||0;
        this.reflectRate=0; this.burnDmg=0; this.stunChance=0;
        this.borkActive=false; this.hasWarmog=false;
        this.isRetreating=false; this.aiShopTimer=rand(5,15);
        this.facingDir=1;
        this.applyStats();
    }
    update(dt){
        if(this.whirlwindTimer > 0) {
            this.whirlwindTimer -= dt;
            this.attackTimer = 0.5; 
            if(!this.wwTick) this.wwTick = 0;
            this.wwTick -= dt;
            if(this.wwTick <= 0) {
                this.wwTick = 0.3;
                spawnSlash(this.x, this.y-this.radius, Math.random()*Math.PI*2, '#cbd5e1', 120);
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 120) {
                        e.applyRawDamage(this.whirlwindDmg || 50, this);
                        if(Math.random() < 0.2) e.airborneTimer = 0.5; 
                    }
                });
            }
        }
        if(this.attackAnimTimer > 0) this.attackAnimTimer -= dt;
        if(this.zhonyaTimer > 0) this.zhonyaTimer -= dt;
        if(this.cragShieldTimer > 0) {
            this.cragShieldTimer -= dt;
            if(this.cragShieldTimer <= 0 && this.cragShieldActive) {
                this.shield = 0;
                this.defense -= 150;
                this.cragShieldActive = false;
            }
        }

        // 자연 골드 및 EXP 획득 (패시브)
        if(!this.isDead) {
            this.gold += dt * 1;
            this.gainExp(dt * 0.5);
        }
        
        if(this.shadowClones) {
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
        
        if(this.poisonZones) {
            for(let i=this.poisonZones.length-1;i>=0;i--) {
                let pz=this.poisonZones[i]; pz.life-=dt;
                if(pz.life<=0){this.poisonZones.splice(i,1);continue;}
                pz.tick+=dt;
                if(pz.tick>=0.5) { pz.tick=0;
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead&&dist(pz,e)<=pz.radius) e.applyRawDamage(pz.dmg*0.5, this, true, true);}); }
            }
        }

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
        
        if(this.grrrGiantTimer > 0) this.grrrGiantTimer -= Math.min(this.grrrGiantTimer, dt);
        if(this.underdogBuffTimer > 0) this.underdogBuffTimer -= Math.min(this.underdogBuffTimer, dt);
        if(this.warAnthemTimer > 0) this.warAnthemTimer -= Math.min(this.warAnthemTimer, dt);
        if(this.dragonBuffTimer > 0) {
            this.dragonBuffTimer -= dt;
            if(this.dragonBuffTimer <= 0) {
                this.dragonBuffStats = null;
                this.applyStats();
            }
        }
        
        this.calculateDynamicStats(dt);
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
            if(joy.active){
                let d = Math.hypot(joy.dx, joy.dy);
                if(d > 5) {
                    this.vx=(joy.dx/d)*this.moveSpd; 
                    this.vy=(joy.dy/d)*this.moveSpd; 
                    if(joy.dx<0) this.facingDir=-1; else if(joy.dx>0) this.facingDir=1;
                }
            }
        }
        let len=Math.hypot(this.vx,this.vy); if(len>this.moveSpd){ this.vx=this.vx/len*this.moveSpd; this.vy=this.vy/len*this.moveSpd; }
    }
    handleAI(dt){
        if(this.isDead || this.stunTimer>0) return;

        let myBase = this.faction === 'BLUE' ? {x:300, y:2700} : {x:2700, y:300};
        
        // 본진 근처면 즉시 최적의 장비 구매 시도
        if(dist(this, myBase) < 400) {
            this.aiShopTimer -= dt;
            if(this.aiShopTimer <= 0) {
                this.aiShopAI();
                this.aiShopTimer = 4.0;
            }
        }

        let hpRatio = this.hp / this.maxHp;
        
        // 0.2초마다 주변 전황 및 고도화된 정보 캐싱
        if (!this.aiUpdateTimer) this.aiUpdateTimer = 0;
        this.aiUpdateTimer -= dt;
        if (this.aiUpdateTimer <= 0) {
            this.aiUpdateTimer = 0.2;
            this.nearEnemiesCache = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) < 900);
            this.nearAlliesCache = entities.filter(e => e.faction === this.faction && !e.isDead && dist(this, e) < 900 && e !== this);
        }

        let nearEnemies = (this.nearEnemiesCache || []).filter(e => !e.isDead);
        let nearAllies = (this.nearAlliesCache || []).filter(e => !e.isDead);

        // ────────────────────────────────────────
        // [가이드 4.3.1] 동적 전술 상태 결정 알고리즘
        // ────────────────────────────────────────
        let oldState = this.aiState;
        
        if (hpRatio <= 0.35) {
            let superWeakEnemy = nearEnemies.find(e => e.type === 'hero' && (e.hp / e.maxHp) <= 0.15 && dist(this, e) < this.range * 1.3);
            if (superWeakEnemy) {
                this.aiState = 'ATTACK';
            } else {
                this.aiState = 'RETREAT';
            }
        } else {
            let combatAllies = nearAllies.filter(a => a.type === 'hero' && a.lastAttackedTimer > 0);
            let visibleEnemyHeroes = nearEnemies.filter(e => e.type === 'hero');
            
            if (combatAllies.length > 0 && visibleEnemyHeroes.length > 0) {
                this.aiState = 'TEAMFIGHT_JOIN';
            } else if (nearEnemies.length > 0) {
                this.aiState = 'ATTACK';
            } else {
                this.aiState = 'LANE';
            }
        }

        if (oldState !== this.aiState) {
            this.aiChasing = false;
            this.reactionDelay = 0.15;
        }
        if (this.reactionDelay > 0) {
            this.reactionDelay -= dt;
            return;
        }

        // ────────────────────────────────────────
        // [가이드 4.3.2] 타겟 우선순위 스코어링 수식 기반 스마트 타겟팅
        // ────────────────────────────────────────
        let target = null;
        if (nearEnemies.length > 0) {
            let bestScore = -99999;
            nearEnemies.forEach(e => {
                if (e.type === 'nexus' && entities.some(t => t.type==='nexus_turret' && t.faction===e.faction && !t.isDead)) return;
                
                let d = dist(this, e);
                let score = 0;
                score += (1.0 - (e.hp / e.maxHp)) * 400;
                score += (1.0 - (d / 900)) * 300;
                if (e.type === 'hero') score += 250;
                if ((e.type === 'tower' || e.type === 'nexus_turret') && !entities.some(m => m.faction === this.faction && m.type === 'minion' && dist(m, e) < e.range)) {
                    score -= 600;
                }

                if (score > bestScore) {
                    bestScore = score;
                    target = e;
                }
            });
        }

        // ────────────────────────────────────────
        // [가이드 4.3.3] 각 상태별 세부 주행 제어
        // ────────────────────────────────────────
        let tx = 1500, ty = 1500;
        
        const followDirection = (targetPos, stopDist) => {
            let d = dist(this, targetPos);
            if (d > stopDist) {
                let a = Math.atan2(targetPos.y - this.y, targetPos.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd;
                this.vy = Math.sin(a) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
            }
            this.facingDir = targetPos.x < this.x ? -1 : 1;
        };

        switch(this.aiState) {
            case 'RETREAT':
                let pursuer = nearEnemies.find(e => e.type === 'hero' && dist(this, e) < 300);
                if (pursuer) {
                    let escapeAngle = Math.atan2(myBase.y - this.y, myBase.x - this.x);
                    let evadeNoise = Math.sin(performance.now() / 150) * 0.4;
                    this.vx = Math.cos(escapeAngle + evadeNoise) * this.moveSpd;
                    this.vy = Math.sin(escapeAngle + evadeNoise) * this.moveSpd;
                } else {
                    followDirection(myBase, 50);
                }
                break;

            case 'TEAMFIGHT_JOIN':
                let targetFight = nearAllies.find(a => a.type === 'hero' && a.lastAttackedTimer > 0);
                if (targetFight) {
                    followDirection(targetFight, this.range * 0.7);
                    if (target && dist(this, target) <= this.range) {
                        if(this.heroSkill1Timer <= 0) this.useSkill(1);
                        if(this.heroSkill2Timer <= 0) this.useSkill(2);
                    }
                } else {
                    this.aiState = 'LANE';
                }
                break;

            case 'ATTACK':
                if (target) {
                    let d = dist(this, target);
                    if (this.attackTimer > 0 && HERO_TMPL[this.heroKey].type === 'ranged' && d < this.range * 0.8) {
                        let escapeAngle = Math.atan2(this.y - target.y, this.x - target.x);
                        this.vx = Math.cos(escapeAngle) * this.moveSpd * 0.85;
                        this.vy = Math.sin(escapeAngle) * this.moveSpd * 0.85;
                    } else {
                        followDirection(target, this.range * 0.6);
                    }
                    
                    if(this.heroSkill1Timer <= 0) this.useSkill(1);
                    if(this.heroSkill2Timer <= 0 && d < this.range * 1.1) this.useSkill(2);
                } else {
                    this.aiState = 'LANE';
                }
                break;

            case 'LANE':
            default:
                if(this.laneRole === 'top') { tx = 300; ty = 300; }
                else if(this.laneRole === 'bot' || this.laneRole === 'support') { tx = 2700; ty = 2700; }
                else if(this.laneRole === 'mid') { tx = 1500; ty = 1500; }
                else if(this.laneRole === 'jungle') {
                    let jg = entities.filter(e => e.type === 'jungle' && !e.isDead && (!e.mtype || !e.mtype.includes('boss'))).sort((a,b) => dist(this,a) - dist(this,b))[0];
                    if(jg) { tx = jg.x; ty = jg.y; }
                    else { tx = 1500; ty = 1500; }
                }

                if(dist(this, {x:tx, y:ty}) < 250) {
                    let enemyBase = this.faction === 'BLUE' ? {x:2700, y:300} : {x:300, y:2700};
                    tx = enemyBase.x; ty = enemyBase.y;
                }

                let enemyTower = entities.find(t => (t.type==='tower' || t.type==='nexus_turret') && t.faction !== this.faction && !t.isDead && dist(this, t) < t.range + 80);
                if (enemyTower) {
                    let hasFriendlyMinion = entities.some(m => m.faction === this.faction && m.type === 'minion' && !m.isDead && dist(m, enemyTower) < enemyTower.range);
                    if (!hasFriendlyMinion) {
                        let retreatAngle = Math.atan2(this.y - enemyTower.y, this.x - enemyTower.x);
                        tx = enemyTower.x + Math.cos(retreatAngle) * (enemyTower.range + 100);
                        ty = enemyTower.y + Math.sin(retreatAngle) * (enemyTower.range + 100);
                    }
                }

                followDirection({x:tx, y:ty}, 40);
                break;
        }

        // 디버그용 데이터 저장
        this.aiTarget = target;
        this.aiTx = tx;
        this.aiTy = ty;
    }
    autoAttack(){
        if(this.attackTimer>0) return;
        let target=null;
        let targetHero = null, targetMinion = null, targetBuilding = null;
        let distHero = Infinity, distMinion = Infinity, distBuilding = Infinity;
        
        entities.forEach(e=>{
            if(e.faction!==this.faction&&!e.isDead){
                if(e.type==='nexus' && entities.some(t=>t.type==='nexus_turret' && t.faction===e.faction && !t.isDead)) return;
                let d=dist(this,e); 
                if(d<=this.range) {
                    if (e.type === 'hero') {
                        if (d < distHero) { distHero = d; targetHero = e; }
                    } else if (e.type === 'minion' || e.type === 'jungle') {
                        if (d < distMinion) { distMinion = d; targetMinion = e; }
                    } else if (e.type === 'tower' || e.type === 'nexus_turret' || e.type === 'nexus') {
                        if (d < distBuilding) { distBuilding = d; targetBuilding = e; }
                    }
                }
            }
        });
        
        target = targetHero || targetMinion || targetBuilding;
        if(!target) return;

        this.attackTimer=1.0/this.aspd;
        let dmg=this.atk;
        let isCrit=Math.random()<this.critChance; if(isCrit) dmg*=2;
        if(this.giantSlayerRate > 0 && !target.isBuilding) {
            if(target.maxHp > this.maxHp) {
                let diff = Math.floor((target.maxHp - this.maxHp) / 100);
                dmg *= (1 + diff * 0.02);
            }
        }
        if(this.borkActive&&!target.isBuilding) dmg+=target.hp*0.05;

        if(HERO_TMPL[this.heroKey].type==='ranged'){
            this.attackAnimTimer = 0.2;
            if(this.heroKey === 'ARCHON') {
                laserEffects.push({x1:this.x, y1:this.y-this.radius, x2:target.x, y2:target.y-target.radius, color:'#ffffff', life:0.15, maxLife:0.15, width:15});
                spawnAOE(target.x, target.y, 80, '#ffffff44', 0.2);
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 80);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                });
                if(this.isPlayer) playSFX('shoot');
            } else {
                projectiles.push(new Projectile(this.x, this.y-this.radius, target, dmg, this, isCrit));
                if(this.isPlayer) playSFX('shoot');
            }
        } else {
            this.attackAnimTimer = 0.2;
            if(this.heroKey === 'BARBARIAN') {
                let a = Math.atan2(target.y-this.y, target.x-this.x);
                spawnSlash(this.x, this.y-this.radius, a + 0.3, '#94a3b8', 60); // 오른손 도끼
                spawnSlash(this.x, this.y-this.radius, a - 0.3, '#94a3b8', 60); // 왼손 도끼
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, this) <= this.range + 30);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                    if(this.lifeSteal>0) this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal);
                });
                if(this.isPlayer) playSFX('hit');
            }
            else if(this.heroKey === 'CRAG') {
                spawnSlash(this.x, this.y-this.radius, Math.random()*Math.PI*2, '#78716c', 100);
                spawnParticles(target.x, target.y, '#57534e', 10, 80, 0.5);
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 100);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                });
                if(this.isPlayer) playSFX('hit');
            }
 else {
                let dealt=target.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                let a = Math.atan2(target.y-this.y, target.x-this.x);
                spawnSlash(this.x, this.y-this.radius, a, this.faction==='BLUE'?'#93c5fd':'#fca5a5', 30);
                this.triggerOnHitPassives(target);
                if(this.lifeSteal>0) { this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal); playSFX('heal'); }
                if(this.burnDmg>0&&!target.isBuilding) target.burnTicks.push({dmg:this.burnDmg,ticks:3,timer:1.0,src:this});
                if(this.stunChance>0&&Math.random()<this.stunChance&&!target.isBuilding) target.stunTimer = target.type==='hero' && target.inventory && target.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[target.heroKey] && HERO_TMPL[target.heroKey].type==='melee' ? (1.0)*0.7 : (1.0);
                // 서리불꽃 건틀릿: 이속 둔화 (근거리 50%, 원거리 25%)
                if(this.hasFrostG && !target.isBuilding) {
                    let isMeleeSelf = HERO_TMPL[this.heroKey] && HERO_TMPL[this.heroKey].type === 'melee';
                    target.moveSpdTimer = 1.5;
                    target.moveSpdBuff = isMeleeSelf ? -0.5 : -0.25;
                    spawnParticles(target.x, target.y, '#bae6fd', 5, 25, 0.3);
                }
                // 티아맷의 도끼: 광역 Splash (근거리 전용)
                if(this.hasTiamat && !target.isBuilding && HERO_TMPL[this.heroKey] && HERO_TMPL[this.heroKey].type === 'melee') {
                    let splashDmg = this.atk * 0.35;
                    spawnRing(target.x, target.y, '#ef4444', 120, 0.2);
                    entities.forEach(ne => {
                        if(ne.faction !== this.faction && !ne.isDead && ne !== target && dist(target, ne) < 120) {
                            ne.applyRawDamage(splashDmg, this, false);
                        }
                    });
                }
                spawnSlash(this.x+Math.cos(a)*this.range*0.5, this.y+Math.sin(a)*this.range*0.5, a, isCrit?'#fbbf24':HERO_TMPL[this.heroKey].color);
            }
        }
    }
    onKill(target){
        this.triggerOnKillPassives(target);
        if(target.type==='hero'){
            this.emote = '🤣'; this.emoteTimer = 3.0;
            target.emote = '😭'; target.emoteTimer = 3.0;
            this.kills++;
            this.killStreak = (this.killStreak || 0) + 1;
            let now = Date.now();
            if(!this.lastKillTime || now - this.lastKillTime < 5000) {
                this.multiKill = (this.multiKill || 0) + 1;
            } else {
                this.multiKill = 1;
            }
            this.lastKillTime = now;
            
            let hName = HERO_TMPL[this.heroKey].name;
            if(this.multiKill === 2) showBanner(hName + ' 더블 킬!', '✌️', this.faction===player?.faction);
            else if(this.multiKill === 3) showBanner(hName + ' 트리플 킬!!', '🔥', this.faction===player?.faction);
            else if(this.multiKill >= 4) showBanner(hName + ' 쿼드라 킬!!!', '💥', this.faction===player?.faction);
            else if(this.killStreak >= 3) showBanner(hName + '가 미쳐 날뛰고 있습니다!', '👹', this.faction===player?.faction);
            else showBanner(hName + ' 처치!', '⚔️', this.faction===player?.faction);

            window.addGold(this, 250); this.gainExp(80);
            if(target.faction!=='BLUE') GS.scoreBlue++; else GS.scoreRed++;
            document.getElementById('scoreBlue').textContent=GS.scoreBlue; document.getElementById('scoreRed').textContent=GS.scoreRed;
            if(this.isPlayer) addText(this.x, this.y-40, '+250G / 80XP', '#fbbf24', 16);
        } else if(target.type==='minion'){ 
            window.addGold(this, 60); this.gainExp(25);
            if(this.isPlayer) addText(this.x, this.y-40, '+60G', '#fbbf24', 16);
        } else if(target.type==='jungle'){ 
            window.addGold(this, 100); this.gainExp(60);
            if(this.isPlayer) addText(this.x, this.y-40, '+100G / 60XP', '#fbbf24', 18);
        } else if(target.type.startsWith('boss')){ 
            window.addGold(this, 400); this.gainExp(150); showBanner('보스 처치!', '👑', this.faction===player?.faction);
            if(this.isPlayer) addText(this.x, this.y-40, '+400G / 150XP', '#fbbf24', 18);
        }
    }
    gainExp(amt){
        this.exp+=amt;
        let leveledUp = 0;
        while(this.exp>=this.maxExp){
            this.exp-=this.maxExp; this.level++; this.maxExp=Math.floor(this.maxExp*1.15); // 레벨업 요구치 완화
            leveledUp++;
            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            if(c==='atk') { this.baseAtk+=6; statMsg = '공격력 +6'; }
            if(c==='hp') { this.baseMaxHp+=60; this.hp+=60; statMsg = '체력 +60'; }
            if(c==='move') { this.baseMoveSpd+=2.5; statMsg = '이동속도 증가'; }
            if(c==='aspd') { this.baseAspd+=0.12; statMsg = '공격속도 증가'; }
            this.applyStats();
            if(this.isPlayer){
                addText(this.x,this.y-60,'LEVEL UP!','#fcd34d',22);
                setTimeout(()=>addText(this.x,this.y-80,'운빨 스탯: '+statMsg+'!', '#a78bfa', 16), 300);
                playSFX('heal');
            }
        }
        if (leveledUp > 0) {
            if (this.isPlayer) {
                this.pendingSkillLevels = (this.pendingSkillLevels || 0) + leveledUp;
                if (!this.pendingLevelUp) {
                    setTimeout(() => this.showSkillSelection(), 500);
                }
            } else {
                for(let i=0; i<leveledUp; i++) this.aiSelectSkill();
            }
        }
    }
    onDeath(attacker){
        let oracleAlly = entities.find(e => e.type==='hero' && e.faction===this.faction && e!==this && !e.isDead && dist(this, e) <= 400 && e.inventory.some(i=>i.id==='oracle_glory'));
        if(oracleAlly && !this.hasUsedOracleRevive) {
            this.hasUsedOracleRevive = true;
            this.isDead = false;
            this.hp = this.maxHp * 0.3;
            this.respawnTimer = 0;
            spawnParticles(this.x, this.y, '#fbbf24', 30, 150, 1.0);
            spawnRing(this.x, this.y, '#fbbf24', 120, 0.8);
            addText(this.x, this.y-50, '✨ 오라클 부활!', '#fbbf24', 24);
            playSFX('heal');
            if(this.isPlayer) {
                document.getElementById('respawnOverlay').classList.add('hidden');
            }
            return;
        }

        this.deaths++;
        this.killStreak = 0;
        this.respawnTimer = Math.min(5 + this.level * 0.8, 25); // 부활 시간 조정
        if (attacker && attacker.type === 'hero' && this.type === 'hero') {
            // 어시스트 처리
            this.damageContributors.forEach(c => {
                if(c.attacker !== attacker && !c.attacker.isDead) {
                    c.attacker.assists++;
                    c.attacker.gainExp(this.level * 15);
                    window.addGold(c.attacker, 150);
                    if(c.attacker.triggerWarAnthem) c.attacker.triggerWarAnthem();
                }
            });
            if(attacker.triggerWarAnthem) attacker.triggerWarAnthem();

            if(window.addKillFeed) addKillFeed(attacker, this);
            if(window.AIChat) window.AIChat.onKill(attacker, this);
        } else if (attacker && attacker.mtype === 'boss_dragon') {
            if(window.addKillFeed) addKillFeed({heroKey:'dragon', name:'드래곤', isPlayer:false}, this);
        }
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
            this.gold-=item.cost; if(Math.random()<ENHANCE_RATES[slot.upgrade]){ slot.upgrade++; if(this.isPlayer) addText(this.x,this.y-50,'+'+slot.upgrade+' 강화 성공!','#f59e0b'); 
                if(slot.upgrade >= 5 && window.AIChat) {
                    // Trigger emojis for nearby heroes
                    let nearby = entities.filter(e=>e.type==='hero' && dist(this, e)<500);
                    nearby.forEach(n => { addText(n.x, n.y-60, ['😲','✨','🔥','😱'][Math.floor(Math.random()*4)], '#fff', 24); });
                }
            } else { addText(this.x,this.y-50,'강화 실패...','#64748b'); }
        } else {
            if(this.inventory.length>=10) return;
            this.gold-=item.cost; this.inventory.push({id:item.id,upgrade:0,stat:item.stat,val:item.val});
        }
        this.applyStats(); this.checkEvolution(); renderShop();
    }
    applyStats(){
        this.maxHp = this.baseMaxHp;
        if (this.isGiant) {
            this.maxHp *= 1.5;
        }
        this.atk=this.baseAtk; this.aspd=this.baseAspd; this.moveSpd=this.baseMoveSpd;
        let t=HERO_TMPL[this.heroKey];
        this.critChance=t.critChance||0; this.lifeSteal=t.lifeSteal||0;
        this.reflectRate=0; this.burnDmg=0; this.stunChance=0; this.shield=0;
        this.cdr=0; this.skillDmgBonus=0; this.giantSlayerRate=0; this.defense=0; this.hasZhonya=false;
        this.borkActive=false; this.hasWarmog=false;
        this.hasTiamat=false; this.hasFrostG=false; this.hasBehemoth=false; this.hasGA=false; this.hasHermes=false;
        this.inventory.forEach(i=>{
            let m=1+(i.upgrade*0.5);
            if(i.stat==='atk') this.atk+=i.val*m; if(i.stat==='hp') this.maxHp+=i.val*m;
            if(i.stat==='move') this.moveSpd+=i.val*m; if(i.stat==='aspd') this.aspd+=i.val*m;
            if(i.stat==='crit') this.critChance+=i.val*m; if(i.stat==='vamp') this.lifeSteal+=i.val*m;
            if(i.stat==='reflect') this.reflectRate+=i.val*m; if(i.stat==='burn') this.burnDmg+=i.val*m;
            if(i.stat==='stun') this.stunChance+=i.val*m; if(i.stat==='shield') this.defense+=i.val*m;
            if(i.stat==='cdr' || i.id==='archmage_staff') { this.cdr+=i.val*m; this.skillDmgBonus+=0.10*m; }
            if(i.stat==='giant_slayer' || i.stat==='reaper') this.giantSlayerRate+=i.val*m;
            if(i.stat==='bork') this.borkActive=true;
            if(i.stat==='warmog') this.hasWarmog=true;
            if(i.stat==='tiamat')  { this.hasTiamat=true;  this.atk+=25*m; this.maxHp+=300*m; }
            if(i.stat==='frost_g') { this.hasFrostG=true;  this.maxHp+=400*m; }
            if(i.stat==='behemoth'){ this.hasBehemoth=true; this.maxHp+=600*m; }
            if(i.stat==='ga')      { this.hasGA=true; this.atk+=40*m; this.shield+=200*m; }
            if(i.stat==='hermes')  { this.hasHermes=true; this.moveSpd+=45*m; }
            if((i.stat==='zhonya' || i.stat==='fate_zhonya') && i.upgrade>=1) this.hasZhonya=true; 
            
            // 진화 아이템 전용 특수 스탯 처리
            if(i.stat==='avalon') this.atk+=i.val*m;
            if(i.stat==='divine_shield') { this.shield+=i.val*m; this.defense+=50*m; }
            if(i.stat==='frozen_heart') this.reflectRate+=i.val*m;
            if(i.stat==='sunfire') this.maxHp+=i.val*m;
            if(i.stat==='archmage') { this.skillDmgBonus+=0.20*m; } 
            if(i.stat==='zeus') this.stunChance+=i.val*m;
            if(i.stat==='storm_eye') this.moveSpd+=i.val*m;
            if(i.stat==='vampiric') this.lifeSteal+=i.val*m;
            if(i.stat==='phantom') this.critChance+=i.val*m;
            if(i.stat==='demonfire') this.burnDmg+=i.val*m;
            if(i.stat==='berserker') { this.aspd+=i.val*m; this.lifeSteal+=0.10*m; }
            if(i.stat==='oracle_glory') { this.defense+=i.val*m; }
        });
        
        this.critChance  = Math.min(this.critChance,  0.65);
        this.stunChance  = Math.min(this.stunChance,  0.40);
        this.lifeSteal   = Math.min(this.lifeSteal,   0.45);
        this.reflectRate = Math.min(this.reflectRate, 0.40);
        this.cdr         = Math.min(this.cdr,         0.55);

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
        let gbLv = this.passiveSkills['guardian_bond'] || 0;
        if(gbLv > 0) this.defense += gbLv * 15;
        let haLv = this.passiveSkills['haste_art'] || 0;
        if(haLv > 0) this.cdr += haLv * 0.10;
        
        if(this.soulAtkBonus > 0) this.atk += this.soulAtkBonus;
        
        if(this.dragonBuffTimer > 0 && this.dragonBuffStats) {
            this.dragonBuffStats.forEach(stat => {
                if(stat === 'atk') this.atk *= 1.3;
                if(stat === 'def') this.defense += 100;
                if(stat === 'moveSpd') this.moveSpd *= 1.3;
                if(stat === 'aspd') this.aspd *= 1.3;
                if(stat === 'maxHp') { this.maxHp *= 1.3; this.hp = Math.min(this.hp, this.maxHp); }
            });
        }
        
        // 시너지: 얼어붙은 학살자 (서리불꽃 건틀릿 + 몰락검)
        if(this.hasFrostG && this.borkActive) { this.atk += 30; this.lifeSteal += 0.10; }
        // 시너지: 불사조의 분노 (수호천사 + 티아맷의 도끼)
        if(this.hasGA && this.hasTiamat) { this.maxHp += 500; }
        // 몰락한 왕의 검: 피흡 5% 기본 추가
        if(this.borkActive) { this.lifeSteal += 0.05; }

        this.staticAtk = this.atk; this.staticAspd = this.aspd; this.staticMoveSpd = this.moveSpd;
        this.hp=Math.min(this.hp, this.maxHp);
    }
    calculateDynamicStats(dt) {
        let effAtk = this.staticAtk || this.atk; 
        let effAspd = this.staticAspd || this.aspd; 
        let effMove = this.staticMoveSpd || this.moveSpd;
        
        if(this.grrrGiantTimer > 0) {
            effAtk *= 1.5; effMove *= 1.2; effAspd *= 1.2; this.damageReduction = 0.3;
            if(!this.isGiant) { this.isGiant=true; this.baseRadius=this.radius; this.baseMaxHp=this.maxHp; this.maxHp*=1.5; this.hp+=this.baseMaxHp*0.5; this.radius*=1.8; }
        } else if(this.isGiant) {
            this.isGiant=false; this.damageReduction = 0; this.maxHp=this.baseMaxHp; this.hp=Math.min(this.hp,this.maxHp); this.radius=this.baseRadius;
        }
        
        if(this.underdogBuffTimer > 0) {
            effAtk *= 1.15; effMove *= 1.15; effAspd *= 1.15;
        }
        
        if(this.atkSpdBuffTimer > 0) {
            this.atkSpdBuffTimer -= dt;
            effAspd *= (this.atkSpdBuffRate || 1.5);
            if(this.atkSpdBuffTimer <= 0) {
                this.atkSpdBuffTimer = 0;
                this.atkSpdBuffRate = 1.0;
            }
        }
        
        if(this.warAnthemTimer > 0) {
            effMove *= 1.3; effAspd *= 1.3;
        }
        
        // 헤르메스의 장화: 비전투 3초 이후 이속 25% 추가 증가
        if(this.hasHermes && this.nonCombatTimer > 3.0) {
            effMove *= 1.25;
        }
        this.atk = effAtk; this.aspd = effAspd; this.moveSpd = effMove;
    }
    autoUseHeroSkills(){
        let nearEnemies = (cx,cy,r) => entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist({x:cx,y:cy},e)<=r);
        
        if(GS.autoSkill1 && this.heroSkill1Timer <= 0 && nearEnemies(this.x, this.y, 400).length > 0) this.useSkill(1);
        if(GS.autoSkill2 && this.heroSkill2Timer <= 0 && nearEnemies(this.x, this.y, 400).length > 0) this.useSkill(2);
    }
    useSkill(idx) {
        if(GS.status === 'COUNTDOWN') return;
        let k = this.heroKey;
        let sl = Math.floor((this.level - 1) / 3) + 1;
        let baseCd = idx===1 ? HERO_TMPL[k].skill1.cd : HERO_TMPL[k].skill2.cd;
        let cd = Math.max(2, baseCd - sl*0.5);
        if(this.cdr > 0) cd = cd * Math.max(0.3, 1 - this.cdr); // Max 70% CDR
        
        if(idx===1) { if(this.heroSkill1Timer > 0) return; this.heroSkill1Timer = cd; this.heroSkill2Timer = Math.max(this.heroSkill2Timer, 1.0); }
        else { if(this.heroSkill2Timer > 0) return; this.heroSkill2Timer = cd; this.heroSkill1Timer = Math.max(this.heroSkill1Timer, 1.0); }
        
        let skillDmg = this.atk * (1.5 + sl * 0.5) * (1 + this.skillDmgBonus);
        let nearEnemies = (cx,cy,r) => entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist({x:cx,y:cy},e)<=r);
        let targets = nearEnemies(this.x, this.y, 400);
        let t = targets.length > 0 ? targets.sort((a,b)=>dist(this,a)-dist(this,b))[0] : null;

        playSFX('skill_burst');
        
        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = cd * 0.66;
            this.emote = '🦍'; this.emoteTimer = 2.0;

            spawnRing(this.x, this.y, '#f59e0b', 150, 0.8);
            for(let i=0; i<3; i++) setTimeout(() => spawnParticles(this.x, this.y, '#b45309', 15, 100, 0.6), i*200);
            return;
        } else if(idx === 2 && k === 'grrr') {
            spawnAOE(this.x, this.y, 125, '#f59e0b88', 0.5);
            this.emote = '🤬'; this.emoteTimer = 2.0;
            let tgts = nearEnemies(this.x, this.y, 125);
            tgts.forEach(e => { e.applyRawDamage(this.atk*2.0, this); e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (2.0)*0.7 : (2.0); });

            // 바닥 갈라짐 + 흙먼지 이펙트
            for(let i=0; i<5; i++) spawnSlash(this.x, this.y, Math.random()*Math.PI*2, '#78350f', 125);
            spawnParticles(this.x, this.y, '#d97706', 40, 125, 0.8);
            return;
        }
        


        
                if(k === 'CRAG') {
            if(idx === 1) { // 대지 강타
                this.attackAnimTimer = 0.8; // 더 묵직한 모션
                this.emote = '💥'; this.emoteTimer = 1.0;
                GS.shakeTimer = (GS.shakeTimer||0) + 0.8; // 매우 강한 화면 흔들림 효과
                
                // 쩌적 갈라지는 거대한 지진 균열 효과
                if (typeof spawnEarthCrack !== 'undefined') {
                    spawnEarthCrack(this.x, this.y, 250, '#facc15'); // 바깥쪽 노란 균열
                    spawnEarthCrack(this.x, this.y, 150, '#f97316'); // 안쪽 붉은 균열
                }
                spawnAOE(this.x, this.y, 200, '#facc1588', 0.8); // 번쩍이는 빛
                
                // 파편과 흙먼지가 연속으로 터짐
                for(let i=0; i<6; i++) {
                    setTimeout(() => {
                        if(GS.status !== 'PLAYING') return;
                        spawnParticles(this.x, this.y, '#44403c', 40, 300, 1.2);
                        spawnParticles(this.x, this.y, '#facc15', 10, 200, 0.8);
                        if(typeof playSFX !== 'undefined') playSFX('skill_burst');
                    }, i * 50);
                }

                // 즉각적인 타격 판정 및 시각 효과 (명중률 100%)
                let tgts = nearEnemies(this.x, this.y, 250); // 범위 더욱 넓힘
                tgts.forEach(e => {
                    let dmg = skillDmg * 2.5; // 확실한 폭딜
                    let dealt = e.applyRawDamage(dmg, this);
                    if(dealt > 0) this.totalDmg += dealt;
                    if(e.applyStun) e.applyStun(2.0);
                    
                    // 타격 피드백 (텍스트 및 이펙트)
                    spawnParticles(e.x, e.y, '#facc15', 10, 80, 0.5);
                    addText(e.x, e.y - 20, '💥스턴!', '#facc15', 18);
                });

            } else { // 바위 갑옷
                this.attackAnimTimer = 0.8;
                if(!this.cragShieldActive) this.defense += 150;
                this.shield = this.maxHp * 0.30;
                this.cragShieldActive = true;
                this.cragShieldTimer = 5.0;
                this.emote = '🛡️'; this.emoteTimer = 1.0;
                
                // 황금빛 바위 오라가 거대하게 용솟음 치는 효과!
                if (typeof spawnRockAura !== 'undefined') spawnRockAura(this.x, this.y, 200); 
                spawnRing(this.x, this.y, '#facc15', 200, 2.0);
                spawnAOE(this.x, this.y, 150, '#facc1533', 2.0); 
                if(typeof playSFX !== 'undefined') playSFX('heal'); 
            }
        } else if(k === 'ARIEL') {
            if(idx === 1) { // 치유의 파동
                this.emote = '💖'; this.emoteTimer = 1.0;
                spawnAOE(this.x, this.y, 250, '#86efac88', 0.5);
                let healAmount = 200 + this.atk * 2.0;
                let allies = entities.filter(e=>e.faction===this.faction && !e.isDead && dist(e, this) <= 250);
                allies.forEach(e => {
                    e.hp = Math.min(e.maxHp, e.hp + healAmount);
                    spawnParticles(e.x, e.y, '#4ade80', 10, 50, 0.6);
                    addText(e.x, e.y - e.radius - 20, '➕', '#4ade80', 20); // 십자가 아이콘
                });
                playSFX('heal');
            } else { // 빛의 인도
                this.emote = '✨'; this.emoteTimer = 1.0;
                spawnRing(this.x, this.y, '#fef08a', 300, 1.0);
                let allies = entities.filter(e=>e.faction===this.faction && !e.isDead && dist(e, this) <= 300);
                allies.forEach(e => {
                    let prevActive = e.arielBuffActive;
                    e.arielBuffTimer = 5.0;
                    if(!prevActive) {
                        e.arielBuffActive = true;
                        e.moveSpd *= 1.4;
                        e.aspd *= 1.4;
                        e.defense += 30;
                    }
                    spawnParticles(e.x, e.y, '#fef08a', 20, 80, 0.8);
                });
            }
        }

        if(k==='BERSERKER') {
            if(idx===1) { // 소용돌이
                spawnRing(this.x, this.y, '#ef4444', 150, 0.4);
                nearEnemies(this.x,this.y,150).forEach(e=>{
                    e.applyRawDamage(skillDmg*1.8, this, true, true); 
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.0)*0.7 : (1.0); e.airborneTimer=0.7;
                    let ea = Math.atan2(e.y - this.y, e.x - this.x);
                    e.vx+=Math.cos(ea)*600; e.vy+=Math.sin(ea)*600;
                });
                for(let i=0;i<8;i++) spawnSlash(this.x, this.y, (Math.PI/4)*i, '#dc2626', 150);
                spawnParticles(this.x, this.y, '#f87171', 30, 150, 0.6);
            } else { // 도약 강타
                if(t) { this.x=t.x; this.y=t.y; }
                spawnAOE(this.x, this.y, 175, '#b91c1c99', 0.5);
                spawnRing(this.x, this.y, '#7f1d1d', 175, 0.5);
                spawnSpecial(this.x, this.y, '#fca5a5', 'plus', 24, 150, 0.5);
                nearEnemies(this.x,this.y,175).forEach(e=>{e.applyRawDamage(skillDmg*2.0, this, true, true); e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (2.0)*0.7 : (2.0);});
                // 피분수 이펙트
                for(let i=0; i<3; i++) setTimeout(()=>spawnParticles(this.x, this.y, '#9f1239', 20, 125, 0.6), i*100);
            }
        } else if(k==='ARCHER') {
            if(idx===2) { // 폭풍 화살
                if(t) {
                    for(let i=0;i<8+sl*2;i++) {
                        setTimeout(()=>{
                            if(t.isDead) { let ne = nearEnemies(this.x,this.y,600); if(ne.length>0) t=ne[0]; }
                            if(t&&!t.isDead) {
                                projectiles.push(new Projectile(this.x,this.y-100,t,skillDmg*0.5,this,false));
                                spawnBeam(this.x, this.y-100, t.x, t.y, '#4ade80', 0.15);
                                spawnParticles(this.x, this.y-100, '#a7f3d0', 5, 100, 0.2);
                                playSFX('shoot');
                            }
                        }, i*60);
                    }
                }
            } else { // 회피 사격 (강화)
                let dx = this.vx || 0; let dy = this.vy || 0;
                let a = (dx !== 0 || dy !== 0) ? Math.atan2(dy, dx) : (this.facingDir > 0 ? 0 : Math.PI);
                this.x += Math.cos(a)*250; this.y += Math.sin(a)*250;
                this.invincibleTimer = 0.5;
                spawnParticles(this.x, this.y, '#6ee7b7', 30, 100, 0.5);
                spawnRing(this.x, this.y, '#10b981', 75, 0.3);
                this.atkSpdBuffTimer = 4; this.atkSpdBuffRate = 2.0;

            }
        } else if(k==='NECROMANCER') {
            if(idx===1) { // 해골 군단 소환
                for(let i=0;i<3+sl;i++) {
                    let m = new Monster(this.x+rand(-80,80), this.y+rand(-80,80), 'summon');
                    m.faction = this.faction;
                    m.maxHp = 1500 + sl*500; m.hp=m.maxHp; m.atk = this.atk*0.8; m.radius=15; m.moveSpd = 120;
                    entities.push(m);
                    spawnSpecial(m.x, m.y, '#1e293b', 'star', 12, 120, 0.5);
                    spawnRing(m.x, m.y, '#9333ea', 80, 0.3);
                }
                playSFX('skill_magic');
            } else { // 죽음의 늪
                let tg = t || this;
                nearEnemies(tg.x, tg.y, 250).forEach(e => {
                    e.applyRawDamage(skillDmg*1.5, this, true, true); e.slowTimer=4; e.slowRate=0.2;
                    spawnAOE(e.x, e.y, 40, '#7e22ce88', 1.0);
                    spawnBeam(tg.x, tg.y, e.x, e.y, '#a855f7', 0.5); // 영혼 흡수선
                });
                spawnAOE(tg.x, tg.y, 250, '#4c1d9566', 1.0);
                for(let i=0;i<10;i++) spawnParticles(tg.x+rand(-100,100), tg.y+rand(-100,100), '#c084fc', 5, 50, 1.0);
            }
        } else if(k==='MECHANIC') {
            if(idx===1) { // 자동 포탑
                let tw = new Building(this.x, this.y, this.faction, 'tower');
                tw.maxHp=2000+sl*800; tw.hp=tw.maxHp; tw.atk=this.atk*1.8; tw.range=400; tw.radius=18; tw.life=20;
                tw.update = function(dt) {
                    Building.prototype.update.call(this, dt);
                    this.life-=dt; if(this.life<=0) this.isDead=true;
                    if(Math.random()<0.1) spawnParticles(this.x, this.y-30, '#fcd34d', 2, 50, 0.3);
                };
                entities.push(tw);
                spawnRing(tw.x, tw.y, '#f59e0b', 200, 0.4);
                spawnSpecial(tw.x, tw.y, '#fbbf24', 'plus', 16, 150, 0.6);
            } else { // 광역 회복 및 보호막
                let allies = entities.filter(e=>e.faction===this.faction&&!e.isDead&&dist(this,e)<=250);
                spawnRing(this.x, this.y, '#10b981', 250, 0.6);
                allies.forEach(a => {
                    a.hp = Math.min(a.maxHp, a.hp + skillDmg*3);
                    a.defBuffTimer = 4.0; a.defBuffAmount = a.maxHp*0.2;
                    spawnSpecial(a.x, a.y, '#34d399', 'plus', 10, 60, 0.6);
                    spawnBeam(this.x, this.y, a.x, a.y, '#6ee7b7', 0.3);
                });
                playSFX('heal');
            }
        } else if(k==='VAMPIRE') {
            if(idx===1) { // 피의 축제 (흡혈)
                spawnRing(this.x, this.y, '#e11d48', 175, 0.6);
                let dmgTotal = 0;
                nearEnemies(this.x, this.y, 175).forEach(e => {
                    e.applyRawDamage(skillDmg*1.5, this, true, true); dmgTotal+=skillDmg*1.5;
                    for(let i=0; i<3; i++) setTimeout(()=>spawnBeam(e.x, e.y, this.x, this.y, '#fda4af', 0.2), i*100);
                    spawnParticles(e.x, e.y, '#be123c', 10, 75, 0.5);
                });
                this.hp = Math.min(this.maxHp, this.hp + dmgTotal*0.4);
            } else { // 핏빛 강림
                if(t) { this.x=t.x; this.y=t.y; }
                spawnAOE(this.x, this.y, 125, '#881337AA', 0.6);
                nearEnemies(this.x, this.y, 125).forEach(e => {
                    e.applyRawDamage(skillDmg*2.5, this, true, true);
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.5)*0.7 : (1.5);
                });
                spawnSpecial(this.x, this.y, '#fca5a5', 'star', 20, 125, 0.6);
                for(let i=0; i<5; i++) spawnSlash(this.x, this.y, Math.random()*Math.PI*2, '#f43f5e', 100);
            }
        } else if(k==='THOR') {
            if(idx===1) { // 뇌전 폭발 (Lightning Strike)
                let tg = t || this;
                spawnAOE(tg.x, tg.y, 150, '#3b82f6CC', 0.5);
                for(let i=0; i<5; i++) {
                    setTimeout(() => {
                        spawnBeam(tg.x+rand(-50,50), tg.y-800, tg.x+rand(-50,50), tg.y+rand(-25,25), '#fde047', 0.3);
                        spawnRing(tg.x, tg.y, '#fef08a', 150, 0.3);
                    }, i*100);
                }
                nearEnemies(tg.x, tg.y, 150).forEach(e=>{e.applyRawDamage(skillDmg*2.2, this, true, true); e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.5)*0.7 : (1.5);});
                spawnParticles(tg.x, tg.y, '#60a5fa', 40, 150, 0.7);
            } else { // 천둥신의 분노
                spawnRing(this.x, this.y, '#93c5fd', 225, 0.8);
                spawnAOE(this.x, this.y, 225, '#1e3a8a66', 0.8);
                for(let i=0; i<10; i++) spawnBeam(this.x, this.y, this.x+Math.cos(i*Math.PI/5)*225, this.y+Math.sin(i*Math.PI/5)*225, '#fde047', 0.5);
                nearEnemies(this.x, this.y, 225).forEach(e=>{
                    e.applyRawDamage(skillDmg*1.5, this, true, true); 
                    e.slowTimer=3; e.slowRate=0.1; 
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.2)*0.7 : (1.2); e.airborneTimer=1.0;
                    spawnParticles(e.x, e.y, '#fef08a', 10, 50, 0.5);
                });
            }
        } else if(k==='ICEBORN') {
            if(idx===1) { // 눈보라 (Blizzard)
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                spawnAOE(this.x + Math.cos(a)*75, this.y + Math.sin(a)*75, 100, '#38bdf8AA', 0.8);
                for(let i=0; i<15; i++) setTimeout(()=>spawnParticles(this.x + Math.cos(a)*75, this.y + Math.sin(a)*75, '#e0f2fe', 5, 100, 0.5), i*50);
                
                nearEnemies(this.x, this.y, 200).forEach(e => {
                    let ea = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = ea - a;
                    while(diff > Math.PI)  diff -= Math.PI*2;
                    while(diff < -Math.PI) diff += Math.PI*2;
                    if(Math.abs(diff) < Math.PI/2.5) {
                        e.applyRawDamage(skillDmg*1.5, this, true, true);
                        e.slowTimer = 3.0; e.slowRate = 0.3;
                        spawnParticles(e.x, e.y, '#7dd3fc', 12, 100, 0.5);
                    }
                });
            } else { // 빙결 폭발 (Frost Nova)
                let tg = t || this;
                spawnAOE(tg.x, tg.y, 125, '#bae6fdCC', 0.8);
                spawnRing(tg.x, tg.y, '#0284c7', 125, 0.8);
                for(let i=0; i<8; i++) spawnSlash(tg.x, tg.y, (Math.PI/4)*i, '#7dd3fc', 125);
                nearEnemies(tg.x, tg.y, 125).forEach(e => { e.applyRawDamage(skillDmg*1.8, this, true, true); e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (2.5)*0.7 : (2.5); e.isFrozen = true; });
                spawnSpecial(tg.x, tg.y, '#e0f2fe', 'star', 24, 125, 0.8);
            }
        } else if(k==='JOKER') {
            if(idx===1) { // 트릭 쇼
                for(let i=0; i<4; i++) {
                    setTimeout(() => {
                        let eff = Math.random();
                        if(eff < 0.33) {
                            nearEnemies(this.x, this.y, 200).forEach(e => {
                                e.applyRawDamage(skillDmg*1.5, this, true, true);
                                spawnParticles(e.x, e.y, '#ef4444', 5, 50, 0.4);
                            });
                            spawnRing(this.x, this.y, '#ef4444', 200, 0.5);

                        } else if(eff < 0.66) {
                            this.defBuffTimer = 4.0; this.defBuffAmount = this.maxHp * 0.2;
                            spawnRing(this.x, this.y, '#3b82f6', 100, 0.5);

                        } else {
                            this.atkSpdBuffTimer = 4.0; this.atkSpdBuffRate = 1.8;
                            spawnRing(this.x, this.y, '#10b981', 100, 0.5);

                        }
                    }, i*250);
                }
            } else { // 잭팟 (광역 카드 비)
                let bet = Math.max(100, Math.min(1500, Math.floor(this.gold * 0.25)));
                this.gold -= bet;
                if(Math.random() < 0.6) { // 60% 확률 당첨!
                    window.addGold(this, bet * 2);

                    spawnRing(this.x, this.y, '#fbbf24', 250, 0.8);
                    spawnAOE(this.x, this.y, 250, '#fcd34d66', 0.8);
                    for(let i=0; i<20; i++) setTimeout(()=>spawnParticles(this.x+rand(-150,150), this.y+rand(-150,150), '#ffffff', 5, 75, 0.5), i*50);
                    nearEnemies(this.x, this.y, 250).forEach(e => {
                        e.applyRawDamage(skillDmg * 3.5 + bet * 2.5, this, true, true);
                        e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.5)*0.7 : (1.5); e.airborneTimer = 0.5;
                    });
                } else {

                    spawnRing(this.x, this.y, '#6b7280', 150, 0.4);
                    nearEnemies(this.x, this.y, 150).forEach(e => {
                        e.applyRawDamage(skillDmg * 1.0, this, true, true);
                    });
                }
                playSFX('skill_burst');
            }
        } else if(k==='DARKPRIEST') {
            if(idx===1) { // 공허의 착취
                let allies = entities.filter(e => e.faction === this.faction && !e.isDead && !e.isBuilding && e !== this);
                if(t) {
                    let boostedDmg = skillDmg * 3.0;
                    if(allies.length > 0) {
                        let sacrifice = allies.sort((a,b) => dist(this,a)-dist(this,b))[0];
                        let drain = sacrifice.maxHp * 0.2;
                        sacrifice.hp = Math.max(1, sacrifice.hp - drain);
                        for(let i=0; i<5; i++) setTimeout(()=>spawnBeam(sacrifice.x, sacrifice.y, this.x, this.y, '#9333ea', 0.2), i*100);

                        boostedDmg *= 1.8;
                    }
                    
                    projectiles.push(new Projectile(this.x, this.y, t, boostedDmg, this, false));
                    spawnSpecial(this.x, this.y, '#4c1d95', 'star', 16, 200, 0.5);

                } else {

                }
            } else { // 파멸의 낙인
                if(t) {
                    t.curseTimer = 15.0; // 저주 15초
                    spawnAOE(t.x, t.y, 75, '#4c1d9599', 1.5);
                    spawnRing(t.x, t.y, '#a855f7', 75, 1.0);

                    for(let i=0; i<8; i++) spawnSlash(t.x, t.y, (Math.PI/4)*i, '#581c87', 75);
                }
            }
        } else if(k==='ARCHON') {
            if(idx===1) { // 사이어닉 스톰 (하얀색 번개비)
                let tg = t || this;
                spawnAOE(tg.x, tg.y, 200, '#ffffff66', 0.8);
                spawnRing(tg.x, tg.y, '#eff6ff', 200, 0.8);
                for(let i=0; i<15; i++) {
                    setTimeout(() => {
                        let bx = tg.x + rand(-180, 180);
                        let by = tg.y + rand(-180, 180);
                        spawnBeam(bx+rand(-20,20), by-800, bx, by, '#ffffff', 0.25);
                        spawnParticles(bx, by, '#e0f2fe', 8, 80, 0.4);
                        if(Math.random()<0.3) playSFX('shoot');
                    }, i * 150);
                }
                nearEnemies(tg.x, tg.y, 200).forEach(e => {
                    e.applyRawDamage(skillDmg * 2.5, this, true, true);
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (0.5)*0.7 : (0.5);
                });

            } else { // 마엘스톰 (갈색 구체 완전 마비)
                let tg = t || this;
                let duration = 3.0;
                spawnAOE(tg.x, tg.y, 180, '#78350fAA', duration); // 짙은 갈색 구체 (오래 남음)
                spawnRing(tg.x, tg.y, '#92400e', 180, duration);
                
                // 마엘스톰 내부의 적 완전 마비
                nearEnemies(tg.x, tg.y, 180).forEach(e => {
                    e.applyRawDamage(skillDmg * 1.5, this, true, true);
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (duration)*0.7 : (duration); // 완전 마비
                    spawnParticles(e.x, e.y, '#b45309', 20, 100, duration);
                });

                
                // 소용돌이 이펙트 추가 생성
                for(let i=0; i<8; i++) {
                    setTimeout(() => spawnSlash(tg.x, tg.y, Math.random()*Math.PI*2, '#78350f', 180), i*300);
                }
            }
        } else if(k==='BARBARIAN') {
            if(idx===1) { // 점프샷 (지형 균열 + 슬로우)
                let tg = t || {x: this.x + this.facingDir*200, y: this.y};
                this.x = tg.x; this.y = tg.y; // 점프 이동
                spawnAOE(this.x, this.y, 200, '#00000088', 0.6);
                spawnRing(this.x, this.y, '#ea580c', 200, 0.6);

                
                // 거대한 지형 균열(Slash) 이펙트를 여러 겹으로
                for(let i=0; i<12; i++) spawnSlash(this.x, this.y, (Math.PI/6)*i, '#451a03', 250);
                for(let i=0; i<5; i++) spawnParticles(this.x+rand(-50,50), this.y+rand(-50,50), '#78350f', 20, 150, 0.6);
                
                nearEnemies(this.x, this.y, 200).forEach(e => {
                    e.applyRawDamage(skillDmg * 2.0, this, true, true);
                    e.slowTimer = 4.0; e.slowRate = 0.5; // 강한 슬로우
                });
                playSFX('skill_burst');
            } else { // 휠윈드 (회오리 돌진 + 에어본)
                this.whirlwindTimer = 3.0; // 3초간 회전
                this.whirlwindDmg = skillDmg * 0.8;
                
                // 적 진영으로 돌진 (탑/바텀/가장 가까운 넥서스 등)
                let tg = t; 
                if(!tg) tg = entities.filter(e=>e.type==='nexus' && e.faction!==this.faction)[0];
                if(tg) {
                    let a = Math.atan2(tg.y - this.y, tg.x - this.x);
                    this.vx = Math.cos(a)*600; this.vy = Math.sin(a)*600; // 돌진!
                }

                spawnRing(this.x, this.y, '#fdba74', 150, 3.0);
                playSFX('skill_burst');
            }
        } else {
            // 미구현 영웅이나 예비용 기본 스킬
            if(t) projectiles.push(new Projectile(this.x, this.y, t, skillDmg, this, false));
        }
    }

    updatePassives(dt) {
        // 화염의 고리
        let frLv = this.passiveSkills['fireRing'] || 0;
        if(frLv > 0) {
            this.passiveTimers.fireRing += dt;
            if(this.passiveTimers.fireRing >= 0.65) {
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
                    setTimeout(()=>{ if(!t.isDead){ t.applyRawDamage(this.atk*1.2,this); spawnAOE(t.x,t.y,42,'#f97316aa',0.5); spawnParticles(t.x,t.y,'#f97316',15,150,0.5); addText(t.x,t.y-30,'\u2604\uFE0F','#f97316',20); } }, i*300);
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
        }

        // 영혼 수확 버프
        if(this.soulBuffTimer>0){this.soulBuffTimer-=dt; if(this.soulBuffTimer<=0) this.soulAtkBonus=0;}

        // 신규 패시브 지속 효과
        let pVamp = this.passiveSkills['vampireAura'] || 0;
        if(pVamp > 0) {
            this._vampireAuraTimer = (this._vampireAuraTimer || 0) + dt;
            if(this._vampireAuraTimer >= 0.3) {
                this._vampireAuraTimer = 0;
                let tickDrain = pVamp * 5 * 0.3;
                let totalHeal = 0;
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 150) {
                        let dealt = e.applyRawDamage(tickDrain, this, true, true);
                        totalHeal += dealt;
                        spawnParticles(e.x, e.y, '#f43f5e', 2, 40, 0.25);
                    }
                });
                if(totalHeal > 0) {
                    this.hp = Math.min(this.maxHp, this.hp + totalHeal * 0.5);
                }
            }
        }
        let pBomb = this.passiveSkills['bombTrail'] || 0;
        if(pBomb > 0 && Math.hypot(this.vx, this.vy) > 10) {
            this.passiveTimers.bombTrail = (this.passiveTimers.bombTrail === undefined) ? 1.5 : this.passiveTimers.bombTrail - dt;
            if(this.passiveTimers.bombTrail <= 0) {
                spawnAOE(this.x, this.y, 60, '#ef444455', 1.0);
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 60) e.applyRawDamage(pBomb * 10, this, true, true);
                });
                this.passiveTimers.bombTrail = 1.5;
            }
        }
        let pStorm = this.passiveSkills['stormWalker'] || 0;
        if(pStorm > 0) {
            this.passiveTimers.stormWalker = (this.passiveTimers.stormWalker === undefined) ? 2.0 : this.passiveTimers.stormWalker - dt;
            if(this.passiveTimers.stormWalker <= 0) {
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 200) {
                        e.applyRawDamage(pStorm * 15, this, true, true);
                        spawnParticles(e.x, e.y, '#fef08a', 5, 80, 0.4);
                    }
                });
                this.passiveTimers.stormWalker = 2.0;
            }
        }
        let pHeal = this.passiveSkills['healing_spring'] || 0;
        if(pHeal > 0) {
            this.passiveTimers.healingSpring = (this.passiveTimers.healingSpring === undefined) ? 4.0 : this.passiveTimers.healingSpring - dt;
            if(this.passiveTimers.healingSpring <= 0) {
                let allies = entities.filter(e => e.type === 'hero' && e.faction === this.faction && !e.isDead && dist(this, e) <= 600);
                let weakestAlly = allies.sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
                if (weakestAlly && weakestAlly.hp < weakestAlly.maxHp) {
                    let healAmt = 50 + pHeal * 50;
                    weakestAlly.hp = Math.min(weakestAlly.maxHp, weakestAlly.hp + healAmt);
                    spawnParticles(weakestAlly.x, weakestAlly.y, '#34d399', 8, 100, 0.5);
                    addText(weakestAlly.x, weakestAlly.y-20, '+'+healAmt, '#34d399', 16);
                }
                this.passiveTimers.healingSpring = 4.0;
            }
        }
        
        if(this.inventory.some(i => i.id === 'oracle_glory')) {
            this._oracleAuraTimer = (this._oracleAuraTimer || 0) - dt;
            if(this._oracleAuraTimer <= 0) {
                this._oracleAuraTimer = 1.0;
                entities.forEach(e => {
                    if(e.type === 'hero' && e.faction === this.faction && !e.isDead && e !== this && dist(this, e) <= 600) {
                        e._oracleDefBuff = 1.5;
                        spawnParticles(e.x, e.y, '#fbbf24', 2, 30, 0.3);
                    }
                });
            }
        }
        
        if(this.fateMeteorTimer > 0) {
            this.fateMeteorTimer -= dt;
            this.passiveTimers.fateMeteorTick = (this.passiveTimers.fateMeteorTick || 0) - dt;
            if(this.passiveTimers.fateMeteorTick <= 0) {
                let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 500);
                let target = targets[Math.floor(Math.random() * targets.length)];
                let tx = target ? target.x : this.x + (Math.random()-0.5)*600;
                let ty = target ? target.y : this.y + (Math.random()-0.5)*600;
                if(window.spawnMeteor) spawnMeteor(tx, ty, this.atk * 3, this);
                this.passiveTimers.fateMeteorTick = 0.5;
            }
        }
    }
    triggerWarAnthem() {
        if(this.passiveSkills['war_anthem'] > 0) {
            let allies = entities.filter(e => e.type==='hero' && e.faction===this.faction && !e.isDead && dist(this, e) <= 600);
            allies.forEach(a => {
                a.warAnthemTimer = 5.0;
            });
            spawnAOE(this.x, this.y, 600, '#fef08a66', 0.3);

            playSFX('heal');
        }
    }
    triggerOnHitPassives(target) {
        if(!target||target.isDead) return;
        // 낙뢰
        let ltLv=this.passiveSkills['lightning']||0;
        if(ltLv>0 && Math.random()<0.08+(ltLv-1)*0.02) {
            let targets=entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<=400).sort(()=>Math.random()-0.5).slice(0,ltLv);
            targets.forEach((t,idx)=>setTimeout(()=>{if(!t.isDead){t.applyRawDamage(this.atk*0.8,this);spawnLightningEffect(t.x,t.y,this===player);}},idx*100));
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
            spawnParticles(target.x,target.y,'#93c5fd',10,80,0.5);
        }
    }
    triggerOnKillPassives(target) {
        if(this.inventory.some(i => i.id === 'avalon_sword')) {
            this.invincibleTimer = 3.0;
            spawnParticles(this.x, this.y, '#fcd34d', 20, 150, 3.0);

        }
        let shLv=this.passiveSkills['soulHarvest']||0;
        if(shLv>0) {
            this.hp=Math.min(this.maxHp,this.hp+this.maxHp*(0.05+(shLv-1)*0.03));
            this.soulAtkBonus=this.baseAtk*(0.08+(shLv-1)*0.06); this.soulBuffTimer=5;
            spawnParticles(this.x,this.y,'#a78bfa',15,100,0.5); playSFX('heal');
        }
        let pBlood = this.passiveSkills['bloodFury'] || 0;
        if(pBlood > 0) {
            this.atkSpdBuffTimer = 3.0 + (pBlood-1);
            this.atkSpdBuffRate = 1.5;
            spawnParticles(this.x, this.y, '#dc2626', 10, 100, 0.4);
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
            let lvText = curLv > 0 ? 'Lv.' + curLv + ' → Lv.' + (curLv+1) : 'NEW! Lv.1';
            let lvClass = curLv > 0 ? 'text-emerald-400' : 'text-amber-400';
            
            let evoMatches = EVOLUTION_ITEMS.filter(evo => evo.reqPassive === skill.id);
            let evoText = '';
            if (evoMatches.length > 0) {
                let itemsHtml = evoMatches.map(evo => {
                    let reqItem = BASE_ITEMS.find(i => i.id === evo.reqItem);
                    let hasItem = this.inventory.some(i => i.id === evo.reqItem);
                    let status = hasItem ? '<span class="text-emerald-400 font-bold">(보유)</span>' : '<span class="text-slate-400">(미보유)</span>';
                    return '<div class="text-[10px] text-slate-300 flex items-center justify-center gap-1">[' + evo.name + ' 재료] ' + (reqItem ? reqItem.icon + ' ' + reqItem.name : '?') + ' ' + status + '</div>';
                }).join('');
                evoText = '<div class="mt-2 pt-2 border-t border-slate-700 w-full">' + itemsHtml + '</div>';
            }

            card.innerHTML = '<div class="text-4xl mb-2">' + skill.icon + '</div>' +
                '<div class="text-sm font-bold text-white mb-1">' + skill.name + '</div>' +
                '<div class="text-[10px] text-slate-300 mb-2 leading-tight">' + skill.desc + '</div>' +
                '<div class="text-[10px] font-bold ' + lvClass + '">' + lvText + '</div>' +
                evoText;
            card.setAttribute('data-skill-id', skill.id);
            card.onclick = function(e) { e.stopPropagation(); player.selectPassiveSkill(skill.id); };
            container.appendChild(card);
        }
    }
    selectPassiveSkill(skillId) {
        this.passiveSkills[skillId] = (this.passiveSkills[skillId]||0) + 1;
        this.applyStats(); this.checkEvolution();
        
        let sk = PASSIVE_SKILLS.find(s=>s.id===skillId);
        addText(this.x,this.y-60, sk.icon+' '+sk.name+' Lv.'+this.passiveSkills[skillId]+'!', '#fcd34d', 18);
        playSFX('heal');

        if (this.pendingSkillLevels > 1) {
            this.pendingSkillLevels--;
            this.showSkillSelection();
        } else {
            this.pendingSkillLevels = 0;
            document.getElementById('skillSelectionOverlay').classList.add('hidden');
            this.pendingLevelUp = false;
            GS.paused = false;
        }
    }
    aiSelectSkill() {
        let available = PASSIVE_SKILLS.filter(s=>(this.passiveSkills[s.id]||0)<s.maxLv);
        if(available.length===0) return;
        let pick = available[Math.floor(Math.random()*available.length)];
        this.passiveSkills[pick.id] = (this.passiveSkills[pick.id]||0) + 1;
        this.applyStats(); this.checkEvolution();
    }
    checkEvolution() {
        EVOLUTION_ITEMS.forEach(evo => {
            if(this.inventory.some(i => i.id === evo.id)) return; // 이미 진화함
            let reqItemIdx = this.inventory.findIndex(i => i.id === evo.reqItem && i.upgrade >= 7);
            if(reqItemIdx !== -1) {
                let reqPassive = PASSIVE_SKILLS.find(p => p.id === evo.reqPassive);
                if(reqPassive && (this.passiveSkills[evo.reqPassive] || 0) >= reqPassive.maxLv) {
                    this.inventory[reqItemIdx] = { id: evo.id, upgrade: 1, stat: evo.stat, val: evo.val };
                    this.applyStats();
                    if(this.isPlayer) {
                        if(window.showEvolutionPopup) window.showEvolutionPopup(evo.name, evo.icon, evo.desc);
                    } else {
                        spawnParticles(this.x, this.y, '#fcd34d', 30, 200, 1.0);
                        let heroName = HERO_TMPL[this.heroKey].name;
                        showBanner(`${heroName} 진화! [${evo.name}]`, evo.icon, this.faction===player?.faction);
                    }
                    playSFX('skill_burst');
                }
            }
        });
    }
    draw(ctx){
        if(this.isDead) return;
        let t=HERO_TMPL[this.heroKey];
        if(this.stunTimer>0){ ctx.strokeStyle='#fbbf24'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(this.x, this.y-this.radius, this.radius*1.4, 0, Math.PI*2); ctx.stroke(); }
        
        t.draw(ctx, this.x, this.y, this.radius, this.facingDir, this.faction, this.attackAnimTimer, this);
        
        if(this.heroKey === 'grrr' && this.isGiant) {
            let pulse = 0.5 + Math.sin(performance.now()/200) * 0.35;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fcd34d';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🦍 ' + (this.grrrGiantTimer||0).toFixed(1) + 's', this.x, this.y - this.radius - 20);
        }
        
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y-this.radius*0.8, this.radius*1.2, this.radius*1.5, 0, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius+4, 0, Math.PI*2);
        ctx.strokeStyle=this.isPlayer?'#fcd34d':(this.faction==='BLUE'?'#3b82f6':'#ef4444'); ctx.lineWidth=this.isPlayer?3:2; ctx.stroke();
        
        let bw=50, bh=6, bx=this.x-bw/2, by=this.y-this.radius-10;
        ctx.fillStyle='#1e293b'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle=this.hp/this.maxHp>0.5?'#22c55e':'#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
        ctx.fillStyle='#fbbf24'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.fillText('Lv'+this.level, this.x, by-2);
        if(this.isPlayer) { 
            ctx.fillText('▶ YOU', this.x, by-15); 
        } else if (player && this.faction !== player.faction) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(this.x, by-15);
            ctx.lineTo(this.x - 6, by-22);
            ctx.lineTo(this.x + 6, by-22);
            ctx.fill();
        }
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
        if(btype==='nexus'){ this.maxHp=15000; this.atk=0; this.range=0; this.radius=50; }
        else if(btype==='nexus_turret') { this.maxHp=18000; this.atk=600; this.defense=50; this.aspd=1.5; this.range=350; this.radius=22; }
        else { this.maxHp=13500; this.atk=420; this.defense=50; this.aspd=1.2; this.range=360; this.radius=28; } // 타워 버프
        this.hp=this.maxHp;
    }
    update(dt){
        if(this.isDead) return;
        super.update(dt);
        if(this.atk > 0 && this.attackTimer<=0){
            let target=null, minD=this.range;
            for(let ptype of ['minion','hero','jungle']){
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead){
                    if(e.type==='nexus' && entities.some(t=>t.type==='nexus_turret' && t.faction===e.faction && !t.isDead)) return;
                    let d=dist(this,e);if(d<=this.range&&d<minD&&e.type===ptype){minD=d;target=e;}
                }});
                if(target) break;
            }
            if(target){
                this.attackTimer=1/this.aspd;
                let dmg = this.atk;
                if(target.type==='hero' && GS.time < 180) dmg = Math.floor(dmg * 0.3); // 초반 3분간 영웅에게 70% 감소
                if(target.type === 'jungle') dmg = Math.floor(dmg * 0.4); 
                // 쌍발 투사체 (9번 요구사항)
                projectiles.push(new Projectile(this.x,this.y-this.radius,target,dmg,this,false,'tower'));
                if(this.type === 'nexus_turret') {
                    setTimeout(() => { if(!this.isDead && !target.isDead) projectiles.push(new Projectile(this.x,this.y-this.radius,target,dmg,this,false,'tower')); }, 150);
                }
                if(this.faction === player?.faction) playSFX('tower');
            }
        }
    }
    onDeath(attacker){
        if(this.type==='nexus'){
            GS.status='GAMEOVER'; document.getElementById('gameOverScreen').classList.remove('hidden');
            let win = player ? (this.faction !== player.faction) : (this.faction !== 'BLUE');
            document.getElementById('txtGameResult').textContent=win?'🏆 VICTORY':'💀 DEFEAT';
            document.getElementById('txtGameResult').style.color=win?'#34d399':'#f87171';
            buildScoreboard();
        } else if (this.type === 'tower' || this.type === 'nexus_turret') {
            let oppFaction = this.faction === 'BLUE' ? 'RED' : 'BLUE';
            entities.forEach(e => {
                if(e.type === 'hero' && e.faction === oppFaction) {
                    window.addGold(e, 300);
                    if(e === player) addText(e.x, e.y-40, '타워 파괴 +300G!', '#fbbf24', 18);
                }
            });
            if(attacker && attacker.type === 'hero') {
                window.addGold(attacker, 200);
                addText(attacker.x, attacker.y-60, '최종타 +200G!', '#f59e0b', 16);
            }
            showBanner('아군이 포탑을 파괴했습니다! (+300G)', '🏰', player ? (this.faction !== player.faction) : (this.faction !== 'BLUE'));
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
        
        let drawHp = isNaN(this.hp) ? 100 : this.hp;
        let drawMaxHp = (isNaN(this.maxHp) || this.maxHp <= 0) ? 100 : this.maxHp;
        let hpRatio = Math.max(0, Math.min(1, drawHp / drawMaxHp));
        let bw=this.radius*2, bh=8, bx=this.x-bw/2, by=this.y-this.radius*2.5;
        ctx.fillStyle='#1e293b'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle='#22c55e'; ctx.fillRect(bx,by,bw*hpRatio,bh);
    }
}

// ============ 에픽 드래곤 보스 ============
class EpicDragon extends Entity {
    constructor(x, y, dtype, scale) {
        super(x, y, 'NEUTRAL', 'jungle');
        this.mtype = 'boss_epic_dragon';
        this.dtype = dtype; // 'red' or 'blue'
        this.radius = 60; // 5배 크기 (기본 영웅 12)
        this.maxHp = 45000 * scale; this.hp = this.maxHp;
        this.atk = 450 * scale;
        this.defense = 75 * scale;
        this.moveSpd = 80;
        this.range = 150;
        
        this.flightTimer = 0;
        this.breathTimer = 0;
        this.roarTimer = 5.0; // 5초마다 넉백
        this.phase = 1; // 1: 지상, 2: 비행 폭격 (hp < 50%)
        this.animTimer = 0;
    }
    update(dt) {
        if(this.isDead) return;
        super.update(dt);
        this.animTimer += dt;
        
        // 체력 50% 이하 비행 기믹 시작
        if(this.hp < this.maxHp * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.flightTimer = 8.0; // 8초간 무적 폭격
            showBanner('드래곤이 공중으로 날아올랐습니다!', '🐲', true);
            spawnRing(this.x, this.y, '#ef4444', 600, 1.0);
        }
        
        if(this.flightTimer > 0) {
            this.flightTimer -= dt;
            this.invincibleTimer = 0.5; // 무적
            
            // 공중 폭격 (메테오/얼음 폭풍)
            if(Math.random() < 0.1) {
                let tx = this.x + rand(-500, 500);
                let ty = this.y + rand(-500, 500);
                spawnAOE(tx, ty, 150, this.dtype==='red'?'#ef4444aa':'#38bdf8aa', 1.5);
                setTimeout(() => {
                    if(this.isDead) return;
                    spawnSpecial(tx, ty, this.dtype==='red'?'#fca5a5':'#e0f2fe', 'star', 20, 150, 0.5);
                    entities.filter(e=>!e.isDead && e.type==='hero' && dist({x:tx,y:ty},e)<=150).forEach(e => {
                        e.applyRawDamage(this.atk * 15.0, this, true, true);
                        e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.0)*0.7 : (1.0);
                    });
                }, 1000);
            }
            return;
        }

        // 지상 패턴
        let targets = entities.filter(e => e.type === 'hero' && !e.isDead && dist(this, e) <= 600);
        let target = targets.sort((a,b) => dist(this,a) - dist(this,b))[0];
        
        this.roarTimer -= dt;
        if(this.roarTimer <= 0 && target) {
            this.roarTimer = 12.0; // 12초 쿨타임
            spawnRing(this.x, this.y, '#f59e0b', 500, 1.0);
            playSFX('skill_burst');
            targets.forEach(e => {
                if(dist(this, e) <= 500) {
                    e.applyRawDamage(this.atk * 10.0, this, true, true);
                    e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.5)*0.7 : (1.5);
                    let a = Math.atan2(e.y - this.y, e.x - this.x);
                    e.vx += Math.cos(a) * 800; e.vy += Math.sin(a) * 800; // 넉백
                }
            });
            return;
        }
        
        if(this.breathTimer > 0) {
            this.breathTimer -= dt;
            this.vx = 0; this.vy = 0;
            if(target) {
                let a = Math.atan2(target.y - this.y, target.x - this.x);
                let bx = this.x + Math.cos(a) * 100;
                let by = this.y + Math.sin(a) * 100;
                spawnParticles(bx, by, this.dtype==='red'?'#ef4444':'#38bdf8', 10, 250, 0.5);
                if(Math.random()<0.2) {
                    targets.forEach(e => {
                        e.applyRawDamage(this.atk * 5.0, this, true, true);
                        spawnParticles(e.x, e.y, this.dtype==='red'?'#ef4444':'#38bdf8', 5, 50, 0.3);
                    });
                }
            }
            return;
        }

        if(target) {
            if(dist(this, target) > this.range) {
                let a = Math.atan2(target.y - this.y, target.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd; this.vy = Math.sin(a) * this.moveSpd;
                this.facingDir = Math.cos(a) >= 0 ? 1 : -1;
            } else {
                this.vx = 0; this.vy = 0;
                if(this.attackTimer <= 0) {
                    this.attackTimer = 4.0; // 평타 대신 브레스
                    this.breathTimer = 2.0;
                    playSFX('shoot');
                }
            }
        }
    }
    draw(ctx) {
        if(this.isDead) return;
        
        // 아우라 효과
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 15, 0, Math.PI*2);
        if(this.ctype==='dragon') ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        else if(this.ctype==='golem') ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        else ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        if(this.facingDir < 0) ctx.scale(-1, 1);
        
        let isFlying = this.flightTimer > 0;
        let scale = isFlying ? 1.5 : 1.2; // 덩치 20% 더 크게
        ctx.scale(scale, scale);
        
        let cBody = this.dtype === 'red' ? '#e11d48' : '#0ea5e9';
        let cDark = this.dtype === 'red' ? '#be123c' : '#0284c7';
        let cWing = this.dtype === 'red' ? '#fb7185' : '#38bdf8';
        let cEye  = '#111827';
        
        let flyY = isFlying ? Math.sin(this.animTimer * 5) * 20 - 50 : Math.sin(this.animTimer * 2) * 5;
        ctx.translate(0, flyY);
        
        let walkPhase = isFlying ? 0 : Math.sin(this.animTimer * 6);
        let wingPhase = isFlying ? Math.sin(this.animTimer * 12) : Math.sin(this.animTimer * 2) * 0.2;

        // 뒷다리 (Dark)
        ctx.fillStyle = cDark;
        ctx.fillRect(-20 + walkPhase*10, 10, 15, 30);
        ctx.fillRect(-25 + walkPhase*10, 30, 25, 10);
        
        // 꼬리 (Body)
        ctx.fillStyle = cBody;
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-90, 0); ctx.lineTo(-30, 20); ctx.fill();
        // 꼬리 가시 (Dark)
        ctx.fillStyle = cDark;
        ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-60, -15); ctx.lineTo(-70, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-80, -10); ctx.lineTo(-90, 0); ctx.fill();

        // 날개 뒤 (Dark)
        ctx.fillStyle = cDark;
        ctx.save(); ctx.translate(-10, -10); ctx.rotate(-wingPhase*0.5);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-40,-60); ctx.lineTo(20,-40); ctx.fill();
        ctx.restore();

        // 몸통 (Body)
        ctx.fillStyle = cBody;
        ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(30, -10); ctx.lineTo(30, 25); ctx.lineTo(-40, 25); ctx.fill();

        // 앞다리 (Body)
        ctx.fillStyle = cBody;
        ctx.fillRect(10 - walkPhase*10, 10, 15, 30);
        ctx.fillRect(5 - walkPhase*10, 30, 25, 10);
        ctx.fillStyle = cDark;
        ctx.beginPath(); ctx.arc(17.5 - walkPhase*10, 25, 6, 0, Math.PI*2); ctx.fill();

        // 목 (Body)
        let headPush = this.breathTimer>0 ? 15 : 0;
        ctx.beginPath(); ctx.moveTo(20, -10); ctx.lineTo(20+headPush, -40); ctx.lineTo(40+headPush, -40); ctx.lineTo(30, -10); ctx.fill();

        // 머리 (Body)
        ctx.fillRect(20+headPush, -60, 45, 20); 
        ctx.beginPath(); ctx.moveTo(65+headPush, -60); ctx.lineTo(85+headPush, -50); ctx.lineTo(65+headPush, -40); ctx.fill();
        
        // 뿔/귀 (Dark)
        ctx.fillStyle = cDark;
        ctx.beginPath(); ctx.moveTo(20+headPush, -60); ctx.lineTo(10+headPush, -80); ctx.lineTo(35+headPush, -60); ctx.fill();

        // 눈 (Eye)
        ctx.fillStyle = cEye;
        ctx.beginPath(); ctx.arc(50+headPush, -50, 4, 0, Math.PI*2); ctx.fill();

        // 앞날개 (Wing)
        ctx.fillStyle = cWing;
        ctx.save(); ctx.translate(0, -10); ctx.rotate(wingPhase);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-60,-80); ctx.lineTo(40,-50); ctx.fill();
        ctx.fillStyle = cBody;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-50,-70); ctx.lineTo(-30,-30); ctx.fill(); 
        ctx.restore();
        
        ctx.restore();
        
        // 체력바
        if(!isFlying) {
            let bw=80, bh=8, bx=this.x-bw/2, by=this.y-this.radius-20;
            ctx.fillStyle='#1e293b'; ctx.fillRect(bx-1,by-1,bw+2,bh+2); ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh);
            ctx.fillStyle='#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
            ctx.fillStyle='#fbbf24'; ctx.font='bold 12px monospace'; ctx.textAlign='center'; 
            ctx.fillText('에픽 드래곤', this.x, by-5);
        }
    }
    onDeath(attacker) {
        showBanner(this.dtype==='red'?'🔴 화염 드래곤 처치!':'🔵 얼음 드래곤 처치!', '🐲', true);
        
        // 2개의 스탯 랜덤 결정
        let stats = ['atk', 'def', 'moveSpd', 'aspd', 'maxHp'];
        let picked = [];
        while(picked.length < 2) {
            let s = stats[Math.floor(Math.random() * stats.length)];
            if(!picked.includes(s)) picked.push(s);
        }
        
        let statNames = picked.map(s => {
            if(s==='atk') return '공격력';
            if(s==='def') return '방어력';
            if(s==='moveSpd') return '이동속도';
            if(s==='aspd') return '공격속도';
            if(s==='maxHp') return '최대체력';
        });
        
        // 팀에게 버프 지급
        let killerFaction = attacker && attacker.faction ? attacker.faction : 'BLUE';
        
        let buffMsg = `${killerFaction==='BLUE'?'블루':'레드'}팀이 [드래곤의 가호] 획득! (${statNames.join(', ')})`;
        showBanner(buffMsg, '🔥', true);
        
        entities.forEach(e => {
            if(e.type === 'hero' && e.faction === killerFaction) {
                e.dragonBuffTimer = 300.0; // 5분
                e.dragonBuffStats = picked;
                e.applyStats();
                spawnRing(e.x, e.y, '#fbbf24', 200, 2.0);
            }
        });
        
        // 거대 폭발
        spawnParticles(this.x, this.y, '#f59e0b', 100, 600, 2.0);
        playSFX('skill_burst');
    }
}

// ============ 미니언 ============
class Minion extends Entity {
    constructor(x,y,faction,lane){
        super(x,y,faction,'minion'); this.lane=lane;
        // 미니언 성장 스케일 강화 (속도 완화, 최대 3.5배 캡 적용)
        let scale=Math.min(1+GS.time/400, 3.5); this.maxHp=Math.floor(400*scale); this.hp=this.maxHp; this.atk=Math.floor(15*scale); this.aspd=1.0; this.moveSpd=120; this.range=30; this.radius=10;
        
        let bTop=[{x:300,y:2700},{x:300,y:300},{x:2700,y:300}], bMid=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}], bBot=[{x:300,y:2700},{x:300,y:2400},{x:2400,y:2400},{x:2400,y:300},{x:2700,y:300}];
        let rTop=[{x:2700,y:300},{x:300,y:300},{x:300,y:2700}], rMid=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}], rBot=[{x:2700,y:300},{x:2400,y:300},{x:2400,y:2400},{x:300,y:2400},{x:300,y:2700}];
        this.waypoints = faction==='BLUE' ? (lane==='top'?bTop:lane==='mid'?bMid:bBot) : (lane==='top'?rTop:lane==='mid'?rMid:rBot);
        this.wpIdx=1; this.animPhase=Math.random()*Math.PI*2;
    }
    update(dt){
        if(this.isDead) return; super.update(dt);
        let closestBuilding = null, closestMinion = null, closestHero = null;
        let dB = 120, dM = 100, dH = 120;
        entities.forEach(e => {
            if(e.faction === this.faction || e.isDead) return;
            const d = dist(this, e);
            if((e.type==='tower' || e.type==='nexus_turret' || e.type==='nexus') && d < dB) {
                dB = d; closestBuilding = e;
            } else if(e.type === 'minion' && d < dM) {
                dM = d; closestMinion = e;
            } else if(e.type === 'hero' && d < dH) {
                dH = d; closestHero = e;
            }
        });
        let target = closestBuilding || closestMinion || closestHero;
        if(target){
            if(dist(this, target)>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
            else { 
                this.vx=0; this.vy=0; 
                if(this.attackTimer<=0){ 
                    this.attackTimer=1/this.aspd; 
                    if(this.type === 'creature') {
                        // 광역 평타
                        let aoeR = 120;
                        spawnSlash(this.x,this.y-this.radius,Math.atan2(target.y-this.y,target.x-this.x),'#f59e0b',40);
                        entities.forEach(e => {
                            if(e.faction !== this.faction && !e.isDead && dist(target, e) <= aoeR) {
                                e.applyRawDamage(this.atk, this, true, false);
                            }
                        });
                    } else {
                        target.applyRawDamage(this.atk,this, true, false); 
                        spawnSlash(this.x,this.y-this.radius,Math.atan2(target.y-this.y,target.x-this.x),'#64748b',20); 
                    }
                } 
            }
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
        let ly = Math.sin(this.animPhase)*this.radius*0.3;
        
        if(this.isSummon) {
            ctx.fillStyle='#111827';
            ctx.fillRect(this.x-this.radius*0.6, this.y-this.radius+ly, this.radius*1.2, this.radius*1.5);
            ctx.fillStyle='#6b7280'; ctx.fillRect(this.x-this.radius*0.4, this.y-this.radius*0.8+ly, this.radius*0.8, this.radius*0.5);
            ctx.fillStyle='#a855f7'; ctx.fillRect(this.x-this.radius*0.2, this.y-this.radius*0.6+ly, 2, 2); ctx.fillRect(this.x+this.radius*0.1, this.y-this.radius*0.6+ly, 2, 2);
            if(Math.random()<0.4) spawnParticles(this.x, this.y-this.radius, '#1f2937', 2, 50, 0.4); // 검은 연기
        } else {
            ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444';
            ctx.fillRect(this.x-this.radius*0.6, this.y-this.radius+ly, this.radius*1.2, this.radius*1.5);
            ctx.fillStyle='#fca5a5'; ctx.fillRect(this.x-this.radius*0.4, this.y-this.radius*0.8+ly, this.radius*0.8, this.radius*0.5);
            ctx.fillStyle='#1e293b'; ctx.fillRect(this.x-this.radius*0.2, this.y-this.radius*0.6+ly, 2, 2); ctx.fillRect(this.x+this.radius*0.1, this.y-this.radius*0.6+ly, 2, 2);
        }
        
        let drawHp = (typeof this.hp !== 'number' || isNaN(this.hp)) ? 100 : this.hp;
        let drawMaxHp = (typeof this.maxHp !== 'number' || isNaN(this.maxHp) || this.maxHp <= 0) ? 100 : this.maxHp;
        let hpRatio = Math.max(0, Math.min(1, drawHp / drawMaxHp));
        let bw=24,bh=4,bx=this.x-bw/2,by=this.y-this.radius-10; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444'; ctx.fillRect(bx,by,bw*hpRatio,bh);
        if(this.emote) { ctx.font = '28px sans-serif'; ctx.fillText(this.emote, this.x - 14, this.y - this.radius*1.5 - 20); }
    }
}


window.spawnCreatures = function(count) {
    const lanes = ['top', 'mid', 'bot'];
    const types = ['dragon', 'golem', 'beast'];
    showBanner('크리처 군단 소환!', '🐉', true);
    for(let i=0; i<count; i++) {
        let lane = lanes[Math.floor(Math.random() * lanes.length)];
        let ctype = types[Math.floor(Math.random() * types.length)];
        entities.push(new Creature(300, 2700, player.faction, lane, ctype));
    }
};

class Guardian extends Entity {
    constructor(x, y, faction) {
        super(x, y, faction, 'guardian');
        this.maxHp = 50000; this.hp = this.maxHp;
        this.atk = 200; this.aspd = 0.8; this.moveSpd = 100; this.range = 70; this.radius = 28;
        this.home = {x, y};
        this.healTimer = 0;
    }
    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if(isSkill || (attacker && attacker.range > 150)) dmg *= 0.3;
        return super.applyRawDamage(dmg * 0.5, attacker, triggerEffects, isSkill);
    }
    applyStun(duration) { } // Immune to CC
    
    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if(isSkill || (attacker && attacker.range > 150)) dmg *= 0.3;
        let d = super.applyRawDamage(dmg * 0.5, attacker, triggerEffects, isSkill);
        this.hitStopTimer = 0; // 완전한 상태이상/경직 면역
        return d;
    }
    applyStun(duration) { } // Immune to CC
    applySlow(amount, duration) { } // Immune to CC
    
    update(dt) {
        if(this.isDead) return;
        super.update(dt);
        
        let target = null;
        let minDist = 800; // 수호신의 어그로 범위 (상당히 넓음)
        entities.forEach(e => {
            if(e.faction === this.faction || e.isDead || e.type === 'tower' || e.type === 'nexus_turret' || e.type === 'nexus' || e.type === 'jungle') return;
            let d = dist(this, e);
            if(d < minDist) {
                minDist = d;
                target = e;
            }
        });

        if(target) {
            let dToTarget = dist(this, target);
            if(dToTarget > this.range) {
                let a = Math.atan2(target.y - this.y, target.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd;
                this.vy = Math.sin(a) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
                if(this.attackTimer <= 0) {
                    this.attackTimer = 1 / this.aspd;
                    
                    // 수호신의 무자비한 공격 ("쓱싹 해버리는")
                    target.applyRawDamage(this.atk * 1.5, this); // 강력한 일격
                    if(target.applyStun) target.applyStun(0.5); // 강력한 경직/스턴
                    
                    // 수호신 전용 거대 무기 휘두르기 이펙트
                    let angle = Math.atan2(target.y - this.y, target.x - this.x);
                    if(typeof spawnSlash !== 'undefined') spawnSlash(this.x, this.y - this.radius, angle, '#38bdf8', 150); // 푸른빛 거대 창 궤적
                    if(typeof spawnParticles !== 'undefined') spawnParticles(target.x, target.y, '#facc15', 20, 80, 0.5);
                    if(typeof playSFX !== 'undefined') playSFX('skill_burst');
                }
            }
        } else {
            // 주변에 적이 없으면 원래 위치(home)로 당당하게 복귀
            if(dist(this, this.home) > 10) {
                let a = Math.atan2(this.home.y - this.y, this.home.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd;
                this.vy = Math.sin(a) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
                // 복귀 완료 시 체력 회복
                if(this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1 * dt);
            }
        }
    }
    
    
    draw(ctx) {
        if(this.isDead) return;
        let r = this.radius;
        
        let atkAnim = 0; // 0 ~ 1
        let maxAtkTime = 1 / this.aspd;
        if(this.attackTimer > maxAtkTime - 0.2) {
            atkAnim = (this.attackTimer - (maxAtkTime - 0.2)) / 0.2; // 1 -> 0
        }

        // 그림자
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(this.x, this.y+r, r*1.2, r*0.5, 0, 0, Math.PI*2); ctx.fill();
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 광배 (후광)
        ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.beginPath(); ctx.arc(0, -r*1.5, r*1.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();

        // 붉은 비단 띠 (어깨 뒤)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.ellipse(-r*1.2, -r, r*0.5, r*1.5, -0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r*1.2, -r, r*0.5, r*1.5, 0.5, 0, Math.PI*2); ctx.fill();
        
        // 다리
        ctx.fillStyle = '#0f766e'; // 청록색 다리
        ctx.fillRect(-r*0.6, r*0.2, r*0.4, r*0.8);
        ctx.fillRect(r*0.2, r*0.2, r*0.4, r*0.8);
        
        // 몸통 (갑옷)
        ctx.fillStyle = '#b91c1c'; // 붉은 베이스
        ctx.fillRect(-r*0.8, -r, r*1.6, r*1.2);
        // 갑옷 장식
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(-r*0.4, -r*0.8, r*0.8, r*0.4);
        ctx.fillStyle = '#10b981'; ctx.fillRect(-r*0.2, -r*0.6, r*0.4, r*0.2); // 중앙 보석

        // 얼굴
        ctx.fillStyle = '#fcd34d'; // 살구/황금빛 피부
        ctx.fillRect(-r*0.6, -r*1.8, r*1.2, r*0.8);
        
        // 화려한 보관 (왕관)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(-r*0.8, -r*1.8); ctx.lineTo(-r*1.2, -r*2.5); ctx.lineTo(-r*0.4, -r*2.2); ctx.lineTo(0, -r*2.8); ctx.lineTo(r*0.4, -r*2.2); ctx.lineTo(r*1.2, -r*2.5); ctx.lineTo(r*0.8, -r*1.8); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(0, -r*2.2, r*0.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(-r*0.6, -r*2.1, r*0.15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(r*0.6, -r*2.1, r*0.15, 0, Math.PI*2); ctx.fill();
        
        // 눈 (부리부리함)
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-r*0.25, -r*1.5, r*0.15, 0, Math.PI*2); ctx.arc(r*0.25, -r*1.5, r*0.15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(-r*0.25, -r*1.5, r*0.05, 0, Math.PI*2); ctx.arc(r*0.25, -r*1.5, r*0.05, 0, Math.PI*2); ctx.fill();
        
                // 팔과 무기 (거대한 창/보탑)
        ctx.save();
        
        let swingAngle = 0;
        if(atkAnim > 0) {
            // 크게 뒤로 젖혔다가 가로로 시원하게 휘두르는 각도 계산
            if(atkAnim > 0.5) {
                let p = (1.0 - atkAnim) * 2.0; // 0.0 -> 1.0
                swingAngle = -Math.PI * 0.4 + p * (Math.PI * 0.9);
            } else {
                let p = atkAnim * 2.0; // 1.0 -> 0.0
                swingAngle = p * (Math.PI * 0.5);
            }
        }
        
        // 오른팔 (보탑)은 그대로
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(r*0.8, -r*0.8, r*0.4, r); // 오른팔
        ctx.fillStyle = '#e2e8f0'; // 보탑
        ctx.fillRect(r*0.9, -r*1.2, r*0.5, r*0.2);
        ctx.fillRect(r*1.0, -r*1.4, r*0.3, r*0.2);
        ctx.fillRect(r*1.1, -r*1.6, r*0.1, r*0.2);
        
        // 왼팔과 거대 창 (가로 휘두르기)
        ctx.save();
        ctx.translate(-r*1.0, 0); // 어깨 관절 축으로 이동
        ctx.rotate(swingAngle);
        
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(-r*0.2, -r*0.8, r*0.4, r); // 왼팔
        
        ctx.fillStyle = '#38bdf8'; // 푸른빛 창대
        ctx.fillRect(-r*0.1, -r*3.0, r*0.2, r*4.5); // 창대 연장
        ctx.fillStyle = '#94a3b8'; // 창날
        ctx.beginPath(); ctx.moveTo(-r*0.3, -r*3.0); ctx.lineTo(0, -r*4.2); ctx.lineTo(r*0.3, -r*3.0); ctx.fill();
        
        // 무기를 휘두를 때 순간적인 잔상/오라 효과
        if(atkAnim > 0.5) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath(); ctx.moveTo(0, -r); ctx.arc(0, -r, r*3.5, -Math.PI*0.5, -Math.PI*0.1); ctx.fill();
        }
        
        ctx.restore();
        
        ctx.restore();
        
        ctx.restore();

        // 체력바
        let hpRatio = Math.max(0, this.hp/this.maxHp);
        ctx.fillStyle='#374151'; ctx.fillRect(this.x-20, this.y-this.radius-20, 40, 5);
        ctx.fillStyle='#facc15'; ctx.fillRect(this.x-20, this.y-this.radius-20, 40*hpRatio, 5);
    }

    
    update(dt) {
        if(this.isDead) return; super.update(dt);
        
        // 시간에 따른 무한 스케일링 (초반 강력, 후반 괴물)
        let scale = 1 + (window.GS ? window.GS.time / 300 : 0); // 5분마다 1배수 증가
        let oldMax = this.maxHp;
        this.maxHp = 50000 * scale;
        this.atk = 200 * scale;
        if(this.maxHp > oldMax) this.hp += (this.maxHp - oldMax);
        
        let distToHome = dist(this, this.home);
        if (distToHome < 150) {
            this.healTimer -= dt;
            if (this.healTimer <= 0) {
                this.hp = Math.min(this.maxHp, this.hp + 100); // 회복
                this.healTimer = 1;
            }
        }
        
        let target = entities.find(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 400 && dist(this.home, e) <= 400);
        if(target) {
            if(dist(this, target) > this.range) {
                let a = Math.atan2(target.y - this.y, target.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd; this.vy = Math.sin(a) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
                if(this.attackTimer <= 0) {
                    this.attackTimer = 1 / this.aspd;
                    let r = Math.random();
                    if(r < 0.2) {
                        // 지진격
                        target.applyRawDamage(this.atk * 1.5, this);
                        target.applyStun && target.applyStun(1.5);
                        target.applySlow && target.applySlow(0.5, 3);
                        spawnAOE(this.x, this.y, 100, '#a16207aa', 0.5);
                        addText(this.x, this.y-40, '지진격!', '#facc15', 20);
                    } else if(r < 0.4) {
                        // 신위 (weaken is not implemented natively, just damage)
                        target.applyRawDamage(this.atk * 2, this);
                        spawnAOE(this.x, this.y, 80, '#ef4444aa', 0.5);
                        addText(this.x, this.y-40, '신위!', '#f87171', 20);
                    } else {
                        // 평타 (스플래시)
                        let splash = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(target, e) <= 60);
                        splash.forEach(e => e.applyRawDamage(this.atk, this));
                        spawnSlash(this.x, this.y, Math.atan2(target.y-this.y, target.x-this.x), '#fbbf24', 35);
                    }
                }
            }
        } else {
            if(distToHome > 10) {
                let a = Math.atan2(this.home.y - this.y, this.home.x - this.x);
                this.vx = Math.cos(a) * this.moveSpd; this.vy = Math.sin(a) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
            }
        }
    }
}

class Creature extends Minion {
    constructor(x, y, faction, lane, ctype) {
        super(x, y, faction, lane);
        this.ctype = ctype; // 'dragon', 'golem', 'beast'
        this.type = 'creature';
        let scale = 1 + (window.GS ? window.GS.time / 360 : 0);
        
        if (ctype === 'dragon') {
            this.maxHp = 30000 * scale; this.hp = this.maxHp;
            this.atk = 600 * scale; this.moveSpd = 120; this.radius = 36; this.aspd = 0.6; this.range = 80;
        } else if (ctype === 'golem') {
            this.maxHp = 60000 * scale; this.hp = this.maxHp;
            this.atk = 200 * scale; this.moveSpd = 100; this.radius = 45; this.aspd = 0.5; this.range = 90;
        } else { // beast
            this.maxHp = 24000 * scale; this.hp = this.maxHp;
            this.atk = 800 * scale; this.moveSpd = 250; this.radius = 30; this.aspd = 1.5; this.range = 70;
            this.beastStunTimer = 6.0;
        }
    }

    
    draw(ctx) {
        if(this.isDead) return;
        let r = this.radius;
        
        let atkAnim = 0; // 0 ~ 1
        let maxAtkTime = 1 / this.aspd;
        if(this.attackTimer > maxAtkTime - 0.2) {
            atkAnim = (this.attackTimer - (maxAtkTime - 0.2)) / 0.2; // 1 -> 0
        }

        // 그림자
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x, this.y+r*0.8, r, r*0.4, 0, 0, Math.PI*2); ctx.fill();
        
        ctx.save();
        ctx.translate(this.x, this.y);
        let anim = Math.sin(this.animPhase) * r * 0.1;

        if (this.ctype === 'dragon') {
            // 화룡 (Infernal Dragon)
            ctx.fillStyle = '#ea580c'; // 몸통
            ctx.fillRect(-r*0.8, -r+anim, r*1.6, r*1.5);
            ctx.fillStyle = '#dc2626'; // 머리
            ctx.fillRect(-r*0.6, -r*1.8+anim, r*1.2, r*0.8);
            ctx.fillStyle = '#fef08a'; // 눈
            ctx.fillRect(-r*0.4, -r*1.6+anim, r*0.2, r*0.2); ctx.fillRect(r*0.2, -r*1.6+anim, r*0.2, r*0.2);
            ctx.fillStyle = '#b91c1c'; // 날개
            ctx.beginPath(); ctx.moveTo(-r*0.8, -r+anim); ctx.lineTo(-r*2, -r*2+anim); ctx.lineTo(-r*0.8, -r*0.2+anim); ctx.fill();
            ctx.beginPath(); ctx.moveTo(r*0.8, -r+anim); ctx.lineTo(r*2, -r*2+anim); ctx.lineTo(r*0.8, -r*0.2+anim); ctx.fill();
            // 불꽃 효과
            if(Math.random()<0.3) spawnParticles(this.x, this.y-r+anim, '#f97316', 1, 30, 0.3);

        } else if (this.ctype === 'golem') {
            // 에메랄드 골렘 (Emerald Golem)
            ctx.fillStyle = '#065f46'; // 몸통
            ctx.fillRect(-r, -r*1.2+anim, r*2, r*1.8);
            ctx.fillStyle = '#10b981'; // 코어 및 장식
            ctx.fillRect(-r*0.3, -r*0.5+anim, r*0.6, r*0.6);
            ctx.fillRect(-r*0.8, -r*1.5+anim, r*0.4, r*0.8); ctx.fillRect(r*0.4, -r*1.5+anim, r*0.4, r*0.8);
            ctx.fillStyle = '#a7f3d0'; // 눈
            ctx.fillRect(-r*0.4, -r*0.8+anim, r*0.2, r*0.1); ctx.fillRect(r*0.2, -r*0.8+anim, r*0.2, r*0.1);
            // 주먹
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(-r*1.4, -r*0.2+anim, r*0.6, r*0.8); ctx.fillRect(r*0.8, -r*0.2+anim, r*0.6, r*0.8);

        } else {
            // 황금 마수 (Golden Beast)
            ctx.fillStyle = '#ca8a04'; // 몸통
            ctx.fillRect(-r*0.7, -r*0.8+anim, r*1.4, r*1.2);
            ctx.fillStyle = '#eab308'; // 갈기
            ctx.beginPath(); ctx.arc(0, -r*0.8+anim, r, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fef08a'; // 얼굴
            ctx.fillRect(-r*0.5, -r*1.2+anim, r, r*0.8);
            ctx.fillStyle = '#ef4444'; // 붉은 눈 (흉폭함)
            ctx.fillRect(-r*0.3, -r*1.0+anim, r*0.2, r*0.1); ctx.fillRect(r*0.1, -r*1.0+anim, r*0.2, r*0.1);
            // 발톱
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-r*0.8, r*0.2+anim, r*0.4, r*0.2); ctx.fillRect(r*0.4, r*0.2+anim, r*0.4, r*0.2);
        }
        
        ctx.restore();

        // 체력바
        let hpRatio = Math.max(0, this.hp/this.maxHp);
        ctx.fillStyle='#374151'; ctx.fillRect(this.x-15, this.y-this.radius-15, 30, 4);
        ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444'; ctx.fillRect(this.x-15, this.y-this.radius-15, 30*hpRatio, 4);
    }

    update(dt) {
        if(this.isDead) return; super.update(dt);
        if(this.ctype === 'dragon') {
            // 태양불꽃 패시브 (범위 150)
            entities.forEach(e => {
                if(e.faction !== this.faction && !e.isDead && e.type !== 'tower' && dist(this, e) <= 150) {
                    e.applyRawDamage(this.atk * 0.1 * dt, this, false, true);
                    if(Math.random()<0.05) spawnParticles(e.x, e.y, '#ef4444', 2, 20, 0.3);
                }
            });
            if(Math.random()<0.05 && typeof spawnRing !== 'undefined') spawnRing(this.x, this.y, 'rgba(239,68,68,0.2)', 150, 0.5);
        } else if(this.ctype === 'beast') {
            // 6초마다 1초 광역 스턴
            if(this.beastStunTimer === undefined) this.beastStunTimer = 6.0;
            this.beastStunTimer -= dt;
            if(this.beastStunTimer <= 0) {
                this.beastStunTimer = 6.0;
                spawnRing(this.x, this.y, '#facc15', 200, 1.0);
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && e.type !== 'tower' && e.type !== 'nexus' && e.type !== 'nexus_turret' && dist(this, e) <= 200) {
                        e.stunTimer = 1.0;
                        e.applyRawDamage(this.atk * 0.5, this, true, true);
                    }
                });
            }
        }
    }
    
    // 오버라이드: 평타를 광역으로
    applyAttack(target) {
    }
}

class Monster extends Entity {
    constructor(x,y,mtype){
        super(x,y,'NEUTRAL','jungle'); this.mtype=mtype; this.home={x,y};
        this.maxHp = mtype.includes('boss') ? 5000 : 1500; this.hp=this.maxHp;
        this.atk = mtype.includes('boss') ? 150 : 40; this.aspd=0.8; this.moveSpd=80; this.range = mtype.includes('boss') ? 90 : 50; this.radius = mtype.includes('boss') ? 40 : 18;
        this.respawnTimer=0;
    }
    update(dt){
        if(this.isDead){ if(!this.mtype.includes('boss') && this.mtype !== 'summon' && this.mtype !== 'goblin') { this.respawnTimer-=dt; if(this.respawnTimer<=0){ this.isDead=false; this.hp=this.maxHp; this.x=this.home.x; this.y=this.home.y; this.aggroTarget=null; } } return; }
        super.update(dt);

        // [V4 섹션 4.2] 황금 고블린 비폭력 도망(Flee) 전용 AI
        if (this.mtype === 'goblin') {
            let threatHeroes = entities.filter(e => e.type === 'hero' && e.faction !== this.faction && !e.isDead && dist(this, e) < 500);
            if (threatHeroes.length > 0) {
                let nearestThreat = threatHeroes.sort((a,b) => dist(this, a) - dist(this, b))[0];
                let fleeAngle = Math.atan2(this.y - nearestThreat.y, this.x - nearestThreat.x);
                let zigZag = Math.sin(performance.now() / 100) * 0.3;
                this.vx = Math.cos(fleeAngle + zigZag) * this.moveSpd;
                this.vy = Math.sin(fleeAngle + zigZag) * this.moveSpd;
                this.facingDir = this.vx >= 0 ? 1 : -1;
            } else {
                if (dist(this, this.home) > 100) {
                    let returnAngle = Math.atan2(this.home.y - this.y, this.home.x - this.x);
                    this.vx = Math.cos(returnAngle) * this.moveSpd * 0.5;
                    this.vy = Math.sin(returnAngle) * this.moveSpd * 0.5;
                } else {
                    this.vx = 0; this.vy = 0;
                }
            }
            return; // 반격 공격 로직 타지 않도록 완벽 격리
        }

        let target = this.aggroTarget;
        
        if(this.mtype === 'summon') {
            this.lifeTimer = (this.lifeTimer || 15) - dt;
            if(this.lifeTimer <= 0) { this.hp=0; this.isDead=true; return; }
            if(!target || target.isDead) {
                let ne = entities.filter(e=>e.faction!==this.faction && !e.isDead);
                if(ne.length>0) target = ne.sort((a,b)=>dist(this,a)-dist(this,b))[0];
            }
        }

        // 어그로 대상이 죽었거나 자기 집에서 너무 멀어지면 어그로 해제
        if(target && (target.isDead || (this.mtype !== 'summon' && dist(this.home, this) > 600))) {
            this.aggroTarget = null;
            target = null;
            if(this.mtype !== 'summon') this.hp = this.maxHp; // 어그로 풀리면 체력 초기화
        }

        if(target){
            if(this.mtype === 'summon' && this.owner && dist(this, this.owner) > 300) {
                target = this.owner; // return to owner
            }
            if(dist(this,target)>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
            else { this.vx=0; this.vy=0; if(this.attackTimer<=0){
                this.attackTimer=1/this.aspd; 
                if(this.mtype === 'boss_dragon') {
                    let r = Math.random();
                    if(r < 0.3) {
                        spawnAOE(this.x, this.y, 250, '#ef444488', 1.0);
                        let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 250);
                        targets.forEach(t => t.applyRawDamage(this.atk*1.5, this));
                        playSFX('skill_burst');
                    } else if(r < 0.6) {
                        spawnRing(this.x, this.y, '#f59e0b', 300, 0.8);
                        let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 300);
                        targets.forEach(t => { t.applyRawDamage(this.atk*2, this); t.stunTimer = t.type==='hero' && t.inventory && t.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[t.heroKey] && HERO_TMPL[t.heroKey].type==='melee' ? (1.0)*0.7 : (1.0); });
                        playSFX('skill_magic');
                    } else target.applyRawDamage(this.atk,this);
                } else target.applyRawDamage(this.atk,this);
            } }
        } else if(dist(this,this.home)>50){ let a=Math.atan2(this.home.y-this.y,this.home.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
        else { this.vx=0; this.vy=0; }
    }
    onDeath(attacker){ this.respawnTimer=15; if(this.mtype==='boss_dragon'){ showBanner('드래곤 처치!','🐲', attacker?.faction===player?.faction); } }
    draw(ctx){
        if(this.isDead) return;

        let t = performance.now();
        let anim = Math.sin(t / 150 + (this.animPhase||0));
        let walk = Math.sin(t / 100 + (this.animPhase||0)) * 10;

        // 1. 바닥 그림자 렌더링
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius * 0.7, this.radius * 1.1, this.radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();

        // 피격 시 흰색 번쩍임 플래시 효과
        if (this.hitFlashTimer > 0) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
        }

        // 2. 몬스터 타입별 개성 있는 외형 렌더링
        if (this.mtype === 'summon') {
            // [소환수: 해골 미니언]
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(this.x - this.radius, this.y - this.radius * 1.5 + anim * 3, this.radius * 2, this.radius * 1.8);
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(this.x - this.radius * 1.2, this.y - this.radius * 0.8 + anim * 3, this.radius * 0.5, this.radius * 0.6);
            ctx.fillRect(this.x + this.radius * 0.7, this.y - this.radius * 0.8 + anim * 3, this.radius * 0.5, this.radius * 0.6);
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(this.x - this.radius * 0.4, this.y - this.radius * 1.1 + anim * 3, 3, 3);
            ctx.fillRect(this.x + this.radius * 0.1, this.y - this.radius * 1.1 + anim * 3, 3, 3);
            if (Math.random() < 0.15) spawnParticles(this.x, this.y - this.radius, '#7e22ce', 1, 30, 0.4);

        } else if (this.mtype === 'slime') {
            // [슬라임] - 말랑말랑 출렁이는 반투명 젤리
            ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + anim * 2, this.radius * 1.1, this.radius * (0.8 - anim * 0.08), 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.2 + anim * 2, 4, 0, Math.PI * 2);
            ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.2 + anim * 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.2 + anim * 2, 2, 0, Math.PI * 2);
            ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.2 + anim * 2, 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.mtype === 'wolf') {
            // [늑대] - 날렵한 각진 머리칼, 쫑긋한 귀
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x - this.radius * 1.2, this.y - this.radius * 0.6 + anim, this.radius * 2.2, this.radius * 1.1);
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius * 0.4, this.y - this.radius * 0.8);
            ctx.lineTo(this.x + this.radius * 1.3, this.y - this.radius * 0.4);
            ctx.lineTo(this.x + this.radius * 0.4, this.y);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius * 0.2, this.y - this.radius * 0.8);
            ctx.lineTo(this.x, this.y - this.radius * 1.4);
            ctx.lineTo(this.x + this.radius * 0.5, this.y - this.radius * 0.8);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(this.x + this.radius * 0.6, this.y - this.radius * 0.6, 3, 2);

        } else if (this.mtype === 'bear') {
            // [곰] - 묵직한 거대 사각형 가죽
            ctx.fillStyle = '#78350f';
            ctx.fillRect(this.x - this.radius * 1.1, this.y - this.radius * 1.2 + anim, this.radius * 2.2, this.radius * 1.8);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(this.x - this.radius * 1.2, this.y + this.radius * 0.3 + walk * 0.3, this.radius * 0.5, this.radius * 0.6);
            ctx.fillRect(this.x + this.radius * 0.7, this.y + this.radius * 0.3 - walk * 0.3, this.radius * 0.5, this.radius * 0.6);
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.7, this.y - this.radius * 1.2 + anim, 6, 0, Math.PI * 2);
            ctx.arc(this.x + this.radius * 0.7, this.y - this.radius * 1.2 + anim, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - this.radius * 0.3, this.y - this.radius * 0.8 + anim, 3, 3);
            ctx.fillRect(this.x + this.radius * 0.1, this.y - this.radius * 0.8 + anim, 3, 3);

        } else if (this.mtype === 'golem') {
            // [고렘] - 금이 간 바위 텍스처, 고대 정수 코어
            ctx.fillStyle = '#64748b';
            ctx.fillRect(this.x - this.radius, this.y - this.radius * 1.4 + anim * 0.5, this.radius * 2, this.radius * 2.0);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius * 0.5, this.y - this.radius * 0.5);
            ctx.lineTo(this.x + this.radius * 0.3, this.y + this.radius * 0.2);
            ctx.stroke();
            ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#d8b4fe';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.radius * 0.9, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

        } else if (this.mtype === 'skeleton') {
            // [해골 전사] - 갈비뼈 상자 구조
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(this.x - this.radius * 0.4, this.y - this.radius * 1.4 + anim, this.radius * 0.8, this.radius * 1.8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(this.x - this.radius * 0.5, this.y - this.radius * 0.8 + anim, this.radius * 1.0, 3);
            ctx.fillRect(this.x - this.radius * 0.5, this.y - this.radius * 0.5 + anim, this.radius * 1.0, 3);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(this.x - this.radius * 1.1, this.y - this.radius * 0.4, this.radius * 0.4, this.radius * 0.9);
            ctx.fillStyle = '#cbd5e1';
            ctx.strokeRect(this.x - this.radius * 1.1, this.y - this.radius * 0.4, this.radius * 0.4, this.radius * 0.9);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x - 3, this.y - this.radius * 1.1, 2, 2);
            ctx.fillRect(this.x + 1, this.y - this.radius * 1.1, 2, 2);

        } else if (this.mtype === 'goblin') {
            // [황금 고블린] - 등에 황금 자루를 짊어진 도둑
            ctx.fillStyle = '#15803d';
            ctx.fillRect(this.x - this.radius * 0.6, this.y - this.radius * 1.1, this.radius * 1.2, this.radius * 1.4);
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius * 0.5, this.y - this.radius * 0.8);
            ctx.lineTo(this.x - this.radius * 1.4, this.y - this.radius * 1.1);
            ctx.lineTo(this.x - this.radius * 0.4, this.y - this.radius * 0.6);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius * 0.5, this.y - this.radius * 0.8);
            ctx.lineTo(this.x + this.radius * 1.4, this.y - this.radius * 1.1);
            ctx.lineTo(this.x + this.radius * 0.4, this.y - this.radius * 0.6);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.8, this.y - this.radius * 0.3, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(this.x - 4, this.y - this.radius * 0.7, 2, 2);
            ctx.fillRect(this.x + 2, this.y - this.radius * 0.7, 2, 2);
            if (Math.random() < 0.35) {
                spawnParticles(this.x, this.y, '#fcd34d', 1, 40, 0.3, 'circle');
            }

        } else {
            // [기타 기본형 보스 개체 등]
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // 3. 체력바 렌더링
        let drawHp = (typeof this.hp !== 'number' || isNaN(this.hp)) ? 1500 : this.hp;
        let drawMaxHp = (typeof this.maxHp !== 'number' || isNaN(this.maxHp) || this.maxHp <= 0) ? 1500 : this.maxHp;
        let hpRatio = Math.max(0, Math.min(1, drawHp / drawMaxHp));
        
        let bw = this.radius * 2, bh = 6, bx = this.x - bw / 2, by = this.y - this.radius - 15;
        ctx.fillStyle = '#374151'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#f97316'; ctx.fillRect(bx, by, bw * hpRatio, bh);
    }
}

// ============ 투사체 ============
class Projectile {
    constructor(x,y,target,dmg,attacker,isCrit,ptype='arrow'){
        this.x=x; this.y=y; this.target=target; this.dmg=dmg; this.attacker=attacker; this.isCrit=isCrit; this.ptype=ptype;
        this.speed=ptype==='tower'?550:500; this.isDead=false;
        this.isSplash = attacker && attacker.type==='hero' && (attacker.heroKey==='JOKER' || attacker.heroKey==='DARKPRIEST' || attacker.heroKey==='ARIEL');
        
        if(attacker && attacker.type==='hero') {
            if(attacker.heroKey==='ICEBORN') this.ptype='ice';
            else if(attacker.heroKey==='JOKER') this.ptype='card';
            else if(attacker.heroKey==='DARKPRIEST') this.ptype='darkorb';
            else if(attacker.heroKey==='NECROMANCER') this.ptype='skull';
            else if(attacker.heroKey==='MECHANIC') this.ptype='bullet';
            else if(attacker.heroKey==='VAMPIRE') this.ptype='blood';
            else if(attacker.heroKey==='ARIEL') this.ptype='holy';
        }
    }
    update(dt){
        if(this.target.isDead){this.isDead=true;return;}
        if(dist(this,this.target)<15 || (this.isSplash && dist(this,this.target)<40)){
            let hitTargets = this.isSplash ? entities.filter(e => e.faction!==this.attacker.faction && !e.isDead && dist(e, this.target) <= 120) : [this.target];
            if(this.isSplash) spawnAOE(this.target.x, this.target.y, 120, '#a855f7aa', 0.5);
            hitTargets.forEach(tgt => {
                let dealt = tgt.applyRawDamage(this.dmg, this.attacker, true, true);
                if(this.attacker && this.attacker.type === 'hero') this.attacker.totalDmg += (dealt || this.dmg);
                if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(tgt);
                if(this.attacker.lifeSteal>0&&this.attacker.type==='hero') { this.attacker.hp=Math.min(this.attacker.maxHp,this.attacker.hp+this.dmg*this.attacker.lifeSteal); playSFX('heal'); }
                if(this.attacker.burnDmg>0&&!tgt.isBuilding) tgt.burnTicks.push({dmg:this.attacker.burnDmg,ticks:3,timer:1.0,src:this.attacker});
                if(this.attacker.stunChance>0&&Math.random()<this.attacker.stunChance&&!tgt.isBuilding) tgt.stunTimer = tgt.type==='hero' && tgt.inventory && tgt.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[tgt.heroKey] && HERO_TMPL[tgt.heroKey].type==='melee' ? (1.0)*0.7 : (1.0);
                
                let hitColor = this.isCrit?'#ff6b35':'#fbbf24';
                if(this.ptype==='blood') hitColor = '#e11d48';
                if(this.ptype==='darkorb' || this.ptype==='skull') hitColor = '#9333ea';
                if(this.ptype==='ice') hitColor = '#7dd3fc';
                spawnParticles(tgt.x,tgt.y-tgt.radius*0.5, hitColor, 10, 120, 0.3);
            });
            this.isDead=true;
        } else {
            let a=Math.atan2(this.target.y-this.y,this.target.x-this.x);
            this.x+=Math.cos(a)*this.speed*dt; this.y+=Math.sin(a)*this.speed*dt;
            
            // Trail effects
            if(this.ptype==='card' && Math.random()<0.5) spawnParticles(this.x, this.y, '#f87171', 1, 20, 0.2);
            if((this.ptype==='darkorb' || this.ptype==='skull') && Math.random()<0.6) spawnParticles(this.x, this.y, '#7e22ce', 2, 30, 0.3);
            if(this.ptype==='blood' && Math.random()<0.5) spawnParticles(this.x, this.y, '#be123c', 1, 20, 0.2);
            if(this.ptype==='ice' && Math.random()<0.4) spawnParticles(this.x, this.y, '#bae6fd', 1, 20, 0.2);
        }
    }
    draw(ctx){
        ctx.save(); ctx.translate(this.x,this.y); 
        let a = Math.atan2(this.target.y-this.y,this.target.x-this.x);
        ctx.rotate(a);
        
        if(this.ptype==='arrow'){ 
            ctx.fillStyle='#92400e'; ctx.fillRect(-10,-1.5,14,3); 
            ctx.fillStyle='#cbd5e1'; ctx.beginPath(); ctx.moveTo(4,-3); ctx.lineTo(12,0); ctx.lineTo(4,3); ctx.fill();
            ctx.fillStyle='#ef4444'; ctx.fillRect(-14,-2,4,4);
        }
        else if(this.ptype==='ice'){
            ctx.shadowColor='#38bdf8'; ctx.shadowBlur=10; ctx.fillStyle='#e0f2fe';
            ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, 0); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        }
        else if(this.ptype==='card'){
            ctx.rotate(performance.now()/50); // Spinning card
            ctx.fillStyle='#ffffff'; ctx.fillRect(-6,-8,12,16);
            ctx.fillStyle='#ef4444'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.fillText('♦', 0, 3);
            ctx.strokeStyle='#1e293b'; ctx.lineWidth=1; ctx.strokeRect(-6,-8,12,16);
        }
        else if(this.ptype==='darkorb' || this.ptype==='skull'){
            ctx.shadowColor='#7c3aed'; ctx.shadowBlur=15; ctx.fillStyle='#4c1d95';
            ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#c084fc'; ctx.beginPath(); ctx.arc(2,-3,3,0,Math.PI*2); ctx.fill(); // eye
            ctx.shadowBlur=0;
        }
        else if(this.ptype==='bullet'){
            ctx.fillStyle='#fbbf24'; ctx.fillRect(-6,-2,12,4);
            ctx.fillStyle='#f59e0b'; ctx.beginPath(); ctx.arc(6,0,2,0,Math.PI*2); ctx.fill();
        }
        
        else if(this.ptype==='holy'){
            ctx.shadowColor='#fef08a'; ctx.shadowBlur=15; ctx.fillStyle='#fef08a';
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(3, -2); ctx.lineTo(8, 0); ctx.lineTo(3, 2); ctx.lineTo(0, 6); ctx.lineTo(-3, 2); ctx.lineTo(-8, 0); ctx.lineTo(-3, -2); ctx.closePath(); ctx.fill();
            ctx.fillStyle='#38bdf8'; ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
            ctx.shadowBlur=0;
        }
        else if(this.ptype==='blood'){
            ctx.fillStyle='#e11d48'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-5); ctx.lineTo(-4,0); ctx.lineTo(-6,5); ctx.fill();
        }
        else { 
            ctx.shadowColor='#fbbf24'; ctx.shadowBlur=10; ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; 
        }
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
window.addEventListener('keydown',e=>{ 
    if(e.code === 'Tab') { e.preventDefault(); if(window.toggleStatusWindow) window.toggleStatusWindow(); return; }
    let k=e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k]=true; if(k==='o'&&player&&!GS.autoSkill1) player.useSkill(1); if(k==='p'&&player&&!GS.autoSkill2) player.useSkill(2); 
});
window.addEventListener('keyup',e=>{ let k=e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k]=false; });
window.addEventListener('wheel', e => { 
    if(e.target.closest('.overflow-y-auto') || e.target.closest('#titleScreen')) return;
    e.preventDefault();
    camera.zoom -= e.deltaY * 0.001; 
    camera.zoom = clamp(camera.zoom, 0.3, 2.0); 
}, { passive: false });

let initPinchD = null, initZoom = 1.0;
window.addEventListener('touchstart',e=>{
    initAudio();
    if(e.touches.length === 2) { initPinchD = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); initZoom = camera.zoom; }
    else {
        const t = e.touches[0];
        const isLeftSide  = t.clientX < window.innerWidth * 0.6;
        const isBottomHalf = t.clientY > window.innerHeight * 0.35;
        if (GS.platform === 'MOBILE' && isLeftSide && isBottomHalf) {
            joy.active = true; joy.id = t.identifier;
            joy.ox = t.clientX; joy.oy = t.clientY;
            joy.dx = 0; joy.dy = 0;
            let jb = document.getElementById('joyBase');
            if(jb) {
                jb.classList.remove('hidden');
                jb.style.left = joy.ox + 'px';
                jb.style.top = joy.oy + 'px';
                let jn = document.getElementById('joyNub');
                if(jn) jn.style.transform = 'translate(0px, 0px)';
            }
        }
    }
});
window.addEventListener('touchmove',e=>{
    if(e.touches.length === 2 && initPinchD) { let d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); camera.zoom = clamp(initZoom * (d/initPinchD), 0.3, 2.0); }
    else if(joy.active) { 
        for(let t of e.changedTouches) {
            if(t.identifier===joy.id){ 
                let dx=t.clientX-joy.ox, dy=t.clientY-joy.oy, d=Math.hypot(dx,dy); 
                if(d>50){dx=dx/d*50;dy=dy/d*50;} 
                joy.dx=dx; joy.dy=dy; 
                let jn = document.getElementById('joyNub');
                if(jn) jn.style.transform = `translate(${dx}px, ${dy}px)`;
            } 
        }
    }
});
window.addEventListener('touchend',e=>{ 
    if(e.touches.length<2) initPinchD=null; 
    let stillTouching = false;
    for(let t of e.touches) if(t.identifier===joy.id) stillTouching = true;
    if(!stillTouching){ 
        joy.active=false; joy.dx=0; joy.dy=0; 
        let jb = document.getElementById('joyBase');
        if(jb) jb.classList.add('hidden');
    } 
});
window.addEventListener('touchcancel',e=>{ 
    joy.active=false; joy.dx=0; joy.dy=0; 
    let jb = document.getElementById('joyBase');
    if(jb) jb.classList.add('hidden');
});

// ============ UI ============
window.selectPlatform=p=>{ GS.platform=p; document.getElementById('btnPlatPC').className=p==='PC'?"px-4 py-2.5 rounded-xl font-bold bg-indigo-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; document.getElementById('btnPlatMobile').className=p==='MOBILE'?"px-4 py-2.5 rounded-xl font-bold bg-emerald-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; };
window.selectFaction=f=>{ GS.faction=f; document.getElementById('btnFactionBlue').className=f==='BLUE'?"py-3 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; document.getElementById('btnFactionRed').className=f==='RED'?"py-3 px-3 rounded-xl border-2 border-fuchsia-500 bg-fuchsia-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; };

window.trackHeroSelect = function(heroKey) {
    let stats = JSON.parse(localStorage.getItem('avalon_hero_stats') || '{}');
    stats[heroKey] = (stats[heroKey] || 0) + 1;
    localStorage.setItem('avalon_hero_stats', JSON.stringify(stats));
};

window.selectHero=h=>{ GS.hero=h; Object.keys(HERO_TMPL).forEach(hk=>{ let btn=document.getElementById('btnHero'+hk); if(btn) btn.className='py-2 px-1 rounded-xl border-2 '+(hk===h?'border-emerald-500 bg-slate-800/80':'border-transparent bg-slate-800/60')+' flex flex-col items-center transition-all'; });
    let t = HERO_TMPL[h];
    let d1 = t.skill1.desc || ''; let d2 = t.skill2.desc || '';
    
    let rangeTypeStr = "알수없음";
    if (t.range <= 100) rangeTypeStr = "근거리";
    else if (t.range <= 250) rangeTypeStr = "중거리";
    else rangeTypeStr = "원거리";
    
    let aoeStr = (h === 'JOKER' || h === 'DARKPRIEST' || h === 'THOR') ? '범위(스플래시)' : '단일 타겟';

    document.getElementById('heroDescription').innerHTML='<div class="flex flex-row gap-3 items-start"><div class="w-16 h-20 shrink-0 bg-slate-800 rounded flex items-center justify-center border border-slate-600 relative overflow-hidden"><canvas id="heroPreviewCanvas" width="64" height="80"></canvas></div>' +
        '<div class="flex-1 text-left"><div class="text-amber-400 font-bold mb-0.5 text-sm">['+t.name+'] <span class="text-[10px] text-white bg-slate-700 px-1 py-0.5 rounded ml-1">'+ (t.role_desc||'') +'</span></div>' +
        '<div class="text-[10px] text-slate-300 mb-1">▪ 공격 형태: <span class="text-emerald-300 font-bold">' + rangeTypeStr + '</span> (' + aoeStr + ')</div>' +
        '<div class="text-white bg-slate-900 p-1.5 rounded mt-1 text-[11px] leading-tight">⚔️ <span class="text-emerald-300 font-bold">'+t.skill1.name+'</span> ('+t.skill1.cd+'초)<br/><span class="text-[10px] text-slate-300">'+d1+'</span><br/><br/>🔮 <span class="text-indigo-300 font-bold">'+t.skill2.name+'</span> ('+t.skill2.cd+'초)<br/><span class="text-[10px] text-slate-300">'+d2+'</span></div></div></div>' +
        '<div class="text-[10px] text-slate-400 mt-1.5 font-bold">※ 게임 내에서 로그라이크 방식으로 추가 패시브 12종을 획득합니다!</div>';

    setTimeout(() => {
        let cvs = document.getElementById('heroPreviewCanvas');
        if(cvs) {
            let ctx = cvs.getContext('2d');
            ctx.clearRect(0,0,64,80);
            if(t.draw) t.draw(ctx, 32, 55, 14, 1, 'BLUE', 0);
        }
    }, 10);
};

function autoDetectPlatform() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth < 768;
    if (isTouchDevice && isSmallScreen) {
        GS.platform = 'MOBILE';
        selectPlatform('MOBILE');
    }
}
function getDefaultZoom() {
    if (GS.platform === 'MOBILE') {
        const shorter = Math.min(window.innerWidth, window.innerHeight);
        return shorter < 400 ? 0.45 : 0.52;
    }
    return 0.65;
}

window.startGame=()=>{
    if(statusUpdateInterval) { clearInterval(statusUpdateInterval); statusUpdateInterval=null; }
    if(window.trackHeroSelect) window.trackHeroSelect(GS.hero);
    autoDetectPlatform();
    initAudio();
    document.getElementById('titleScreen').classList.add('hidden'); document.getElementById('gameHUD').classList.remove('hidden'); document.getElementById('gameHUD').classList.add('flex');
    if(GS.platform==='MOBILE') document.getElementById('pcGuideText').classList.add('hidden');
    generateEnv();

    // 완벽한 초기화
    entities=[]; projectiles=[]; particles=[]; floatingTexts=[]; slashEffects=[]; aoeEffects=[]; earthCrackEffects=[]; rockAuraEffects=[];
    GS.scoreBlue=0; GS.scoreRed=0; GS.time=0; GS.paused=false; minionTimer=MINION_INTERVAL-2;
    midBossSpawned = [false, false, false]; suddenDeathTriggered = false; goblinSpawned = false;
    document.getElementById('scoreBlue').textContent='0'; document.getElementById('scoreRed').textContent='0';

    // 건물 세팅 (3라인 + 수호타워)
    entities.push(new Building(300,2700,'BLUE','nexus')); entities.push(new Building(2700,300,'RED','nexus'));
    // 수호신 스폰
    entities.push(new Guardian(300, 2700, 'BLUE')); entities.push(new Guardian(2700, 300, 'RED'));
    // 수호 타워 (Nexus Turrets)
    entities.push(new Building(300,2550,'BLUE','nexus_turret')); entities.push(new Building(450,2700,'BLUE','nexus_turret')); entities.push(new Building(150,2700,'BLUE','nexus_turret')); entities.push(new Building(300,2850,'BLUE','nexus_turret'));
    entities.push(new Building(2700,450,'RED','nexus_turret')); entities.push(new Building(2550,300,'RED','nexus_turret')); entities.push(new Building(2850,300,'RED','nexus_turret')); entities.push(new Building(2700,150,'RED','nexus_turret'));
    // 탑
    entities.push(new Building(300,1500,'BLUE','tower')); entities.push(new Building(300,800,'BLUE','tower')); entities.push(new Building(1500,300,'RED','tower')); entities.push(new Building(800,300,'RED','tower'));
    // 바텀
    entities.push(new Building(1500,2400,'BLUE','tower')); entities.push(new Building(2200,2400,'BLUE','tower')); entities.push(new Building(2400,1500,'RED','tower')); entities.push(new Building(2400,2200,'RED','tower'));
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
    camera.x=player.x; camera.y=player.y; camera.zoom = getDefaultZoom();
    GS.status='COUNTDOWN'; GS.countdownTimer=5.0; GS.lastFrame=performance.now();
    resizeCanvas();
    
    document.getElementById('hudHeroName').textContent=HERO_TMPL[GS.hero].name;
    
    renderShop(); requestAnimationFrame(gameLoop);
};
window.toggleShop=()=>{ document.getElementById('shopUI').classList.toggle('hidden'); renderShop(); };

window.updateStatusWindow = () => {
    let bl=document.getElementById('statusBlueList'); let rl=document.getElementById('statusRedList');
    if(!bl || !rl) return;
    bl.innerHTML=''; rl.innerHTML='';
    let blueHeroes = entities.filter(e=>e.type==='hero'&&e.faction==='BLUE').sort((a,b)=>b.kills-a.kills);
    let redHeroes = entities.filter(e=>e.type==='hero'&&e.faction==='RED').sort((a,b)=>b.kills-a.kills);
    
    let makeItem = (h) => {
        let t = HERO_TMPL[h.heroKey];
        return `<div class="flex items-center gap-3 bg-slate-950/50 p-2 rounded border border-slate-800">
            <div class="flex-1 flex flex-col">
                <span class="font-bold text-slate-200" style="color:${t.color}">${t.name}</span>
                <span class="text-[10px] text-slate-400">Lv.${h.level} | ${h.heroKey==='JOKER'?'도박사':t.role_desc.split(' ')[1]}</span>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-xs font-bold text-emerald-400">${h.kills} / ${h.deaths} / ${h.assists||0}</span>
                <span class="text-[10px] text-amber-400">${Math.floor(h.gold)}G</span>
            </div>
        </div>`;
    };
    blueHeroes.forEach(h => bl.innerHTML += makeItem(h));
    redHeroes.forEach(h => rl.innerHTML += makeItem(h));
};

let statusUpdateInterval = null;
window.toggleStatusWindow = () => {
    let el = document.getElementById('statusWindowOverlay');
    if(el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        el.classList.add('flex');
        window.updateStatusWindow();
        statusUpdateInterval = setInterval(window.updateStatusWindow, 500);
    } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
        if(statusUpdateInterval) { clearInterval(statusUpdateInterval); statusUpdateInterval = null; }
    }
};

window.toggleEvolutionGuide = () => {
    const modal = document.getElementById('evolutionGuideModal');
    if (modal.classList.contains('hidden')) {
        renderEvolutionGuide();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
};

window.renderEvolutionGuide = () => {
    const list = document.getElementById('evolutionGuideList');
    if (!list) return;
    list.innerHTML = '';
    
    EVOLUTION_ITEMS.forEach(evo => {
        let reqItem = BASE_ITEMS.find(i => i.id === evo.reqItem);
        let reqPass = PASSIVE_SKILLS.find(p => p.id === evo.reqPassive);
        
        let hasItem = false, itemLv = 0, itemMax = false;
        let hasPass = false, passLv = 0, passMax = false;
        let alreadyEvolved = false;
        
        if (player) {
            alreadyEvolved = player.inventory.some(i => i.id === evo.id);
            let invItem = player.inventory.find(i => i.id === evo.reqItem);
            if(invItem) { hasItem = true; itemLv = invItem.upgrade; if(itemLv >= 7) itemMax = true; }
            if(player.passiveSkills[evo.reqPassive]) {
                hasPass = true; passLv = player.passiveSkills[evo.reqPassive];
                if(passLv >= reqPass.maxLv) passMax = true;
            }
        }
        
        let statusText = '';
        let bgClass = 'bg-slate-800 border-slate-700';
        if (alreadyEvolved) {
            statusText = '<span class="text-xs text-amber-400 font-bold ml-auto border border-amber-400/50 px-2 py-0.5 rounded">완성</span>';
            bgClass = 'bg-amber-900/40 border-amber-500';
        } else if (itemMax && passMax) {
            statusText = '<span class="text-xs text-emerald-400 font-bold ml-auto animate-pulse">진화 임박!</span>';
            bgClass = 'bg-emerald-900/40 border-emerald-500';
        }
        
        list.innerHTML += `
            <div class="border rounded-xl p-3 flex flex-col gap-2 ${bgClass}">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${evo.icon}</span>
                    <div class="flex flex-col">
                        <span class="text-amber-400 font-bold">${evo.name}</span>
                        <span class="text-[10px] text-slate-300">${evo.desc}</span>
                    </div>
                    ${statusText}
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <div onclick="window.buyFromGuide('${reqItem?reqItem.id:''}')" class="flex-1 flex flex-col items-center bg-slate-900 rounded p-1 border ${itemMax?'border-emerald-500/50':'border-slate-700'} cursor-pointer hover:bg-slate-800 transition-colors title='클릭하여 구매'">
                        <span class="text-xs text-slate-200">${reqItem?reqItem.icon:'?'} ${reqItem?reqItem.name:'?'}</span>
                        <span class="text-[10px] ${itemMax?'text-emerald-400 font-bold':'text-slate-400'}">강화: ${itemLv}/7 <span class="text-amber-500">(${reqItem?reqItem.cost:0}G)</span></span>
                    </div>
                    <div class="text-slate-500">+</div>
                    <div class="flex-1 flex flex-col items-center bg-slate-900 rounded p-1 border ${passMax?'border-emerald-500/50':'border-slate-700'}">
                        <span class="text-xs text-slate-200">${reqPass?reqPass.icon:'?'} ${reqPass?reqPass.name:'?'}</span>
                        <span class="text-[10px] ${passMax?'text-emerald-400 font-bold':'text-slate-400'}">레벨: ${passLv}/${reqPass?reqPass.maxLv:0}</span>
                    </div>
                </div>
            </div>
        `;
    });
};

window.showEvolutionPopup = (name, icon, desc) => {
    let popup = document.getElementById('evolutionSuccessPopup');
    let box = document.getElementById('evoPopupBox');
    if(!popup || !box) return;
    document.getElementById('evoPopupIcon').innerText = icon;
    document.getElementById('evoPopupName').innerText = name;
    document.getElementById('evoPopupDesc').innerText = desc;
    
    popup.classList.remove('hidden');
    setTimeout(() => { box.style.transform = 'scale(1.2)'; }, 50);
    setTimeout(() => { box.style.transform = 'scale(1.0)'; }, 300);
    
    setTimeout(() => {
        box.style.transform = 'scale(0)';
        setTimeout(() => popup.classList.add('hidden'), 500);
    }, 4000);
};
window.buyItemUI=id=>{ 
    if(player) {
        player.buyItem(id); 
        let modal = document.getElementById('evolutionGuideModal');
        if (modal && !modal.classList.contains('hidden')) renderEvolutionGuide();
    }
};
window.buyFromGuide = (id) => {
    if(!id || !player) return;
    let b = BASE_ITEMS.find(i=>i.id===id);
    if(b && player.gold >= b.cost) {
        let slot = player.inventory.find(i => i.id === id);
        if (slot || player.inventory.length < 10) {
            player.buyItem(id);
            renderEvolutionGuide();
        }
    }
};
window.triggerSkill=idx=>{ if(player&&!player.isDead) player.useSkill(idx); };

// Active items removed
window.toggleAutoSkill = (num) => {
    let badge;
    if (num === 1) {
        GS.autoSkill1 = !GS.autoSkill1;
        badge = document.getElementById('badgeAutoSkill1');
        if (badge) badge.textContent = GS.autoSkill1 ? 'A' : 'M';
    } else if (num === 2) {
        GS.autoSkill2 = !GS.autoSkill2;
        badge = document.getElementById('badgeAutoSkill2');
        if (badge) badge.textContent = GS.autoSkill2 ? 'A' : 'M';
    }
    if (badge) {
        let state = num === 1 ? GS.autoSkill1 : GS.autoSkill2;
        if (state) {
            badge.classList.remove('bg-slate-700', 'border-slate-500', 'text-slate-300', 'hover:bg-slate-600');
            badge.classList.add('bg-amber-500', 'border-amber-300', 'text-slate-900', 'hover:bg-amber-400');
        } else {
            badge.classList.remove('bg-amber-500', 'border-amber-300', 'text-slate-900', 'hover:bg-amber-400');
            badge.classList.add('bg-slate-700', 'border-slate-500', 'text-slate-300', 'hover:bg-slate-600');
        }
    }
};

function renderShop(){
    const cont=document.getElementById('shopItemContainer'); cont.innerHTML='';
    if(!player) return; document.getElementById('hudGoldText').textContent=Math.floor(player.gold)+'G';
    
    document.getElementById('hudVaultGold').textContent = Math.floor(window.TEAM_VAULT.gold);
    BASE_ITEMS.forEach(i=>{
        let slot=player.inventory.find(inv=>inv.id===i.id); let lv=slot?'<span class="text-rose-400 font-bold">+'+slot.upgrade+'</span>':'';
        let canBuy=player.gold>=i.cost&&(slot||player.inventory.length<10);
        cont.innerHTML+=`
        <div class="bg-slate-800/80 hover:bg-slate-700/80 transition-colors border border-slate-700 rounded-lg p-1 md:p-2 flex flex-col items-center justify-between gap-0.5 md:gap-1 w-full relative group shadow-sm">
            <div class="text-2xl md:text-3xl mb-0.5 md:mb-1 mt-0.5 md:mt-1">${i.icon}</div>
            <div class="text-center w-full">
                <div class="text-[9px] md:text-xs font-bold text-slate-100 truncate w-full px-0.5">${i.name} ${lv}</div>
                <div class="text-[8px] md:text-[10px] text-amber-400 font-bold">${i.cost}G</div>
            </div>
            ${i.desc ? '<div class="text-[7.5px] md:text-[9px] text-slate-400 text-center leading-tight line-clamp-2 min-h-[1.5rem] mt-0.5 px-0.5">'+i.desc+'</div>' : ''}
            <button onclick="buyItemUI('${i.id}')" class="${canBuy?'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]':'bg-slate-700 text-slate-500'} text-[8px] md:text-[11px] w-full py-1 md:py-1.5 rounded font-bold mt-0.5 transition-all">${slot?'강화 (+'+(slot.upgrade+1)+')':'구매'}</button>
        </div>`;
    });
}

// ============ 메인 루프 ============
const canvas=document.getElementById('gameCanvas'); const ctx=canvas.getContext('2d');
const mCanvas=document.getElementById('minimapCanvas'); window.mCtx=mCanvas.getContext('2d'); const mCtx=window.mCtx;
mCanvas.width=160; mCanvas.height=160;

let canvasDPR = 1;
function resizeCanvas() {
    canvasDPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = Math.floor(w * canvasDPR);
    canvas.height = Math.floor(h * canvasDPR);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => { setTimeout(resizeCanvas, 300); });


function gameLoop(now){
    if(GS.status!=='PLAYING' && GS.status!=='COUNTDOWN') return;
    // dt 클램프 완화: 프레임 드랍이 생겨도 최대 0.2초(5 FPS) 분량의 시간을 한 번에 처리해 현실 시간과 싱크를 맞춤
    let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;
    
    if(!GS.paused) {
        if(GS.status === 'COUNTDOWN') {
            GS.countdownTimer -= dt;
            if(GS.countdownTimer <= 0) {
                GS.status = 'PLAYING';
                showBanner('사냥 시작!', '⚔️', true);
            }
        }
        if(GS.status === 'PLAYING') {
            // Underdog Buff Logic
        if(GS.lastUnderdogCheck === undefined) GS.lastUnderdogCheck = 0;
        if(GS.time - GS.lastUnderdogCheck >= 120) {
            GS.lastUnderdogCheck = GS.time;
            let blueScore = GS.scoreBlue; let redScore = GS.scoreRed;
            let buffFaction = null;
            if(blueScore + 3 < redScore) buffFaction = 'BLUE';
            else if(redScore + 3 < blueScore) buffFaction = 'RED';
            
            if(buffFaction && window.showBuffAnnouncer) {
                let fName = buffFaction === 'BLUE' ? '블루' : '레드';
                window.showBuffAnnouncer(`지금부터 30초간 ${fName}진영 언더독 버프 (이속/공속 20% 증가) 적용됩니다!`);
                entities.forEach(e => {
                    if(e.type === 'hero' && e.faction === buffFaction) {
                        e.underdogBuffTimer = 30.0;
                    }
                });
            }
        }

        // Creature Spawn Logic (6분 = 360초)
        if(GS.lastCreatureSpawn === undefined) GS.lastCreatureSpawn = 0;
        if(GS.time > 0 && GS.time - GS.lastCreatureSpawn >= 360) {
            GS.lastCreatureSpawn = GS.time;
            const lanes = ['top', 'mid', 'bot'];
            const types = ['dragon', 'golem', 'beast'];
            let spawnedAny = false;
            
            // BLUE 팀 스폰 로직
            let blueCount = Math.min(3, Math.floor(window.TEAM_VAULT.gold / 600));
            if(blueCount > 0) {
                window.TEAM_VAULT.gold -= blueCount * 600;
                for(let i=0; i<blueCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(300, 2700, 'BLUE', lane, ctype));
                }
                spawnedAny = true;
            }
            
            // RED 팀 스폰 로직
            if(blueCount > 0) {
                for(let i=0; i<blueCount; i++) {
                    let lane = lanes[Math.floor(Math.random() * lanes.length)];
                    let ctype = types[Math.floor(Math.random() * types.length)];
                    entities.push(new Creature(2700, 300, 'RED', lane, ctype));
                }
            }
            
            if(spawnedAny) {
                showBanner('크리처 지원군 도착!', '🐉', true);
            }
        }
        
        // Dragon Spawn Logic
        if(GS.lastDragonCheck === undefined) GS.lastDragonCheck = 0;
        if(GS.time >= 300 && GS.time - GS.lastDragonCheck >= 300) {
            GS.lastDragonCheck = GS.time;
            let scale = Math.floor(GS.time / 300); // 1 at 5min, 2 at 10min...
            
            let dragonRed = new EpicDragon(600, 600, 'red', scale);
            let dragonBlue = new EpicDragon(2400, 2400, 'blue', scale);
            
            entities.push(dragonRed, dragonBlue);
            showBanner('11시와 5시 방향에 [에픽 드래곤] 등장!', '🐲', true);
        }

        GS.time+=dt;

        // 골드 고블린 스폰 (8분 1회)
        if(typeof goblinSpawned === 'undefined') window.goblinSpawned = false;
        if(!window.goblinSpawned && GS.time >= 8 * 60) {
            window.goblinSpawned = true;
            let gx = 1500 + rand(-300, 300);
            let gy = 1500 + rand(-300, 300);
            let goblin = new Monster(gx, gy, 'goblin');
            goblin.maxHp = 1200; goblin.hp = goblin.maxHp;
            goblin.atk = 10; goblin.moveSpd = 220;  // 매우 빠름
            goblin.radius = 14;
            // 처치 시 거대 골드 보상
            goblin.onDeath = function(attacker) {
                if(attacker && attacker.type === 'hero') {
                    window.addGold(attacker, 2500);
                    addText(attacker.x, attacker.y-60, '💰 황금 고블린 +2500G!', '#fbbf24', 20);
                    spawnSpecial(this.x, this.y, '#fbbf24', 'star', 20, 250, 1.0);
                }
                showBanner('황금 고블린 처치!', '💰', attacker?.faction===player?.faction);
            };
            entities.push(goblin);
            showBanner('황금 고블린 출현! 잡아라!', '💰', true);
        }

        // 서든데스 트리거
        if(typeof suddenDeathTriggered === 'undefined') window.suddenDeathTriggered = false;
        if(!window.suddenDeathTriggered && GS.time >= 18 * 60) {
            window.suddenDeathTriggered = true;
            let sdWarn = document.getElementById('suddenDeathWarn');
            if(sdWarn) sdWarn.classList.remove('hidden');
            showBanner('⚠️ 서든데스 발동! 넥서스 HP가 빠르게 감소합니다!', '💀', true);
            
            // 서든데스 크리쳐: 양측 본진에서 동시 스폰
            let sdBlue = new Monster(300, 2700, 'boss_dragon');
            sdBlue.faction = 'RED';  // 블루 본진으로 어그로
            sdBlue.maxHp = 15000; sdBlue.hp = sdBlue.maxHp;
            sdBlue.atk = 300; sdBlue.radius = 50;
            entities.push(sdBlue);
            
            let sdRed = new Monster(2700, 300, 'boss_dragon');
            sdRed.faction = 'BLUE';  // 레드 본진으로 어그로
            sdRed.maxHp = 15000; sdRed.hp = sdRed.maxHp;
            sdRed.atk = 300; sdRed.radius = 50;
            entities.push(sdRed);
        }
        // 서든데스 중: 매 초마다 넥서스 HP 감소
        if(window.suddenDeathTriggered) {
            entities.forEach(e => {
                if(e.type === 'nexus' && !e.isDead) {
                    e.hp = Math.max(1, e.hp - e.maxHp * 0.005 * dt);  // 초당 0.5% 감소
                }
            });
        }

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
        // 미드 보스 스폰 제거됨
        } // End of PLAYING block

        entities.forEach(e=>e.update(dt)); projectiles.forEach(p=>p.update(dt));
        for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
        for(let i=floatingTexts.length-1;i>=0;i--){let ft=floatingTexts[i];ft.y+=ft.vy*dt;ft.life-=dt;if(ft.life<=0)floatingTexts.splice(i,1);}
        for(let i=slashEffects.length-1;i>=0;i--){slashEffects[i].life-=dt;if(slashEffects[i].life<=0)slashEffects.splice(i,1);}
        for(let i=earthCrackEffects.length-1; i>=0; i--) { earthCrackEffects[i].life -= dt; if(earthCrackEffects[i].life <= 0) earthCrackEffects.splice(i, 1); }
        for(let i=rockAuraEffects.length-1; i>=0; i--) { 
            let eff = rockAuraEffects[i];
            eff.life -= dt; 
            eff.rocks.forEach(r => { r.yOffset += r.speedY * dt; r.angle += dt; });
            if(eff.life <= 0) rockAuraEffects.splice(i, 1); 
        }
        for(let i=aoeEffects.length-1;i>=0;i--){aoeEffects[i].life-=dt;if(aoeEffects[i].life<=0)aoeEffects.splice(i,1);}
        for(let i=ringEffects.length-1;i>=0;i--) { ringEffects[i].life-=dt; ringEffects[i].r = ringEffects[i].maxR*(1-ringEffects[i].life/ringEffects[i].maxLife); if(ringEffects[i].life<=0) ringEffects.splice(i,1); }
        for(let i=beamEffects.length-1;i>=0;i--) { beamEffects[i].life-=dt; if(beamEffects[i].life<=0) beamEffects.splice(i,1); }
        for(let i=laserEffects.length-1;i>=0;i--) { laserEffects[i].life-=dt; if(laserEffects[i].life<=0) laserEffects.splice(i,1); }
        for(let i=stormZones.length-1;i>=0;i--) {
            let sz = stormZones[i];
            sz.life -= dt;
            if(Math.random() < 0.4) spawnBeam(sz.x+rand(-sz.radius, sz.radius), sz.y+rand(-sz.radius, sz.radius)-200, sz.x+rand(-20,20), sz.y+rand(-20,20), '#ffffff', 0.15);
            if(!sz.tickTimer) sz.tickTimer = 0;
            sz.tickTimer -= dt;
            if(sz.tickTimer <= 0) {
                sz.tickTimer = 0.5;
                entities.forEach(e => { if(e.faction !== sz.faction && !e.isDead && dist({x:sz.x,y:sz.y}, e) <= sz.radius) e.applyRawDamage(sz.dmg, sz.attacker); });
            }
            if(sz.life<=0) stormZones.splice(i,1);
        }
        
        if(window.AIChat) window.AIChat.update(dt);
        entities=entities.filter(e=>!e.isDead||e.type==='hero'||(e.type==='jungle'&&!e.mtype.includes('boss')&&e.mtype!=='summon')); projectiles=projectiles.filter(p=>!p.isDead);
        let camSmooth = GS.platform === 'MOBILE' ? 0.08 : 0.12;
        if(player&&!player.isDead){ camera.x+=(player.x-camera.x)*camSmooth; camera.y+=(player.y-camera.y)*camSmooth; }
    }

    draw(); updateUI(); requestAnimationFrame(gameLoop);
}

// ============ 렌더 ============
function draw(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.save(); 
    ctx.scale(canvasDPR, canvasDPR);
    ctx.translate(window.innerWidth/2, window.innerHeight/2); 
    ctx.scale(camera.zoom, camera.zoom); 
    ctx.translate(-camera.x, -camera.y);

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

    let all=[...entities, ...projectiles].filter(e=>!e.isDead || e.type==='hero'); all.sort((a,b)=>a.y-b.y); 
    all.forEach(e => {
        if(e.type === 'hero' || e.type === 'minion' || e.type === 'jungle') {
            ctx.save();
            if(e.airborneTimer > 0) ctx.translate(0, -Math.sin(e.airborneTimer*Math.PI) * 60);
            e.draw(ctx);
            if(!e.isDead) {
                if(e.isFrozen) {
                    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
                    ctx.fillRect(e.x - e.radius*1.5, e.y - e.radius*2.5, e.radius*3, e.radius*3);
                    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
                    ctx.strokeRect(e.x - e.radius*1.5, e.y - e.radius*2.5, e.radius*3, e.radius*3);
                    ctx.font = '24px sans-serif'; ctx.fillText('🧊', e.x - 12, e.y - e.radius*1.5);
                }
                if(e.stunTimer > 0 && !e.isFrozen) {
                    ctx.font = '24px sans-serif'; ctx.fillText('💫', e.x - 12, e.y - e.radius*2.5);
                } else if(e.slowTimer > 0 && !e.isFrozen) {
                    ctx.font = '20px sans-serif'; ctx.fillText('🐢', e.x - 10, e.y - e.radius*2.5);
                }
            }
            ctx.restore();
        } else {
            e.draw(ctx);
        }
    });

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

    earthCrackEffects.forEach(eff => {
        let alpha = eff.life / eff.maxLife;
        ctx.globalAlpha = alpha;
        ctx.save(); ctx.translate(eff.x, eff.y);
        ctx.shadowColor = eff.color; ctx.shadowBlur = 15;
        
        // 안쪽 어두운 균열 배경
        ctx.strokeStyle = '#292524'; ctx.lineWidth = 8 * alpha + 2;
        eff.lines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(line[0].x, line[0].y);
            for(let j=1; j<line.length; j++) ctx.lineTo(line[j].x, line[j].y);
            ctx.stroke();
        });
        
        // 중심부 빛나는 에너지
        ctx.strokeStyle = eff.color; ctx.lineWidth = 4 * alpha + 1;
        eff.lines.forEach(line => {
            ctx.beginPath(); ctx.moveTo(line[0].x, line[0].y);
            for(let j=1; j<line.length; j++) ctx.lineTo(line[j].x, line[j].y);
            ctx.stroke();
        });
        
        ctx.restore();
        ctx.globalAlpha = 1;
    });

    rockAuraEffects.forEach(eff => {
        let alpha = eff.life / eff.maxLife;
        ctx.globalAlpha = Math.min(1, alpha * 2);
        ctx.save(); ctx.translate(eff.x, eff.y);
        
        // 솟구치는 거대한 황금빛 오라 기둥
        let grad = ctx.createLinearGradient(0, -250, 0, 50);
        grad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        grad.addColorStop(0.5, 'rgba(250, 204, 21, '+(0.6*alpha)+')');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(0, 50, 120, 40, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(-120, -250, 240, 300);

        // 떠오르는 거대 바위 파편들
        eff.rocks.forEach(r => {
            ctx.save();
            let rx = Math.cos(r.angle) * r.dist;
            let ry = Math.sin(r.angle) * r.dist * 0.5 + r.yOffset;
            ctx.translate(rx, ry);
            ctx.rotate(r.angle * 3);
            ctx.fillStyle = '#44403c'; 
            ctx.fillRect(-r.size/2, -r.size/2, r.size, r.size);
            ctx.strokeStyle = '#facc15'; ctx.lineWidth=2;
            ctx.strokeRect(-r.size/2, -r.size/2, r.size, r.size);
            ctx.restore();
        });
        ctx.restore();
        ctx.globalAlpha = 1;
    });
    
    // 충격파 링 렌더
    ringEffects.forEach(re => {
        let alpha = (re.life / re.maxLife) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = re.color;
        ctx.lineWidth = 4 * (re.life / re.maxLife);
        ctx.beginPath(); ctx.arc(re.x, re.y, re.r, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = 1;
    });

    // 번개 빔 렌더
    laserEffects.forEach(be => {
        let alpha = (be.life / be.maxLife);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = be.color;
        ctx.lineWidth = be.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = be.color; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(be.x1, be.y1); ctx.lineTo(be.x2, be.y2); ctx.stroke();
        ctx.shadowBlur=0; ctx.globalAlpha=1; ctx.lineCap='butt';
    });
    beamEffects.forEach(be => {
        let alpha = (be.life / be.maxLife);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = be.color;
        ctx.lineWidth = 3 * alpha + 1;
        ctx.shadowColor = be.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(be.x1, be.y1);
        let dx = be.x2-be.x1, dy = be.y2-be.y1;
        be.segments.forEach((seg,i) => {
            let t=(i+1)/(be.segments.length+1);
            ctx.lineTo(be.x1+dx*t+seg.ox, be.y1+dy*t+seg.oy);
        });
        ctx.lineTo(be.x2, be.y2); ctx.stroke();
        ctx.shadowBlur=0; ctx.globalAlpha=1;
    });
    particles.forEach(p=>{
        ctx.globalAlpha=Math.max(0,p.life/p.maxLife); ctx.fillStyle=p.color;
        if(p.shape==='plus') { ctx.font='bold 20px monospace'; ctx.fillText('+', p.x, p.y); }
        else if(p.shape==='star') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life*5);
            ctx.beginPath();
            for(let i=0;i<5;i++) {
                ctx.lineTo(Math.cos((18+i*72)*Math.PI/180)*p.size, Math.sin((18+i*72)*Math.PI/180)*p.size);
                ctx.lineTo(Math.cos((54+i*72)*Math.PI/180)*p.size*0.4, Math.sin((54+i*72)*Math.PI/180)*p.size*0.4);
            }
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
        else { ctx.beginPath(); ctx.arc(p.x,p.y,p.size*Math.max(0,p.life/p.maxLife),0,Math.PI*2); ctx.fill(); }
    }); ctx.globalAlpha=1;

    floatingTexts.forEach(ft=>{ ctx.globalAlpha=Math.max(0,ft.life); ctx.fillStyle=ft.color; ctx.font='bold '+ft.size+'px monospace'; ctx.textAlign='center'; ctx.fillText(ft.text, ft.x, ft.y); }); ctx.globalAlpha=1;

    // Draw Speech Bubbles
    if(window.chatBubbles) {
        window.chatBubbles.forEach(b => {
            if(b.hero && !b.hero.isDead && b.life > 0) {
                ctx.save();
                ctx.translate(b.hero.x, b.hero.y - 75);
                ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
                let w = ctx.measureText(b.text).width + 20;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.beginPath();
                ctx.roundRect(-w/2, -22, w, 28, 10);
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.fillText(b.text, 0, -3);
                // arrow
                ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(6, 6); ctx.lineTo(0, 14); ctx.fillStyle='rgba(255, 255, 255, 0.95)'; ctx.fill();
                ctx.restore();
            }
        });
    }

    if(GS.platform==='MOBILE'&&joy.active){ ctx.restore(); ctx.save(); ctx.globalAlpha=0.4; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(joy.ox,joy.oy,50,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=0.7; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(joy.ox+joy.dx,joy.oy+joy.dy,20,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.restore(); return; }
    ctx.restore(); 
    if(GS.status === 'COUNTDOWN') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        let cdNum = Math.ceil(GS.countdownTimer);
        ctx.fillText(cdNum > 0 ? cdNum : 'START!', canvas.width/2, canvas.height/2);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText("준비하세요! 카운트다운 동안 스킬 사용이 금지됩니다.", canvas.width/2, canvas.height/2 + 60);
    }
    drawMinimap();
}

function renderInventory(){
    const inv=document.getElementById('inventorySlots');
    inv.innerHTML='';
    for(let i=0;i<16;i++){
        let d=document.createElement('div');
        d.className='w-5 h-5 md:w-10 md:h-10 bg-slate-900 border border-slate-700 rounded flex items-center justify-center text-[10px] md:text-sm relative group';
        if(player&&i<player.inventory.length){
            let item=player.inventory[i];
            let bi=[...BASE_ITEMS,...EVOLUTION_ITEMS].find(b=>b.id===item.id);
            d.innerHTML=`<div class="cursor-pointer text-[12px] md:text-xl">${bi?bi.icon:'?'}</div><div class="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[8px] md:text-[10px] font-black px-0.5 md:px-1 rounded-full">+${item.upgrade}</div>`;
        }
        inv.appendChild(d);
    }
}

function drawMinimap() {
    if (!window.mCtx) return;
    const mc = window.mCtx;
    const W  = mCanvas.width;   // 160
    const H  = mCanvas.height;  // 160

    // ── 배경 클리어 ──
    mc.clearRect(0, 0, W, H);
    mc.fillStyle = '#0f172a';
    mc.fillRect(0, 0, W, H);

    // ── 좌표 변환 헬퍼 ──
    const tx = (wx) => (wx / MAP_SIZE) * W;
    const ty = (wy) => (wy / MAP_SIZE) * H;

    // ────────────────────────────────────────
    // [1] 3라인 도로 표시 (라인 상태)
    // ────────────────────────────────────────
    const laneAlpha = 0.35;
    mc.fillStyle = `rgba(139,90,43,${laneAlpha})`;

    // 탑 라인 (좌상단 ㄱ자)
    mc.fillRect(tx(200), ty(200), tx(200), ty(2300)); // 세로 (좌측 벽)
    mc.fillRect(tx(200), ty(200), tx(2300), ty(200)); // 가로 (상단 벽)

    // 바텀 라인 (우하단 ㄱ자)
    mc.fillRect(tx(2500), ty(200), tx(200), ty(2300)); // 세로 (우측 벽)
    mc.fillRect(tx(200), ty(2500), tx(2300), ty(200)); // 가로 (하단 벽)

    // 미드 라인 (대각선)
    mc.save();
    mc.translate(W/2, H/2);
    mc.rotate(-Math.PI/4);
    mc.fillRect(-W*0.58, -H*0.035, W*1.16, H*0.07);
    mc.restore();

    // [2] 타워(라인 상태) 표시 — 잔존 여부로 라인 장악 가시화
    // [3] 영웅 및 보스 위치 표시 (핵심)
    entities.forEach(e => {
        if(e.isDead) return;
        
        let ex = tx(e.x);
        let ey = ty(e.y);

        if(e.type === 'tower' || e.type === 'nexus_turret' || e.type === 'nexus') {
            let col = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
            mc.fillStyle = col;
            mc.globalAlpha = 0.6;
            if(e.type === 'nexus') mc.fillRect(ex - 4, ey - 4, 8, 8);
            else mc.fillRect(ex - 2.5, ey - 2.5, 5, 5);
            mc.globalAlpha = 1;
        } else if(e.type === 'hero') {
            if(e === player) {
                // 플레이어: 크고 흰 테두리 + 팀 색
                mc.strokeStyle = '#ffffff';
                mc.lineWidth   = 1.5;
                mc.fillStyle   = e.faction === 'BLUE' ? '#60a5fa' : '#f87171';
                mc.beginPath(); mc.arc(ex, ey, 4.5, 0, Math.PI*2); mc.fill(); mc.stroke();
                // 플레이어 위에 삼각형 화살표
                mc.fillStyle = '#ffffff';
                mc.beginPath(); mc.moveTo(ex, ey - 7); mc.lineTo(ex - 3, ey - 13); mc.lineTo(ex + 3, ey - 13); mc.closePath(); mc.fill();
            } else {
                // AI 영웅: 팀 색 원
                mc.fillStyle = e.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
                mc.beginPath(); mc.arc(ex, ey, 3, 0, Math.PI*2); mc.fill();
            }
        } else if(e.type === 'jungle') {
            if(e.mtype && e.mtype.includes('boss')) {
                mc.fillStyle = '#dc2626';
                mc.fillRect(ex - 3, ey - 3, 6, 6);
                mc.globalAlpha = 0.85;
            }
        }
    });

    // ────────────────────────────────────────
    // [4] 카메라 시야 사각형 표시 (현재 화면 범위)
    // ────────────────────────────────────────
    if(player) {
        let visW = (window.innerWidth  / camera.zoom) / MAP_SIZE * W;
        let visH = (window.innerHeight / camera.zoom) / MAP_SIZE * H;
        let vcx  = tx(camera.x) - visW/2;
        let vcy  = ty(camera.y) - visH/2;
        mc.strokeStyle = 'rgba(255,255,255,0.25)';
        mc.lineWidth   = 1;
        mc.strokeRect(vcx, vcy, visW, visH);
    }

    // ────────────────────────────────────────
    // [5] 미니맵 테두리
    // ────────────────────────────────────────
    mc.strokeStyle = '#334155';
    mc.lineWidth   = 1.5;
    mc.strokeRect(0, 0, W, H);
}

function updateUI(){
    if(!player) return; let m=Math.floor(GS.time/60), s=Math.floor(GS.time%60); 
    document.getElementById('gameTimer').textContent=m.toString().padStart(2,'0')+':'+s.toString().padStart(2,'0');
    const timerMini = document.getElementById('gameTimerMini');
    if (timerMini) timerMini.textContent = m.toString().padStart(2,'0')+':'+s.toString().padStart(2,'0');
    
    document.getElementById('hudLevelBadge').textContent='Lv.'+player.level; document.getElementById('hudKDA').textContent='K:'+player.kills+' / D:'+player.deaths;
    document.getElementById('hudHpBar').style.width=(player.hp/player.maxHp)*100+'%'; document.getElementById('hudHpText').textContent=Math.floor(player.hp)+' / '+Math.floor(player.maxHp); document.getElementById('hudXpBar').style.width=(player.exp/player.maxExp)*100+'%';
    document.getElementById('hudGoldText').textContent=Math.floor(player.gold)+'G';
    
    const inv=document.getElementById('inventorySlots'); 
    let newInvHtml='';
    for(let i=0;i<10;i++){ 
        let item=player.inventory[i]; 
        let bi=item?[...BASE_ITEMS,...EVOLUTION_ITEMS].find(b=>b.id===item.id):null; 
        let content=item?'<div class="flex items-center justify-center w-full h-full text-[13px] md:text-base leading-none pt-0.5">'+(bi?bi.icon:'?')+'</div>'+(item.upgrade>0?'<div class="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 text-[9px] bg-rose-600 text-white rounded-[4px] px-1 py-px font-bold leading-none shadow z-10">+'+item.upgrade+'</div>':''):''; 
        newInvHtml+='<div class="relative w-7 h-7 md:w-10 md:h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">'+content+'</div>'; 
    }
    if (inv.lastHtml !== newInvHtml) { inv.innerHTML = newInvHtml; inv.lastHtml = newInvHtml; }
    // 히어로 패시브 쿨다운 표시
    let m1=document.getElementById('maskSkill1'), m2=document.getElementById('maskSkill2');
    if(m1) { if(player.heroSkill1Timer>0){m1.classList.remove('hidden');m1.textContent=player.heroSkill1Timer.toFixed(1);}else m1.classList.add('hidden'); }
    if(m2) { if(player.heroSkill2Timer>0){m2.classList.remove('hidden');m2.textContent=player.heroSkill2Timer.toFixed(1);}else m2.classList.add('hidden'); }
    
    // 액티브 아이템 표시 제거
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

function buildScoreboard() {
    const area = document.getElementById('scoreboardArea');
    if (!area) return;

    // 모든 영웅 수집
    const allHeroes = entities.filter(e => e.type === 'hero');
    const blueTeam = allHeroes.filter(e => e.faction === 'BLUE').sort((a,b) => b.kills - a.kills);
    const redTeam  = allHeroes.filter(e => e.faction === 'RED').sort((a,b) => b.kills - a.kills);

    const renderRow = (h, isPlayer) => {
        const name = HERO_TMPL[h.heroKey]?.name || h.heroKey;
        const kda = `${h.kills} / ${h.deaths} / ${h.assists || 0}`;
        const dmg = h.totalDmg >= 1000 ? (h.totalDmg/1000).toFixed(1)+'k' : Math.floor(h.totalDmg);
        const lvl = h.level;
        const playerMark = isPlayer ? ' 👑' : '';
        const rowBg = isPlayer ? 'rgba(252,211,77,0.1)' : 'transparent';
        return `
            <tr style="background:${rowBg}; ${isPlayer?'border:1px solid rgba(252,211,77,0.3);':''}">
                <td class="py-1 px-2 text-left">
                    <span class="text-xs font-bold text-white">${name}${playerMark}</span>
                    <span class="text-[9px] text-slate-400 ml-1">Lv.${lvl}</span>
                </td>
                <td class="py-1 px-2 text-center font-mono text-xs font-bold text-white">${kda}</td>
                <td class="py-1 px-2 text-center font-mono text-xs text-amber-400">${dmg}</td>
            </tr>`;
    };

    const renderTeam = (team, color, label) => `
        <div class="mb-3">
            <div class="text-xs font-black mb-1 px-1" style="color:${color}">▣ ${label}</div>
            <table class="w-full border-collapse">
                <thead>
                    <tr class="border-b border-slate-700">
                        <th class="text-[9px] text-slate-400 text-left py-0.5 px-2">영웅</th>
                        <th class="text-[9px] text-slate-400 text-center py-0.5 px-2">K/D/A</th>
                        <th class="text-[9px] text-slate-400 text-center py-0.5 px-2">딜량</th>
                    </tr>
                </thead>
                <tbody>
                    ${team.map(h => renderRow(h, h === player)).join('')}
                </tbody>
            </table>
        </div>`;

    const gameMin = Math.floor(GS.time/60), gameSec = Math.floor(GS.time%60);
    area.innerHTML = `
        <div class="text-[10px] text-slate-400 mb-3 text-center">
            경기 시간: ${String(gameMin).padStart(2,'0')}:${String(gameSec).padStart(2,'0')}
            &nbsp;|&nbsp; 블루 ${GS.scoreBlue} : ${GS.scoreRed} 레드
        </div>
        ${renderTeam(blueTeam, '#34d399', '🔵 BLUE TEAM')}
        ${renderTeam(redTeam, '#f87171', '🔴 RED TEAM')}
    `;
    if(player) {
        const totalDmg = entities.filter(e=>e.type==='hero').reduce((s,h)=>s+(h.totalDmg||0),0);
        const domPct = totalDmg > 0 ? Math.round((player.totalDmg / totalDmg) * 100) : 0;
        const kda = `${player.kills}/${player.deaths}/${player.assists||0}`;
        
        const kdaEl  = document.getElementById('kdaResult');
        const domEl  = document.getElementById('dominanceResult');
        if(kdaEl)  kdaEl.innerText  = kda;
        if(domEl)  domEl.innerText  = domPct + '%';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    autoDetectPlatform();
    
    let stats = JSON.parse(localStorage.getItem('avalon_hero_stats') || '{}');
    let maxHero = null;
    let maxCount = 0;
    for(let hk in stats) {
        if(stats[hk] > maxCount) {
            maxCount = stats[hk];
            maxHero = hk;
        }
    }
    if(maxHero && maxCount > 0) {
        let btn = document.getElementById('btnHero' + maxHero);
        if(btn) {
            btn.classList.add('relative');
            btn.innerHTML += '<div class="absolute -top-2 -right-2 bg-amber-500 text-[8px] font-bold text-white px-1 py-0.5 rounded shadow z-10 whitespace-nowrap animate-bounce">Pick!</div>';
        }
    }
});

selectHero('BERSERKER');


// ====== AI Chat & Kill Feed Systems ======
window.killStreaks = {};

window.chatBubbles = []; // For in-game speech bubbles

function getHeroName(e) {
    if(!e) return '알수없음';
    if(e.heroKey && HERO_TMPL[e.heroKey]) return HERO_TMPL[e.heroKey].name;
    if(e.type === 'tower') return '타워';
    if(e.type === 'minion') return '미니언';
    if(e.type === 'nexus') return '넥서스';
    if(e.mtype) return '몬스터';
    return '알수없음';
}

window.addKillFeed = function(attacker, victim) {
    if (!attacker || !victim) return;
    const feed = document.getElementById('killFeed');
    if (!feed) return;
    
    let aName = getHeroName(attacker);
    let vName = getHeroName(victim);
    
    if(attacker.heroKey) {
        let attackerHero = entities.find(e => e.type === 'hero' && e.heroKey === attacker.heroKey);
        let streakCount = attackerHero ? (attackerHero.killStreak || 0) : 0;
        let streakText = '';
        if (streakCount >= 2) {
            streakText = `<span class="text-amber-400 animate-pulse font-black"> [${streakCount}연속 킬!]</span>`;
            if(window.showMultiKillAnnouncer) window.showMultiKillAnnouncer(streakCount, getHeroName(attacker));
            if (window.AIChat && streakCount >= 3) window.AIChat.triggerEvent('streak', attacker, streakCount);
        }
        
        let el = document.createElement('div');
        el.className = 'text-[11px] md:text-sm font-bold bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg flex gap-2 items-center text-white animate-fade-in-down';
        let aCol = attacker.faction==='BLUE'?'#60a5fa':'#f87171';
        let vCol = victim.faction==='BLUE'?'#60a5fa':'#f87171';
        
        el.innerHTML = `<span style="color:${aCol}">${aName}</span> ⚔️ <span style="color:${vCol}">${vName}</span> ${streakText}`;
        
        feed.prepend(el);
        if(feed.children.length > 5) feed.lastChild.remove();
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            el.style.transition = 'all 0.5s';
            setTimeout(() => el.remove(), 500);
        }, 5000);
    }
};

window.addPing = function(x, y, faction, type='danger') {
    playSFX('ui');
};

window.AIChat = {
    timer: 0,
    chatLog: null,
    pendingResponses: [],
    lastTowerCount: -1,
    
    patterns: {
        game_start: [
            "다들 ㅎㅇ", "이번 판 이겨봅시다", "미드 달림", "탑 먼저 감", "정글 파밍 시작함", "던지면 바로 던짐", "바텀 든든하게 갑니다", "화이팅 해보죠", "아 첫판인데", "초반부터 빡세게 가자"
        ],
        tower_down_team: [
            "아니 타워 밀리는데 안막고 뭐함?", "탑 뚫림 방어좀", "타워 다 터지네", "핑 찍어도 안오네 진짜", "라인 관리 안하냐", "타워 피 1인데 좀 막지", "우리 타워 다날라감"
        ],
        tower_down_enemy: [
            "포탑 달달하고", "쭉 밀죠 ㄱㄱ", "운영 미쳤다", "타워 컷~", "라인전 압살이네", "우리가 이김 이거", "계속 압박하자"
        ],
        boss_kill: [
            "나이스 보스 먹었다", "이거 이겼네 ㅋㅋ", "버프 개꿀", "바론 버프 나이스", "보스컷 ㅅㄱ", "이제 밀면 끝남"
        ],
        nexus_low: [
            "아니 넥서스 점사 당하는데 뭐함?", "빨리 수비좀!!!", "끝났다 그냥 ㅈㅈ", "기방하라고 제발!!", "넥서스 터진다 아아아", "방어 안하고 다 어디감?"
        ],
        kill: [
            "컷~ ㅅㄱ", "벌레컷ㅋㅋ", "아 달다~", "?? 쟤 뭐함?", "개못하네 진짜ㅋㅋ", "꺼어어억", "잘가시고~", "딜량 실화냐?", "이게 게임이지", "나이스!", 
            "캐리머신 ON", "바닥 쓸고가네ㅋㅋ", "마우스 발로함?", "AI한테도 지냐?", "응 컷~", "너무 달달하고~", "수고링", "이걸 사네ㅋㅋ 나이스", "막타 개꿀", "센스 미쳤고", 
            "피지컬 차이ㅋㅋ", "손가락 몇개심?", "걍 지우개네 ㅋㅋ", "숨쉬듯 킬먹네", "아 너무 쉽다", "ㅋㅋ 수준", "삭제완료", "경험치 자판기네", "한대 치면 죽네", "그냥 샌드백이쥬?", 
            "살살 할게요~", "어우 눈부셔 내 피지컬", "너넨 이런거 못하지?", "아~ 꿀맛", "버스타라 걍"
        ],
        death: [
            "아니 내 백업 안오고 뭐함?", "스킬 다피했는데 이걸 억까하네", "아 ㄲㅂ", "억까 ㅈ대네", "아니 백업 좀;;", "렉걸림 ㅈㅅ", "운빨 망겜 수준", "ㅅㅂ 이게 죽어?", 
            "아니 피 1남았는데", "우리팀 뭐함?", "정글차이 개심하네", "아 핑킥 ㅈㅅ", "마우스 선 뽑힘", "저게 사네 ㅡㅡ", "밸런스 꼬라지", "아니 내 킬인데", 
            "힐 좀 주지;;", "아 눈부셔", "손 풀고 있음", "봐준거임ㅋㅋ", "진짜 억까 너무심하네", "아 샷건마렵네", "아니 팀원들 왜구경함?", "이건 억까지 ㅅㅂ", 
            "아니 딜 왜저래", "한대충 혐오스럽네", "팀운 ㅈㅈ", "아 프레임 드랍ㅡㅡ", "내가 앞에서 다맞아주는데", "저걸 못잡네", "와 저걸 사네", "버그망겜 진짜"
        ],
        team_fight_win: [
            "다 닦았죠? ㅅㄱ", "나이스 ㅋㅋ", "캐리 개꿀", "우물 대기하셈", "서렌 치셈 걍ㅋㅋ", "오합지졸이네 아주", "팀워크 미쳤다", "이게 팀이지", "걍 밀죠 ㄱㄱ", "바론이나 먹죠", 
            "게임 ㅈㄴ쉽네", "개압살ㅋㅋ", "차이 너무나고~", "전광판 싹 비웠고", "넥서스 밀자", "오픈해라 걍", "겜 끝났네 ㅅㄱ", "너무 압도적인데", "벌레들 소탕 완료", "아 달달하다", "이판 이겼네"
        ],
        team_fight_lose: [
            "아니 딜 왜저럼", "우리팀 딜러들 다어디감?", "포지션 개에반데", "서렌 치자 걍", "아니 왜 한타를 지금함?", "이걸 지네;;", "진짜 팀운 ㅈ같다", "아니 스킬 다빠졌는데 왜들어감?", "답답하네 진짜", "걍 우물에 있어라", 
            "아~ 눈물나네", "이게 게임이냐", "왜 다 던짐?", "아이고 의미없다", "이거 못막음 ㅅㄱ", "벌써 겜 터졌네", "역전 가능하냐 이거", "멘탈 나가네", "팀워크 0이네 진짜", "다 따로노네"
        ],
        streak: [
            "내가 캐리중이다", "누가 날 막냐 ㅋㅋㅋ", "핵 아님 ㅅㄱ", "손 씻고 왔다", "다 덤벼라", "나 안죽음 ㅅㄱ", "이 판은 내가 지배한다", "MVP는 내꺼", "폼 미쳤다 나", "학살 시작합니다", "그냥 신임ㅋㅋ", "누가 나좀 멈춰봐라", "이게 실력이다 벌레들아"
        ],
        response: [
            "ㅇㅈ", "ㄹㅇㅋㅋ", "니가 할말은 아님", "ㅋㅋㅋ 개웃기네", "네 다음 벌레", "입만 살았네", "조용히좀 해라", "응 니얼굴", "팩트 묵직하고", "차단함 ㅅㄱ", 
            "핑계는 ㅋㅋㅋ", "잘좀 해봐라", "싸우지마셈;;", "채팅칠 시간에 겜이나 해", "니가 젤 못해", "남탓 오지네", "ㅋㅋㅋㅋㅋ", "아 뼈맞음", "그만 싸워라 쫌", "둘다 똑같음 걍", 
            "그러는 넌 잘함?", "키보드 워리어 컷", "채팅 ㅈㄴ 치네", "응 아니야~", "니 실력이나 봐라", "웃고갑니다", "현실은 시궁창", "겜 끝나고 1:1 ㄱ?", "방빼라 그냥", "한숨만 나온다"
        ],
        emojis: {
            killer: ["😎", "😆", "🤪", "👻", "😈", "🥳", "🤣", "👅", "🔥", "✌️"],
            victim: ["🤬", "💀", "😭", "😱", "🤮", "💢", "☠️", "💧", "👎", "🤡"]
        }
    },
    
    addChat: function(hero, msg) {
        if(!this.chatLog) this.chatLog = document.getElementById('chatLog');
        if(!this.chatLog || !hero) return;
        
        // Spawn speech bubble in game
        /* Chat deleted */
        
        let aName = getHeroName(hero);
        let hCol = hero.faction === 'BLUE' ? '#60a5fa' : '#f87171';
        let bgCol = hero.faction === 'BLUE' ? 'bg-blue-950/60 border-blue-800' : 'bg-red-950/60 border-red-800';
        let align = hero.faction === 'BLUE' ? 'self-start' : 'self-end';
        
        let el = document.createElement('div');
        el.className = `text-[12px] md:text-[14px] font-bold px-3 py-1.5 rounded-xl border shadow-lg text-white w-fit ${bgCol} ${align} animate-fade-in-up`;
        
        let scope = Math.random() < 0.3 ? '[전체]' : '[팀]';
        el.innerHTML = `<span style="color:${hCol}"> ${scope} ${aName}</span>: ${msg}`;
        
        this.chatLog.append(el);
        if(this.chatLog.children.length > 8) this.chatLog.firstChild.remove();
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.8s';
            setTimeout(() => el.remove(), 800);
        }, 7000);
        
        // Tiki-taka logic
        if(Math.random() < 0.5) {
            this.pendingResponses.push({ timer: 0.5 + Math.random()*1.5, srcFaction: hero.faction, msgType: 'response' });
        }
    },
    
    onKill: function(killer, victim) {
        if(killer && killer.type === 'hero' && victim && victim.type === 'hero') {
            if(window.addText) {
                let kEmoji = this.patterns.emojis.killer[Math.floor(Math.random()*this.patterns.emojis.killer.length)];
                let vEmoji = this.patterns.emojis.victim[Math.floor(Math.random()*this.patterns.emojis.victim.length)];
                killer.emote = kEmoji; killer.emoteTimer = 3.0;
                victim.emote = vEmoji; victim.emoteTimer = 3.0;
            }
            
            // 닉네임 입력 전당 등록을 위해 KDA 및 딜량 데이터 세팅
            const kdaResult = document.getElementById('kdaResult');
            if(kdaResult) kdaResult.innerText = `${player.kills}/${player.deaths}/${player.assists||0}`;
            const domResult = document.getElementById('dominanceResult');
            
            if (Math.random() < 0.8) {
                let msg = this.patterns.kill[Math.floor(Math.random() * this.patterns.kill.length)];
                setTimeout(() => this.addChat(killer, msg), 500);
            }
            if (Math.random() < 0.8) {
                let msg = this.patterns.death[Math.floor(Math.random() * this.patterns.death.length)];
                setTimeout(() => this.addChat(victim, msg), 1500);
            }
        }
    },
    
    triggerEvent: function(type, hero, val) {
        if(!hero) return;
        let msg = '';
        if(type === 'streak' && Math.random() < 0.9) {
            msg = this.patterns.streak[Math.floor(Math.random()*this.patterns.streak.length)];
        } else if(type === 'game_start') {
            msg = this.patterns.game_start[Math.floor(Math.random()*this.patterns.game_start.length)];
        } else if(type === 'tower_down_team') {
            msg = this.patterns.tower_down_team[Math.floor(Math.random()*this.patterns.tower_down_team.length)];
        } else if(type === 'tower_down_enemy') {
            msg = this.patterns.tower_down_enemy[Math.floor(Math.random()*this.patterns.tower_down_enemy.length)];
        } else if(type === 'boss_kill') {
            msg = this.patterns.boss_kill[Math.floor(Math.random()*this.patterns.boss_kill.length)];
        } else if(type === 'nexus_low') {
            msg = this.patterns.nexus_low[Math.floor(Math.random()*this.patterns.nexus_low.length)];
        }
        if(msg) this.addChat(hero, msg);
    },
    
    update: function(dt) {
        this.timer += dt;
        
        
        // Multi-kill Hostile Emoji Meeting
        let currentHeroes = entities.filter(e => e.type === 'hero');
        currentHeroes.forEach(h => {
            if((h.killStreak || 0) >= 3) {
                if(Math.random() < 0.1) {
                    let nearEnemies = currentHeroes.filter(e => e.faction !== h.faction && dist(e, h) < 300);
                    if(nearEnemies.length > 0) {
                        let hEmoji = ['🤬', '👿', '🖕', '💢'][Math.floor(Math.random()*4)];
                        h.emote = hEmoji; h.emoteTimer = 3.0;
                    }
                }
            }
        });

        // Update pings

        
        // Update bubbles
        for(let i=window.chatBubbles.length-1; i>=0; i--) {
            window.chatBubbles[i].life -= dt;
            if(window.chatBubbles[i].life <= 0 || window.chatBubbles[i].hero.isDead) window.chatBubbles.splice(i, 1);
        }
        
        // Process Tiki-taka responses
        for(let i=this.pendingResponses.length-1; i>=0; i--) {
            let pr = this.pendingResponses[i];
            pr.timer -= dt;
            if(pr.timer <= 0) {
                let allies = entities.filter(e => e.type === 'hero' && e.faction === pr.srcFaction && !e.isDead);
                if(allies.length > 0) {
                    let responder = allies[Math.floor(Math.random() * allies.length)];
                    let msg = this.patterns.response[Math.floor(Math.random() * this.patterns.response.length)];
                    this.addChat(responder, msg);
                }
                this.pendingResponses.splice(i, 1);
            }
        }
        
        if (this.timer < 1.0) return; // Check every 1 second
        this.timer = 0;
        
        let heroes = entities.filter(e => e.type === 'hero' && !e.isDead);
        if (heroes.length === 0) return;
        
        let rHero = heroes[Math.floor(Math.random() * heroes.length)];
        
        // 1. Check Game Start
        if (GS.time < 30 && Math.random() < 0.2) {
            this.triggerEvent('game_start', rHero);
            return;
        }
        
        // 2. Check Nexus Low
        let nexuses = entities.filter(e => e.type === 'nexus');
        for(let nx of nexuses) {
            if (nx.hp / nx.maxHp < 0.5 && Math.random() < 0.3) {
                let myHeroes = heroes.filter(h => h.faction === nx.faction);
                if(myHeroes.length > 0) this.triggerEvent('nexus_low', myHeroes[Math.floor(Math.random() * myHeroes.length)]);
                return;
            }
        }
        
        // 3. Check Towers
        let towers = entities.filter(e => e.type === 'tower');
        if (this.lastTowerCount !== -1 && towers.length < this.lastTowerCount) {
            // A tower died
            let towerFactions = towers.map(t=>t.faction);
            // Guess which faction lost a tower (approximate)
            let myHeroes = heroes.filter(h => h.faction === rHero.faction);
            let enemyHeroes = heroes.filter(h => h.faction !== rHero.faction);
            if(myHeroes.length > 0) this.triggerEvent('tower_down_team', myHeroes[Math.floor(Math.random()*myHeroes.length)]);
            if(enemyHeroes.length > 0) this.triggerEvent('tower_down_enemy', enemyHeroes[Math.floor(Math.random()*enemyHeroes.length)]);
            this.lastTowerCount = towers.length;
            return;
        }
        this.lastTowerCount = towers.length;
        
        // 4. Team fights
        if(Math.random() < 0.3) {
            let closeAllies = heroes.filter(h => h.faction === rHero.faction && dist(h, rHero) < 400);
            let closeEnemies = heroes.filter(h => h.faction !== rHero.faction && dist(h, rHero) < 400);
            
            if (closeAllies.length >= 2 && closeEnemies.length >= 2) {
                // Team fight happening
                if (rHero.hp / rHero.maxHp > 0.7) {
                    this.addChat(rHero, this.patterns.team_fight_win[Math.floor(Math.random() * this.patterns.team_fight_win.length)]);
                } else {
                    this.addChat(rHero, this.patterns.team_fight_lose[Math.floor(Math.random() * this.patterns.team_fight_lose.length)]);
                    window.addPing(rHero.x, rHero.y, rHero.faction);
                }
                return;
            }
        }
    }
};



window.showMultiKillAnnouncer = function(count, heroName) {
    const texts = { 2:'DOUBLE KILL!', 3:'TRIPLE KILL!', 4:'QUADRA KILL!', 5:'PENTA KILL!', 6:'LEGENDARY KILL!', 7:'HEPTA KILL!', 8:'OCTA KILL!', 9:'NONA KILL!', 10:'DECA KILL!' };
    let t = count <= 10 ? texts[count] : 'GODLIKE!';
    let el = document.getElementById('multiKillAnnouncer');
    let textEl = document.getElementById('multiKillText');
    if(!el || !textEl) return;
    textEl.innerHTML = `<div class="text-2xl md:text-4xl text-white mb-2 drop-shadow-md font-sans">[${heroName||'알수없음'}]이(가) 날뛰고 있습니다!</div><div>${t}</div>`;
    el.classList.remove('hidden');
    textEl.style.opacity = '1';
    textEl.style.transform = 'scale(1)';
    playSFX('skill_cast');
    setTimeout(() => {
        textEl.style.opacity = '0';
        textEl.style.transform = 'scale(1.5)';
        setTimeout(() => { el.classList.add('hidden'); }, 300);
    }, 2000);
};

window.showBuffAnnouncer = function(msg) {
    let el = document.getElementById('buffAnnouncer');
    let textEl = document.getElementById('buffAnnouncerText');
    if(!el || !textEl) return;
    textEl.innerText = msg;
    el.classList.remove('hidden');
    playSFX('heal');
    setTimeout(() => {
        el.classList.add('hidden');
    }, 3000);
};

window.saveAndReload = function() {
    let name = document.getElementById('playerNameInput').value || '익명';
    let dominance = document.getElementById('dominanceResult').innerText;
    let kda = document.getElementById('kdaResult').innerText;
    
    if(player && HERO_TMPL) {
        let record = {
            name: name,
            hero: HERO_TMPL[player.heroKey].name,
            kda: kda,
            dominance: dominance,
            date: new Date().toLocaleDateString()
        };
        
        let hof = JSON.parse(localStorage.getItem('avalon_hof') || '[]');
        hof.push(record);
        if(hof.length > 20) hof.shift();
        localStorage.setItem('avalon_hof', JSON.stringify(hof));
    }
    location.reload();
};

window.showHoF = function() {
    let hof = JSON.parse(localStorage.getItem('avalon_hof') || '[]');
    let tbody = document.getElementById('hofTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    if(hof.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-400">기록이 없습니다.</td></tr>';
    } else {
        hof.slice().reverse().forEach(r => {
            tbody.innerHTML += `
            <tr class="border-t border-slate-700">
                <td class="p-2">${r.name}</td>
                <td class="p-2">${r.hero}</td>
                <td class="p-2 text-center text-amber-400 font-bold">${r.kda}</td>
                <td class="p-2 text-right text-emerald-400 font-bold">${r.dominance}</td>
            </tr>`;
        });
    }
    
    document.getElementById('hofScreen').classList.remove('hidden');
};
