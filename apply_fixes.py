import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Screen Shake 완전 제거
content = re.sub(r'let screenShake = \{ x:0, y:0, intensity:0, duration:0 \};\n?', '', content)
content = re.sub(r'function shakeScreen\(intensity, duration\) \{\s*screenShake\.intensity = intensity;\s*screenShake\.duration = duration;\s*\}\n?', '', content)
content = re.sub(r'if\(screenShake\.duration>0\) \{ screenShake\.duration-=dt; screenShake\.x=rand\(-screenShake\.intensity,screenShake\.intensity\); screenShake\.y=rand\(-screenShake\.intensity,screenShake\.intensity\); \} else \{ screenShake\.x=0; screenShake\.y=0; \}\n?', '', content)
content = content.replace('ctx.translate(window.innerWidth/2 + screenShake.x * canvasDPR, window.innerHeight/2 + screenShake.y * canvasDPR);', 'ctx.translate(window.innerWidth/2, window.innerHeight/2);')
content = re.sub(r'shakeScreen\([0-9\.]+,\s*[0-9\.]+\);\s*', '', content)

# 2. 모든 타격 기절 -> 크리티컬 전용으로 제한
target_knockback = '''if(!this.isBuilding && attacker && !attacker.isBuilding) {
            let angle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
            let kbForce = isCrit ? 250 : 100;
            this.x += Math.cos(angle) * kbForce * 0.1;
            this.y += Math.sin(angle) * kbForce * 0.1;
            this.stunTimer = Math.max(this.stunTimer || 0, isCrit ? 0.3 : 0.15);
        }'''
replacement_knockback = '''if(!this.isBuilding && attacker && !attacker.isBuilding) {
            let angle = Math.atan2(this.y - attacker.y, this.x - attacker.x);
            if(isCrit) {
                this.x += Math.cos(angle) * 20;
                this.y += Math.sin(angle) * 20;
                this.stunTimer = Math.max(this.stunTimer || 0, 0.2);
            }
        }'''
content = content.replace(target_knockback, replacement_knockback)

# 3. 원거리 영웅 딜량 누락
target_dmg = '''this.target.applyRawDamage(this.dmg,this.attacker);
            if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(this.target);'''
replacement_dmg = '''this.target.applyRawDamage(this.dmg,this.attacker);
            if(this.attacker && this.attacker.type === 'hero') this.attacker.totalDmg += this.dmg;
            if(this.attacker && this.attacker.triggerOnHitPassives) this.attacker.triggerOnHitPassives(this.target);'''
content = content.replace(target_dmg, replacement_dmg)

# 4. 연속 레벨업 시 스킬 선택 화면 중복
content = content.replace("this.pendingLevelUp = false;", "this.pendingLevelUp = false;\n        this.pendingSkillLevels = 0;")
content = content.replace("this.heroSkill1Timer=0; this.heroSkill2Timer=0;", "this.heroSkill1Timer=0; this.heroSkill2Timer=0;\n        this.pendingSkillLevels = 0;")

target_gainExp = '''    gainExp(amt){
        this.exp+=amt;
        while(this.exp>=this.maxExp){
            this.exp-=this.maxExp; this.level++; this.maxExp=Math.floor(this.maxExp*1.15); // 레벨업 요구량 완화
            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            if(c==='atk') { this.baseAtk+=6; statMsg = '공격력 +6'; }
            if(c==='hp') { this.baseMaxHp+=60; this.hp+=60; statMsg = '체력 +60'; }
            if(c==='move') { this.baseMoveSpd+=2.5; statMsg = '이동속도 증가'; }
            if(c==='aspd') { this.baseAspd+=0.12; statMsg = '공격속도 증가'; }
            this.applyStats();
            if(this.isPlayer){
                addText(this.x,this.y-60,'LEVEL UP!','#fcd34d',22);
                setTimeout(()=>addText(this.x,this.y-80,'운빨 스탯: '+statMsg+'!', '#a78bfa', 16), 300);
                playSFX('heal');
                setTimeout(() => this.showSkillSelection(), 500);
            } else {
                this.aiSelectSkill();
            }
        }
    }'''
replacement_gainExp = '''    gainExp(amt){
        this.exp+=amt;
        while(this.exp>=this.maxExp){
            this.exp-=this.maxExp; this.level++; this.maxExp=Math.floor(this.maxExp*1.15); // 레벨업 요구량 완화
            let stats=['atk','hp','move','aspd']; let c=stats[Math.floor(Math.random()*stats.length)];
            let statMsg = '';
            if(c==='atk') { this.baseAtk+=6; statMsg = '공격력 +6'; }
            if(c==='hp') { this.baseMaxHp+=60; this.hp+=60; statMsg = '체력 +60'; }
            if(c==='move') { this.baseMoveSpd+=2.5; statMsg = '이동속도 증가'; }
            if(c==='aspd') { this.baseAspd+=0.12; statMsg = '공격속도 증가'; }
            this.applyStats();
            if(this.isPlayer){
                addText(this.x,this.y-60,'LEVEL UP!','#fcd34d',22);
                setTimeout(()=>addText(this.x,this.y-80,'운빨 스탯: '+statMsg+'!', '#a78bfa', 16), 300);
                playSFX('heal'); // Change to heal or level_up
                this.pendingSkillLevels++;
            } else {
                this.aiSelectSkill();
            }
        }
        if(this.isPlayer && this.pendingSkillLevels > 0 && !GS.paused) {
            this.pendingSkillLevels--;
            setTimeout(() => this.showSkillSelection(), 400);
        }
    }'''
content = content.replace(target_gainExp, replacement_gainExp)

target_selSkill = '''    selectPassiveSkill(skillId) {
        this.passiveSkills[skillId] = (this.passiveSkills[skillId]||0) + 1;
        this.applyStats();
        document.getElementById('skillSelectionOverlay').classList.add('hidden');
        this.pendingLevelUp = false; GS.paused = false;
        let sk = PASSIVE_SKILLS.find(s=>s.id===skillId);
        addText(this.x,this.y-60, sk.icon+' '+sk.name+' Lv.'+this.passiveSkills[skillId]+'!', '#fcd34d', 18);
        playSFX('heal');
    }'''
replacement_selSkill = '''    selectPassiveSkill(skillId) {
        this.passiveSkills[skillId] = (this.passiveSkills[skillId]||0) + 1;
        this.applyStats();
        document.getElementById('skillSelectionOverlay').classList.add('hidden');
        this.pendingLevelUp = false; GS.paused = false;
        let sk = PASSIVE_SKILLS.find(s=>s.id===skillId);
        addText(this.x,this.y-60, sk.icon+' '+sk.name+' Lv.'+this.passiveSkills[skillId]+'!', '#fcd34d', 18);
        playSFX('heal');
        
        if(this.pendingSkillLevels > 0) {
            this.pendingSkillLevels--;
            setTimeout(() => this.showSkillSelection(), 300);
        }
    }'''
content = content.replace(target_selSkill, replacement_selSkill)

# 5. 낙뢰 패시브 사운드 제한
target_spawnLt = '''function spawnLightningEffect(x, y) {
    for(let i=0;i<5;i++) particles.push({x:x+rand(-15,15),y:y-i*60,vx:rand(-20,20),vy:rand(-30,10),life:0.3,maxLife:0.3,color:'#fbbf24',size:rand(3,8),shape:'circle'});
    spawnParticles(x, y, '#fde68a', 12, 100, 0.3);
    playSFX('tower');
}'''
replacement_spawnLt = '''function spawnLightningEffect(x, y, isPlayerCaused=false) {
    for(let i=0;i<5;i++) particles.push({x:x+rand(-15,15),y:y-i*60,vx:rand(-20,20),vy:rand(-30,10),life:0.3,maxLife:0.3,color:'#fbbf24',size:rand(3,8),shape:'circle'});
    spawnParticles(x, y, '#fde68a', 12, 100, 0.3);
    if(isPlayerCaused) playSFX('tower');
}'''
content = content.replace(target_spawnLt, replacement_spawnLt)

target_triggerLt = "targets.forEach((t,idx)=>setTimeout(()=>{if(!t.isDead){t.applyRawDamage(this.atk*0.8,this);spawnLightningEffect(t.x,t.y);addText(t.x,t.y-30,'⚡','#fbbf24',22);}},idx*100));"
replacement_triggerLt = "targets.forEach((t,idx)=>setTimeout(()=>{if(!t.isDead){t.applyRawDamage(this.atk*0.8,this);spawnLightningEffect(t.x,t.y,this===player);addText(t.x,t.y-30,'⚡','#fbbf24',22);}},idx*100));"
content = content.replace(target_triggerLt, replacement_triggerLt)

# 6. 좌향 공격 애니메이션 회전 반전 오류
target_drawBlocky = "function drawBlockyHero(ctx, x, y, r, dir, faction, animPhase) {"
replacement_drawBlocky = "function drawBlockyHero(ctx, x, y, r, dir, faction, animPhase) {\n    let rotDir = dir < 0 ? -1 : 1;"
content = content.replace(target_drawBlocky, replacement_drawBlocky)

content = content.replace("ctx.translate(x, y); ctx.rotate(Math.PI/4); ctx.translate(-x, -y);", "ctx.translate(x, y); ctx.rotate((Math.PI/4) * rotDir); ctx.translate(-x, -y);")
content = content.replace("ctx.rotate(Math.PI * 0.7);", "ctx.rotate(Math.PI * 0.7 * rotDir);")
content = content.replace("ctx.rotate(Math.PI * 0.8);", "ctx.rotate(Math.PI * 0.8 * rotDir);")
content = content.replace("ctx.rotate(Math.PI/2);", "ctx.rotate((Math.PI/2) * rotDir);")
content = content.replace("ctx.rotate(-Math.PI * 0.1);", "ctx.rotate(-Math.PI * 0.1 * rotDir);")

# 7. 미니언 타겟 우선순위
target_minion = '''        let target=null, minD=150;
        entities.forEach(e=>{
            if(e.faction!==this.faction && !e.isDead){
                let d=dist(this,e);
                if(d<minD){ minD=d; target=e; }
            }
        });'''
replacement_minion = '''        let closestBuilding = null, closestMinion = null, closestHero = null;
        let dB = 120, dM = 100, dH = 120;
        entities.forEach(e => {
            if(e.faction === this.faction || e.isDead) return;
            const d = dist(this, e);
            if((e.type==='tower' || e.type==='nexus_turret' || e.type==='nexus') && d < dB) {
                dB = d; closestBuilding = e;
            } else if(e.type === 'minion' && d < dM) {
                dM = d; closestMinion = e;
            } else if(e.type === 'hero' && d < dH) {
                dH = d; closestHero = e;
            }
        });
        let target = closestBuilding || closestMinion || closestHero;'''
content = content.replace(target_minion, replacement_minion)

# 8. renderInventory 삭제
content = re.sub(r'function renderInventory\(\).*?\}\n(?=function renderMinimap|function renderShop|function autoDetect)', '', content, flags=re.DOTALL)

# 9. 궁수 스킬 개편 및 무적 프레임 추가
# 무적 상태 처리 (Entity 클래스의 applyRawDamage)
target_applyDamage = "applyRawDamage(amount, attacker, triggerEffects=true){\n        if(this.isDead) return 0;"
replacement_applyDamage = "applyRawDamage(amount, attacker, triggerEffects=true){\n        if(this.isDead || this.invincibleTimer > 0) return 0;"
content = content.replace(target_applyDamage, replacement_applyDamage)

# update() 내 invincibleTimer 감소
content = content.replace("if(this.attackAnimTimer > 0) this.attackAnimTimer -= dt;", "if(this.attackAnimTimer > 0) this.attackAnimTimer -= dt;\n        if(this.invincibleTimer > 0) this.invincibleTimer -= dt;")

# 궁수 템플릿 이름 변경
content = content.replace('skill2:{name:"백스텝",  cd:10}', 'skill2:{name:"블링크",  cd:10}')

# 궁수 useSkill 로직 수정
target_archer_skill2 = '''            } else {
                let a = t ? Math.atan2(this.y-t.y, this.x-t.x) : Math.random()*Math.PI*2;
                this.x += Math.cos(a)*200; this.y += Math.sin(a)*200;
                spawnParticles(this.x, this.y, '#6ee7b7', 20, 150, 0.4);
                this.atkSpdBuffTimer = 3; this.atkSpdBuffRate = 1.5;
            }'''
replacement_archer_skill2 = '''            } else {
                let dx = this.vx || 0; let dy = this.vy || 0;
                let a = (dx !== 0 || dy !== 0) ? Math.atan2(dy, dx) : (this.facingDir > 0 ? 0 : Math.PI);
                this.x += Math.cos(a)*200; this.y += Math.sin(a)*200;
                this.invincibleTimer = 0.3; // 무적
                spawnParticles(this.x, this.y, '#6ee7b7', 20, 150, 0.4);
                this.atkSpdBuffTimer = 3; this.atkSpdBuffRate = 1.5;
            }'''
content = content.replace(target_archer_skill2, replacement_archer_skill2)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
