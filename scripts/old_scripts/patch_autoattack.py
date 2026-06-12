import sys

def patch_autoattack():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # ZEROS auto-attack (Melee splash like BARBARIAN)
    # Target:
    #             else if(this.heroKey === 'CRAG') {
    crag_target = """            else if(this.heroKey === 'CRAG') {"""
    crag_replace = """            else if(this.heroKey === 'ZEROS') {
                let a = Math.atan2(target.y-this.y, target.x-this.x);
                spawnSlash(this.x, this.y-this.radius, a, '#7f1d1d', 120); // 흑염검
                let hitTargets = entities.filter(e=>e.faction!==this.faction && !e.isDead && dist(e, this) <= this.range + 20);
                hitTargets.forEach(tgt => {
                    let dealt=tgt.applyRawDamage(dmg, this); this.totalDmg+=dealt;
                    this.triggerOnHitPassives(tgt);
                    if(this.lifeSteal>0) this.hp=Math.min(this.maxHp, this.hp+dealt*this.lifeSteal);
                });
                if(this.isPlayer) playSFX('hit');
            }
            else if(this.heroKey === 'CRAG') {"""
    
    if crag_target in content:
        content = content.replace(crag_target, crag_replace)
        print("Patched ZEROS autoattack.")
    else:
        print("crag_target not found")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_autoattack()
