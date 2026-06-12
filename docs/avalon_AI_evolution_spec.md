# 운빨 아발론 — AI 지능 전면 진화 설계서
## "진짜 유저처럼 플레이하는 9명의 AI"

> **문서 유형:** 구현 준비 완료 스펙 (Implementer-Ready Specification)  
> **대상 파일:** `game.js` — `handleAI()`, `aiShopAI()`, `aiSelectSkill()`, `AIChat` 전면 재설계  
> **설계 철학:** AI는 단순한 보조 NPC가 아닌, 각자의 성격과 판단력을 가진 **독립적인 게임 플레이어**다.

---

## 0. 현재 AI의 핵심 문제 진단 (Before)

```
현재 상태머신: RETREAT / ATTACK / TEAMFIGHT_JOIN / LANE (4개)
현재 아이템:   24종 중 완전 무작위 구매 (타입 필터 없음)
현재 스킬:     13종 중 완전 무작위 선택 (타입 필터 없음)
현재 소통:     상황 트리거 → 랜덤 문자열 출력 (행동과 무관)
현재 협동:     없음 (각자 독립 상태머신)
현재 오더:     없음
현재 라인:     단일 좌표로 이동 (웨이포인트 없음)
```

---

## 1. 설계 원칙 (Design Principles)

| 원칙 | 설명 |
|------|------|
| **역할 정체성** | 탱커는 앞에 서고, 힐러는 뒤에 있고, 암살자는 혼자 움직인다 |
| **상황 인지** | 점수, 타워 수, 시간, 팀 체력을 지속 모니터링하고 전략을 바꾼다 |
| **팀 뇌** | 한 명이 오더를 내리고 나머지가 따른다. 오더는 게임 상황에 따라 바뀐다 |
| **개성** | 9명이 각자 다른 성향 (공격형/수비형/기회주의형 등)을 갖는다 |
| **불완전함** | 가끔 실수하고, 가끔 혼자 움직이고, 가끔 싸운다. 너무 완벽하면 AI처럼 보인다 |

---

## 2. 핵심 신규 시스템 개요

```
┌─────────────────────────────────────────────────────┐
│                   TEAM BRAIN (팀 뇌)                 │  ← 신규
│  GameAnalyzer → StrategicOrder 발행 → 전체 AI 구독  │
└─────────────────────────────────────────────────────┘
         ↓ 오더 수신          ↓ 오더 수신
┌──────────────────┐  ┌──────────────────────────────┐
│  AI PERSONALITY  │  │    TACTICAL STATE MACHINE     │
│  (개성 시스템)   │  │  (전술 상태머신, 12개 상태)   │  ← 확장
└──────────────────┘  └──────────────────────────────┘
         ↓                        ↓
┌──────────────────────────────────────────────────────┐
│               SMART SHOP & SKILL AI                  │  ← 수정
│  역할 기반 우선순위 → 상황별 아이템 선택             │
└──────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────┐
│              BEHAVIORAL CHAT (행동 연계 채팅)         │  ← 진화
│  실제 AI 행동 → 맥락 있는 채팅 자동 생성             │
└──────────────────────────────────────────────────────┘
```

---

## 3. 시스템 1: AI 성격 분류 (Personality System)

### 3-1. 5가지 성격 타입 정의

게임 시작 시, 각 AI 영웅에게 5가지 성격 중 하나를 랜덤으로 부여한다.

```javascript
// ============ AI 성격 시스템 ============
// game.js 상단 상수 선언부에 추가 (HERO_TMPL 아래)
const AI_PERSONALITY = {
    AGGRESSIVE: {
        id: 'AGGRESSIVE',
        label: '공격형',
        retreatHpRatio: 0.20,   // 이 HP 이하에서만 후퇴
        chaseRange: 1100,        // 추적 거리
        orderObeyRate: 0.55,     // 오더 이행 확률 (가끔 무시)
        loneWolfChance: 0.40,    // 혼자 행동할 확률
        skillUseDelay: 0.1,      // 스킬 사용 딜레이 (즉각 사용)
        shopBias: 'atk',
        chatStyle: 'toxic',
    },
    TACTICAL: {
        id: 'TACTICAL',
        label: '전술형',
        retreatHpRatio: 0.35,
        chaseRange: 800,
        orderObeyRate: 0.90,     // 오더를 잘 따름
        loneWolfChance: 0.10,
        skillUseDelay: 0.3,
        shopBias: 'balanced',
        chatStyle: 'callout',
    },
    COWARD: {
        id: 'COWARD',
        label: '생존형',
        retreatHpRatio: 0.50,    // HP 절반만 돼도 후퇴
        chaseRange: 500,
        orderObeyRate: 0.70,
        loneWolfChance: 0.20,
        skillUseDelay: 0.5,
        shopBias: 'def',
        chatStyle: 'complain',
    },
    OPPORTUNIST: {
        id: 'OPPORTUNIST',
        label: '기회주의형',
        retreatHpRatio: 0.30,
        chaseRange: 700,
        orderObeyRate: 0.50,
        loneWolfChance: 0.60,    // 혼자 이득 챙기러 다님
        skillUseDelay: 0.2,
        shopBias: 'gold',
        chatStyle: 'brag',
    },
    SUPPORT_MIND: {
        id: 'SUPPORT_MIND',
        label: '서포터형',
        retreatHpRatio: 0.40,
        chaseRange: 600,
        orderObeyRate: 0.85,
        loneWolfChance: 0.05,    // 항상 팀과 같이
        skillUseDelay: 0.4,
        shopBias: 'utility',
        chatStyle: 'encourage',
    }
};
```

### 3-2. 영웅 생성 시 성격 부여 (Hero constructor 수정)

```javascript
// Hero constructor 내부, this.applyStats(); 바로 위에 추가

if (!isPlayer) {
    let personalityPool;
    if (heroKey === 'ARIEL' || heroKey === 'DARKPRIEST') {
        personalityPool = ['SUPPORT_MIND','SUPPORT_MIND','SUPPORT_MIND','TACTICAL','COWARD'];
    } else if (heroKey === 'CRAG' || heroKey === 'BARBARIAN' || heroKey === 'grrr') {
        personalityPool = ['AGGRESSIVE','AGGRESSIVE','TACTICAL','TACTICAL','OPPORTUNIST'];
    } else if (heroKey === 'VAMPIRE' || heroKey === 'ZEROS' || heroKey === 'JOKER') {
        personalityPool = ['OPPORTUNIST','OPPORTUNIST','AGGRESSIVE','TACTICAL','COWARD'];
    } else {
        personalityPool = ['AGGRESSIVE','TACTICAL','COWARD','OPPORTUNIST','SUPPORT_MIND'];
    }
    this.personality = AI_PERSONALITY[personalityPool[Math.floor(Math.random() * personalityPool.length)]];
    this.aiMemory = {
        lastDeathPos:   null,    // 마지막 사망 위치 기억
        lastKilledBy:   null,    // 마지막으로 죽인 적 기억
        enemyDangerMap: {},      // 적별 위험도 점수
        objectiveFocus: null,
    };
    this.wpIdx = 1;              // 웨이포인트 인덱스
}
```

---

## 4. 시스템 2: 팀 뇌 (TeamBrain) — 오더 시스템

팀 뇌는 각 팀(BLUE/RED)에 하나씩 존재하며,
**KDA 1등 AI가 오더를 내리고 나머지가 따르는** 구조다.

### 4-1. TeamBrain 클래스 정의 (Hero 클래스 선언부 위에 추가)

```javascript
// ============ 팀 뇌 시스템 ============
class TeamBrain {
    constructor(faction) {
        this.faction = faction;
        this.updateTimer = 3.0;
        this.commander = null;
        this.currentOrder = {
            type: 'FARM', lane: 'mid', urgency: 'normal',
            targetEntity: null, issuedAt: 0, duration: 15.0,
        };
    }

    update(dt) {
        this.updateTimer -= dt;
        if (this.updateTimer > 0) return;
        this.updateTimer = 3.0;
        this._electCommander();
        this._analyzeAndIssueOrder();
    }

    // 사령관 선출: KDA + 레벨 기준 최강자
    _electCommander() {
        let myHeroes = entities.filter(e =>
            e.type==='hero' && e.faction===this.faction && !e.isDead && !e.isPlayer);
        if (myHeroes.length === 0) return;
        myHeroes.sort((a, b) => {
            let sa = a.kills*3 + (a.assists||0) - a.deaths*2 + a.level;
            let sb = b.kills*3 + (b.assists||0) - b.deaths*2 + b.level;
            return sb - sa;
        });
        this.commander = myHeroes[0];
    }

    // 전략 분석 및 오더 발행
    _analyzeAndIssueOrder() {
        let ef    = this.faction==='BLUE' ? 'RED' : 'BLUE';
        let myH   = entities.filter(e=>e.type==='hero'&&e.faction===this.faction&&!e.isDead);
        let myNx  = entities.find(e=>e.type==='nexus'&&e.faction===this.faction);
        let enmNx = entities.find(e=>e.type==='nexus'&&e.faction===ef);
        let dragons = entities.filter(e=>(e.mtype==='boss_epic_dragon'||e.mtype==='boss')&&!e.isDead);
        let myScore  = this.faction==='BLUE' ? GS.scoreBlue : GS.scoreRed;
        let enmScore = this.faction==='BLUE' ? GS.scoreRed  : GS.scoreBlue;
        let avgHp = myH.length>0 ? myH.reduce((s,h)=>s+h.hp/h.maxHp,0)/myH.length : 1;

        // 1. 위기: 넥서스 체력 30% 이하
        if (myNx && myNx.hp/myNx.maxHp < 0.30) {
            return this._issue('DEFEND', null, 'critical', 10.0);
        }
        // 2. 적 넥서스 무방비
        if (enmNx && !entities.some(e=>e.type==='nexus_turret'&&e.faction===ef&&!e.isDead)) {
            let lane = this._weakestEnemyLane();
            this._chat('nexus_open');
            return this._issue('PUSH_'+lane.toUpperCase(), lane, 'urgent', 20.0);
        }
        // 3. 드래곤 기회
        let nearDragon = dragons.find(d=>myH.filter(h=>dist(h,d)<900).length>=2);
        if (nearDragon && avgHp>0.55 && Math.random()<0.65) {
            this._chat('call_dragon');
            return this._issue('DRAGON', null, 'urgent', 15.0, nearDragon);
        }
        // 4. 팀 체력 낮음 → 파밍
        if (avgHp < 0.45) return this._issue('FARM', null, 'normal', 12.0);
        // 5. 이기고 있음 → 약한 라인 집중
        if (myScore - enmScore >= 3) {
            let lane = this._weakestEnemyLane();
            if (Math.random()<0.5) this._chat('order_push');
            return this._issue('PUSH_'+lane.toUpperCase(), lane, 'normal', 15.0);
        }
        // 6. 지고 있음 → 수비
        if (enmScore - myScore >= 3) {
            if (Math.random()<0.6) this._chat('call_defend');
            return this._issue('DEFEND', null, 'urgent', 12.0);
        }
        // 7. 아군 3명 이상 집결 → 한타
        let grouped = this._findGroupedAllies(3, 450);
        if (grouped && GS.time>300) {
            if (Math.random()<0.4) this._chat('call_teamfight');
            return this._issue('GROUP_FIGHT', null, 'normal', 8.0);
        }
        // 8. 기본: 라인 밀기
        let lane = GS.time<300 ? ['top','mid','bot'][Math.floor(Math.random()*3)] : this._weakestEnemyLane();
        return this._issue('PUSH_'+lane.toUpperCase(), lane, 'normal', 12.0);
    }

    _issue(type, lane, urgency, duration, target=null) {
        this.currentOrder = { type, lane, urgency, targetEntity:target, issuedAt:GS.time, duration };
    }

    _weakestEnemyLane() {
        let ef = this.faction==='BLUE' ? 'RED' : 'BLUE';
        let laneScore = { top:0, mid:0, bot:0 };
        entities.filter(e=>(e.type==='tower'||e.type==='nexus_turret')&&e.faction===ef&&!e.isDead)
            .forEach(t=>{
                let l=(t.x<700||t.y>2300)?'top':(t.x>2300||t.y<700)?'bot':'mid';
                laneScore[l]+=t.hp;
            });
        return Object.entries(laneScore).sort((a,b)=>a[1]-b[1])[0][0];
    }

    _findGroupedAllies(minCount, radius) {
        let heroes=entities.filter(e=>e.type==='hero'&&e.faction===this.faction&&!e.isDead);
        for(let h of heroes){
            if(heroes.filter(a=>a!==h&&dist(a,h)<radius).length+1>=minCount) return h;
        }
        return null;
    }

    _chat(type) {
        if(this.commander && window.AIChat)
            window.AIChat.triggerOrderChat(this.commander, type, this.faction);
    }
}
```

### 4-2. 게임 시작 / 루프 연결

```javascript
// [수정 위치 1] startGame() 함수 내부, entities.push(player) 이후에 추가
window.TeamBrains = {};
window.TeamBrains['BLUE'] = new TeamBrain('BLUE');
window.TeamBrains['RED']  = new TeamBrain('RED');

// [수정 위치 2] gameLoop() 내 AIChat.update(dt) 바로 아래에 추가
if (window.TeamBrains) {
    if (window.TeamBrains['BLUE']) window.TeamBrains['BLUE'].update(dt);
    if (window.TeamBrains['RED'])  window.TeamBrains['RED'].update(dt);
}
```

---

## 5. 시스템 3: 전술 상태머신 확장 (12개 상태)

### 5-1. 상태 전체 목록

| 상태 | 트리거 조건 | 행동 설명 |
|------|------------|-----------|
| RETREAT | HP ≤ personality.retreatHpRatio | 지그재그로 본진 방향 도주 |
| RECALL | 본진 근처 + HP 낮음 | 본진 대기, 쇼핑, 회복 |
| ATTACK | 근처에 적 있음 | 타겟 추격 + 스킬 사용 |
| TEAMFIGHT_JOIN | 전투 중인 아군 2명 + 적 영웅 | 한타 합류 |
| SIEGE | 미니언 탱킹 중인 타워 근처 | 타워 사거리 밖 안전 딜 |
| JUNGLE_HUNT | 정글 역할 or 라인 비었을 때 | HP 낮은 정글몹 우선 처치 |
| ASSASSINATE | 적 영웅 HP 30% 발견 | 단독 추적, 스킬 즉각 사용 |
| ESCORT | SUPPORT_MIND + 약한 아군 발견 | 약한 아군 옆에서 보호 |
| FOLLOW_ORDER | 오더 활성 + orderObeyRate 통과 | TeamBrain 지시 이행 |
| SPLITPUSH | OPPORTUNIST + 혼자 + HP 충분 | 반대 라인 단독 압박 |
| BAIT | (추후 확장) | 일부러 적을 끌어 아군 합류 |
| LANE | 기본 | 웨이포인트 따라 라인 이동 |

### 5-2. handleAI() 전체 재작성

```javascript
// ============================================================
// handleAI() — 기존 함수 전체 대체
// ============================================================
handleAI(dt) {
    if (this.isDead || this.stunTimer > 0) return;

    let myBase    = this.faction==='BLUE' ? {x:300,y:2700} : {x:2700,y:300};
    let enemyBase = this.faction==='BLUE' ? {x:2700,y:300} : {x:300,y:2700};
    let hpRatio   = this.hp / this.maxHp;
    let pers      = this.personality || AI_PERSONALITY.TACTICAL;

    // [1] 주변 정보 캐싱 (0.2초마다 갱신)
    if (!this.aiUpdateTimer) this.aiUpdateTimer = 0;
    this.aiUpdateTimer -= dt;
    if (this.aiUpdateTimer <= 0) {
        this.aiUpdateTimer = 0.2;
        this.nearEnemiesCache = entities.filter(e=>
            e.faction!==this.faction&&!e.isDead&&dist(this,e)<1000);
        this.nearAlliesCache  = entities.filter(e=>
            e.faction===this.faction&&!e.isDead&&dist(this,e)<1000&&e!==this);
        // 위협도 업데이트
        if (this.aiMemory) {
            this.nearEnemiesCache.forEach(e=>{
                if(e.type==='hero') {
                    let d=(e.kills||0)*10+(e.level||1)*5;
                    if(this.aiMemory.lastKilledBy===e.heroKey) d+=50;
                    this.aiMemory.enemyDangerMap[e.heroKey]=d;
                }
            });
        }
    }

    let nearEnemies = (this.nearEnemiesCache||[]).filter(e=>!e.isDead);
    let nearAllies  = (this.nearAlliesCache ||[]).filter(e=>!e.isDead);

    // [2] 스마트 쇼핑: 본진 근처에서만
    if (dist(this, myBase) < 400) {
        if (!this.aiShopTimer) this.aiShopTimer = 3.0 + Math.random()*4.0;
        this.aiShopTimer -= dt;
        if (this.aiShopTimer <= 0) {
            this.aiShopAI_smart();
            this.aiShopTimer = 3.0 + Math.random()*4.0;
        }
    }

    // [3] 팀 오더 확인
    let brain  = window.TeamBrains && window.TeamBrains[this.faction];
    let order  = brain ? brain.currentOrder : null;
    let orderActive = order && (GS.time - order.issuedAt) < order.duration;

    // [4] 상태 전환 결정
    let oldState = this.aiState;
    this.aiState = this._decideState(hpRatio,nearEnemies,nearAllies,pers,order,orderActive,myBase);

    if (oldState !== this.aiState) {
        this.aiChasing = false;
        this.reactionDelay = pers.id==='AGGRESSIVE' ? 0.05 : 0.10+Math.random()*0.15;
        if (Math.random() < 0.25) this._stateChat(oldState, this.aiState);
    }
    if (this.reactionDelay > 0) { this.reactionDelay -= dt; return; }

    // [5] 타겟 선정
    let target = this._pickTarget(nearEnemies, pers);

    // [6] 상태 실행
    this._runState(dt,target,nearEnemies,nearAllies,myBase,enemyBase,pers,order,orderActive);
    this.aiTarget = target;
}

// ─────────────────────────────────────────────────────
// 상태 결정
// ─────────────────────────────────────────────────────
_decideState(hpRatio, nearEnemies, nearAllies, pers, order, orderActive, myBase) {

    // 생존 최우선
    if (hpRatio <= pers.retreatHpRatio) {
        if (pers.id==='AGGRESSIVE') {
            let dying=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.15&&dist(this,e)<this.range*1.5);
            if(dying) return 'ASSASSINATE';
        }
        return dist(this,myBase)<500 ? 'RECALL' : 'RETREAT';
    }

    // 팀 오더 이행
    if (orderActive && Math.random()<pers.orderObeyRate) return 'FOLLOW_ORDER';

    // 개별 판단: 죽어가는 적 발견
    let dyingHero=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.30&&dist(this,e)<700);
    if(dyingHero&&(pers.id==='AGGRESSIVE'||pers.id==='OPPORTUNIST')) return 'ASSASSINATE';

    // 서포터: 약한 아군 보호
    if(pers.id==='SUPPORT_MIND') {
        let weakAlly=nearAllies.find(a=>a.type==='hero'&&a.hp/a.maxHp<0.40);
        if(weakAlly) return 'ESCORT';
    }

    // 한타 합류
    let combatAllies=nearAllies.filter(a=>a.type==='hero'&&(a.lastAttackedTimer||0)>0);
    if(combatAllies.length>=2&&nearEnemies.filter(e=>e.type==='hero').length>=1) return 'TEAMFIGHT_JOIN';

    // 기회주의: 스플릿 푸시
    if(pers.id==='OPPORTUNIST'&&hpRatio>0.70&&nearAllies.filter(a=>a.type==='hero').length===0&&Math.random()<pers.loneWolfChance) return 'SPLITPUSH';

    // 공성 기회
    let siegeTower=entities.find(e=>
        (e.type==='tower'||e.type==='nexus_turret')&&e.faction!==this.faction&&!e.isDead&&
        dist(this,e)<700&&entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,e)<e.range));
    if(siegeTower) return 'SIEGE';

    if(nearEnemies.length>0) return 'ATTACK';
    return 'LANE';
}

// ─────────────────────────────────────────────────────
// 타겟 선정
// ─────────────────────────────────────────────────────
_pickTarget(nearEnemies, pers) {
    if(nearEnemies.length===0) return null;
    let best=-99999, target=null;
    nearEnemies.forEach(e=>{
        if(e.type==='nexus'&&entities.some(t=>t.type==='nexus_turret'&&t.faction===e.faction&&!t.isDead)) return;
        let d=dist(this,e);
        let s=(1-(e.hp/e.maxHp))*400+(1-(d/1000))*300;
        if(e.type==='hero') s+=250;
        if(pers.id==='AGGRESSIVE'&&e.type==='hero') s+=400;
        if(pers.id==='AGGRESSIVE'&&e.type==='minion') s-=200;
        if(pers.id==='OPPORTUNIST') s+=(1-(e.hp/e.maxHp))*300;
        if(pers.id==='TACTICAL'&&e.type==='hero'&&this.aiMemory) s+=(this.aiMemory.enemyDangerMap[e.heroKey]||0)*0.5;
        if((e.type==='tower'||e.type==='nexus_turret')&&
           !entities.some(m=>m.faction===this.faction&&m.type==='minion'&&dist(m,e)<e.range)) s-=600;
        if(s>best){best=s;target=e;}
    });
    return target;
}

// ─────────────────────────────────────────────────────
// 상태 실행
// ─────────────────────────────────────────────────────
_runState(dt, target, nearEnemies, nearAllies, myBase, enemyBase, pers, order, orderActive) {
    let hpRatio=this.hp/this.maxHp;
    const go=(pos,stop)=>{
        let d=dist(this,pos);
        if(d>stop){let a=Math.atan2(pos.y-this.y,pos.x-this.x);this.vx=Math.cos(a)*this.moveSpd;this.vy=Math.sin(a)*this.moveSpd;}
        else{this.vx=0;this.vy=0;}
        this.facingDir=pos.x<this.x?-1:1;
    };
    const skills=(needTarget=true,maxDist=9999)=>{
        if(needTarget&&(!target||dist(this,target)>maxDist)) return;
        if(this.heroSkill1Timer<=pers.skillUseDelay) this.useSkill(1);
        if(this.heroSkill2Timer<=pers.skillUseDelay&&(!needTarget||dist(this,target)<this.range*1.2)) this.useSkill(2);
    };

    switch(this.aiState) {

        case 'RETREAT': {
            let chaser=nearEnemies.find(e=>e.type==='hero'&&dist(this,e)<350);
            if(chaser){
                let a=Math.atan2(myBase.y-this.y,myBase.x-this.x);
                let n=Math.sin(performance.now()/130)*0.5;
                this.vx=Math.cos(a+n)*this.moveSpd; this.vy=Math.sin(a+n)*this.moveSpd;
                // 탈출기 사용
                if(dist(this,chaser)<200&&this.heroSkill2Timer<=0) this.useSkill(2);
            } else { go(myBase,50); }
            break;
        }

        case 'RECALL': {
            go(myBase,80);
            if(hpRatio>0.75) this.aiState='LANE';
            break;
        }

        case 'ATTACK': {
            if(!target){this.aiState='LANE';break;}
            let d=dist(this,target);
            if(HERO_TMPL[this.heroKey].type==='ranged'&&this.attackTimer>0&&d<this.range*0.75){
                // 원거리: 키팅 (공쿨 중 거리 유지 + 사이드 스텝)
                let a=Math.atan2(this.y-target.y,this.x-target.x);
                let side=Math.sin(performance.now()/200)*0.6;
                this.vx=Math.cos(a+side)*this.moveSpd*0.8;
                this.vy=Math.sin(a+side)*this.moveSpd*0.8;
            } else { go(target,this.range*0.65); }
            skills(true,this.range*1.3);
            break;
        }

        case 'TEAMFIGHT_JOIN': {
            let center=nearAllies.find(a=>a.type==='hero'&&(a.lastAttackedTimer||0)>0);
            if(!center){this.aiState='LANE';break;}
            let stopDist=HERO_TMPL[this.heroKey].type==='melee'?this.range*0.5:this.range*0.8;
            go(center,stopDist);
            skills(true,this.range*1.2);
            break;
        }

        case 'SIEGE': {
            let ef=this.faction==='BLUE'?'RED':'BLUE';
            let tw=entities.find(e=>(e.type==='tower'||e.type==='nexus_turret')&&e.faction!==this.faction&&!e.isDead&&dist(this,e)<700);
            if(!tw){this.aiState='LANE';break;}
            let hasTank=entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,tw)<tw.range);
            if(hasTank){
                // 타워 사거리 바깥 경계에서 딜
                let a=Math.atan2(this.y-tw.y,this.x-tw.x);
                go({x:tw.x+Math.cos(a)*(tw.range-this.range*0.9),y:tw.y+Math.sin(a)*(tw.range-this.range*0.9)},30);
            } else { go(myBase,300); }
            break;
        }

        case 'ASSASSINATE': {
            let prey=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.40)
                   ||nearEnemies.find(e=>e.type==='hero');
            if(!prey){this.aiState='LANE';break;}
            go(prey,this.range*0.4);
            if(this.heroSkill1Timer<=0) this.useSkill(1);
            if(this.heroSkill2Timer<=0) this.useSkill(2);
            break;
        }

        case 'ESCORT': {
            let weakA=nearAllies.find(a=>a.type==='hero'&&a.hp/a.maxHp<0.40);
            if(!weakA||weakA.hp/weakA.maxHp>0.72){this.aiState='LANE';break;}
            go(weakA,80);
            if(target&&target.type==='hero'){go(target,this.range*0.5);skills(true,this.range*1.3);}
            break;
        }

        case 'FOLLOW_ORDER': {
            if(!order||!orderActive){this.aiState='LANE';break;}
            let ef=this.faction==='BLUE'?'RED':'BLUE';
            switch(order.type){
                case 'DEFEND': {
                    let nx=entities.find(e=>e.type==='nexus'&&e.faction===this.faction);
                    if(nx) go(nx,200);
                    if(target){go(target,this.range*0.6);skills(true,this.range*1.2);}
                    break;
                }
                case 'DRAGON': {
                    let dg=order.targetEntity;
                    if(dg&&!dg.isDead){go(dg,this.range*0.7);skills(true,this.range*1.3);}
                    else this.aiState='LANE';
                    break;
                }
                case 'PUSH_TOP': case 'PUSH_MID': case 'PUSH_BOT': {
                    let dest=this._laneDest(order.lane||'mid');
                    go(dest,100);
                    let tw=entities.find(e=>(e.type==='tower'||e.type==='nexus_turret')&&e.faction===ef&&!e.isDead&&dist(this,e)<e.range*1.8);
                    if(tw&&entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,tw)<tw.range)){
                        let a=Math.atan2(this.y-tw.y,this.x-tw.x);
                        go({x:tw.x+Math.cos(a)*(tw.range-this.range*0.8),y:tw.y+Math.sin(a)*(tw.range-this.range*0.8)},30);
                    }
                    if(target&&dist(this,target)<this.range*1.2) skills(true,this.range*1.2);
                    break;
                }
                case 'GROUP_FIGHT': {
                    let gc=this._nearestAllyGroup();
                    if(gc) go(gc,150);
                    if(target) skills(true,this.range*1.2);
                    break;
                }
                default: this.aiState='LANE';
            }
            break;
        }

        case 'SPLITPUSH': {
            let oppLane=this.laneRole==='top'?'bot':'top';
            go(this._laneDest(oppLane),100);
            if(nearEnemies.find(e=>e.type==='hero'&&dist(this,e)<400)) this.aiState='RETREAT';
            break;
        }

        case 'LANE': default: {
            let wps=this._laneWaypoints();
            let dest=this._nextWaypoint(wps);
            let tw=entities.find(t=>
                (t.type==='tower'||t.type==='nexus_turret')&&t.faction!==this.faction&&!t.isDead&&dist(this,t)<t.range+130);
            if(tw&&!entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,tw)<tw.range)){
                let a=Math.atan2(this.y-tw.y,this.x-tw.x);
                dest={x:tw.x+Math.cos(a)*(tw.range+130),y:tw.y+Math.sin(a)*(tw.range+130)};
            }
            go(dest,60);
            if(nearEnemies.length>0&&target) this.aiState='ATTACK';
            break;
        }
    }
}

// ─────────────────────────────────────────────────────
// 보조 함수들 (Hero 클래스에 추가)
// ─────────────────────────────────────────────────────

_laneDest(lane) {
    let d={
        BLUE:{top:{x:300,y:300},  mid:{x:1500,y:1500},bot:{x:2700,y:2700}},
        RED: {top:{x:2700,y:2700},mid:{x:1500,y:1500},bot:{x:300,y:300}}
    };
    return (d[this.faction]&&d[this.faction][lane])||{x:1500,y:1500};
}

_laneWaypoints() {
    let bT=[{x:300,y:2700},{x:300,y:1500},{x:300,y:300}];
    let bM=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}];
    let bB=[{x:300,y:2700},{x:1500,y:2700},{x:2700,y:2700},{x:2700,y:300}];
    let rT=[{x:2700,y:300},{x:2700,y:1500},{x:2700,y:2700}];
    let rM=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}];
    let rB=[{x:2700,y:300},{x:1500,y:300},{x:300,y:300},{x:300,y:2700}];
    let bWp={top:bT,mid:bM,bot:bB,jungle:bM,support:bB};
    let rWp={top:rT,mid:rM,bot:rB,jungle:rM,support:rB};
    return (this.faction==='BLUE'?bWp:rWp)[this.laneRole]||bM;
}

_nextWaypoint(wps) {
    if(!wps||wps.length===0) return{x:1500,y:1500};
    if(this.wpIdx===undefined) this.wpIdx=1;
    let wp=wps[Math.min(this.wpIdx,wps.length-1)];
    if(dist(this,wp)<180&&this.wpIdx<wps.length-1) this.wpIdx++;
    return wp;
}

_nearestAllyGroup() {
    let allies=entities.filter(e=>e.type==='hero'&&e.faction===this.faction&&!e.isDead&&e!==this);
    for(let a of allies){if(allies.filter(b=>b!==a&&dist(a,b)<300).length>=1) return a;}
    return allies[0]||null;
}

_stateChat(from, to) {
    if(window.AIChat) window.AIChat.triggerStateChat(this, from, to);
}
```

---

## 6. 시스템 4: 스마트 쇼핑 & 스킬 선택

### 6-1. aiShopAI_smart() — 기존 aiShopAI() 대체

```javascript
// Hero 클래스에 추가 (기존 aiShopAI 아래에)
aiShopAI_smart() {
    let heroType = HERO_TMPL[this.heroKey].type;
    let pers     = this.personality || AI_PERSONALITY.TACTICAL;
    let hpRatio  = this.hp / this.maxHp;

    let eligible = BASE_ITEMS.filter(i=>{
        if(this.gold<i.cost) return false;
        if(i.heroType==='melee'  && heroType!=='melee')  return false;
        if(i.heroType==='ranged' && heroType!=='ranged') return false;
        return true;
    });
    if(eligible.length===0) return;

    let scored=eligible.map(item=>{
        let s=50;
        // 성격별 가중치
        if(pers.shopBias==='atk')
            if(['berserker_axe','rapid_cannon','rabadon','mage_staff','luden_echo','void_staff'].includes(item.id)) s+=60;
        if(pers.shopBias==='def')
            if(['steel_plate','magic_cloak','behemoth_armor','absolute_armor','guardian_angel'].includes(item.id)) s+=60;
        if(pers.shopBias==='utility')
            if(['purify_amulet','phantom_dancer','frost_staff','mirror_armor'].includes(item.id)) s+=60;
        // HP 낮을 때 방어 긴급 구매
        if(hpRatio<0.40&&['behemoth_armor','absolute_armor','guardian_angel','steel_plate'].includes(item.id)) s+=80;
        // 보유 아이템 강화 우선
        let owned=this.inventory.find(i2=>i2.id===item.id);
        if(owned&&owned.upgrade<7) s+=40;
        // 진화 경로 완성 기대
        EVOLUTION_ITEMS.forEach(evo=>{
            if(evo.reqItem===item.id&&(this.passiveSkills[evo.reqPassive]||0)>0) s+=55;
        });
        s+=(Math.random()-0.5)*40; // 노이즈 (불완전함 연출)
        return{item,s};
    });
    scored.sort((a,b)=>b.s-a.s);
    this.buyItem(scored[0].item.id);
}
```

### 6-2. aiSelectSkill() — 기존 함수 대체

```javascript
aiSelectSkill() {
    let heroType = HERO_TMPL[this.heroKey].type;
    let pers     = this.personality || AI_PERSONALITY.TACTICAL;

    let available=PASSIVE_SKILLS.filter(s=>{
        if((this.passiveSkills[s.id]||0)>=s.maxLv) return false;
        if(heroType==='melee'  && s.heroType==='ranged') return false;
        if(heroType==='ranged' && s.heroType==='melee')  return false;
        return true;
    });
    if(available.length===0) return;

    let scored=available.map(s=>{
        let sc=50;
        if(pers.shopBias==='atk')
            if(['bloodFury','berserkerSoul','soulHarvest','shadowStrike','stormWalker'].includes(s.id)) sc+=50;
        if(pers.shopBias==='def')
            if(['ironHealth','thornArmor','vampireAura','poisonCloud'].includes(s.id)) sc+=50;
        if(pers.shopBias==='utility')
            if(['haste_art','frost','swiftWind'].includes(s.id)) sc+=50;
        // 진화 경로 완성 우선순위 (아이템 보유 시 해당 패시브 집중)
        EVOLUTION_ITEMS.forEach(evo=>{
            if(evo.reqPassive===s.id&&this.inventory.some(i=>i.id===evo.reqItem)) sc+=75;
        });
        sc+=(Math.random()-0.5)*30;
        return{s,sc};
    });
    scored.sort((a,b)=>b.sc-a.sc);
    let pick=scored[0].s;
    this.passiveSkills[pick.id]=(this.passiveSkills[pick.id]||0)+1;
    this.applyStats();
    this.checkEvolution();
}
```

---

## 7. 시스템 5: 행동 연계 채팅 진화

### 7-1. AIChat 신규 메서드 (window.AIChat 객체 내부에 추가)

```javascript
// window.AIChat = { ... } 내부에 아래 두 메서드 추가

// 오더 채팅 — TeamBrain이 호출
triggerOrderChat: function(commander, orderType, faction) {
    if(!commander) return;
    const p={
        call_dragon:    ["용 잡으러 갑시다","드래곤 집결!","빠르게 드래곤 치자","용 먹으면 이김 ㄱㄱ","드래곤!"],
        call_defend:    ["수비!!","넥서스로 다 모여","빨리 들어와","방어 라인 잡아!","수비 안하면 진다","넥서스 위험"],
        order_push:     ["라인 밀자","집결해서 넥서스!","약한 라인 ㄱㄱ","다 모여서 밀자","오더: 라인 집중"],
        call_teamfight: ["한타 간다","뭉쳐 한타 박자","집결!","5명 모이면 이김","한타 각 나왔다"],
        nexus_open:     ["넥서스 무방비다!!","지금이야!!","다 버리고 넥서스!","가즈아!!!!","열렸다 ㄱ"],
    };
    let msgs=p[orderType]; if(!msgs) return;
    let msg=msgs[Math.floor(Math.random()*msgs.length)];
    setTimeout(()=>this.addChat(commander,msg), 200+Math.random()*400);
},

// 상태 전환 채팅 — AI 행동 변경 시 호출
triggerStateChat: function(hero, from, to) {
    const p={
        'LANE->ASSASSINATE':     ["잠깐 저놈 잡고올게","피 낮네 ㅋ 치고빠짐","컷하고올게"],
        'ATTACK->RETREAT':       ["아 ㅅㅂ 피 없어","일단 튀어야겠다","렉임 ㅈㅅ","후퇴"],
        'LANE->SPLITPUSH':       ["나 반대 라인 밀게","혼자 탑 밀고올게","스플릿 갑니다","딴데 압박걸게"],
        'RETREAT->RECALL':       ["본진 잠깐","아이템 사러","회복 좀 하고올게","귀환"],
        'ATTACK->TEAMFIGHT_JOIN':["한타 합류","간다!","같이 함"],
        'LANE->FOLLOW_ORDER':    ["오더 대로","알겠음","합류","ㅇㅇ"],
        'LANE->SIEGE':           ["타워 딜 넣자","미니언 탱크 고마워","공성 간다"],
        'RECALL->LANE':          ["복귀","왔다","준비됨","ㄱㄱ"],
        'LANE->ESCORT':          ["내가 지킴","뒤에 있어","커버 간다"],
    };
    let key=from+'->'+to, msgs=p[key];
    if(!msgs||Math.random()>0.30) return;
    this.addChat(hero, msgs[Math.floor(Math.random()*msgs.length)]);
},
```

### 7-2. addChat() 상단에 성격별 빈도 조정 블록 삽입

```javascript
// 기존 addChat: function(hero, msg) { 바로 다음 줄 맨 앞에 삽입
if(!hero||!msg) return;
let chatProb=1.0;
if(hero.personality){
    const cp={AGGRESSIVE:1.0,TACTICAL:0.55,COWARD:0.80,OPPORTUNIST:0.90,SUPPORT_MIND:0.65};
    chatProb=cp[hero.personality.id]||1.0;
}
if(Math.random()>chatProb) return;
// ... 이후 기존 코드 그대로 ...
```

---

## 8. 구현 순서 (Antigravity 전달용)

### Phase 1 — 즉각 수정 (30분)
1. `aiShopAI_smart()` 추가 → 기존 `aiShopAI()` 호출부 교체
2. `aiSelectSkill()` heroType 필터 3줄 추가

### Phase 2 — 성격 시스템 (1~2시간)
3. `AI_PERSONALITY` 상수 추가 (game.js 상단)
4. Hero constructor — `this.personality`, `this.aiMemory`, `this.wpIdx` 추가

### Phase 3 — 팀 뇌 (2~3시간)
5. `TeamBrain` 클래스 추가 (Hero 클래스 위)
6. `startGame()` — TeamBrains 초기화 2줄
7. `gameLoop()` — TeamBrain.update 3줄

### Phase 4 — 상태머신 확장 (3~4시간)
8. `handleAI()` 전체 재작성
9. `_decideState()`, `_pickTarget()`, `_runState()` 추가
10. 보조 함수 5개 추가

### Phase 5 — 채팅 연계 (1시간)
11. `AIChat.triggerOrderChat()` 추가
12. `AIChat.triggerStateChat()` 추가
13. `addChat()` 상단 빈도 조정 블록 삽입

---

## 9. Before → After 비교표

| 항목 | Before | After |
|------|--------|-------|
| 아이템 구매 | 크래그가 저격수 렌즈 구매 | 크래그는 방어/근접만 구매 |
| 스킬 선택 | 원거리가 근접 전용 패시브 선택 | 타입 필터 + 성향 가중치 |
| 타워 다이브 | 미니언 없어도 돌진 | 미니언 없으면 안전 거리 유지 |
| 귀환 | HP 낮아도 라인 유지 | 본진 귀환 후 쇼핑·회복 |
| 암살자 행동 | 근처 적 공격 | HP 낮은 적 단독 추적 |
| 서포터 행동 | 근처 적 공격 | 약한 아군 옆에서 보호 |
| 라인 이동 | 단일 좌표 직진 | 웨이포인트 경로 추종 |
| 원거리 이동 | 무작위 | 공격 쿨 중 키팅 |
| 한타 합류 | 우연히 근처에 있으면 | 오더·판단으로 적극 합류 |
| 팀 전략 | 없음 | KDA 1등이 3초마다 오더 발행 |
| 드래곤 | 우연히 근처면 공격 | 팀이 타이밍 맞춰 집결 |
| 채팅 | 랜덤 텍스트 출력 | 실제 행동과 연계된 맥락 채팅 |
| 개성 차이 | 9명 동일 | 공격형/전술형/생존형/기회주의/서포터 |
| 진화 목표 | 랜덤 아이템·스킬 | 진화 경로 인지 후 역방향으로 스킬·아이템 결정 |

---

*본 설계서는 game.js v1.0.14 직독 분석 기반, 모든 함수명·변수명은 기존 코드베이스와 충돌 없이 설계됨.*
