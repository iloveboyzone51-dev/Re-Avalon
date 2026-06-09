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

function playSFX(type) {
    if (!GS.sfxEnabled || !audioCtx) return;
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
    BERSERKER: { name:"광전사", color:"#ef4444", hp:1900, atk:52, aspd:1.3, move:185, range:90,  type:"melee", role_desc:"[근접 / 브루저 / 광역 제어]",
        skill1:{name:"회전 참격",cd:5, desc:"주변 반경 내 적들에게 광역 데미지를 주고 0.5초 기절시킵니다."}, 
        skill2:{name:"도약 강타",cd:8, desc:"대상에게 도약하여 주변에 큰 데미지를 주고 1.5초 기절시킵니다."},  
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'berserker',anim) },
    ARCHER:    { name:"궁수",    color:"#10b981", hp:1300, atk:35, aspd:1.3, move:165, range:420, type:"ranged", role_desc:"[원거리 / 지속 딜러 / 순간 회피]",
        skill1:{name:"화살 폭우",cd:6, desc:"단일 대상에게 연속으로 화살을 발사하여 큰 데미지를 줍니다."}, 
        skill2:{name:"블링크",  cd:10, desc:"전방으로 순간이동하며 5초간 공격속도가 50% 증가합니다."}, 
        critChance:0.15, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'archer',anim) },
    NECROMANCER:{ name:"네크로맨서",color:"#a855f7",hp:1400, atk:38, aspd:1.0, move:150, range:360, type:"ranged", role_desc:"[원거리 / 마법사 / 소환]",
        skill1:{name:"해골 소환",cd:7, desc:"적의 어그로를 끄는 근접 해골 미니언을 소환합니다."}, 
        skill2:{name:"저주 역병",cd:11, desc:"넓은 범위에 도트 데미지를 주며 이동속도를 크게 감소시킵니다."}, 
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'necromancer',anim) },
    grrr: { name:'그르르', color:"#f59e0b", hp:1600, atk:70, aspd:0.9, move:150, range:60, type:"melee", role_desc:"[근접 / 탱커 / 폭주]",
        skill1:{name:'거대화', type:'self_buff', cd:18, desc:'일정 시간 동안 크기가 커지며 최대 체력/방어/공속/이속이 폭증합니다.'},
        skill2:{name:'포효', type:'aoe_stun', cd:12, desc:'크게 포효하여 주변의 모든 적을 2초간 강력하게 기절시킵니다.'},
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'grrr',anim) },
    VAMPIRE:   { name:"뱀파이어",color:"#f43f5e", hp:1700, atk:45, aspd:1.2, move:175, range:110, type:"melee", role_desc:"[근접 / 암살자 / 피흡]",
        skill1:{name:"흡혈 파동",cd:7, desc:"전방 부채꼴 범위의 적들에게 데미지를 주고 데미지 비례 체력을 회복합니다."}, 
        skill2:{name:"박쥐 강습",cd:9, desc:"적의 배후로 순간이동하며 데미지를 주고 1.5초간 기절시킵니다."},  
        lifeSteal:0.20, draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'vampire',anim) },
    THOR:      { name:"토르",    color:"#60a5fa", hp:2300, atk:65, aspd:0.85,move:175, range:100, type:"melee", role_desc:"[근접 / 마법사 / 광역 폭딜]",
        skill1:{name:"번개 강타",cd:9, desc:"목표물에 번개를 떨어뜨려 주변에 큰 데미지와 스턴을 부여합니다."}, 
        skill2:{name:"충격파",  cd:11, desc:"주변 넓은 범위에 매우 큰 데미지를 주고 적들을 밀어내며 에어본시킵니다."}, 
        draw:(ctx,x,y,r,dir,f,anim)=>drawBlockyHero(ctx,x,y,r,dir,f,'thor',anim) },
    ICEBORN: {
        name:"이스버그", color:"#38bdf8",
        hp:2200, atk:48, aspd:1.24, move:160, range:220, type:"ranged", role_desc:"[중거리 / 마법사 / 빙결 제어]",
        skill1: { name:"빙결 창격", cd:7, desc:"전방 원뿔형 범위에 얼음 창을 투척하여 데미지를 주고 적 이동속도 60% 감소 2.5초" },
        skill2: { name:"얼음 감옥", cd:14, desc:"대상 위치에 얼음 기둥 소환. 반경 100 내 적 2초 완전 빙결(스턴)" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'iceborn',anim)
    },
    JOKER: {
        name:"조커블레이드", color:"#a855f7",
        hp:1400, atk:42, aspd:1.82, move:175, range:360, type:"ranged", role_desc:"[원거리 / 딜러 / 도박]",
        critChance:0.12,
        skill1: { name:"왕의 패", cd:8, desc:"카드 3장을 무작위로 뽑음. 각각 공격/방어/공속 버프 등 무작위 효과 발동" },
        skill2: { name:"전체 배팅", cd:16, desc:"현재 소지 골드에 비례한 막대한 피해량 폭발. (모 아니면 도)" },
        draw:(ctx,x,y,r,dir,f,anim) => drawBlockyHero(ctx,x,y,r,dir,f,'joker',anim)
    },
    DARKPRIEST: {
        name:"암흑사제", color:"#7c3aed",
        hp:1500, atk:35, aspd:1.3, move:155, range:380, type:"ranged", role_desc:"[원거리 / 서포터 / 디버퍼]",
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
    { id:'bork',     name:'몰락한 왕의 검',cost:500, stat:'bork',     val:1,    icon:'🗡️', desc:'적 현재 체력 비례 추가 피해' },
    { id:'warmog',   name:'워모그의 갑옷',cost:500, stat:'warmog',   val:1,    icon:'💚', desc:'비전투 시 체력 대폭 회복' },
    { id:'mage_staff',name:'현자의 지팡이',cost:450, stat:'cdr',      val:0.15, icon:'🔮', desc:'스킬 쿨타임 감소 및 데미지 증가' },
    { id:'hourglass',name:'시공의 모래시계',cost:600, stat:'zhonya', val:1,    icon:'⏳', desc:'사용 시 2.5초간 무적 (쿨 90초)' },
    { id:'giant_slayer',name:'거인 학살자',cost:500, stat:'giant_slayer',val:0.03,icon:'🏹', desc:'적 최대 체력 비례 고정 피해' },
    { id:'legion_shield',name:'군단의 방패',cost:450, stat:'shield',  val:20,   icon:'🔰', desc:'아군 방어력 증가 오라' }
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
    { id:'divine_shield', name:'신성한 방패', reqItem:'shield', reqPassive:'guardian_bond', desc:'[진화] 거대 방어막 및 주변 아군 방어력 급격 증가', icon:'🛡️', stat:'divine_shield', val:800 },
    { id:'frozen_heart', name:'얼어붙은 심장', reqItem:'reflect', reqPassive:'frost', desc:'[진화] 피격 시 적의 공속/이속 대폭 감소', icon:'❄️', stat:'frozen_heart', val:0.3 },
    { id:'sunfire_cape', name:'태양불꽃 망토', reqItem:'hp', reqPassive:'fireRing', desc:'[진화] 체력 극대화 및 화염 고리 강화', icon:'🔥', stat:'sunfire', val:3000 },
    { id:'archmage_staff', name:'대마법사의 지팡이', reqItem:'mage_staff', reqPassive:'haste_art', desc:'[진화] 쿨감 극대화 및 스킬 사용 시 이속 폭증', icon:'🔮', stat:'archmage', val:0.35 },
    { id:'zeus_bracelet', name:'번개신의 팔찌', reqItem:'stun', reqPassive:'chainLightning', desc:'[진화] 타격 시 연쇄 번개 강화 및 확정 기절', icon:'⚡', stat:'zeus', val:0.2 },
    { id:'eye_of_storm', name:'폭풍의 눈', reqItem:'move', reqPassive:'stormWalker', desc:'[진화] 이속 극대화 및 번개 구름 아군 이속 버프', icon:'🌪️', stat:'storm_eye', val:60 },
    { id:'vampiric_cloak', name:'흡혈마의 망토', reqItem:'vamp', reqPassive:'healing_spring', desc:'[진화] 흡혈 극대화 및 내 흡혈량으로 아군 회복', icon:'🩸', stat:'vampiric', val:0.3 },
    { id:'phantom_dagger', name:'환영의 단검', reqItem:'crit', reqPassive:'mirrorImage', desc:'[진화] 크리티컬 증가 및 복제본 도발 강화', icon:'🪞', stat:'phantom', val:0.25 },
    { id:'hourglass_fate', name:'운명의 모래시계', reqItem:'hourglass', reqPassive:'meteor', desc:'[진화] 경직 시 유성우 폭발 및 쿨타임 감소', icon:'⏳', stat:'fate_zhonya', val:1 },
    { id:'demonfire_blade', name:'화염마귀의 검', reqItem:'burn', reqPassive:'bombTrail', desc:'[진화] 평타 타격 시 대상 위치 폭탄 폭발', icon:'🧨', stat:'demonfire', val:100 },
    { id:'oracle_glory', name:'오라클의 영광', reqItem:'legion_shield', reqPassive:'war_anthem', desc:'[진화] 방어 오라 극대화 및 1회 부활 지원', icon:'🔰', stat:'oracle_glory', val:30 },
    { id:'berserker_axe', name:'광전사의 도끼', reqItem:'aspd', reqPassive:'ironHealth', desc:'[진화] 잃은 체력 비례 공속 증가 및 피흡', icon:'🪓', stat:'berserker', val:0.5 }
];

// ============ 전역 상태 ============
let GS = { status:'TITLE', platform:'PC', faction:'BLUE', hero:'grrr', time:0, lastFrame:0, paused:false, autoSkill:false, hitStopTimer:0, sfxEnabled:true };
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

let beamEffects = [];    // 빔/번개 효과
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
function drawBlockyHero(ctx, x, y, r, dir, faction, type, attackAnimTimer = 0) {
    let rotDir = dir < 0 ? -1 : 1;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.8, r*0.7, r*0.25, 0, 0, Math.PI*2); ctx.fill();
    
    let anim = Math.sin(performance.now()/150);
    let lx = anim * r * 0.2;
    
    let isAttacking = attackAnimTimer > 0;
    
    ctx.save();
    
    // 뱀파이어 돌진(Dash) 애니메이션 처리
    if(type === 'vampire' && isAttacking) {
        ctx.translate(dir * r * 1.5, 0); // 뱀파이어 전체 몸 돌진
    }
    
    if(dir < 0) { ctx.translate(x*2, 0); ctx.scale(-1, 1); } // 좌우 반전

    // 팀 식별띠
    let fCol = faction === 'BLUE' ? '#3b82f6' : '#ef4444';

    // 기본 바디 그리기 함수
    const drawBody = (skin, shirt, pants) => {
        ctx.save();
        // 상체 회전 (공격 시 아주 크게 기울어짐)
        if(isAttacking && type !== 'vampire') {
            ctx.translate(x, y); ctx.rotate((Math.PI/4) * rotDir); ctx.translate(-x, -y); // 45도 기울어짐
        }
        
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
        ctx.restore();
    };

    if(type === 'berserker') {
        drawBody('#fca5a5', '#475569', '#1e293b'); // 바바리안/기사 느낌
        // 철 투구
        ctx.fillStyle = '#64748b'; ctx.fillRect(x-r*0.45, y-r*1.0, r*0.9, r*0.3);
        ctx.fillRect(x-r*0.1, y-r*0.7, r*0.2, r*0.4); // 코보호대
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.8, y+r*0.4);
            ctx.rotate(Math.PI * 0.7 * rotDir); // 180도 가깝게 크게 내리친 포즈
        } else {
            ctx.translate(x+r*0.5, y-r*0.3);
            ctx.rotate(-Math.PI * 0.1 * rotDir); // 평소 포즈
        }
        // 대검 (아주 큼직하게)
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(-r*0.1, -r*1.5, r*0.2, r*2.0);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(-r*0.3, -r*0.2, r*0.6, r*0.15); // 크로스가드
        ctx.restore();
        
    } else if(type === 'archer') {
        drawBody('#fde047', '#22c55e', '#14532d');
        // 초록 후드
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.6); ctx.lineTo(x+r*0.5, y-r*0.6); ctx.lineTo(x, y-r*1.2); ctx.closePath(); ctx.fill();
        
        ctx.save();
        if (isAttacking) {
            ctx.translate(x+r*0.6, y);
            ctx.rotate(Math.PI * 0.1);
        } else {
            ctx.translate(x+r*0.6, y);
        }
        
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r*0.6, -Math.PI*0.4, Math.PI*0.4); ctx.stroke(); // 활대
        
        let pull = isAttacking ? r*0.8 : 0; // 뒤로 크게 당긴 포즈
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.cos(-Math.PI*0.4)*r*0.6, Math.sin(-Math.PI*0.4)*r*0.6); ctx.lineTo(-pull, 0); ctx.lineTo(Math.cos(Math.PI*0.4)*r*0.6, Math.sin(Math.PI*0.4)*r*0.6); ctx.stroke(); // 활시위
        
        if(isAttacking) { // 장전된 화살
            ctx.fillStyle = '#94a3b8'; ctx.fillRect(-pull, -1, r*1.2, 2);
        }
        ctx.restore();
        
    } else if(type === 'necromancer') {
        drawBody('#e9d5ff', '#7c3aed', '#4c1d95');
        // 보라 마법사 모자
        ctx.fillStyle = '#6d28d9'; ctx.fillRect(x-r*0.6, y-r*0.9, r*1.2, r*0.15);
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9); ctx.lineTo(x+r*0.4, y-r*0.9); ctx.lineTo(x, y-r*1.5); ctx.closePath(); ctx.fill();
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.7, y-r*0.6);
            ctx.rotate((Math.PI/2) * rotDir); // 지팡이를 앞으로 겨누는 포즈
        } else {
            ctx.translate(x+r*0.55, y-r*0.3);
            ctx.rotate(0);
        }
        ctx.fillStyle = '#475569'; ctx.fillRect(-r*0.05, -r*0.7, r*0.1, r*1.3);
        ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.arc(0, -r*0.8, r*0.3, 0, Math.PI*2); ctx.fill();
        if(isAttacking) {
            ctx.fillStyle = 'rgba(192, 132, 252, 0.8)'; ctx.beginPath(); ctx.arc(0, -r*0.8, r*0.6, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        
    } else if(type === 'mechanic') {
        drawBody('#fed7aa', '#d97706', '#78350f');
        // 고글
        ctx.fillStyle = '#1e293b'; ctx.fillRect(x-r*0.4, y-r*0.75, r*0.8, r*0.2);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(x-r*0.25, y-r*0.72, r*0.15, r*0.14); ctx.fillRect(x+r*0.1, y-r*0.72, r*0.15, r*0.14);
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.3, y-r*0.2);
            ctx.rotate(-Math.PI * 0.1 * rotDir); // 총구 들림 (반동)
        } else {
            ctx.translate(x+r*0.4, y-r*0.1);
        }
        ctx.fillStyle = '#475569'; ctx.fillRect(0, 0, r*0.8, r*0.3); // 큼직한 총
        ctx.fillStyle = '#0f172a'; ctx.fillRect(r*0.5, -r*0.1, r*0.4, r*0.4);
        if(isAttacking) { // 총구 화염 포즈
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(r*0.9, r*0.15, r*0.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        
    } else if(type === 'vampire') {
        drawBody('#fecdd3', '#1c1917', '#0c0a09');
        // 망토
        let capeSway = isAttacking ? r * 0.8 : 0; // 망토 펄럭임
        ctx.fillStyle = '#9f1239'; 
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.3); ctx.lineTo(x-r*0.8-capeSway, y+r*0.8); ctx.lineTo(x-r*0.2, y+r*0.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.4, y-r*0.3); ctx.lineTo(x+r*0.8-capeSway, y+r*0.8); ctx.lineTo(x+r*0.2, y+r*0.5); ctx.closePath(); ctx.fill();
        // 눈 빨갛게
        ctx.fillStyle = '#ef4444'; ctx.fillRect(x-r*0.2, y-r*0.7, r*0.1, r*0.1); ctx.fillRect(x+r*0.1, y-r*0.7, r*0.1, r*0.1);
        // 잔상
        if(isAttacking) {
            ctx.fillStyle = 'rgba(244,63,94,0.3)'; ctx.beginPath(); ctx.arc(x-dir*r*1.5, y, r, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x-dir*r*0.8, y, r, 0, Math.PI*2); ctx.fill();
        }
        
        } else if(type === 'grrr') {
        drawBody('#d97706', '#92400e', '#78350f');
        // 사자 갈기 (더 풍성하게)
        ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, -r*0.6, r*0.9, 0, Math.PI*2); ctx.fill();
        // 머리 
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, -r*0.6, r*0.6, 0, Math.PI*2); ctx.fill();
        // 귀 
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(-r*0.5, -r*1.1, r*0.25, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.5, -r*1.1, r*0.25, 0, Math.PI*2); ctx.fill();
        // 눈 (야성적인 붉은 눈)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-r*0.3, -r*0.7, r*0.15, r*0.1); 
        ctx.fillRect(r*0.15, -r*0.7, r*0.15, r*0.1);
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*1.2*rotDir, y);
            // 앞발 공격
            ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    } else if(type === 'thor') {
        drawBody('#bfdbfe', '#2563eb', '#1e3a8a');
        // 헬멧 (날개)
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x-r*0.4, y-r*0.9, r*0.8, r*0.2);
        ctx.beginPath(); ctx.moveTo(x-r*0.4, y-r*0.9); ctx.lineTo(x-r*0.7, y-r*1.1); ctx.lineTo(x-r*0.4, y-r*0.7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.4, y-r*0.9); ctx.lineTo(x+r*0.7, y-r*1.1); ctx.lineTo(x+r*0.4, y-r*0.7); ctx.closePath(); ctx.fill();
        // 묠니르
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.9, y+r*0.5);
            ctx.rotate(Math.PI * 0.8 * rotDir); // 망치를 크게 내리찍은 포즈
        } else {
            ctx.translate(x+r*0.5, y-r*0.2);
        }
        ctx.fillStyle = '#475569'; ctx.fillRect(-r*0.05, -r*0.5, r*0.15, r*1.0); // 자루
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(-r*0.35, -r*0.9, r*0.7, r*0.4); // 쇠부분 크게
        if(isAttacking) {
            ctx.fillStyle = 'rgba(96,165,250,0.8)';
            ctx.beginPath(); ctx.arc(0, -r*0.7, r*1.2, 0, Math.PI*2); ctx.fill(); // 번개 이펙트
        }
        ctx.restore();
    } else if (type === 'iceborn') {
        drawBody('#e0f2fe', '#0ea5e9', '#0284c7');
        // 얼음 창
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.9, y);
            ctx.rotate(Math.PI * 0.3 * rotDir);
        } else {
            ctx.translate(x+r*0.5, y-r*0.2);
        }
        ctx.fillStyle = '#bae6fd'; ctx.fillRect(-r*0.05, -r*1.5, r*0.1, r*3.0);
        ctx.fillStyle = '#38bdf8'; 
        ctx.beginPath(); ctx.moveTo(-r*0.2, -r*1.5); ctx.lineTo(r*0.2, -r*1.5); ctx.lineTo(0, -r*2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
    } else if (type === 'joker') {
        drawBody('#fdf4ff', '#9333ea', '#581c87');
        // 조커 모자
        ctx.fillStyle = '#a855f7';
        ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.9); ctx.lineTo(x-r*0.8, y-r*1.5); ctx.lineTo(x-r*0.1, y-r*1.1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+r*0.5, y-r*0.9); ctx.lineTo(x+r*0.8, y-r*1.5); ctx.lineTo(x+r*0.1, y-r*1.1); ctx.fill();
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.8, y-r*0.3);
            ctx.rotate(Math.PI * 0.4 * rotDir);
        } else {
            ctx.translate(x+r*0.6, y);
        }
        // 카드 쥐고 있는 손
        ctx.fillStyle = '#f87171'; ctx.fillRect(0, -r*0.5, r*0.4, r*0.6);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-r*0.1, -r*0.4, r*0.6, r*0.4);
        ctx.restore();
    } else if (type === 'darkpriest') {
        drawBody('#f3f4f6', '#4c1d95', '#1e1b4b');
        // 후드
        ctx.fillStyle = '#312e81';
        ctx.beginPath(); ctx.arc(x, y-r*0.8, r*0.6, 0, Math.PI*2); ctx.fill();
        // 사악한 지팡이
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.8, y-r*0.5);
            ctx.rotate(Math.PI * 0.5 * rotDir);
        } else {
            ctx.translate(x+r*0.6, y-r*0.2);
        }
        ctx.fillStyle = '#374151'; ctx.fillRect(-r*0.05, -r*1.2, r*0.1, r*2.0);
        ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(0, -r*1.2, r*0.3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
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
    }
    update(dt){
        if(this.isDead) return;
        if(this.invincibleTimer>0) {
            this.invincibleTimer-=dt;
            this.vx=0; this.vy=0;
            return;
        }
        if(this.hitFlashTimer>0) this.hitFlashTimer-=dt;
        if(this.curseTimer>0) this.curseTimer-=dt;
        if(this.airborneTimer>0) this.airborneTimer-=dt;
        if(this.slowTimer > 0) this.slowTimer -= dt;
        if(this.stunTimer>0){ 
            this.stunTimer-=dt; 
            if(this.stunTimer<=0) this.isFrozen=false;
            return; 
        }
        let spdMult = (this.slowTimer > 0) ? (1 - this.slowRate) : 1;
        this.x=clamp(this.x+this.vx*dt*spdMult, 10, MAP_SIZE-10);
        this.y=clamp(this.y+this.vy*dt*spdMult, 10, MAP_SIZE-10);
        this.attackTimer-=dt;
        this.lastAttackedTimer=Math.max(0, this.lastAttackedTimer-dt);
        this.animPhase+=dt*3; if(this.emoteTimer>0){this.emoteTimer-=dt; if(this.emoteTimer<=0)this.emote=null;}
        
        let home = this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
        if(dist(this, home) < 400 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * dt);
            if(Math.random()<0.05) { spawnParticles(this.x,this.y-10,'#22c55e',3,50,0.5); addText(this.x,this.y-this.radius-20,'\u2795','#22c55e',20); }
            if(Math.random()<0.01 && !this.emote) { this.emote = ['🤤','👼','💖'][Math.floor(Math.random()*3)]; this.emoteTimer=2; }
        }

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
        if(this.isDead || this.invincibleTimer > 0) return 0;
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
        if(this.defense > 0) dmg = dmg * (100 / (100 + this.defense));
        
        if(this.shield > 0) {
            let absorbed = Math.min(this.shield, dmg);
            this.shield -= absorbed;
            dmg -= absorbed;
            if(absorbed > 0) addText(this.x, this.y-this.radius-10, '🔰'+Math.floor(absorbed), '#60a5fa', 12);
            if(dmg <= 0) return 0;
        }

        if(this.curseTimer > 0) dmg *= 1.3;
        this.hp-=dmg;
        
        if (this.passiveSkills && this.passiveSkills['mirrorImage'] > 0) {
            if(Math.random() < 0.15 + (this.passiveSkills['mirrorImage']-1)*0.05) {
                this.shadowClones = this.shadowClones || [];
                this.shadowClones.push({x:this.x+rand(-50,50),y:this.y+rand(-50,50),life:5,atk:this.atk*0.5,animPhase:Math.random()*Math.PI*2});
            }
        }
        
        // 정글몹 어그로 반격 로직 추가
        if(this.type === 'jungle' && attacker && !attacker.isBuilding) this.aggroTarget = attacker;

        if(triggerEffects && this.reflectRate>0 && attacker && !attacker.isBuilding){
            let ref=dmg*this.reflectRate; attacker.hp-=ref; addText(attacker.x, attacker.y-25, Math.floor(ref), '#e879f9', 12);
        }
        
        let color = attacker===player?'#fbbf24':(attacker&&attacker.faction==='BLUE'?'#60a5fa':'#f87171');
        spawnParticles(this.x, this.y-this.radius*0.5, color, 5, 80, 0.3);
        
        let isCrit = amount > (attacker?attacker.atk*1.5:0);
        
        addText(this.x+rand(-15,15), this.y-this.radius-10, isCrit?'\u{1F4A5}'+Math.floor(dmg)+'!':Math.floor(dmg), isCrit?'#ef4444':(attacker===player?'#fbbf24':'#f8fafc'), isCrit?28:14);

        // 히트 플래시 (번쩍임 효과)
        this.hitFlashTimer = 0.1;

        if(this.hp<=0){ this.hp=0; this.isDead=true; if(attacker&&attacker.onKill) attacker.onKill(this); this.onDeath(attacker); }
        if (attacker === player || this === player) {
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
        this.baseAspd=t.aspd; this.aspd=t.aspd; this.baseMoveSpd=t.move; this.moveSpd=t.move;
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
        if(this.attackAnimTimer > 0) this.attackAnimTimer -= dt;
        if(this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if(this.zhonyaTimer > 0) this.zhonyaTimer -= dt;
        // 자연 골드 및 EXP 획득 (패시브)
        if(!this.isDead) {
            this.gold += dt * 4;
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
                entities.forEach(e=>{if(e.faction!==this.faction&&!e.isDead&&dist(pz,e)<=pz.radius) e.applyRawDamage(pz.dmg*0.5,this);}); }
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
            if(joy.active){ this.vx=(joy.dx/50)*this.moveSpd; this.vy=(joy.dy/50)*this.moveSpd; if(joy.dx<0) this.facingDir=-1; else if(joy.dx>0) this.facingDir=1; }
        }
        let len=Math.hypot(this.vx,this.vy); if(len>this.moveSpd){ this.vx=this.vx/len*this.moveSpd; this.vy=this.vy/len*this.moveSpd; }
    }
    handleAI(dt){
        if(this.isDead || this.stunTimer>0) return;

        let myBase = this.faction==='BLUE' ? {x:300,y:2700} : {x:2700,y:300};
        if(dist(this, myBase) < 400) {
            this.aiShopTimer-=dt; if(this.aiShopTimer<=0){ this.aiShopAI(); this.aiShopTimer=5; }
        }

        let hpRatio = this.hp/this.maxHp;
        
        let nearEnemies = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(this,e)<600);
        
        
        // Recalculate stats handled in calculateDynamicStats
        let t = HERO_TMPL[this.heroKey];
        if(t) {
            // Stats are now centrally managed in calculateDynamicStats.
        }
        let oldState = this.aiState;


        // 1차 AI: 체력 기반 로직만 적용
        if (hpRatio <= 0.3) {
            let weakestEnemy = nearEnemies.sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
            if (weakestEnemy && (weakestEnemy.hp/weakestEnemy.maxHp) <= 0.1) {
                this.aiState = 'ATTACK'; // 적 체력이 10% 이하면 추격 유지
            } else {
                this.aiState = 'RETREAT'; // 내 체력이 30% 이하 시 후퇴
            }
        } else if (nearEnemies.length > 0) {
            this.aiState = 'ATTACK';
        } else {
            this.aiState = 'LANE';
        }

        if (oldState !== this.aiState) {
            this.aiStateChangedAt = GS.time;
            this.aiChasing = false;
        }

        // --- 2. 상태별 행동 실행 ---
        let tx = 1500, ty = 1500; // default
        let target = null;

        // 이동 헬퍼 함수 (히스테리시스 적용)
        const moveToTarget = (t, startDist, stopDist) => {
            let d = dist(this, t);
            if (this.aiChasing && d <= stopDist) this.aiChasing = false;
            else if (!this.aiChasing && d >= startDist) this.aiChasing = true;

            if (this.aiChasing) {
                let a = Math.atan2(t.y-this.y, t.x-this.x);
                this.vx = Math.cos(a)*this.moveSpd; this.vy = Math.sin(a)*this.moveSpd;
                this.facingDir = t.x < this.x ? -1 : 1;
            } else {
                this.vx = 0; this.vy = 0;
                this.facingDir = t.x < this.x ? -1 : 1;
            }
        };

        switch(this.aiState) {
            case 'RETREAT':
                tx = myBase.x; ty = myBase.y;
                let underEnemyTower1 = entities.some(t=>(t.type==='tower'||t.type==='nexus_turret') && t.faction!==this.faction && !t.isDead && dist(this,t)<t.range+50);
                if (underEnemyTower1 && hpRatio < 0.7) {
                    let a = Math.atan2(myBase.y-this.y, myBase.x-this.x);
                    this.vx = Math.cos(a)*this.moveSpd; this.vy = Math.sin(a)*this.moveSpd;
                    break;
                }
                if(dist(this, myBase) < 150) { this.vx=0; this.vy=0; } // 힐링
                else {
                    let a = Math.atan2(ty-this.y, tx-this.x);
                    this.vx = Math.cos(a)*this.moveSpd; this.vy = Math.sin(a)*this.moveSpd;
                    this.facingDir = tx < this.x ? -1 : 1;
                }
                break;

            case 'ATTACK':
                target = nearEnemies.sort((a,b) => dist(this,a) - dist(this,b))[0];
                if(target) moveToTarget(target, this.range * 0.8, this.range * 0.4);
                
                if(this.heroSkill1Timer <= 0) this.useSkill(1);
                else if(this.heroSkill2Timer <= 0) this.useSkill(2);
                break;

            case 'LANE':
            default:
                if(this.laneRole === 'top') { tx = 300; ty = 300; }
                else if(this.laneRole === 'bot') { tx = 2700; ty = 2700; }
                
                if(dist(this, {x:tx, y:ty}) < 400) {
                    let enemyBase = this.faction==='BLUE'?{x:2700,y:300}:{x:300,y:2700};
                    tx = enemyBase.x; ty = enemyBase.y;
                }
                
                let targetEnemy = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(this,e)<this.range).sort((a,b)=>dist(this,a)-dist(this,b))[0];
                if(targetEnemy) {
                    this.vx=0; this.vy=0;
                    this.facingDir = targetEnemy.x < this.x ? -1 : 1;
                    if(this.heroSkill1Timer <= 0) this.useSkill(1);
                } else {
                    let underEnemyTower = entities.some(t=>(t.type==='tower'||t.type==='nexus_turret') && t.faction!==this.faction && !t.isDead && dist(this,t)<t.range+50);
                    if (underEnemyTower && hpRatio < 0.7) {
                        let a = Math.atan2(myBase.y-this.y, myBase.x-this.x);
                        this.vx = Math.cos(a)*this.moveSpd; this.vy = Math.sin(a)*this.moveSpd;
                        break;
                    }

                    // 목표 방향 이동 (히스테리시스 적용)
                    let waypoint = {x:tx, y:ty};
                    moveToTarget(waypoint, 50, 20);
                }
                break;
        }

        // 디버그용 데이터 저장
        this.aiTarget = target;
        this.aiTx = tx;
        this.aiTy = ty;
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
        if(this.giantSlayerRate > 0 && !target.isBuilding) dmg += target.maxHp * this.giantSlayerRate;
        if(this.borkActive&&!target.isBuilding) dmg+=target.hp*0.08;

        if(HERO_TMPL[this.heroKey].type==='ranged'){
            this.attackAnimTimer = 0.2;
            projectiles.push(new Projectile(this.x, this.y-this.radius, target, dmg, this, isCrit));
            if(this.isPlayer) playSFX('shoot');
        } else {
            this.attackAnimTimer = 0.2;
            let dealt=target.applyRawDamage(dmg, this); this.totalDmg+=dealt;
            // 궤적 이펙트 (반달 모양)
            let a = Math.atan2(target.y-this.y, target.x-this.x);
            spawnSlash(this.x, this.y-this.radius, a, this.faction==='BLUE'?'#93c5fd':'#fca5a5', 30);
            this.triggerOnHitPassives(target);
            if(this.lifeSteal>0) { this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal); playSFX('heal'); }
            if(this.burnDmg>0&&!target.isBuilding) target.burnTicks.push({dmg:this.burnDmg,ticks:3,timer:1.0,src:this});
            if(this.stunChance>0&&Math.random()<this.stunChance&&!target.isBuilding) target.stunTimer=1.0;
            spawnSlash(this.x+Math.cos(a)*this.range*0.5, this.y+Math.sin(a)*this.range*0.5, a, isCrit?'#fbbf24':HERO_TMPL[this.heroKey].color);
        }
    }
    onKill(target){
        this.triggerOnKillPassives(target);
        if(target.type==='hero'){
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
            if(this.multiKill === 2) showBanner(hName + ' 더블 킬!', '✌️', this.faction==='BLUE');
            else if(this.multiKill === 3) showBanner(hName + ' 트리플 킬!!', '🔥', this.faction==='BLUE');
            else if(this.multiKill >= 4) showBanner(hName + ' 쿼드라 킬!!!', '💥', this.faction==='BLUE');
            else if(this.killStreak >= 3) showBanner(hName + '가 미쳐 날뛰고 있습니다!', '👹', this.faction==='BLUE');
            else showBanner(hName + ' 처치!', '⚔️', this.faction==='BLUE');

            this.gold+=250; this.gainExp(80);
            if(target.faction!=='BLUE') GS.scoreBlue++; else GS.scoreRed++;
            document.getElementById('scoreBlue').textContent=GS.scoreBlue; document.getElementById('scoreRed').textContent=GS.scoreRed;
            if(this.isPlayer) addText(this.x, this.y-40, '+250G / 80XP', '#fbbf24', 16);
        } else if(target.type==='minion'){ 
            this.gold+=60; this.gainExp(25);
            if(this.isPlayer) addText(this.x, this.y-40, '+60G', '#fbbf24', 16);
        } else if(target.type==='jungle'){ 
            this.gold+=100; this.gainExp(60);
            if(this.isPlayer) addText(this.x, this.y-40, '+100G / 60XP', '#fbbf24', 18);
        } else if(target.type.startsWith('boss')){ 
            this.gold+=400; this.gainExp(150); showBanner('보스 처치!', '👑', this.faction==='BLUE'); 
            if(this.isPlayer) addText(this.x, this.y-40, '+400G / 150XP', '#fbbf24', 18);
        }
    }
    gainExp(amt){
        this.exp+=amt;
        while(this.exp>=this.maxExp){
            this.exp-=this.maxExp; this.level++; this.maxExp=Math.floor(this.maxExp*1.15); // 레벨업 요구치 완화
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
                setTimeout(() => this.showSkillSelection(), 500);
            } else {
                this.aiSelectSkill();
            }
        }
    }
    onDeath(attacker){
        let oracleAlly = entities.find(e => e.type==='hero' && e.faction===this.faction && e!==this && !e.isDead && dist(this, e) <= 400 && e.inventory.some(i=>i.id==='oracle_glory'));
        if(oracleAlly && !this.hasUsedOracleRevive) {
            this.hasUsedOracleRevive = true;
            this.hp = this.maxHp * 0.3;
            spawnParticles(this.x, this.y, '#fbbf24', 30, 150, 1.0);
            addText(this.x, this.y-50, '오라클 부활!', '#fbbf24', 24);
            playSFX('heal');
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
                    c.attacker.gold += 150;
                    if(c.attacker.triggerWarAnthem) c.attacker.triggerWarAnthem();
                }
            });
            if(attacker.triggerWarAnthem) attacker.triggerWarAnthem();

            if(window.addKillFeed) addKillFeed(attacker, this);
            if(window.AIChat) window.AIChat.onKill(attacker, this);
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
            if(this.inventory.length>=8) return;
            this.gold-=item.cost; this.inventory.push({id:item.id,upgrade:0,stat:item.stat,val:item.val});
        }
        this.applyStats(); this.checkEvolution(); renderShop();
    }
    applyStats(){
        this.maxHp=this.baseMaxHp; this.atk=this.baseAtk; this.aspd=this.baseAspd; this.moveSpd=this.baseMoveSpd;
        let t=HERO_TMPL[this.heroKey];
        this.critChance=t.critChance||0; this.lifeSteal=t.lifeSteal||0;
        this.reflectRate=0; this.burnDmg=0; this.stunChance=0; this.shield=0;
        this.cdr=0; this.skillDmgBonus=0; this.giantSlayerRate=0; this.defense=0; this.hasZhonya=false;
        this.borkActive=false; this.hasWarmog=false;
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
            if(i.stat==='berserker') this.aspd+=i.val*m;
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
        let gbLv = this.passiveSkills['guardian_bond'] || 0;
        if(gbLv > 0) this.defense += gbLv * 15;
        let haLv = this.passiveSkills['haste_art'] || 0;
        if(haLv > 0) this.cdr += haLv * 0.10;
        
        if(this.soulAtkBonus > 0) this.atk += this.soulAtkBonus;
        
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
        
        if(this.warAnthemTimer > 0) {
            effMove *= 1.3; effAspd *= 1.3;
        }
        
        this.atk = effAtk; this.aspd = effAspd; this.moveSpd = effMove;
    }
    autoUseHeroSkills(){
        if(!GS.autoSkill) return;
        let nearEnemies = (cx,cy,r) => entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist({x:cx,y:cy},e)<=r);
        
        if(this.heroSkill1Timer <= 0 && nearEnemies(this.x, this.y, 400).length > 0) this.useSkill(1);
        if(this.heroSkill2Timer <= 0 && nearEnemies(this.x, this.y, 400).length > 0) this.useSkill(2);
    }
    useSkill(idx) {
        let k = this.heroKey;
        let sl = Math.floor((this.level - 1) / 3) + 1;
        let baseCd = idx===1 ? HERO_TMPL[k].skill1.cd : HERO_TMPL[k].skill2.cd;
        let cd = Math.max(2, baseCd - sl*0.5);
        if(this.cdr > 0) cd = cd * Math.max(0.3, 1 - this.cdr); // Max 70% CDR
        
        if(idx===1) { if(this.heroSkill1Timer > 0) return; this.heroSkill1Timer = cd; }
        else { if(this.heroSkill2Timer > 0) return; this.heroSkill2Timer = cd; }
        
        let skillDmg = this.atk * (1.5 + sl * 0.5) * (1 + this.skillDmgBonus);
        let nearEnemies = (cx,cy,r) => entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist({x:cx,y:cy},e)<=r);
        let targets = nearEnemies(this.x, this.y, 400);
        let t = targets.length > 0 ? targets.sort((a,b)=>dist(this,a)-dist(this,b))[0] : null;

        playSFX('skill_burst');
        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = cd * 0.66; // 2/3 of cooldown
            this.emote = '🦍'; this.emoteTimer = 2.0;
            addText(this.x, this.y-50, '거대화! 체력+50% 공방+50% 이속+20%', '#fcd34d', 18);
            return;
        } else if(idx === 2 && k === 'grrr') {
            spawnAOE(this.x, this.y, 180, '#f59e0b88', 0.5);
            this.emote = '🤬'; this.emoteTimer = 2.0;
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 180);
            targets.forEach(t => { t.applyRawDamage(this.atk*1.8, this); t.stunTimer = 2.0; });
            addText(this.x, this.y-50, '포효!', '#ef4444', 24);
            return;
        }
        
        addText(this.x, this.y-50, idx===1 ? HERO_TMPL[k].skill1.name : HERO_TMPL[k].skill2.name, HERO_TMPL[k].color, 24);

        if(k==='BERSERKER') {
            if(idx===1) {
                spawnRing(this.x, this.y, '#ef4444', 250, 0.4);
                nearEnemies(this.x,this.y,250).forEach(e=>{e.applyRawDamage(skillDmg,this); e.stunTimer=0.5;});
                for(let i=0;i<4;i++) spawnSlash(this.x, this.y, Math.PI/2*i, '#f87171', 200);
            } else {
                if(t) { this.x=t.x; this.y=t.y; }
                spawnAOE(this.x, this.y, 300, '#b91c1c99', 0.5);
                spawnSpecial(this.x, this.y, '#fca5a5', 'plus', 16, 200, 0.5);
                nearEnemies(this.x,this.y,300).forEach(e=>{e.applyRawDamage(skillDmg*1.5,this); e.stunTimer=1.5;});
            }
        } else if(k==='ARCHER') {
            if(idx===1 && t) {
                for(let i=0;i<5+sl;i++) {
                    setTimeout(()=>{
                        if(t.isDead) { let ne = nearEnemies(this.x,this.y,500); if(ne.length>0) t=ne[0]; }
                        if(t&&!t.isDead) {
                            projectiles.push(new Projectile(this.x,this.y-100,t,skillDmg*0.6,this,false));
                            spawnBeam(this.x, this.y-100, t.x, t.y, '#34d399', 0.1);
                            playSFX('shoot');
                        }
                    }, i*80);
                }
            } else {
                let dx = this.vx || 0; let dy = this.vy || 0;
                let a = (dx !== 0 || dy !== 0) ? Math.atan2(dy, dx) : (this.facingDir > 0 ? 0 : Math.PI);
                this.x += Math.cos(a)*200; this.y += Math.sin(a)*200;
                this.invincibleTimer = 0.3; // 무적
                spawnParticles(this.x, this.y, '#6ee7b7', 20, 150, 0.4);
                this.atkSpdBuffTimer = 3; this.atkSpdBuffRate = 1.5;
            }
        } else if(k==='NECROMANCER') {
            if(idx===1) {
                for(let i=0;i<2+sl;i++) {
                    let m = new Monster(this.x+rand(-50,50), this.y+rand(-50,50), 'summon');
                    m.faction = this.faction;
                    m.maxHp = 1500; m.hp=m.maxHp; m.atk = this.atk*0.8; m.radius=15; m.moveSpd = 100;
                    entities.push(m);
                    spawnSpecial(m.x, m.y, '#1e293b', 'star', 8, 100, 0.4);
                }
                playSFX('skill_magic');
            } else {
                nearEnemies(this.x, this.y, 450).forEach(e => {
                    e.applyRawDamage(skillDmg,this); e.slowTimer=3; e.slowRate=0.3;
                    spawnAOE(e.x, e.y, 60, '#7e22ce88', 0.8);
                });
            }
        } else if(k==='MECHANIC') {
            if(idx===1) {
                let tw = new Building(this.x, this.y, this.faction, 'tower');
                tw.maxHp=1500+sl*600; tw.hp=tw.maxHp; tw.atk=this.atk*1.5; tw.range=350; tw.radius=15; tw.life=18;
                tw.update = function(dt) {
                    Building.prototype.update.call(this, dt);
                    this.life-=dt; if(this.life<=0) this.isDead=true;
                };
                entities.push(tw);
                spawnRing(tw.x, tw.y, '#f59e0b', 150, 0.3);
            } else {
                let allies = entities.filter(e=>e.faction===this.faction&&!e.isDead&&dist(this,e)<=400);
                allies.forEach(a => {
                    a.hp = Math.min(a.maxHp, a.hp + skillDmg*2);
                    spawnSpecial(a.x, a.y, '#10b981', 'plus', 5, 100, 0.6);
                });
                playSFX('heal');
            }
        } else if(k==='VAMPIRE') {
            if(idx===1) {
                spawnRing(this.x, this.y, '#f43f5e', 300, 0.5);
                let dmgTotal = 0;
                nearEnemies(this.x, this.y, 300).forEach(e => {
                    e.applyRawDamage(skillDmg*1.2,this); dmgTotal+=skillDmg*1.2;
                    spawnBeam(e.x, e.y, this.x, this.y, '#fda4af', 0.2);
                });
                this.hp = Math.min(this.maxHp, this.hp + dmgTotal*0.3);
            } else {
                if(t) { this.x=t.x; this.y=t.y; }
                spawnAOE(this.x, this.y, 200, '#88133799', 0.6);
                nearEnemies(this.x, this.y, 200).forEach(e => e.applyRawDamage(skillDmg*2,this));
                spawnSpecial(this.x, this.y, '#fca5a5', 'star', 12, 180, 0.5);
            }
        } else if(k==='THOR') {
            if(idx===1) {
                let tg = t || this;
                spawnBeam(tg.x, tg.y-600, tg.x, tg.y, '#60a5fa', 0.3);
                spawnAOE(tg.x, tg.y, 250, '#3b82f6AA', 0.4);
                nearEnemies(tg.x, tg.y, 250).forEach(e=>{e.applyRawDamage(skillDmg*1.8,this); e.stunTimer=1.2;});
            } else {
                spawnRing(this.x, this.y, '#93c5fd', 400, 0.6);
                nearEnemies(this.x, this.y, 400).forEach(e=>{
                    e.applyRawDamage(skillDmg,this); 
                    e.slowTimer=2; e.slowRate=0.2; 
                    e.stunTimer=1.0; e.airborneTimer=1.0;
                });
            }
        } else if(k==='ICEBORN') {
            if(idx===1) {
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                spawnAOE(this.x + Math.cos(a)*100, this.y + Math.sin(a)*100, 150, '#38bdf888', 0.5);
                nearEnemies(this.x, this.y, 300).forEach(e => {
                    let ea = Math.atan2(e.y - this.y, e.x - this.x);
                    if(Math.abs(ea - a) < Math.PI/3) { e.applyRawDamage(skillDmg*1.2, this); e.slowTimer = 2.5; e.slowRate = 0.4; }
                });
            } else {
                let tg = t || this;
                spawnAOE(tg.x, tg.y, 100, '#bae6fd99', 0.8);
                nearEnemies(tg.x, tg.y, 100).forEach(e => { e.applyRawDamage(skillDmg*1.5, this); e.stunTimer = 2.0; e.isFrozen = true; });
                spawnSpecial(tg.x, tg.y, '#7dd3fc', 'plus', 10, 100, 0.5);
            }
        } else if(k==='JOKER') {
            if(idx===1) {
                for(let i=0; i<3; i++) {
                    setTimeout(() => {
                        let eff = Math.random();
                        if(eff < 0.33) {
                            nearEnemies(this.x, this.y, 350).forEach(e => e.applyRawDamage(skillDmg*1.5, this));
                            spawnRing(this.x, this.y, '#ef4444', 350, 0.4);
                        } else if(eff < 0.66) {
                            this.defense += this.maxHp * 0.15;
                            spawnRing(this.x, this.y, '#3b82f6', 150, 0.4);
                        } else {
                            this.atkSpdBuffTimer = 3.0; this.atkSpdBuffRate = 1.5;
                            spawnRing(this.x, this.y, '#10b981', 150, 0.4);
                        }
                    }, i*200);
                }
            } else {
                let bet = Math.floor(this.gold * 0.2);
                this.gold -= bet;
                if(Math.random() < 0.5) {
                    this.gold += bet * 2;
                    addText(this.x, this.y-70, '잭팟!', '#fbbf24', 28);
                    spawnRing(this.x, this.y, '#fbbf24', 400, 0.6);
                    nearEnemies(this.x, this.y, 400).forEach(e => { e.applyRawDamage(skillDmg*3, this); e.stunTimer = 1.0; });
                } else {
                    addText(this.x, this.y-70, '꽝...', '#9ca3af', 20);
                }
            }
        } else if(k==='DARKPRIEST') {
            if(idx===1) {
                let allies = entities.filter(e => e.faction === this.faction && !e.isDead && e.type === 'hero' && e !== this);
                if(allies.length > 0) {
                    let sacrifice = allies[Math.floor(Math.random() * allies.length)];
                    let drain = sacrifice.maxHp * 0.15;
                    sacrifice.hp = Math.max(1, sacrifice.hp - drain);
                    spawnBeam(sacrifice.x, sacrifice.y, this.x, this.y, '#7c3aed', 0.3);
                    
                    if(t) projectiles.push(new Projectile(this.x, this.y, t, skillDmg*2.5, this, false));
                }
            } else {
                if(t) {
                    t.curseTimer = 10.0;
                    spawnAOE(t.x, t.y, 80, '#4c1d95', 1.0);
                    addText(t.x, t.y-50, '낙인!', '#a855f7', 24);
                }
            }
        } else {
            if(t) {
                if(HERO_TMPL[k].type==='ranged') { for(let i=0;i<3+sl;i++) setTimeout(()=>{if(!t.isDead) projectiles.push(new Projectile(this.x,this.y,t,skillDmg*0.5,this,false));}, i*100); }
                else { this.x=t.x+rand(-40,40); this.y=t.y+rand(-40,40); t.applyRawDamage(skillDmg*1.5,this); spawnParticles(this.x,this.y,HERO_TMPL[k].color,20,150,0.5); }
            } else {
                spawnParticles(this.x,this.y,HERO_TMPL[k].color,10,100,0.3);
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
                addText(this.x,this.y-50,'분신 소환!','#a78bfa',16);
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
            let drain = pVamp * 5 * dt;
            entities.forEach(e => {
                if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 150) {
                    e.hp -= drain; this.hp = Math.min(this.maxHp, this.hp + drain);
                    spawnParticles(e.x, e.y, '#f43f5e', 1, 30, 0.2);
                }
            });
        }
        let pBomb = this.passiveSkills['bombTrail'] || 0;
        if(pBomb > 0 && Math.hypot(this.vx, this.vy) > 10) {
            this.passiveTimers.bombTrail = (this.passiveTimers.bombTrail || 0) - dt;
            if(this.passiveTimers.bombTrail <= 0) {
                spawnAOE(this.x, this.y, 60, '#ef444455', 1.0);
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 60) e.applyRawDamage(pBomb * 10, this);
                });
                this.passiveTimers.bombTrail = 1.5;
            }
        }
        let pStorm = this.passiveSkills['stormWalker'] || 0;
        if(pStorm > 0) {
            this.passiveTimers.stormWalker = (this.passiveTimers.stormWalker || 0) - dt;
            if(this.passiveTimers.stormWalker <= 0) {
                entities.forEach(e => {
                    if(e.faction !== this.faction && !e.isDead && dist(this, e) <= 200) {
                        e.applyRawDamage(pStorm * 15, this);
                        spawnParticles(e.x, e.y, '#fef08a', 5, 80, 0.4);
                    }
                });
                this.passiveTimers.stormWalker = 2.0;
            }
        }
        let pHeal = this.passiveSkills['healing_spring'] || 0;
        if(pHeal > 0) {
            this.passiveTimers.healingSpring = (this.passiveTimers.healingSpring || 0) - dt;
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
            addText(this.x, this.y-60, '전장의 찬가!', '#fef08a', 20);
            playSFX('heal');
        }
    }
    triggerOnHitPassives(target) {
        if(!target||target.isDead) return;
        // 낙뢰
        let ltLv=this.passiveSkills['lightning']||0;
        if(ltLv>0 && Math.random()<0.08+(ltLv-1)*0.02) {
            let targets=entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<=400).sort(()=>Math.random()-0.5).slice(0,ltLv);
            targets.forEach((t,idx)=>setTimeout(()=>{if(!t.isDead){t.applyRawDamage(this.atk*0.8,this);spawnLightningEffect(t.x,t.y,this===player);addText(t.x,t.y-30,'⚡','#fbbf24',22);}},idx*100));
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
            spawnParticles(target.x,target.y,'#93c5fd',10,80,0.5); addText(target.x,target.y-20,'❄️','#93c5fd',16);
        }
    }
    triggerOnKillPassives(target) {
        if(this.inventory.some(i => i.id === 'avalon_sword')) {
            this.invincibleTimer = 3.0;
            spawnParticles(this.x, this.y, '#fcd34d', 20, 150, 3.0);
            addText(this.x, this.y-50, '아발론 수호!', '#fcd34d', 20);
        }
        let shLv=this.passiveSkills['soulHarvest']||0;
        if(shLv>0) {
            this.hp=Math.min(this.maxHp,this.hp+this.maxHp*(0.05+(shLv-1)*0.03));
            this.soulAtkBonus=this.baseAtk*(0.08+(shLv-1)*0.06); this.soulBuffTimer=5;
            spawnParticles(this.x,this.y,'#a78bfa',15,100,0.5); addText(this.x,this.y-40,'👻 영혼 수확!','#a78bfa',16); playSFX('heal');
        }
        let pBlood = this.passiveSkills['bloodFury'] || 0;
        if(pBlood > 0) {
            this.atkSpdBuffTimer = 3.0 + (pBlood-1);
            this.atkSpdBuffRate = 1.5;
            spawnParticles(this.x, this.y, '#dc2626', 10, 100, 0.4);
            addText(this.x, this.y-50, '😡 피의 분노!', '#ef4444', 16);
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
        this.applyStats(); this.checkEvolution();
        document.getElementById('skillSelectionOverlay').classList.add('hidden');
        this.pendingLevelUp = false;
        this.pendingSkillLevels = 0; GS.paused = false;
        let sk = PASSIVE_SKILLS.find(s=>s.id===skillId);
        addText(this.x,this.y-60, sk.icon+' '+sk.name+' Lv.'+this.passiveSkills[skillId]+'!', '#fcd34d', 18);
        playSFX('heal');
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
            let reqItemIdx = this.inventory.findIndex(i => i.id === evo.reqItem && i.upgrade >= 9);
            if(reqItemIdx !== -1) {
                let reqPassive = PASSIVE_SKILLS.find(p => p.id === evo.reqPassive);
                if(reqPassive && (this.passiveSkills[evo.reqPassive] || 0) >= reqPassive.maxLv) {
                    this.inventory[reqItemIdx] = { id: evo.id, upgrade: 1, stat: evo.stat, val: evo.val };
                    this.applyStats();
                    if(this.isPlayer) {
                        if(window.showEvolutionPopup) window.showEvolutionPopup(evo.name, evo.icon, evo.desc);
                    } else {
                        spawnParticles(this.x, this.y, '#fcd34d', 30, 200, 1.0);
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
        
        t.draw(ctx, this.x, this.y, this.radius, this.facingDir, this.faction, this.attackAnimTimer);
        
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
        if(this.isPlayer) { ctx.fillText('▶ YOU', this.x, by-15); }
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
        else if(btype==='nexus_turret') { this.maxHp=12000; this.atk=400; this.aspd=1.5; this.range=350; this.radius=22; }
        else { this.maxHp=9000; this.atk=280; this.aspd=1.2; this.range=360; this.radius=28; } // 타워 버프
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
            let win=this.faction!=='BLUE'; 
            document.getElementById('txtGameResult').textContent=win?'🏆 VICTORY':'💀 DEFEAT';
            document.getElementById('txtGameResult').style.color=win?'#34d399':'#f87171';
            buildScoreboard();
        } else if (this.type === 'tower' || this.type === 'nexus_turret') {
            let oppFaction = this.faction === 'BLUE' ? 'RED' : 'BLUE';
            entities.forEach(e => {
                if(e.type === 'hero' && e.faction === oppFaction) {
                    e.gold += 500;
                    if(e === player) addText(e.x, e.y-40, '타워 파괴 +500G!', '#fbbf24', 18);
                }
            });
            showBanner('타워 파괴!', '💥', this.faction !== 'BLUE');
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

// ============ 미니언 ============
class Minion extends Entity {
    constructor(x,y,faction,lane){
        super(x,y,faction,'minion'); this.lane=lane;
        // 미니언 성장 스케일 강화 (속도 완화, 최대 3.5배 캡 적용)
        let scale=Math.min(1+GS.time/400, 3.5); this.maxHp=Math.floor(400*scale); this.hp=this.maxHp; this.atk=Math.floor(15*scale); this.aspd=1.0; this.moveSpd=120; this.range=30; this.radius=10;
        
        let bTop=[{x:300,y:2700},{x:300,y:300},{x:2700,y:300}], bMid=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}], bBot=[{x:300,y:2700},{x:300,y:2400},{x:2400,y:2400},{x:2400,y:300},{x:2700,y:300}];
        let rTop=[{x:2700,y:300},{x:2700,y:300},{x:300,y:300},{x:300,y:2700}], rMid=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}], rBot=[{x:2700,y:300},{x:2400,y:300},{x:2400,y:2400},{x:300,y:2400},{x:300,y:2700}];
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
            else { this.vx=0; this.vy=0; if(this.attackTimer<=0){ this.attackTimer=1/this.aspd; target.applyRawDamage(this.atk,this); spawnSlash(this.x,this.y-this.radius,Math.atan2(target.y-this.y,target.x-this.x),'#64748b',20); } }
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

class Monster extends Entity {
    constructor(x,y,mtype){
        super(x,y,'NEUTRAL','jungle'); this.mtype=mtype; this.home={x,y};
        this.maxHp = mtype.includes('boss') ? 5000 : 1500; this.hp=this.maxHp;
        this.atk = mtype.includes('boss') ? 150 : 40; this.aspd=0.8; this.moveSpd=80; this.range=50; this.radius = mtype.includes('boss') ? 40 : 18;
        this.respawnTimer=0;
    }
    update(dt){
        if(this.isDead){ if(!this.mtype.includes('boss') && this.mtype !== 'summon') { this.respawnTimer-=dt; if(this.respawnTimer<=0){ this.isDead=false; this.hp=this.maxHp; this.x=this.home.x; this.y=this.home.y; this.aggroTarget=null; } } return; }
        super.update(dt);
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
                        targets.forEach(t => { t.applyRawDamage(this.atk*2, this); t.stunTimer = 1.0; });
                        playSFX('skill_magic');
                    } else target.applyRawDamage(this.atk,this);
                } else target.applyRawDamage(this.atk,this);
            } }
        } else if(dist(this,this.home)>50){ let a=Math.atan2(this.home.y-this.y,this.home.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }
        else { this.vx=0; this.vy=0; }
    }
    onDeath(attacker){ this.respawnTimer=15; if(this.mtype==='boss_dragon'){ showBanner('드래곤 처치!','🐲', attacker.faction==='BLUE'); } }
    draw(ctx){
        if(this.isDead) return;
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+this.radius*0.8,this.radius,this.radius*0.4,0,0,Math.PI*2); ctx.fill();
        
        if(this.mtype === 'summon') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius*2, this.radius*2);
            ctx.fillStyle = '#9333ea';
            ctx.fillRect(this.x - this.radius*0.4, this.y - this.radius*0.6, this.radius*0.8, this.radius*0.4);
            if(Math.random()<0.3) spawnParticles(this.x, this.y, '#1e293b', 1, 30, 0.5);
        } else {
            // 몬스터 타입에 따른 다양한 색상
            if(this.mtype === 'wolf') ctx.fillStyle = '#475569';
            else if(this.mtype === 'bear') ctx.fillStyle = '#78350f';
            else if(this.mtype === 'golem') ctx.fillStyle = '#94a3b8';
            else if(this.mtype === 'skeleton') ctx.fillStyle = '#f8fafc';
            else if(this.mtype === 'slime') ctx.fillStyle = '#22c55e';
            else ctx.fillStyle = '#991b1b'; // Boss

            ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius*0.8, 0, 0, Math.PI*2); ctx.fill();
        }
        
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y-this.radius*0.5, this.radius*1.2, this.radius*1.2, 0, 0, Math.PI*2);
            ctx.fill();
        }

        // 눈 포인트
        ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(this.x-this.radius*0.3, this.y-this.radius*0.2, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x+this.radius*0.3, this.y-this.radius*0.2, 3, 0, Math.PI*2); ctx.fill();

        let drawHp = (typeof this.hp !== 'number' || isNaN(this.hp)) ? 1500 : this.hp;
        let drawMaxHp = (typeof this.maxHp !== 'number' || isNaN(this.maxHp) || this.maxHp <= 0) ? 1500 : this.maxHp;
        let hpRatio = Math.max(0, Math.min(1, drawHp / drawMaxHp));
        
        let bw=this.radius*2,bh=6,bx=this.x-bw/2,by=this.y-this.radius-15; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle='#f97316'; ctx.fillRect(bx,by,bw*hpRatio,bh);
    }
}

// ============ 투사체 ============
class Projectile {
    constructor(x,y,target,dmg,attacker,isCrit,ptype='arrow'){
        this.x=x; this.y=y; this.target=target; this.dmg=dmg; this.attacker=attacker; this.isCrit=isCrit; this.ptype=ptype;
        this.speed=ptype==='tower'?550:400; this.isDead=false;
        this.isSplash = attacker && attacker.type==='hero' && (attacker.heroKey==='JOKER' || attacker.heroKey==='DARKPRIEST');
        if(attacker && attacker.heroKey==='ICEBORN') this.ptype='ice';
    }
    update(dt){
        if(this.target.isDead){this.isDead=true;return;}
        if(dist(this,this.target)<15 || (this.isSplash && dist(this,this.target)<40)){
            let hitTargets = this.isSplash ? entities.filter(e => e.faction!==this.attacker.faction && !e.isDead && dist(e, this.target) <= 120) : [this.target];
            if(this.isSplash) spawnAOE(this.target.x, this.target.y, 120, '#a855f7aa', 0.5);
            hitTargets.forEach(tgt => {
                tgt.applyRawDamage(this.dmg,this.attacker);
                if(this.attacker && this.attacker.type === 'hero') this.attacker.totalDmg += this.dmg;
                if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(tgt);
                if(this.attacker.lifeSteal>0&&this.attacker.type==='hero') { this.attacker.hp=Math.min(this.attacker.maxHp,this.attacker.hp+this.dmg*this.attacker.lifeSteal); playSFX('heal'); }
                if(this.attacker.burnDmg>0&&!tgt.isBuilding) tgt.burnTicks.push({dmg:this.attacker.burnDmg,ticks:3,timer:1.0,src:this.attacker});
                if(this.attacker.stunChance>0&&Math.random()<this.attacker.stunChance&&!tgt.isBuilding) tgt.stunTimer=1.0;
                spawnParticles(tgt.x,tgt.y-tgt.radius*0.5, this.isCrit?'#ff6b35':'#fbbf24', 8, 120, 0.3);
            });
            this.isDead=true;
        } else {
            let a=Math.atan2(this.target.y-this.y,this.target.x-this.x);
            this.x+=Math.cos(a)*this.speed*dt; this.y+=Math.sin(a)*this.speed*dt;
        }
    }
    draw(ctx){
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.atan2(this.target.y-this.y,this.target.x-this.x));
        if(this.ptype==='arrow'){ ctx.fillStyle='#92400e'; ctx.fillRect(-10,-1.5,14,3); }
        else if(this.ptype==='ice'){
            ctx.shadowColor='#38bdf8'; ctx.shadowBlur=10; ctx.fillStyle='#e0f2fe';
            ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, 0); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        } else { ctx.shadowColor='#fbbf24'; ctx.shadowBlur=10; ctx.fillStyle='#fbbf24'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
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
window.addEventListener('keydown',e=>{ let k=e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k]=true; if(k==='o'&&player&&!GS.autoSkill) player.useSkill(1); if(k==='p'&&player&&!GS.autoSkill) player.useSkill(2); });
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
        }
    }
});
window.addEventListener('touchmove',e=>{
    if(e.touches.length === 2 && initPinchD) { let d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); camera.zoom = clamp(initZoom * (d/initPinchD), 0.3, 2.0); }
    else if(joy.active) { for(let t of e.changedTouches) if(t.identifier===joy.id){ let dx=t.clientX-joy.ox, dy=t.clientY-joy.oy, d=Math.hypot(dx,dy); if(d>50){dx=dx/d*50;dy=dy/d*50;} joy.dx=dx; joy.dy=dy; } }
});
window.addEventListener('touchend',e=>{ 
    if(e.touches.length<2) initPinchD=null; 
    let stillTouching = false;
    for(let t of e.touches) if(t.identifier===joy.id) stillTouching = true;
    if(!stillTouching){ joy.active=false; joy.dx=0; joy.dy=0; } 
});
window.addEventListener('touchcancel',e=>{ joy.active=false; joy.dx=0; joy.dy=0; });

// ============ UI ============
window.selectPlatform=p=>{ GS.platform=p; document.getElementById('btnPlatPC').className=p==='PC'?"px-4 py-2.5 rounded-xl font-bold bg-indigo-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; document.getElementById('btnPlatMobile').className=p==='MOBILE'?"px-4 py-2.5 rounded-xl font-bold bg-emerald-600 border text-white w-1/2 text-sm":"px-4 py-2.5 rounded-xl font-bold bg-slate-800 border text-slate-400 w-1/2 text-sm"; };
window.selectFaction=f=>{ GS.faction=f; document.getElementById('btnFactionBlue').className=f==='BLUE'?"py-3 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; document.getElementById('btnFactionRed').className=f==='RED'?"py-3 px-3 rounded-xl border-2 border-fuchsia-500 bg-fuchsia-950/40 flex flex-col items-center gap-0.5":"py-3 px-3 rounded-xl border-2 border-transparent bg-slate-800/50 flex flex-col items-center gap-0.5"; };
window.selectHero=h=>{ GS.hero=h; Object.keys(HERO_TMPL).forEach(hk=>{ document.getElementById('btnHero'+hk).className='py-2 px-1 rounded-xl border-2 '+(hk===h?'border-emerald-500 bg-slate-800/80':'border-transparent bg-slate-800/60')+' flex flex-col items-center transition-all'; });
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
    autoDetectPlatform();
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
    GS.status='PLAYING'; GS.lastFrame=performance.now();
    resizeCanvas();
    
    document.getElementById('hudHeroName').textContent=HERO_TMPL[GS.hero].name;
    
    renderShop(); requestAnimationFrame(gameLoop);
};
window.toggleShop=()=>{ document.getElementById('shopUI').classList.toggle('hidden'); renderShop(); };

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
            if(invItem) { hasItem = true; itemLv = invItem.upgrade; if(itemLv >= 9) itemMax = true; }
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
                    <div class="flex-1 flex flex-col items-center bg-slate-900 rounded p-1 border ${itemMax?'border-emerald-500/50':'border-slate-700'}">
                        <span class="text-xs">${reqItem?reqItem.icon:'?'} ${reqItem?reqItem.name:'?'}</span>
                        <span class="text-[10px] ${itemMax?'text-emerald-400 font-bold':'text-slate-400'}">강화: ${itemLv}/9</span>
                    </div>
                    <div class="text-slate-500">+</div>
                    <div class="flex-1 flex flex-col items-center bg-slate-900 rounded p-1 border ${passMax?'border-emerald-500/50':'border-slate-700'}">
                        <span class="text-xs">${reqPass?reqPass.icon:'?'} ${reqPass?reqPass.name:'?'}</span>
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
window.buyItemUI=id=>{ if(player) player.buyItem(id); };
window.triggerSkill=idx=>{ if(player&&!player.isDead) player.useSkill(idx); };

window.triggerActiveItem=()=>{
    if(player && !player.isDead && player.hasZhonya && (player.zhonyaTimer||0) <= 0) {
        let isEvolved = player.inventory.some(i => i.id === 'hourglass_fate');
        player.invincibleTimer = 2.5;
        player.zhonyaTimer = isEvolved ? 60 : 90;
        player.stunTimer = 2.5; // 경직
        playSFX('skill_cast');
        spawnParticles(player.x, player.y, '#fef08a', 20, 100, 2.5);
        addText(player.x, player.y-40, isEvolved ? '운명의 시간!' : '경직!', '#fef08a', 24);
        
        if (isEvolved) {
            player.fateMeteorTimer = 2.5;
        }
    }
};
window.toggleAutoSkill=()=>{
    GS.autoSkill = !GS.autoSkill;
    const btn = document.getElementById('btnAutoSkill');
    const txt = document.getElementById('txtAutoSkill');
    if (txt) txt.textContent = GS.autoSkill ? 'AUTO' : 'MANUAL';
    if (btn) {
        btn.style.background = GS.autoSkill ? 'rgba(245,158,11,0.85)' : 'rgba(100,116,139,0.7)';
        btn.style.color = GS.autoSkill ? '#0f172a' : '#cbd5e1';
    }
};

function renderShop(){
    const cont=document.getElementById('shopItemContainer'); cont.innerHTML='';
    if(!player) return; document.getElementById('hudGoldText').textContent=Math.floor(player.gold)+'G';
    BASE_ITEMS.forEach(i=>{
        let slot=player.inventory.find(inv=>inv.id===i.id); let lv=slot?'<span class="text-rose-400 font-bold">+'+slot.upgrade+'</span>':'';
        let canBuy=player.gold>=i.cost&&(slot||player.inventory.length<8);
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
    if(GS.status!=='PLAYING') return;
    // dt 클램프 완화: 프레임 드랍이 생겨도 최대 0.2초(5 FPS) 분량의 시간을 한 번에 처리해 현실 시간과 싱크를 맞춤
    let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;
    


    if(!GS.paused) {
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

        // Dragon Spawn Logic
        if(GS.lastDragonCheck === undefined) GS.lastDragonCheck = 0;
        if(GS.time >= 300 && GS.time - GS.lastDragonCheck >= 300) {
            GS.lastDragonCheck = GS.time;
            let d_type = Math.random() < 0.5 ? 'boss_red_dragon' : 'boss_blue_dragon';
            let d_x = 500 + Math.random() * 2000;
            let d_y = 500 + Math.random() * 2000;
            let dragon = new Monster(d_x, d_y, d_type);
            
            // Scaling stats based on time
            let scale = Math.floor(GS.time / 300); // 1 at 5min, 2 at 10min...
            dragon.maxHp = 5000 * scale; dragon.hp = dragon.maxHp;
            dragon.atk = 150 * scale;
            
            entities.push(dragon);
            showBanner((d_type==='boss_red_dragon'?'레드':'블루') + ' 드래곤 등장!', '🐲', true);
        }

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
        for(let i=ringEffects.length-1;i>=0;i--) { ringEffects[i].life-=dt; ringEffects[i].r = ringEffects[i].maxR*(1-ringEffects[i].life/ringEffects[i].maxLife); if(ringEffects[i].life<=0) ringEffects.splice(i,1); }
        for(let i=beamEffects.length-1;i>=0;i--) { beamEffects[i].life-=dt; if(beamEffects[i].life<=0) beamEffects.splice(i,1); }
        
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
    ctx.restore(); drawMinimap();
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
        } else if(e.type === 'jungle' || e.mtype?.startsWith('boss_')) {
            if(e.mtype?.startsWith('boss_')) {
                mc.fillStyle = '#dc2626'; // 빨간색 (에픽 보스)
                mc.fillRect(ex-3, ey-3, 6, 6);
            } else if(e.mtype === 'jungle_boss') {
                mc.fillStyle = '#f59e0b'; // 주황색 (중간 보스)
                mc.fillRect(ex-2, ey-2, 4, 4);
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
    const inv=document.getElementById('inventorySlots'); inv.innerHTML='';
    for(let i=0;i<8;i++){ let item=player.inventory[i]; let bi=item?[...BASE_ITEMS,...EVOLUTION_ITEMS].find(b=>b.id===item.id):null; let content=item?'<span class="text-sm">'+(bi?bi.icon:'?')+'</span>'+(item.upgrade>0?'<span class="absolute -top-1 -right-1 text-[7px] bg-rose-600 text-white rounded px-0.5 font-bold">+'+item.upgrade+'</span>':''):''; inv.innerHTML+='<div class="relative w-6 h-6 md:w-8 md:h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center">'+content+'</div>'; }
    // 히어로 패시브 쿨다운 표시
    let m1=document.getElementById('maskSkill1'), m2=document.getElementById('maskSkill2');
    if(m1) { if(player.heroSkill1Timer>0){m1.classList.remove('hidden');m1.textContent=player.heroSkill1Timer.toFixed(1);}else m1.classList.add('hidden'); }
    if(m2) { if(player.heroSkill2Timer>0){m2.classList.remove('hidden');m2.textContent=player.heroSkill2Timer.toFixed(1);}else m2.classList.add('hidden'); }
    
    // 액티브 아이템 표시
    let mZ = document.getElementById('maskActiveItem'), bZ = document.getElementById('btnActiveItem');
    if(bZ && mZ) {
        if(player.hasZhonya) {
            bZ.classList.remove('hidden');
            if(player.zhonyaTimer>0) { mZ.classList.remove('hidden'); mZ.textContent=player.zhonyaTimer.toFixed(1); }
            else { mZ.classList.add('hidden'); }
        } else { bZ.classList.add('hidden'); }
    }
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
}

document.addEventListener('DOMContentLoaded', () => {
    autoDetectPlatform();
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
        window.killStreaks[attacker.heroKey] = (window.killStreaks[attacker.heroKey] || 0) + 1;
        let streakCount = window.killStreaks[attacker.heroKey];
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
    
    if(victim.heroKey) {
        window.killStreaks[victim.heroKey] = 0;
    }
};

window.addPing = function(x, y, faction, type='danger') {
    
    playSFX('button');
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
                addText(killer.x, killer.y - 60, kEmoji, '#ffffff', 28);
                addText(victim.x, victim.y - 60, vEmoji, '#ffffff', 28);
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
            if(window.killStreaks && window.killStreaks[h.heroKey] >= 3) {
                if(Math.random() < 0.1) {
                    let nearEnemies = currentHeroes.filter(e => e.faction !== h.faction && dist(e, h) < 300);
                    if(nearEnemies.length > 0) {
                        let hEmoji = ['🤬', '👿', '🖕', '💢'][Math.floor(Math.random()*4)];
                        addText(h.x, h.y - 70, hEmoji, '#fff', 28);
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
    
    if(window.player && window.HERO_TMPL) {
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
