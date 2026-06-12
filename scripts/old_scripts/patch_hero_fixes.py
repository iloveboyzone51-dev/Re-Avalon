import sys

def patch_game_js():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update ZEPHYR range
    content = content.replace('range:400, type:"ranged", role_desc:"[바람 마법사', 'range:380, type:"ranged", role_desc:"[바람 마법사')
    
    # 2. Update SYLVIA range
    content = content.replace('range:300, type:"ranged", role_desc:"[초장거리 스나이퍼', 'range:450, type:"ranged", role_desc:"[초장거리 스나이퍼')

    # 3. Update ZEROS autoUseHeroSkills (Skill 1: Huge weapon swing, Skill 2: Afterimage trail)
    # Target in autoUseHeroSkills
    zeros_skill1_target = """            if(idx===1) { // 흑염참
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                spawnAOE(this.x + Math.cos(a)*100, this.y + Math.sin(a)*100, 150, '#7f1d1dAA', 0.5);
                spawnSlash(this.x, this.y, a + 0.2, '#000000', 200);
                spawnSlash(this.x, this.y, a - 0.2, '#7f1d1d', 200);"""
    zeros_skill1_replace = """            if(idx===1) { // 흑염참
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                this.attackAnimTimer = 0.5;
                spawnAOE(this.x + Math.cos(a)*100, this.y + Math.sin(a)*100, 200, '#7f1d1dAA', 0.8);
                // 거대한 무기 휘두름 및 잔상 이펙트
                for(let i=-2; i<=2; i++) {
                    setTimeout(() => spawnSlash(this.x, this.y, a + i*0.15, '#000000', 250), (i+2)*50);
                    setTimeout(() => spawnSlash(this.x, this.y, a + i*0.15, '#dc2626', 220), (i+2)*50 + 20);
                }"""
    content = content.replace(zeros_skill1_target, zeros_skill1_replace)

    zeros_skill2_target = """                    this.x = target.x + Math.cos(a)*40;
                    this.y = target.y + Math.sin(a)*40;
                    
                    target.applyRawDamage(skillDmg * 3.5, this, true, true);"""
    zeros_skill2_replace = """                    let startX = this.x; let startY = this.y;
                    this.x = target.x + Math.cos(a)*40;
                    this.y = target.y + Math.sin(a)*40;
                    
                    // 돌진 경로에 멋진 붉은/검은 잔상 추가 (1초 후 사라짐)
                    if(typeof laserEffects !== 'undefined') {
                        laserEffects.push({x1:startX, y1:startY, x2:this.x, y2:this.y, color:'#7f1d1d', life:1.0, maxLife:1.0, width:40});
                        laserEffects.push({x1:startX, y1:startY, x2:this.x, y2:this.y, color:'#000000', life:0.8, maxLife:0.8, width:20});
                    }
                    for(let i=0; i<8; i++) {
                        let tx = startX + (this.x - startX)*(i/8);
                        let ty = startY + (this.y - startY)*(i/8);
                        spawnParticles(tx, ty, '#dc2626', 10, 80, 1.0);
                    }
                    
                    target.applyRawDamage(skillDmg * 3.5, this, true, true);"""
    content = content.replace(zeros_skill2_target, zeros_skill2_replace)

    # 4. Update SYLVIA skills
    sylvia_skill1_target = """                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#06b6d4', 0.4, 20);
                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#ffffff', 0.2, 10);"""
    sylvia_skill1_replace = """                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#06b6d4', 0.4, 40);
                    spawnBeam(this.x, this.y-this.radius, this.x + Math.cos(a)*1000, this.y-this.radius + Math.sin(a)*1000, '#ffffff', 0.2, 20);"""
    content = content.replace(sylvia_skill1_target, sylvia_skill1_replace)

    sylvia_skill2_target = """            } else { // 전술 회피
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
            }"""
    sylvia_skill2_replace = """            } else { // 전술 회피
                let a = this.facingDir > 0 ? 0 : Math.PI;
                if(t) a = Math.atan2(t.y - this.y, t.x - this.x);
                let mineX = this.x, mineY = this.y;
                
                // 백덤블링 애니메이션 모션
                this.attackAnimTimer = 0.5; 
                this.x -= Math.cos(a)*250;
                this.y -= Math.sin(a)*250;
                this.invincibleTimer = 0.5;
                
                // 지뢰 렌더링을 위해 파티클 남기기
                spawnRing(mineX, mineY, '#ef4444', 30, 0.5);
                
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
            }"""
    content = content.replace(sylvia_skill2_target, sylvia_skill2_replace)

    # 5. Update ZEPHYR skill 2 to make projectile isMega
    zephyr_skill2_target = """                let p = new Projectile(this.x, this.y, {x:this.x+Math.cos(a)*800, y:this.y+Math.sin(a)*800, isDead:false}, skillDmg*1.2, this, false, 'tornado');
                p.speed = 100; p.life = 4.0;
                projectiles.push(p);"""
    zephyr_skill2_replace = """                let p = new Projectile(this.x, this.y, {x:this.x+Math.cos(a)*800, y:this.y+Math.sin(a)*800, isDead:false}, skillDmg*1.2, this, false, 'tornado');
                p.speed = 100; p.life = 4.0;
                p.isMega = true; // 대형 회오리
                projectiles.push(p);"""
    content = content.replace(zephyr_skill2_target, zephyr_skill2_replace)

    # 6. Update Projectile.draw for mega tornado
    tornado_draw_target = """        else if(this.ptype==='tornado'){
            ctx.rotate(performance.now()/50);
            ctx.shadowColor='#4ade80'; ctx.shadowBlur=10; ctx.strokeStyle='#86efac'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.stroke();
            ctx.shadowBlur=0;
        }"""
    tornado_draw_replace = """        else if(this.ptype==='tornado'){
            ctx.rotate(performance.now()/50);
            let scale = this.isMega ? 3 : 1;
            ctx.shadowColor='#4ade80'; ctx.shadowBlur=10 * scale; ctx.strokeStyle='#86efac'; ctx.lineWidth=2 * scale;
            ctx.beginPath(); ctx.arc(0,0,14 * scale,0,Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0,7 * scale,0,Math.PI*2); ctx.stroke();
            ctx.shadowBlur=0;
        }"""
    content = content.replace(tornado_draw_target, tornado_draw_replace)

    # 7. Update drawBlockyHero for ZEROS sword aura and SYLVIA range circle
    # ZEROS sword aura target
    zeros_draw_target = """        ctx.fillStyle = '#1c1917'; ctx.fillRect(-r*0.1, -r*2.0, r*0.3, r*2.5); // 자루 및 칼등
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.moveTo(-r*0.1, -r*2.0); ctx.lineTo(r*0.3, -r*2.5); ctx.lineTo(r*0.5, -r*1.5); ctx.lineTo(r*0.2, r*0); ctx.fill(); // 날
        // 붉은 화염 이펙트 (흑염검 오라)
        ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r*0.1, -r*2.0); ctx.lineTo(r*0.3, -r*2.5); ctx.stroke();
        ctx.shadowBlur = 0;"""
    zeros_draw_replace = """        ctx.fillStyle = '#1c1917'; ctx.fillRect(-r*0.1, -r*2.0, r*0.3, r*2.5); // 자루 및 칼등
        
        // 은은한 붉은색 오라(Aura)가 도는 검 테두리
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 15;
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.moveTo(-r*0.1, -r*2.0); ctx.lineTo(r*0.3, -r*2.5); ctx.lineTo(r*0.5, -r*1.5); ctx.lineTo(r*0.2, r*0); ctx.closePath(); ctx.fill(); 
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.shadowBlur = 0;"""
    content = content.replace(zeros_draw_target, zeros_draw_replace)

    # SYLVIA range circle target
    sylvia_draw_target = """    } else if(type === 'sylvia') {
        drawBody('#fef08a', '#cffafe', '#f0fdf4', '#06b6d4'); // Cream white + Cyan
        // 헥스테크 후드"""
    sylvia_draw_replace = """    } else if(type === 'sylvia') {
        if(entity && entity.isPlayer) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 450, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        drawBody('#fef08a', '#cffafe', '#f0fdf4', '#06b6d4'); // Cream white + Cyan
        // 헥스테크 후드"""
    content = content.replace(sylvia_draw_target, sylvia_draw_replace)


    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)
        print("Patched hero fixes successfully.")

if __name__ == '__main__':
    patch_game_js()
