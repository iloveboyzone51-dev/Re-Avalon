import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ----------------------------------------------------
# STEP 4: AI Logic Humanization
# ----------------------------------------------------
# 4-1. Add AI parameters to Hero constructor
hero_constructor_end = """        this.kills=0; this.deaths=0; this.assists=0; this.totalDmg=0;
        this.floatingTextTimer=0; this.floatingTexts=[];
        this.isGiant = false;
        
        // AI 개성 파라미터
        const rand = (min, max) => Math.random() * (max - min) + min;
        this.aiPersonality = {
            aggression:  rand(0.3, 1.0),
            riskTaking:  rand(0.2, 0.9),
            greediness:  rand(0.3, 0.8),
            teamPlayer:  rand(0.3, 0.9),
            junglePref:  rand(0.1, 0.7),
        };
        this.aiDecisionTimer = rand(0, 2.0);
        this.aiCurrentDecision = 'LANE';
        this.aiIdleTimer = 0;
        this.aiEmoteTimer = 0;
"""
js = re.sub(r"this\.floatingTexts=\[\];\s*(?:this\.isGiant = false;)?", hero_constructor_end, js, count=1)

# 4-2. Replace handleAI()
old_handle_ai = r"handleAI\(dt\) \{[\s\S]*?(?=\n    autoUseHeroSkills)"
new_handle_ai = """handleAI(dt) {
        if(this.isDead || this.stunTimer > 0) return;

        let myBase  = this.faction === 'BLUE' ? {x:300,  y:2700} : {x:2700, y:300};
        let enyBase = this.faction === 'BLUE' ? {x:2700, y:300}  : {x:300,  y:2700};
        let hpRatio = this.hp / this.maxHp;
        let p       = this.aiPersonality;

        // ── 기본 상점 방문 ──
        if(dist(this, myBase) < 400) {
            this.aiShopTimer -= dt;
            if(this.aiShopTimer <= 0) {
                this.aiShopRoleAware();
                this.aiShopTimer = (Math.random()*10 + 8);
            }
        }

        // ── 결정 타이머: 인간처럼 0.3~0.8초마다 재평가 ──
        this.aiDecisionTimer -= dt;
        if(this.aiDecisionTimer > 0) {
            this.executeDecision(dt, myBase, enyBase);
            this.autoAttack();
            return;
        }
        this.aiDecisionTimer = (Math.random()*0.5 + 0.3);

        // ── 근처 정보 수집 ──
        let nearEnemyHeroes = entities.filter(e => e.faction !== this.faction && !e.isDead && e.type==='hero' && dist(this,e) < 600);
        let nearAllyHeroes  = entities.filter(e => e.faction === this.faction  && !e.isDead && e.type==='hero' && e !== this && dist(this,e) < 500);
        let nearEnemyAll    = entities.filter(e => e.faction !== this.faction  && !e.isDead && dist(this,e) < 600);

        // ── 위험도 계산 ──
        let dangerScore = 0;
        nearEnemyHeroes.forEach(e => {
            let killThreaten = (e.atk * e.aspd * 5) > this.hp;
            dangerScore += killThreaten ? 2 : 1;
        });
        let underTower = entities.some(t => (t.type==='tower'||t.type==='nexus_turret') && t.faction!==this.faction && !t.isDead && dist(this,t)<t.range+50);

        // ── 도주 결정 ──
        let retreatThreshold = 0.25 + (1 - p.riskTaking) * 0.25;
        if(hpRatio < retreatThreshold || (hpRatio < 0.5 && dangerScore >= 3 && underTower)) {
            let dyingEnemy = nearEnemyAll.find(e => e.hp/e.maxHp < 0.12 && dist(this,e)<this.range*1.5);
            if(dyingEnemy && p.greediness > 0.6) {
                this.aiCurrentDecision = 'KILL_CHASE';
                this.aiDecisionTarget = dyingEnemy;
            } else {
                this.aiCurrentDecision = 'RETREAT';
            }
        }
        // ── 한타 합류 ──
        else if(nearAllyHeroes.length >= 2 && nearEnemyHeroes.length >= 2 && p.teamPlayer > 0.5) {
            this.aiCurrentDecision = 'TEAMFIGHT';
        }
        // ── 정글 파밍 ──
        else if(this.laneRole==='jungle' || (p.junglePref > 0.5 && nearEnemyAll.length === 0)) {
            this.aiCurrentDecision = 'JUNGLE';
        }
        // ── 공격 ──
        else if(nearEnemyAll.length > 0) {
            this.aiCurrentDecision = 'ATTACK';
        }
        // ── 라인 전진 ──
        else {
            if(Math.random() < 0.03) {
                this.aiCurrentDecision = 'IDLE';
                this.aiIdleTimer = (Math.random()*2 + 0.5);
            } else {
                this.aiCurrentDecision = 'LANE';
            }
        }

        this.executeDecision(dt, myBase, enyBase);
        this.autoAttack();
    }

    executeDecision(dt, myBase, enyBase) {
        let p = this.aiPersonality;
        const moveTo = (tx, ty, spd) => {
            let a = Math.atan2(ty - this.y, tx - this.x);
            a += (Math.random()*0.16 - 0.08);
            this.vx = Math.cos(a) * (spd || this.moveSpd);
            this.vy = Math.sin(a) * (spd || this.moveSpd);
            this.facingDir = tx < this.x ? -1 : 1;
        };
        const stopMove = () => { this.vx = 0; this.vy = 0; };

        switch(this.aiCurrentDecision) {
            case 'RETREAT': {
                moveTo(myBase.x, myBase.y);
                if(dist(this, myBase) < 120) stopMove();
                if(!this.emote && Math.random() < 0.005) {
                    this.emote = ['😰','🏃','😱'][Math.floor(Math.random()*3)];
                    this.emoteTimer = 2;
                }
                break;
            }
            case 'KILL_CHASE': {
                let t2 = this.aiDecisionTarget;
                if(!t2 || t2.isDead) { this.aiCurrentDecision = 'LANE'; break; }
                if(dist(this,t2) > this.range * 0.7) moveTo(t2.x, t2.y);
                else stopMove();
                if(this.heroSkill1Timer <= 0) this.useSkill(1);
                break;
            }
            case 'TEAMFIGHT': {
                let allies = entities.filter(e => e.faction===this.faction && !e.isDead && e.type==='hero' && e!==this);
                let center = allies.reduce((acc,a)=>({x:acc.x+a.x/allies.length, y:acc.y+a.y/allies.length}), {x:0,y:0});
                if(dist(this, center) > 120) moveTo(center.x, center.y);
                else stopMove();
                let tgt = entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<600)
                                   .sort((a,b)=>a.hp-b.hp)[0];
                this.aiDecisionTarget = tgt;
                if(tgt && this.heroSkill1Timer <= 0) this.useSkill(1);
                if(tgt && this.heroSkill2Timer <= 0) this.useSkill(2);
                break;
            }
            case 'JUNGLE': {
                let mob = entities.filter(e => e.type==='jungle' && !e.isDead && dist(this,e)<800)
                                  .sort((a,b)=>dist(this,a)-dist(this,b))[0];
                if(mob) {
                    if(dist(this,mob) > this.range*0.7) moveTo(mob.x, mob.y);
                    else stopMove();
                } else {
                    moveTo(1500, 1500);
                }
                break;
            }
            case 'ATTACK': {
                let tgt = entities.filter(e=>e.faction!==this.faction&&!e.isDead&&dist(this,e)<600)
                                   .sort((a,b)=>{
                                       if(p.aggression > 0.7) return (b.type==='hero'?-1:1);
                                       return dist(this,a) - dist(this,b);
                                   })[0];
                this.aiDecisionTarget = tgt;
                if(!tgt) { this.aiCurrentDecision='LANE'; break; }
                if(dist(this,tgt) > this.range * 0.75) moveTo(tgt.x, tgt.y);
                else stopMove();
                if(this.heroSkill1Timer <= 0 && dist(this,tgt)<400) this.useSkill(1);
                if(this.heroSkill2Timer <= 0 && dist(this,tgt)<400) this.useSkill(2);
                break;
            }
            case 'IDLE': {
                this.aiIdleTimer -= (1/60);
                stopMove();
                if(this.aiIdleTimer <= 0) this.aiCurrentDecision = 'LANE';
                if(!this.emote && Math.random() < 0.01) {
                    this.emote = ['😶','🙄','💭','😴'][Math.floor(Math.random()*4)];
                    this.emoteTimer = 2;
                }
                break;
            }
            case 'LANE':
            default: {
                let dest = {x:1500, y:1500};
                if(this.laneRole === 'top') dest = this.faction==='BLUE'?{x:300,y:300}:{x:2700,y:2700};
                if(this.laneRole === 'bot') dest = this.faction==='BLUE'?{x:2700,y:2700}:{x:300,y:300};
                if(dist(this, dest) < 300) dest = enyBase;
                let underTower = entities.some(t=>(t.type==='tower'||t.type==='nexus_turret')&&t.faction!==this.faction&&!t.isDead&&dist(this,t)<t.range+40);
                if(underTower && this.hp/this.maxHp < 0.65) {
                    moveTo(myBase.x, myBase.y, this.moveSpd * 0.7);
                    break;
                }
                moveTo(dest.x, dest.y);
                break;
            }
        }
    }

    aiShopRoleAware() {
        let budget = this.gold;
        const pref = {
            top:    ['hp','reflect','atk'],
            mid:    ['atk','aspd','burn'],
            bot:    ['aspd','crit','lifesteal'],
            jungle: ['atk','move','lifesteal'],
        };
        let role  = this.laneRole || 'mid';
        let prefs = pref[role] || pref.mid;
        for(let pid of prefs) {
            let item = BASE_ITEMS.find(i=>i.id===pid);
            if(item && budget >= item.cost) {
                this.buyItem(item.id);
                return;
            }
        }
        this.aiShopAI();
    }
"""
js = re.sub(old_handle_ai, new_handle_ai, js)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied step 4!")
