import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Grrr Giant skill
grrr_giant_old = """            // Grrr Giant buff
            if(this.grrrGiantTimer > 0) {
                effAtk *= 1.5; effMove *= 1.2; effAspd *= 1.2;
            }"""
grrr_giant_new = """            // Grrr Giant buff
            if(this.grrrGiantTimer > 0) {
                effAtk *= 1.5; effMove *= 1.2; effAspd *= 1.2; this.damageReduction = 0.3;
                if(!this.isGiant) { this.isGiant=true; this.baseRadius=this.radius; this.baseMaxHp=this.maxHp; this.maxHp*=1.5; this.hp+=this.baseMaxHp*0.5; this.radius*=1.8; }
            } else if(this.isGiant) {
                this.isGiant=false; this.damageReduction = 0; this.maxHp=this.baseMaxHp; this.hp=Math.min(this.hp,this.maxHp); this.radius=this.baseRadius;
            }"""
js = js.replace(grrr_giant_old, grrr_giant_new)

trigger_old = """        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = 12;
            this.baseRadius = this.radius;
            this.radius *= 1.8;
            this.atk *= 1.5; this.maxHp *= 2; this.hp += this.maxHp/2;
            this.moveSpd *= 1.2; this.aspd *= 1.2;
            addText(this.x, this.y-50, '거대화!', '#fcd34d', 20);
        }"""
trigger_new = """        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = 10;
            addText(this.x, this.y-50, '거대화! 체력+50% 공방+50% 이속+20%', '#fcd34d', 18);
        }"""
js = js.replace(trigger_old, trigger_new)

# 2. Minimap
minimap_old = "const mCanvas=document.getElementById('minimapCanvas'); const mCtx=mCanvas.getContext('2d');"
minimap_new = "const mCanvas=document.getElementById('minimapCanvas'); const mCtx=mCanvas.getContext('2d');\nmCanvas.width=160; mCanvas.height=160;"
js = js.replace(minimap_old, minimap_new)

# 3. Knockback/Hitstop
kb_old = """        // 피격 넉백 및 경직(Hit-stun)
        if(!this.isBuilding && attacker && !attacker.isBuilding) {
            let angle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
            let kbForce = isCrit ? 250 : 100; // 넉백 수치 대폭 증가
            this.x += Math.cos(angle) * kbForce * 0.1;
            this.y += Math.sin(angle) * kbForce * 0.1;
            
            // 피격 경직 (0.15초~0.3초간 움직임 정지)
            this.stunTimer = Math.max(this.stunTimer || 0, isCrit ? 0.3 : 0.15);
        }

        // 히트스톱 (크리티컬이거나, 플레이어가 때렸을 때)
        if(isCrit) {
            GS.hitStopTimer = 0.04;
        }"""
js = js.replace(kb_old, "")

hitstop_old = """    if(!GS.paused && GS.hitStopTimer > 0) {
        GS.hitStopTimer -= dt;
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }"""
js = js.replace(hitstop_old, "")

# 4. Dragon Remodel & AI
dragon_draw_old = """        // 몬스터 종류에 따른 색상과 모양 (5종류)
        if(this.mtype === 'wolf') ctx.fillStyle = '#475569';
        else if(this.mtype === 'bear') ctx.fillStyle = '#78350f';
        else if(this.mtype === 'golem') ctx.fillStyle = '#94a3b8';
        else if(this.mtype === 'skeleton') ctx.fillStyle = '#f8fafc';
        else if(this.mtype === 'slime') ctx.fillStyle = '#22c55e';
        else ctx.fillStyle = '#991b1b'; // Boss

        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius*0.8, 0, 0, Math.PI*2); ctx.fill();"""
dragon_draw_new = """        if(this.mtype === 'boss_dragon') {
            ctx.save();
            ctx.translate(this.x, this.y);
            let a = this.vx||this.vy ? Math.atan2(this.vy, this.vx) : Math.PI/2;
            ctx.rotate(a);
            ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.moveTo(-this.radius, 0); ctx.lineTo(-this.radius*2.5, -this.radius*0.3); ctx.lineTo(-this.radius*2.5, this.radius*0.3); ctx.fill();
            let wingAnim = Math.sin(performance.now()/150) * 0.5;
            ctx.fillStyle = '#991b1b';
            ctx.beginPath(); ctx.moveTo(0, -this.radius*0.5); ctx.lineTo(this.radius*1.5, -this.radius*2.5 + wingAnim*20); ctx.lineTo(-this.radius, -this.radius*1.5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, this.radius*0.5); ctx.lineTo(this.radius*1.5, this.radius*2.5 - wingAnim*20); ctx.lineTo(-this.radius, this.radius*1.5); ctx.fill();
            ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius*1.2, this.radius*0.8, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(this.radius, 0, this.radius*0.6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.moveTo(this.radius*1.2, -this.radius*0.3); ctx.lineTo(this.radius*0.8, -this.radius*0.8); ctx.lineTo(this.radius*0.5, -this.radius*0.4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(this.radius*1.2, this.radius*0.3); ctx.lineTo(this.radius*0.8, this.radius*0.8); ctx.lineTo(this.radius*0.5, this.radius*0.4); ctx.fill();
            ctx.restore();
        } else {
            if(this.mtype === 'wolf') ctx.fillStyle = '#475569';
            else if(this.mtype === 'bear') ctx.fillStyle = '#78350f';
            else if(this.mtype === 'golem') ctx.fillStyle = '#94a3b8';
            else if(this.mtype === 'skeleton') ctx.fillStyle = '#f8fafc';
            else if(this.mtype === 'slime') ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius*0.8, 0, 0, Math.PI*2); ctx.fill();
        }"""
js = js.replace(dragon_draw_old, dragon_draw_new)

dragon_ai_old = "else { this.vx=0; this.vy=0; if(this.attackTimer<=0){this.attackTimer=1/this.aspd; target.applyRawDamage(this.atk,this);} }"
dragon_ai_new = """else { this.vx=0; this.vy=0; if(this.attackTimer<=0){
    this.attackTimer=1/this.aspd; 
    if(this.mtype === 'boss_dragon') {
        let r = Math.random();
        if(r < 0.3) {
            spawnAOE(this.x, this.y, 250, '#ef444488', 1.0);
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 250);
            targets.forEach(t => t.applyRawDamage(this.atk*1.5, this));
            playSFX('skill_burst');
        } else if(r < 0.6) {
            spawnRing(this.x, this.y, '#f59e0b', 300, 0.8);
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 300);
            targets.forEach(t => { t.applyRawDamage(this.atk*2, this); t.stunTimer = 1.0; });
            playSFX('skill_cast');
        } else target.applyRawDamage(this.atk,this);
    } else target.applyRawDamage(this.atk,this);
} }"""
js = js.replace(dragon_ai_old, dragon_ai_new)

# 5. Emote
emote_draw = """        let bw=24,bh=4,bx=this.x-bw/2,by=this.y-this.radius-10; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
        if(this.emote) { ctx.font = '28px sans-serif'; ctx.fillText(this.emote, this.x - 14, this.y - this.radius*1.5 - 20); }"""
js = js.replace("let bw=24,bh=4,bx=this.x-bw/2,by=this.y-this.radius-10; ctx.fillStyle='#374151'; ctx.fillRect(bx,by,bw,bh); ctx.fillStyle=this.faction==='BLUE'?'#3b82f6':'#ef4444'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);", emote_draw)

chat_emote = """            if (event === 'kill' || event === 'streak') {
                if (Math.random() < 0.5) character.emote = ['🤣','😎','🤪','🔥'][Math.floor(Math.random()*4)];
            } else if (event === 'death') {
                character.emote = ['😭','🤬','💀','💢'][Math.floor(Math.random()*4)];
            }
            if(character.emote) character.emoteTimer = 3.0;"""
js = js.replace("let chatChance = 0.5;", chat_emote + "\n            let chatChance = 0.5;")
js = js.replace("this.animPhase+=dt*3;", "this.animPhase+=dt*3; if(this.emoteTimer>0){this.emoteTimer-=dt; if(this.emoteTimer<=0)this.emote=null;}")

# 6. Critical Damage
crit_old = "addText(this.x+rand(-15,15), this.y-this.radius-10, isCrit?'\\u{1F4A5}'+dmg:dmg, attacker===player?'#fbbf24':'#f8fafc', isCrit?18:14);"
crit_new = "addText(this.x+rand(-15,15), this.y-this.radius-10, isCrit?'\\u{1F4A5}'+dmg+'!':dmg, isCrit?'#ef4444':(attacker===player?'#fbbf24':'#f8fafc'), isCrit?28:14);"
js = js.replace(crit_old, crit_new)

# 7. AI Logic
ai_old = """          if(closestBuilding || closestHero || closestMinion) {
              let target = closestHero || closestBuilding || closestMinion;
              if(dist(this, target) <= this.range) {"""
ai_new = """          if(this.hp/this.maxHp < 0.25) this.aiState = 'RETREAT';
          else if(this.hp/this.maxHp > 0.8) this.aiState = 'PUSH';
          
          if(this.aiState === 'RETREAT' && this !== player) {
              let home = this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
              let a=Math.atan2(home.y-this.y,home.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd;
          } else if (closestHero && closestHero.hp/closestHero.maxHp < 0.3 && this !== player) {
              let a=Math.atan2(closestHero.y-this.y,closestHero.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd;
              if(dist(this, closestHero) <= this.range) {
                  this.vx=0; this.vy=0; if(this.attackTimer<=0){this.attackTimer=1/this.aspd; closestHero.applyRawDamage(this.atk,this); spawnSlash(this.x,this.y-this.radius,Math.atan2(closestHero.y-this.y,closestHero.x-this.x),'#64748b',20);}
              }
          } else if(closestBuilding || closestHero || closestMinion) {
              let target = closestHero || closestBuilding || closestMinion;
              if(dist(this, target) <= this.range) {"""
js = js.replace(ai_old, ai_new)

# 8. Nexus Healing
nexus_heal = """        if(this.slowTimer > 0) this.slowTimer -= dt;
        
        let home = this.faction==='BLUE'?{x:300,y:2700}:{x:2700,y:300};
        if(dist(this, home) < 400 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * dt);
            if(Math.random()<0.05) { spawnParticles(this.x,this.y-10,'#22c55e',3,50,0.5); addText(this.x,this.y-this.radius-20,'\\u2795','#22c55e',20); }
        }"""
js = js.replace("if(this.slowTimer > 0) this.slowTimer -= dt;", nexus_heal)

# 9. Waypoints
wp_old = "let bTop=[{x:300,y:2700},{x:300,y:300},{x:2700,y:300}], bMid=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}], bBot=[{x:300,y:2700},{x:2700,y:2700},{x:2700,y:300}];\n        let rTop=[{x:2700,y:300},{x:300,y:300},{x:300,y:2700}], rMid=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}], rBot=[{x:2700,y:300},{x:2700,y:2700},{x:300,y:2700}];"
wp_new = "let bTop=[{x:300,y:2700},{x:300,y:300},{x:2700,y:300}], bMid=[{x:300,y:2700},{x:1500,y:1500},{x:2700,y:300}], bBot=[{x:300,y:2700},{x:300,y:2400},{x:2400,y:2400},{x:2400,y:300},{x:2700,y:300}];\n        let rTop=[{x:2700,y:300},{x:2700,y:300},{x:300,y:300},{x:300,y:2700}], rMid=[{x:2700,y:300},{x:1500,y:1500},{x:300,y:2700}], rBot=[{x:2700,y:300},{x:2400,y:300},{x:2400,y:2400},{x:300,y:2400},{x:300,y:2700}];"
js = js.replace(wp_old, wp_new)

# Damage Reduction handler in applyRawDamage
dmg_red = "        let dmg=Math.max(1, Math.floor(amount));\n        if(this.damageReduction) dmg = Math.max(1, dmg * (1 - this.damageReduction));"
js = js.replace("let dmg=Math.max(1, Math.floor(amount));", dmg_red)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied V8 logic to game.js")
