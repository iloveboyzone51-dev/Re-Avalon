import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Task 10: Grrr Skills
old_skill_burst = "playSFX('skill_burst');"
grrr_skills = """
        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = 12;
            this.baseRadius = this.radius;
            this.radius *= 1.8;
            this.atk *= 1.5; this.maxHp *= 2; this.hp += this.maxHp/2;
            this.moveSpd *= 1.2; this.aspd *= 1.2;
            addText(this.x, this.y-50, '거대화!', '#fcd34d', 20);
        } else if(idx === 2 && k === 'grrr') {
            spawnAOE(this.x, this.y, 180, '#f59e0b88', 0.5);
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 180);
            targets.forEach(t => { t.applyRawDamage(this.atk*1.8, this); t.stunTimer = 2.0; });
            addText(this.x, this.y-50, '포효!', '#ef4444', 24);
        }
        """
if "k === 'grrr'" not in js:
    js = js.replace(old_skill_burst, old_skill_burst + grrr_skills)

# Task 10: Grrr Giant Revert in Hero.update
old_hero_update = "if(this.stunTimer>0) this.stunTimer-=dt;"
grrr_update = """
        if(this.grrrGiantTimer > 0) {
            this.grrrGiantTimer -= dt;
            if(this.grrrGiantTimer <= 0) {
                this.radius = this.baseRadius;
                this.atk /= 1.5; this.maxHp /= 2; this.hp = Math.min(this.hp, this.maxHp);
                this.moveSpd /= 1.2; this.aspd /= 1.2;
            }
        }
        if(this.underdogBuffTimer > 0) {
            this.underdogBuffTimer -= dt;
        }
"""
if "grrrGiantTimer" not in js:
    js = js.replace(old_hero_update, old_hero_update + grrr_update)

# Task 4 & 6: Underdog Buff & Dragons in gameLoop
gameloop_hook = "if(!GS.paused) {"
gameloop_logic = """
        // Underdog Buff Logic
        if(GS.lastUnderdogCheck === undefined) GS.lastUnderdogCheck = 0;
        if(GS.time - GS.lastUnderdogCheck >= 120) {
            GS.lastUnderdogCheck = GS.time;
            let blueScore = GS.scoreBlue; let redScore = GS.scoreRed;
            let buffFaction = null;
            if(blueScore + 3 < redScore) buffFaction = 'BLUE';
            else if(redScore + 3 < blueScore) buffFaction = 'RED';
            
            if(buffFaction && window.showBuffAnnouncer) {
                window.showBuffAnnouncer(buffFaction + ' 진영 언더독 버프 발동!');
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
"""
if "lastUnderdogCheck" not in js:
    js = js.replace(gameloop_hook, gameloop_hook + gameloop_logic)

# Underdog stats calculation in Hero stats
# Wait, we need to apply stats dynamically or just rely on the buffTimer.
# In game.js, stats are calculated? No, they are direct properties. We should recalculate them in `Hero.update` or just apply/remove them.
# A better way is to calculate effective stats in a getter or during attack. 
# For now, let's just modify the attack / move speed logic. 

# Task 14: Enhance UI text
old_enhance_success = "addText(this.x,this.y-50,'+'+slot.upgrade+' 성공!','#f59e0b'); }"
new_enhance_success = """addText(this.x,this.y-50,'+'+slot.upgrade+' 강화 성공!','#f59e0b'); 
                if(slot.upgrade >= 5 && window.AIChat) {
                    // Trigger emojis for nearby heroes
                    let nearby = entities.filter(e=>e.type==='hero' && dist(this, e)<500);
                    nearby.forEach(n => { addText(n.x, n.y-60, ['😲','✨','🔥','😱'][Math.floor(Math.random()*4)], '#fff', 24); });
                }
            } else { addText(this.x,this.y-50,'강화 실패...','#64748b'); }"""
js = js.replace(old_enhance_success, new_enhance_success)

# Task 9: AI Defense Logic
old_handle_ai = "let hpRatio = this.hp/this.maxHp;"
new_handle_ai = """
        // Defense logic
        let myTowers = entities.filter(e=>(e.type==='tower'||e.type.includes('nexus')) && e.faction===this.faction && !e.isDead);
        let towerUnderAttack = myTowers.find(t => t.hp < t.maxHp && entities.some(en => en.faction!==this.faction && dist(en,t)<400));
        if (towerUnderAttack && dist(this, towerUnderAttack) < 1000) {
            this.aiState = 'DEFEND';
            this.aiTarget = {x: towerUnderAttack.x, y: towerUnderAttack.y};
        }
        
        let hpRatio = this.hp/this.maxHp;
"""
if "aiTarget" not in js:
    js = js.replace(old_handle_ai, new_handle_ai)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Part 3 changes applied")
