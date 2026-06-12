import sys

def patch_zephyr():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update ZEPHYR range in HERO_TMPL
    zephyr_target = """    ZEPHYR: {
        name:"제피르", color:"#4ade80",
        hp:1800, atk:40, aspd:1.6, move:175, range:200, type:"ranged", role_desc:"[바람 마법사 / 다단히트 DPS]",
"""
    zephyr_replace = """    ZEPHYR: {
        name:"제피르", color:"#4ade80",
        hp:1800, atk:40, aspd:1.6, move:175, range:400, type:"ranged", role_desc:"[바람 마법사 / 다단히트 DPS]",
"""
    if zephyr_target in content:
        content = content.replace(zephyr_target, zephyr_replace)
        print("Patched ZEPHYR range.")
    else:
        print("zephyr_target not found")
        
    # 2. Update autoAttack for ZEPHYR
    attack_target = """            if(this.heroKey === 'ARCHON') {
                laserEffects.push({x1:this.x, y1:this.y-this.radius, x2:target.x, y2:target.y-target.radius, color:'#ffffff', life:0.15, maxLife:0.15, width:15});
                spawnAOE(target.x, target.y, 80, '#ffffff44', 0.2);
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 80);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                });
                if(this.isPlayer) playSFX('shoot');
            } else {"""
            
    attack_replace = """            if(this.heroKey === 'ARCHON') {
                laserEffects.push({x1:this.x, y1:this.y-this.radius, x2:target.x, y2:target.y-target.radius, color:'#ffffff', life:0.15, maxLife:0.15, width:15});
                spawnAOE(target.x, target.y, 80, '#ffffff44', 0.2);
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, target) <= 80);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                });
                if(this.isPlayer) playSFX('shoot');
            } else if(this.heroKey === 'ZEPHYR') {
                let a = Math.atan2(target.y - this.y, target.x - this.x);
                for(let i = -1; i <= 1; i++) {
                    let pa = a + i * 0.15; // 약간씩 퍼지는 3갈래
                    projectiles.push(new Projectile(this.x, this.y-this.radius, {x:this.x+Math.cos(pa)*800, y:this.y+Math.sin(pa)*800, isDead:false}, dmg*0.7, this, isCrit, 'tornado'));
                }
                if(this.isPlayer) playSFX('shoot');
            } else {"""

    if attack_target in content:
        content = content.replace(attack_target, attack_replace)
        print("Patched ZEPHYR autoAttack.")
    else:
        print("attack_target not found")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_zephyr()
