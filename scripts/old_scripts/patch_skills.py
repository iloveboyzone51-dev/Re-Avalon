import sys

def patch_skills():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    target_archon = "        } else if(k==='ARCHON') {"
    new_skills = """        } else if(k==='ZEROS') {
            if(idx===1) { // 흑염참
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                spawnAOE(this.x + Math.cos(a)*100, this.y + Math.sin(a)*100, 150, '#7f1d1dAA', 0.5);
                spawnSlash(this.x, this.y, a + 0.2, '#000000', 200);
                spawnSlash(this.x, this.y, a - 0.2, '#7f1d1d', 200);
                nearEnemies(this.x, this.y, 250).forEach(e => {
                    let ea = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = ea - a;
                    while(diff > Math.PI) diff -= Math.PI*2;
                    while(diff < -Math.PI) diff += Math.PI*2;
                    if(Math.abs(diff) < Math.PI/2) {
                        e.applyRawDamage(skillDmg * 1.8, this, true, true);
                        e.slowTimer = 3.0; e.slowRate = 0.5;
                        spawnParticles(e.x, e.y, '#000000', 10, 80, 0.5);
                    }
                });
                playSFX('skill_burst');
            } else { // 그림자 습격
                let tgts = nearEnemies(this.x, this.y, 600);
                if(tgts.length > 0) {
                    let target = tgts.sort((a,b)=>a.hp-b.hp)[0];
                    let a = Math.atan2(target.y - this.y, target.x - this.x);
                    this.x = target.x + Math.cos(a)*40;
                    this.y = target.y + Math.sin(a)*40;
                    
                    target.applyRawDamage(skillDmg * 3.5, this, true, true);
                    spawnSlash(this.x, this.y, a+Math.PI, '#000000', 150);
                    spawnAOE(this.x, this.y, 100, '#00000088', 0.8);
                    
                    nearEnemies(this.x, this.y, 100).forEach(e => {
                        e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (1.5)*0.7 : (1.5);
                    });
                    playSFX('skill_burst');
                }
            }
        } else if(k==='SYLVIA') {
            if(idx===1) { // 관통하는 섬광
                this.attackAnimTimer = 1.0;
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                
                spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*800, this.y-this.radius + Math.sin(a)*800, '#ef4444', 1.0);
                
                setTimeout(() => {
                    if(this.isDead || typeof GS === 'undefined' || GS.status !== 'PLAYING') return;
                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#06b6d4', 0.4, 20);
                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#ffffff', 0.2, 10);
                    if(typeof playSFX !== 'undefined') playSFX('skill_burst');
                    
                    nearEnemies(this.x, this.y, 1000).forEach(e => {
                        let ea = Math.atan2(e.y - this.y, e.x - this.x);
                        let diff = Math.abs(ea - a);
                        while(diff > Math.PI) diff -= Math.PI*2;
                        if(Math.abs(diff) < 0.1) {
                            let oldDef = e.defense;
                            e.defense = 0; 
                            e.applyRawDamage(skillDmg * 2.5, this, true, true);
                            e.defense = oldDef;
                            spawnParticles(e.x, e.y, '#06b6d4', 15, 100, 0.4);
                        }
                    });
                }, 1000);
            } else { // 전술 회피
                let tgts = nearEnemies(this.x, this.y, 150);
                if(tgts.length > 0) {
                    let a = Math.atan2(tgts[0].y - this.y, tgts[0].x - this.x);
                    let mineX = this.x, mineY = this.y;
                    setTimeout(() => {
                        if(typeof GS === 'undefined' || GS.status !== 'PLAYING') return;
                        spawnAOE(mineX, mineY, 150, '#f59e0bAA', 0.5);
                        spawnRing(mineX, mineY, '#fbbf24', 150, 0.5);
                        if(typeof playSFX !== 'undefined') playSFX('skill_burst');
                        nearEnemies(mineX, mineY, 150).forEach(e => {
                            e.applyRawDamage(skillDmg * 1.5, this, true, true);
                            e.stunTimer = e.type==='hero' && e.inventory && e.inventory.some(i=>i.id==='behemoth_armor') && HERO_TMPL[e.heroKey] && HERO_TMPL[e.heroKey].type==='melee' ? (2.0)*0.7 : (2.0);
                        });
                    }, 500);

                    this.x -= Math.cos(a)*200;
                    this.y -= Math.sin(a)*200;
                    this.invincibleTimer = 0.5;
                }
            }
        } else if(k==='ZEPHYR') {
            if(idx===1) { // Tornado Blast
                for(let i=0; i<6; i++) {
                    let a = (Math.PI*2/6)*i;
                    projectiles.push(new Projectile(this.x + Math.cos(a)*30, this.y + Math.sin(a)*30, {x:this.x + Math.cos(a)*400, y:this.y + Math.sin(a)*400, isDead:false}, skillDmg*0.8, this, false, 'tornado'));
                }
                playSFX('skill_magic');
            } else { // Gale Squall
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                let p = new Projectile(this.x, this.y, {x:this.x+Math.cos(a)*800, y:this.y+Math.sin(a)*800, isDead:false}, skillDmg*1.2, this, false, 'tornado');
                p.speed = 100; p.life = 4.0;
                projectiles.push(p);
                playSFX('skill_magic');
            }
        } else if(k==='ARCHON') {"""
    
    if target_archon in content:
        content = content.replace(target_archon, new_skills)
        print("Patched autoUseHeroSkills.")
    else:
        print("target_archon not found")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_skills()
