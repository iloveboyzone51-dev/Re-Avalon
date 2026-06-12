import sys
with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Golem damage
golem_target = """    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if (this.ctype === 'golem') {
            if (isSkill || (attacker && attacker.range > 150)) {
                return 0; // 면역
            }
            dmg *= 0.75; // 25% 감소
        }
        return super.applyRawDamage(dmg, attacker, triggerEffects, isSkill);
    }"""
golem_replace = """    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if (this.ctype === 'golem') {
            if (isSkill || (attacker && attacker.range > 150)) {
                dmg *= 0.5; // 50% 감면
            } else {
                dmg *= 0.75; // 25% 감소
            }
        }
        return super.applyRawDamage(dmg, attacker, triggerEffects, isSkill);
    }"""
if golem_target in content:
    content = content.replace(golem_target, golem_replace)
    print("Golem damage logic updated.")
else:
    print("Golem damage logic not found!")

# 2. Guardian CC immunity
# First remove duplicate methods and add update method
guardian_target = """    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
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
        super.update(dt);"""
guardian_replace = """    applyRawDamage(dmg, attacker, triggerEffects=true, isSkill=false) {
        if(isSkill || (attacker && attacker.range > 150)) dmg *= 0.3;
        let d = super.applyRawDamage(dmg * 0.5, attacker, triggerEffects, isSkill);
        this.hitStopTimer = 0; // 완전한 상태이상/경직 면역
        return d;
    }
    applyStun(duration) { }
    applySlow(amount, duration) { }
    
    update(dt) {
        if(this.isDead) return;
        super.update(dt);
        this.stunTimer = 0;
        this.airborneTimer = 0;
        this.isFrozen = false;
        this.slowTimer = 0;
        this.hitStopTimer = 0;
        this.vx = 0;
        this.vy = 0;"""
if guardian_target in content:
    content = content.replace(guardian_target, guardian_replace)
    print("Guardian CC immunity updated.")
else:
    print("Guardian CC immunity NOT found!")

# 3. Joker attack type
joker_target1 = "this.isSplash = attacker && attacker.type==='hero' && (attacker.heroKey==='JOKER' || attacker.heroKey==='DARKPRIEST' || attacker.heroKey==='ARIEL');"
joker_replace1 = "this.isSplash = attacker && attacker.type==='hero' && (attacker.heroKey==='DARKPRIEST' || attacker.heroKey==='ARIEL');"
if joker_target1 in content:
    content = content.replace(joker_target1, joker_replace1)
    print("Joker splash removed from Projectile.")
else:
    print("Joker splash target 1 not found!")

joker_target2 = "let aoeStr = (h === 'JOKER' || h === 'DARKPRIEST' || h === 'THOR') ? '광역(스플래시)' : '단일 타겟';"
joker_replace2 = "let aoeStr = (h === 'DARKPRIEST' || h === 'THOR') ? '광역(스플래시)' : '단일 타겟';"
if joker_target2 in content:
    content = content.replace(joker_target2, joker_replace2)
    print("Joker splash removed from UI string.")
else:
    print("Joker splash target 2 not found!")

# 4. Hero 5 sec invincibility on respawn
respawn_target = """                this.isDead=false; this.hp=this.maxHp;
                let sp=this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
                this.x=sp.x+rand(-60,60); this.y=sp.y+rand(-60,60);
                if(this.isPlayer){ document.getElementById('respawnOverlay').classList.add('hidden'); }"""
respawn_replace = """                this.isDead=false; this.hp=this.maxHp;
                this.invincibleTimer = 5.0; // 5초 무적
                let sp=this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
                this.x=sp.x+rand(-60,60); this.y=sp.y+rand(-60,60);
                if(this.isPlayer){ document.getElementById('respawnOverlay').classList.add('hidden'); }"""
if respawn_target in content:
    content = content.replace(respawn_target, respawn_replace)
    print("Hero respawn invincibility added.")
else:
    print("Hero respawn target not found!")

# 5. Creature Beast and Dragon maxHp to 50000
creature_hp_target = """        if (ctype === 'dragon') {
            this.maxHp = 30000 * scale; this.hp = this.maxHp;
            this.atk = 600 * scale; this.moveSpd = 120; this.radius = 54; this.aspd = 0.6; this.range = 80;
        } else if (ctype === 'golem') {
            this.maxHp = 60000 * scale; this.hp = this.maxHp;
            this.atk = 200 * scale; this.moveSpd = 100; this.radius = 67; this.aspd = 0.5; this.range = 90;
        } else { // beast
            this.maxHp = 24000 * scale; this.hp = this.maxHp;
            this.atk = 800 * scale; this.moveSpd = 250; this.radius = 45; this.aspd = 1.5; this.range = 70;
            this.beastStunTimer = 6.0;
        }"""
creature_hp_replace = """        if (ctype === 'dragon') {
            this.maxHp = 50000 * scale; this.hp = this.maxHp;
            this.atk = 600 * scale; this.moveSpd = 120; this.radius = 54; this.aspd = 0.6; this.range = 80;
        } else if (ctype === 'golem') {
            this.maxHp = 60000 * scale; this.hp = this.maxHp;
            this.atk = 200 * scale; this.moveSpd = 100; this.radius = 67; this.aspd = 0.5; this.range = 90;
        } else { // beast
            this.maxHp = 50000 * scale; this.hp = this.maxHp;
            this.atk = 800 * scale; this.moveSpd = 250; this.radius = 45; this.aspd = 1.5; this.range = 70;
            this.beastStunTimer = 6.0;
        }"""
if creature_hp_target in content:
    content = content.replace(creature_hp_target, creature_hp_replace)
    print("Creature HP updated.")
else:
    print("Creature HP target not found!")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("All patches applied to game.js!")
