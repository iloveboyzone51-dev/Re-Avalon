import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Phase 1: Creature Spawn bug
old_creature_spawn = '''window.spawnCreatures = function(count) {
    const lanes = ['top', 'mid', 'bot'];
    const types = ['dragon', 'golem', 'beast'];
    showBanner('크리처 군단 소환!', '🐉', true);
    for(let i=0; i<count; i++) {
        let lane = lanes[Math.floor(Math.random() * lanes.length)];
        let ctype = types[Math.floor(Math.random() * types.length)];
        entities.push(new Creature(300, 2700, player.faction, lane, ctype));
    }
};'''
new_creature_spawn = '''window.spawnCreatures = function(count) {
    const lanes = ['top', 'mid', 'bot'];
    const types = ['dragon', 'golem', 'beast'];
    showBanner('크리처 군단 소환!', '🐉', true);
    for(let i=0; i<count; i++) {
        let lane = lanes[Math.floor(Math.random() * lanes.length)];
        let ctype = types[Math.floor(Math.random() * types.length)];
        let spawnX = (player.faction === 'BLUE') ? 300 : 2700;
        let spawnY = (player.faction === 'BLUE') ? 2700 : 300;
        entities.push(new Creature(spawnX, spawnY, player.faction, lane, ctype));
    }
};'''
content = content.replace(old_creature_spawn, new_creature_spawn)

# Phase 1: Filter
old_filter = "entities=entities.filter(e=>!e.isDead||e.type==='hero'||(e.type==='jungle'&&!e.mtype.includes('boss')&&e.mtype!=='summon'));"
new_filter = "entities=entities.filter(e=>!e.isDead||e.type==='hero'||e.type==='creature'||(e.type==='jungle'&&!e.mtype.includes('boss')&&e.mtype!=='summon'));"
content = content.replace(old_filter, new_filter)

# Phase 2: Guardian update override
# Remove lines 3225-3274 (first update) and replace second update (3385-3442) with new logic.
lines = content.split('\n')
idx1 = -1
for i in range(3220, 3235):
    if 'update(dt)' in lines[i]:
        idx1 = i
        break
# Find end of first update
if idx1 != -1:
    depth = 0
    idx1_end = -1
    for i in range(idx1, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth == 0:
            idx1_end = i
            break
    for i in range(idx1, idx1_end + 1):
        lines[i] = '' # Clear first update

idx2 = -1
for i in range(3370, 3400):
    if 'update(dt)' in lines[i] and 'this.healTimer' in ''.join(lines[i:i+15]):
        idx2 = i
        break

if idx2 != -1:
    depth = 0
    idx2_end = -1
    for i in range(idx2, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth == 0:
            idx2_end = i
            break

    new_guardian_update = '''    update(dt) {
        if(this.isDead) return;
        super.update(dt);
        
        // 1. 수호신의 치유 오라 기믹 (우물 근처 아군 힐링)
        let homePos = this.faction === 'BLUE' ? {x:300, y:2700} : {x:2700, y:300};
        let distFromWell = dist(this, homePos);
        
        if(distFromWell < 200) {
            entities.forEach(e => {
                if(e.faction === this.faction && !e.isDead && dist(this, e) <= 250) {
                    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05 * dt);
                    if(Math.random() < 0.03 && typeof spawnParticles !== 'undefined') spawnParticles(e.x, e.y, '#eab308', 2, 40, 0.4, 'plus');
                }
            });
        }

        // 2. 800px 감시 및 완벽한 휘두르기 전투 AI 작동
        this.attackTimer -= dt;
        let target = null;
        let minDist = 800;
        
        entities.forEach(e => {
            if(e.faction !== this.faction && !e.isDead && e.type !== 'tower' && e.type !== 'nexus_turret' && e.type !== 'nexus' && e.type !== 'jungle') {
                let d = dist(this, e);
                if(d < minDist) {
                    minDist = d;
                    target = e;
                }
            }
        });

        if(target) {
            let angle = Math.atan2(target.y - this.y, target.x - this.x);
            if(minDist > this.range) {
                this.vx = Math.cos(angle) * this.moveSpd;
                this.vy = Math.sin(angle) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
            }
            
            if(minDist <= this.range && this.attackTimer <= 0) {
                this.attackTimer = 1.0 / this.aspd;
                if(typeof spawnRing !== 'undefined') spawnRing(this.x, this.y, '#eab308', 200, 0.5);
                if(typeof spawnSlash !== 'undefined') spawnSlash(this.x, this.y-this.radius, angle, '#eab308', 120);
                
                let hitTargets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 180);
                hitTargets.forEach(tgt => {
                    tgt.applyRawDamage(this.atk * 1.5, this);
                    if(tgt.applyStun) tgt.applyStun(1.5);
                    let pushAngle = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                    tgt.vx = Math.cos(pushAngle) * 800;
                    tgt.vy = Math.sin(pushAngle) * 800;
                    if(typeof addText !== 'undefined') addText(tgt.x, tgt.y - 30, '🛡️ 침입자 격퇴!', '#facc15', 16);
                });
                if(typeof playSFX !== 'undefined') playSFX('skill_burst');
            }
        } else {
            if(distFromWell > 20) {
                let angle = Math.atan2(homePos.y - this.y, homePos.x - this.x);
                this.vx = Math.cos(angle) * this.moveSpd;
                this.vy = Math.sin(angle) * this.moveSpd;
            } else {
                this.vx = 0; this.vy = 0;
            }
        }
    }'''

    for i in range(idx2, idx2_end + 1):
        lines[i] = ''
    lines[idx2] = new_guardian_update

content = '\n'.join(lines)

# Phase 3: Building tower heating
old_building = '''            if(target){
                this.attackTimer=1/this.aspd;
                let dmg = this.atk;'''
new_building = '''            if(target){
                this.attackTimer=1/this.aspd;
                let dmg = this.atk;
                if(!this.heatingTargets) this.heatingTargets = {};
                let tid = target.id || target.heroKey || target.type;
                if(this.lastTargetId && this.lastTargetId !== tid) {
                    delete this.heatingTargets[this.lastTargetId];
                    this.heatingTargets[tid] = 1.0;
                }
                if(!this.heatingTargets[tid]) this.heatingTargets[tid] = 1.0;
                else this.heatingTargets[tid] = Math.min(3.0, this.heatingTargets[tid] + 0.25);
                this.lastTargetId = tid;
                dmg = dmg * this.heatingTargets[tid];'''
content = content.replace(old_building, new_building)

# Phase 4: MINION_INTERVAL
content = content.replace('const MINION_INTERVAL   = 18;', 'const MINION_INTERVAL   = 9;')

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
