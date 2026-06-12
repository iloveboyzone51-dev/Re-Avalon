import sys

def patch_projectile():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Projectile constructor
    proj_target1 = """            else if(attacker.heroKey==='ARIEL') this.ptype='holy';
        }
    }"""
    proj_replace1 = """            else if(attacker.heroKey==='ARIEL') this.ptype='holy';
            else if(attacker.heroKey==='SYLVIA') this.ptype='snipe_bullet';
            else if(attacker.heroKey==='ZEPHYR') { this.ptype='tornado'; this.speed=250; this.hitSet = new Set(); this.life = 1.5; }
        }
        if(this.ptype==='tornado') {
            let a = Math.atan2(target.y-y, target.x-x);
            this.vx = Math.cos(a) * this.speed;
            this.vy = Math.sin(a) * this.speed;
        }
    }"""
    if proj_target1 in content:
        content = content.replace(proj_target1, proj_replace1)
        print("Patched Projectile constructor.")
    else:
        print("proj_target1 not found")

    # 2. Projectile update
    proj_target2 = """    update(dt){
        if(this.target.isDead){this.isDead=true;return;}
        if(dist(this,this.target)<15 || (this.isSplash && dist(this,this.target)<40)){"""
    proj_replace2 = """    update(dt){
        if(this.ptype==='tornado') {
            this.life -= dt;
            if(this.life <= 0 || this.x < 0 || this.x > 3000 || this.y < 0 || this.y > 3000) { this.isDead = true; return; }
            this.x += this.vx * dt; this.y += this.vy * dt;
            entities.forEach(e => {
                if(e.faction !== this.attacker.faction && !e.isDead && dist(this, e) < 50 && !this.hitSet.has(e)) {
                    this.hitSet.add(e);
                    let dealt = e.applyRawDamage(this.dmg, this.attacker, true, true);
                    if(this.attacker && this.attacker.type === 'hero') this.attacker.totalDmg += (dealt || this.dmg);
                    if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(e);
                    spawnParticles(e.x, e.y, '#4ade80', 5, 50, 0.3);
                }
            });
            return;
        }
        if(this.target.isDead){this.isDead=true;return;}
        if(dist(this,this.target)<15 || (this.isSplash && dist(this,this.target)<40)){"""
    if proj_target2 in content:
        content = content.replace(proj_target2, proj_replace2)
        print("Patched Projectile update.")
    else:
        print("proj_target2 not found")

    # 3. Projectile draw
    proj_target3 = """        else if(this.ptype==='blood'){
            ctx.fillStyle='#e11d48'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-5); ctx.lineTo(-4,0); ctx.lineTo(-6,5); ctx.fill();
        }"""
    proj_replace3 = """        else if(this.ptype==='blood'){
            ctx.fillStyle='#e11d48'; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(-6,-5); ctx.lineTo(-4,0); ctx.lineTo(-6,5); ctx.fill();
        }
        else if(this.ptype==='snipe_bullet'){
            ctx.fillStyle='#06b6d4'; ctx.fillRect(-10,-2,20,4);
            ctx.fillStyle='#fef08a'; ctx.beginPath(); ctx.arc(10,0,2,0,Math.PI*2); ctx.fill();
        }
        else if(this.ptype==='tornado'){
            ctx.rotate(performance.now()/50);
            ctx.shadowColor='#4ade80'; ctx.shadowBlur=10; ctx.strokeStyle='#86efac'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.stroke();
            ctx.shadowBlur=0;
        }"""
    if proj_target3 in content:
        content = content.replace(proj_target3, proj_replace3)
        print("Patched Projectile draw.")
    else:
        print("proj_target3 not found")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_projectile()
