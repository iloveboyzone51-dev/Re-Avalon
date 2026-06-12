import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update TEAM_VAULT and remove souls
content = content.replace("window.TEAM_VAULT = { souls: 0, gold: 0 };", "window.TEAM_VAULT = { gold: 0 };")
content = content.replace("if(Math.random() < 0.15) window.TEAM_VAULT.souls++;", "")
content = content.replace("document.getElementById('hudVaultSouls').textContent = window.TEAM_VAULT.souls;", "")

# 2. Update applyRawDamage in Entity
old_apply = '''    applyRawDamage(amount, attacker, triggerEffects=true){
        if(this.isDead) return 0;'''
new_apply = '''    applyRawDamage(amount, attacker, triggerEffects=true, isSkill=false){
        if(this.isDead) return 0;
        if(isSkill && this.ctype === 'golem') return 0;
        if(this.ctype === 'beast') amount *= 0.75;'''
content = content.replace(old_apply, new_apply)

# 3. Update applyRawDamage in Guardian
old_guard_apply1 = '''    applyRawDamage(dmg, attacker, triggerEffects=true) {
        return super.applyRawDamage(dmg * 0.5, attacker, triggerEffects); // 50% damage reduction
    }'''
new_guard_apply1 = '''    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if(isSkill || (attacker && attacker.range > 150)) dmg *= 0.3;
        return super.applyRawDamage(dmg * 0.5, attacker, triggerEffects, isSkill);
    }'''
content = content.replace(old_guard_apply1, new_guard_apply1)

old_guard_apply2 = '''    applyRawDamage(dmg, attacker, triggerEffects=true) {
        let d = super.applyRawDamage(dmg * 0.5, attacker, triggerEffects);'''
new_guard_apply2 = '''    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if(isSkill || (attacker && attacker.range > 150)) dmg *= 0.3;
        let d = super.applyRawDamage(dmg * 0.5, attacker, triggerEffects, isSkill);'''
content = content.replace(old_guard_apply2, new_guard_apply2)

# 4. Guardian Attack Speed (2x) and Area
old_guard_const = '''        this.baseMaxHp=25000; this.maxHp=25000; this.hp=25000; this.atk=200; this.defense=100;
        this.baseAspd=0.8; this.aspd=0.8; this.moveSpd=150; this.range=120; this.radius=30;'''
new_guard_const = '''        this.baseMaxHp=25000; this.maxHp=25000; this.hp=25000; this.atk=200; this.defense=100;
        this.baseAspd=1.6; this.aspd=1.6; this.moveSpd=150; this.range=120; this.radius=30;'''
content = content.replace(old_guard_const, new_guard_const)

# 5. Creature constructor (Stats and scale)
old_creature_const = '''        let scale = 1 + (window.GS ? window.GS.time / 360 : 0); // 6분에 2배, 12분에 3배
        
        if (ctype === 'dragon') {
            this.maxHp = 15000 * scale; this.hp = this.maxHp;
            this.atk = 300 * scale; this.moveSpd = 120; this.radius = 24; this.aspd = 0.6; this.range = 80;
        } else if (ctype === 'golem') {
            this.maxHp = 30000 * scale; this.hp = this.maxHp;
            this.atk = 100 * scale; this.moveSpd = 100; this.radius = 30; this.aspd = 0.5; this.range = 90;
        } else { // beast
            this.maxHp = 12000 * scale; this.hp = this.maxHp;
            this.atk = 400 * scale; this.moveSpd = 250; this.radius = 20; this.aspd = 1.5; this.range = 70;
        }'''
new_creature_const = '''        let scale = 1 + (window.GS ? window.GS.time / 360 : 0);
        
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
        }'''
content = content.replace(old_creature_const, new_creature_const)

# 6. Creature update & draw (passives & AOE)
old_creature_update = '''    update(dt) {
        if(this.isDead) return; super.update(dt);
        if(this.attackTimer <= 0 && this.ctype === 'dragon') {
             // 브레스 (가상)
             if(Math.random()<0.1) spawnParticles(this.x, this.y, '#ef4444', 5, 60, 0.5);
        }
    }'''
new_creature_update = '''    update(dt) {
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
    }'''
content = content.replace(old_creature_update, new_creature_update)

old_minion_attack = '''            else { this.vx=0; this.vy=0; if(this.attackTimer<=0){ this.attackTimer=1/this.aspd; target.applyRawDamage(this.atk,this); spawnSlash(this.x,this.y-this.radius,Math.atan2(target.y-this.y,target.x-this.x),'#64748b',20); } }'''
new_minion_attack = '''            else { 
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
            }'''
content = content.replace(old_minion_attack, new_minion_attack)

# 7. spawnCreatures economy (600G per creature)
old_spawn_call = '''        if(GS.time > 0 && GS.time - GS.lastCreatureSpawn >= 360) {
            GS.lastCreatureSpawn = GS.time;
            if(window.spawnCreatures) window.spawnCreatures(1);
        }'''
new_spawn_call = '''        if(GS.time > 0 && GS.time - GS.lastCreatureSpawn >= 360) {
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
        }'''
content = content.replace(old_spawn_call, new_spawn_call)

# 8. EpicDragon destruction logic
content = content.replace("e.applyRawDamage(this.atk * 1.5, this);", "e.applyRawDamage(this.atk * 15.0, this, true, true);")
content = content.replace("e.applyRawDamage(this.atk, this);", "e.applyRawDamage(this.atk * 10.0, this, true, true);")
content = content.replace("e.applyRawDamage(this.atk * 0.5, this);", "e.applyRawDamage(this.atk * 5.0, this, true, true);")
content = content.replace("e.applyRawDamage(domainDmg, this, false);", "e.applyRawDamage(domainDmg * 5.0, this, false, true);")

# 9. Correctly inject isSkill for heroes WITHOUT breaking code.
# The correct way is to use regex with lookahead/lookbehind, or simpler, replace exact patterns.
# Only replace `applyRawDamage(X, this)` where X starts with `skillDmg`, `pBomb`, etc.
def fix_apply(m):
    return f"applyRawDamage({m.group(1)}, {m.group(2)}, true, true)"

content = re.sub(r'applyRawDamage\((skillDmg(?:\s*\*\s*[\d.]+)?(?:.*?)?),\s*(this)\)', fix_apply, content)
content = re.sub(r'applyRawDamage\((pBomb(?:\s*\*\s*[\d.]+)?(?:.*?)?),\s*(this)\)', fix_apply, content)
content = re.sub(r'applyRawDamage\((pStorm(?:\s*\*\s*[\d.]+)?(?:.*?)?),\s*(this)\)', fix_apply, content)
content = re.sub(r'applyRawDamage\((pz\.dmg(?:\s*\*\s*[\d.]+)?(?:.*?)?),\s*(this)\)', fix_apply, content)
content = re.sub(r'applyRawDamage\((tickDrain(?:\s*\*\s*[\d.]+)?(?:.*?)?),\s*(this)\)', fix_apply, content)

# Also fix projectile damages that use `this.attacker`
content = re.sub(r'applyRawDamage\((this\.dmg(?:.*?)?),\s*(this\.attacker)\)', fix_apply, content)

# 10. Fix aura in draw() for Creature
old_creature_draw = '''    draw(ctx) {
        if(this.isDead) return;
        ctx.save();
        ctx.translate(this.x, this.y);'''
new_creature_draw = '''    draw(ctx) {
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
        ctx.translate(this.x, this.y);'''
content = content.replace(old_creature_draw, new_creature_draw)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("game.js patched cleanly.")
