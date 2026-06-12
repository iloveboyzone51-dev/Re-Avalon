import re

def modify_game_js():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject AI_PERSONALITY and TeamBrain before class Hero extends Entity
    ai_system = """
// ============ AI 성격 시스템 ============
const AI_PERSONALITY = {
    AGGRESSIVE: {
        id: 'AGGRESSIVE', label: '공격형',
        retreatHpRatio: 0.20, chaseRange: 1100, orderObeyRate: 0.55, loneWolfChance: 0.40, skillUseDelay: 0.1,
        shopBias: 'atk', chatStyle: 'toxic',
    },
    TACTICAL: {
        id: 'TACTICAL', label: '전술형',
        retreatHpRatio: 0.35, chaseRange: 800, orderObeyRate: 0.90, loneWolfChance: 0.10, skillUseDelay: 0.3,
        shopBias: 'balanced', chatStyle: 'callout',
    },
    COWARD: {
        id: 'COWARD', label: '생존형',
        retreatHpRatio: 0.50, chaseRange: 500, orderObeyRate: 0.70, loneWolfChance: 0.20, skillUseDelay: 0.5,
        shopBias: 'def', chatStyle: 'complain',
    },
    OPPORTUNIST: {
        id: 'OPPORTUNIST', label: '기회주의형',
        retreatHpRatio: 0.30, chaseRange: 700, orderObeyRate: 0.50, loneWolfChance: 0.60, skillUseDelay: 0.2,
        shopBias: 'gold', chatStyle: 'brag',
    },
    SUPPORT_MIND: {
        id: 'SUPPORT_MIND', label: '서포터형',
        retreatHpRatio: 0.40, chaseRange: 600, orderObeyRate: 0.85, loneWolfChance: 0.05, skillUseDelay: 0.4,
        shopBias: 'utility', chatStyle: 'encourage',
    }
};

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

    _electCommander() {
        let myHeroes = entities.filter(e => e.type==='hero' && e.faction===this.faction && !e.isDead && !e.isPlayer);
        if (myHeroes.length === 0) return;
        myHeroes.sort((a, b) => {
            let sa = a.kills*3 + (a.assists||0) - a.deaths*2 + a.level;
            let sb = b.kills*3 + (b.assists||0) - b.deaths*2 + b.level;
            return sb - sa;
        });
        this.commander = myHeroes[0];
    }

    _analyzeAndIssueOrder() {
        let ef = this.faction==='BLUE' ? 'RED' : 'BLUE';
        let myH = entities.filter(e=>e.type==='hero'&&e.faction===this.faction&&!e.isDead);
        let myNx = entities.find(e=>e.type==='nexus'&&e.faction===this.faction);
        let enmNx = entities.find(e=>e.type==='nexus'&&e.faction===ef);
        let dragons = entities.filter(e=>(e.mtype==='boss_epic_dragon'||e.mtype==='boss')&&!e.isDead);
        let myScore = this.faction==='BLUE' ? GS.scoreBlue : GS.scoreRed;
        let enmScore = this.faction==='BLUE' ? GS.scoreRed : GS.scoreBlue;
        let avgHp = myH.length>0 ? myH.reduce((s,h)=>s+h.hp/h.maxHp,0)/myH.length : 1;

        if (myNx && myNx.hp/myNx.maxHp < 0.30) return this._issue('DEFEND', null, 'critical', 10.0);
        
        if (enmNx && !entities.some(e=>e.type==='nexus_turret'&&e.faction===ef&&!e.isDead)) {
            let lane = this._weakestEnemyLane();
            this._chat('nexus_open');
            return this._issue('PUSH_'+lane.toUpperCase(), lane, 'urgent', 20.0);
        }
        
        let nearDragon = dragons.find(d=>myH.filter(h=>dist(h,d)<900).length>=2);
        if (nearDragon && avgHp>0.55 && Math.random()<0.65) {
            this._chat('call_dragon');
            return this._issue('DRAGON', null, 'urgent', 15.0, nearDragon);
        }
        
        if (avgHp < 0.45) return this._issue('FARM', null, 'normal', 12.0);
        
        if (myScore - enmScore >= 3) {
            let lane = this._weakestEnemyLane();
            if (Math.random()<0.5) this._chat('order_push');
            return this._issue('PUSH_'+lane.toUpperCase(), lane, 'normal', 15.0);
        }
        
        if (enmScore - myScore >= 3) {
            if (Math.random()<0.6) this._chat('call_defend');
            return this._issue('DEFEND', null, 'urgent', 12.0);
        }
        
        let grouped = this._findGroupedAllies(3, 450);
        if (grouped && GS.time>300) {
            if (Math.random()<0.4) this._chat('call_teamfight');
            return this._issue('GROUP_FIGHT', null, 'normal', 8.0);
        }
        
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
        let sorted = Object.entries(laneScore).sort((a,b)=>a[1]-b[1]);
        return sorted.length > 0 ? sorted[0][0] : 'mid';
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

class Hero extends Entity {
"""
    content = content.replace("class Hero extends Entity {", ai_system, 1)

    # 2. Inject into Hero constructor
    constructor_inj = """
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
            this.aiMemory = { lastDeathPos: null, lastKilledBy: null, enemyDangerMap: {}, objectiveFocus: null };
            this.wpIdx = 1;
        }
        this.applyStats();
"""
    content = content.replace("        this.applyStats();", constructor_inj, 1)

    # 3. Replace handleAI (stops strictly before aiShopAI)
    handle_ai_pattern = re.compile(r'    handleAI\(dt\).*?(?=    aiShopAI\(\)\s*\{)', re.DOTALL)
    new_handle_ai = """    handleAI(dt) {
        if (this.isDead || this.stunTimer > 0) return;

        let myBase    = this.faction==='BLUE' ? {x:300,y:2700} : {x:2700,y:300};
        let enemyBase = this.faction==='BLUE' ? {x:2700,y:300} : {x:300,y:2700};
        let hpRatio   = this.hp / this.maxHp;
        let pers      = this.personality || AI_PERSONALITY.TACTICAL;

        if (!this.aiUpdateTimer) this.aiUpdateTimer = 0;
        this.aiUpdateTimer -= dt;
        if (this.aiUpdateTimer <= 0) {
            this.aiUpdateTimer = 0.2;
            this.nearEnemiesCache = entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<1000);
            this.nearAlliesCache  = entities.filter(e=>e.faction===this.faction&&!e.isDead&&dist(this,e)<1000&&e!==this);
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

        if (dist(this, myBase) < 400) {
            if (!this.aiShopTimer) this.aiShopTimer = 3.0 + Math.random()*4.0;
            this.aiShopTimer -= dt;
            if (this.aiShopTimer <= 0) {
                this.aiShopAI();
                this.aiShopTimer = 3.0 + Math.random()*4.0;
            }
        }

        let brain  = window.TeamBrains && window.TeamBrains[this.faction];
        let order  = brain ? brain.currentOrder : null;
        let orderActive = order && (GS.time - order.issuedAt) < order.duration;

        let oldState = this.aiState;
        this.aiState = this._decideState(hpRatio,nearEnemies,nearAllies,pers,order,orderActive,myBase);

        if (oldState !== this.aiState) {
            this.aiChasing = false;
            this.reactionDelay = pers.id==='AGGRESSIVE' ? 0.05 : 0.10+Math.random()*0.15;
            if (Math.random() < 0.25) this._stateChat(oldState, this.aiState);
        }
        if (this.reactionDelay > 0) { this.reactionDelay -= dt; return; }

        let target = this._pickTarget(nearEnemies, pers);
        this._runState(dt,target,nearEnemies,nearAllies,myBase,enemyBase,pers,order,orderActive);
        this.aiTarget = target;
    }

    _decideState(hpRatio, nearEnemies, nearAllies, pers, order, orderActive, myBase) {
        let dangerZones = entities.filter(e => e.type==='stormZone' && e.faction!==this.faction && dist(this, e) < e.radius);
        if (dangerZones.length > 0) return 'EVADE';

        if (hpRatio <= pers.retreatHpRatio) {
            if (pers.id==='AGGRESSIVE') {
                let dying=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.15&&dist(this,e)<this.range*1.5);
                if(dying) return 'ASSASSINATE';
            }
            return dist(this,myBase)<500 ? 'RECALL' : 'RETREAT';
        }
        if (orderActive && Math.random()<pers.orderObeyRate) return 'FOLLOW_ORDER';
        let dyingHero=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.30&&dist(this,e)<700);
        if(dyingHero&&(pers.id==='AGGRESSIVE'||pers.id==='OPPORTUNIST')) return 'ASSASSINATE';
        if(pers.id==='SUPPORT_MIND') {
            let weakAlly=nearAllies.find(a=>a.type==='hero'&&a.hp/a.maxHp<0.40);
            if(weakAlly) return 'ESCORT';
        }
        let combatAllies=nearAllies.filter(a=>a.type==='hero'&&(a.lastAttackedTimer||0)>0);
        if(combatAllies.length>=2&&nearEnemies.filter(e=>e.type==='hero').length>=1) return 'TEAMFIGHT_JOIN';
        if(pers.id==='OPPORTUNIST'&&hpRatio>0.70&&nearAllies.filter(a=>a.type==='hero').length===0&&Math.random()<pers.loneWolfChance) return 'SPLITPUSH';
        
        let siegeTower=entities.find(e=>
            (e.type==='tower'||e.type==='nexus_turret')&&e.faction!==this.faction&&!e.isDead&&
            dist(this,e)<700&&entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,e)<e.range));
        if(siegeTower) return 'SIEGE';
        if(nearEnemies.length>0) return 'ATTACK';
        return 'LANE';
    }

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
            case 'EVADE': {
                let dangerZones = entities.filter(e => e.type==='stormZone' && e.faction!==this.faction && dist(this, e) < e.radius);
                if(dangerZones.length > 0) {
                    let dz = dangerZones[0];
                    let a = Math.atan2(this.y - dz.y, this.x - dz.x);
                    this.vx = Math.cos(a) * this.moveSpd * 1.5;
                    this.vy = Math.sin(a) * this.moveSpd * 1.5;
                    this.facingDir = this.vx > 0 ? 1 : -1;
                } else {
                    this.aiState = 'LANE';
                }
                break;
            }
            case 'RETREAT': {
                let chaser=nearEnemies.find(e=>e.type==='hero'&&dist(this,e)<350);
                if(chaser){
                    let a=Math.atan2(myBase.y-this.y,myBase.x-this.x);
                    let n=Math.sin(performance.now()/130)*0.5;
                    this.vx=Math.cos(a+n)*this.moveSpd; this.vy=Math.sin(a+n)*this.moveSpd;
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
                    let a=Math.atan2(this.y-target.y,this.x-target.x);
                    let side=Math.sin(performance.now()/200)*0.6;
                    this.vx=Math.cos(a+side)*this.moveSpd*0.8; this.vy=Math.sin(a+side)*this.moveSpd*0.8;
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
                let tw=entities.find(e=>(e.type==='tower'||e.type==='nexus_turret')&&e.faction!==this.faction&&!e.isDead&&dist(this,e)<700);
                if(!tw){this.aiState='LANE';break;}
                let hasTank=entities.some(m=>m.faction===this.faction&&m.type==='minion'&&!m.isDead&&dist(m,tw)<tw.range);
                if(hasTank){
                    let a=Math.atan2(this.y-tw.y,this.x-tw.x);
                    go({x:tw.x+Math.cos(a)*(tw.range-this.range*0.9),y:tw.y+Math.sin(a)*(tw.range-this.range*0.9)},30);
                } else { go(myBase,300); }
                break;
            }
            case 'ASSASSINATE': {
                let prey=nearEnemies.find(e=>e.type==='hero'&&(e.hp/e.maxHp)<0.40)||nearEnemies.find(e=>e.type==='hero');
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
                let tw=entities.find(t=>(t.type==='tower'||t.type==='nexus_turret')&&t.faction!==this.faction&&!t.isDead&&dist(this,t)<t.range+130);
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
"""
    content = handle_ai_pattern.sub(new_handle_ai, content)

    # 4. Replace aiShopAI (stops strictly before applyStats)
    shop_ai_pattern = re.compile(r'    aiShopAI\(\)\s*\{.*?(?=    applyStats\(\)\s*\{)', re.DOTALL)
    new_shop_ai = """    aiShopAI() {
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
            if(pers.shopBias==='atk') if(['berserker_axe','rapid_cannon','rabadon','mage_staff','luden_echo','void_staff'].includes(item.id)) s+=60;
            if(pers.shopBias==='def') if(['steel_plate','magic_cloak','behemoth_armor','absolute_armor','guardian_angel'].includes(item.id)) s+=60;
            if(pers.shopBias==='utility') if(['purify_amulet','phantom_dancer','frost_staff','mirror_armor'].includes(item.id)) s+=60;
            if(hpRatio<0.40&&['behemoth_armor','absolute_armor','guardian_angel','steel_plate'].includes(item.id)) s+=80;
            let owned=this.inventory.find(i2=>i2.id===item.id);
            if(owned&&owned.upgrade<7) s+=40;
            EVOLUTION_ITEMS.forEach(evo=>{
                if(evo.reqItem===item.id&&(this.passiveSkills[evo.reqPassive]||0)>0) s+=55;
            });
            s+=(Math.random()-0.5)*40;
            return{item,s};
        });
        scored.sort((a,b)=>b.s-a.s);
        this.buyItem(scored[0].item.id);
    }

"""
    content = shop_ai_pattern.sub(new_shop_ai, content)

    # 5. Replace aiSelectSkill (stops strictly before checkEvolution)
    select_skill_pattern = re.compile(r'    aiSelectSkill\(\)\s*\{.*?(?=    checkEvolution\(\)\s*\{)', re.DOTALL)
    new_select_skill = """    aiSelectSkill() {
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
            if(pers.shopBias==='atk') if(['bloodFury','berserkerSoul','soulHarvest','shadowStrike','stormWalker'].includes(s.id)) sc+=50;
            if(pers.shopBias==='def') if(['ironHealth','thornArmor','vampireAura','poisonCloud'].includes(s.id)) sc+=50;
            if(pers.shopBias==='utility') if(['haste_art','frost','swiftWind'].includes(s.id)) sc+=50;
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

"""
    content = select_skill_pattern.sub(new_select_skill, content)

    # 6. Inject TeamBrains into startGame()
    startgame_pat = re.compile(r'entities\.push\(player\);[\s]*')
    content = startgame_pat.sub(r"entities.push(player);\n    window.TeamBrains = { 'BLUE': new TeamBrain('BLUE'), 'RED': new TeamBrain('RED') };\n", content, count=1)

    # 7. Inject TeamBrains update in gameLoop()
    gameloop_pat = re.compile(r'if\(window\.AIChat\) window\.AIChat\.update\(dt\);')
    content = gameloop_pat.sub(r"if(window.AIChat) window.AIChat.update(dt);\n    if(window.TeamBrains) { if(window.TeamBrains['BLUE']) window.TeamBrains['BLUE'].update(dt); if(window.TeamBrains['RED']) window.TeamBrains['RED'].update(dt); }", content, count=1)

    # 8. Modify window.AIChat to add triggerOrderChat and triggerStateChat
    aichat_pat = re.compile(r'window\.AIChat = \{[\s]*chatLog: null,')
    chat_methods = """window.AIChat = {
    chatLog: null,
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
        
        let tColor = faction === 'BLUE' ? '#3b82f6' : '#ef4444';
        if(orderType==='call_dragon') {
            let dg = entities.find(e=>(e.mtype==='boss_epic_dragon'||e.mtype==='boss')&&!e.isDead);
            if(dg) { spawnRing(dg.x, dg.y, tColor, 200, 1.0); spawnParticles(dg.x, dg.y, tColor, 30, 200, 1.5); }
        } else if(orderType==='call_defend') {
            let nx = entities.find(e=>e.type==='nexus'&&e.faction===faction);
            if(nx) { spawnRing(nx.x, nx.y, tColor, 250, 1.0); spawnParticles(nx.x, nx.y, tColor, 40, 250, 1.5); }
        }
    },
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
"""
    content = aichat_pat.sub(chat_methods, content)

    # 9. Add probability filter in addChat based on personality
    addchat_pat = re.compile(r'        if\(!this\.chatLog \|\| !hero\) return;[\s]*')
    prob_code = r"""        if(!this.chatLog || !hero) return;
        let chatProb=1.0;
        if(hero.personality){
            const cp={AGGRESSIVE:1.0,TACTICAL:0.55,COWARD:0.80,OPPORTUNIST:0.90,SUPPORT_MIND:0.65};
            chatProb=cp[hero.personality.id]||1.0;
        }
        if(Math.random()>chatProb) return;
"""
    content = addchat_pat.sub(prob_code, content)

    # 10. Modify Hero.draw to draw 👑 on commander
    hero_draw_pat = re.compile(r'        ctx\.restore\(\);[\s]*// HP Bar')
    crown_code = r"""        ctx.restore();
        
        let brain = window.TeamBrains && window.TeamBrains[this.faction];
        if(brain && brain.commander === this && !this.isDead) {
            ctx.font = '20px Arial';
            ctx.fillText('👑', this.x-10, this.y - this.radius - 20);
        }
        
        // HP Bar"""
    content = hero_draw_pat.sub(crown_code, content)

    # Joker skill update (Phase 4 requirement mentioned earlier)
    content = content.replace("let bet = Math.max(100,", "let bet = Math.max(500,")
    
    # CC update for ZEROS (stun to slow)
    content = content.replace("e.stunTimer = 1.2;", "e.slowTimer = 2.0; e.slowRate = 0.9; /* Stun -> Slow (Phase 4) */")
    
    # Barbarian CC update (stun to bleeding)
    content = content.replace("e.stunTimer = 0.5;", "if(!e.status_bleeding) { e.status_bleeding = 3.0; e.bleedingDmg = skillDmg * 0.2; } /* Stun -> Bleeding (Phase 4) */")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("AI Evolution Update applied SAFELY!")

if __name__ == '__main__':
    modify_game_js()
