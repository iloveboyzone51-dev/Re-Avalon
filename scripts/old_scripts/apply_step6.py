import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add nearEnemies helper
if "function nearEnemies" not in js:
    js = js.replace("function dist(a,b)", "function nearEnemies(x,y,r) { return entities.filter(e => e.faction !== player?.faction && !e.isDead && dist({x,y},e)<=r); }\nfunction dist(a,b)")

# wait, nearEnemies should depend on 'this.faction' not player's faction if an AI uses it.
# Actually, let's just replace nearEnemies with a definition that takes faction.
# Let's just define it inline where used, or add a global helper that takes faction.
# Since the instruction document uses `nearEnemies(this.x, this.y, 350)` inside `Hero` context, I will add it as a method to Hero class.

js = js.replace("class Hero extends Entity {", "class Hero extends Entity {\n    nearEnemies(cx,cy,r) { return entities.filter(e => e.faction !== this.faction && !e.isDead && dist({x:cx,y:cy}, e)<=r); }")

# 2. Add Passives to PASSIVE_SKILLS
passives_add = """    { id:'poisonCloud', name:'독안개', icon:'☠️', desc:'주기적으로 주변에 독구름 생성', maxLv:4 },
    { id:'vampireAura', name:'흡혈 오라', icon:'🧛', desc:'주변 적 체력을 초당 흡수', maxLv:3 },
    { id:'bombTrail', name:'폭탄 발자국', icon:'💣', desc:'이동 시 뒤에 폭탄을 흘림', maxLv:3 },
    { id:'mirrorImage', name:'허상 거울', icon:'🪞', desc:'피격 시 일정 확률로 자신을 복제', maxLv:2 },
    { id:'bloodFury', name:'피의 분노', icon:'😡', desc:'처치 시 일시적 공속 50% 폭증', maxLv:3 },
    { id:'stormWalker', name:'폭풍 발걸음', icon:'🌪️', desc:'주변에 지속적인 번개 구름 형성', maxLv:3 }"""
js = re.sub(r"\{\s*id:'poisonCloud'[\s\S]*?\}", passives_add, js)

# 3. Add passive effects in Hero.update()
passive_effects = """        // 신규 패시브 지속 효과
        let pVamp = this.passiveSkills['vampireAura'] || 0;
        if(pVamp > 0) {
            let drain = pVamp * 5 * dt;
            this.nearEnemies(this.x, this.y, 150).forEach(e => {
                e.hp -= drain; this.hp = Math.min(this.maxHp, this.hp + drain);
                spawnParticles(e.x, e.y, '#f43f5e', 1, 30, 0.2);
            });
        }
        let pBomb = this.passiveSkills['bombTrail'] || 0;
        if(pBomb > 0 && Math.hypot(this.vx, this.vy) > 10) {
            this.bombTimer = (this.bombTimer || 0) - dt;
            if(this.bombTimer <= 0) {
                spawnAOE(this.x, this.y, 60, '#ef444455', 1.0);
                this.nearEnemies(this.x, this.y, 60).forEach(e => e.applyRawDamage(pBomb * 10, this));
                this.bombTimer = 1.5;
            }
        }
        let pStorm = this.passiveSkills['stormWalker'] || 0;
        if(pStorm > 0) {
            this.stormTimer = (this.stormTimer || 0) - dt;
            if(this.stormTimer <= 0) {
                this.nearEnemies(this.x, this.y, 200).forEach(e => {
                    e.applyRawDamage(pStorm * 15, this);
                    spawnParticles(e.x, e.y, '#fef08a', 5, 80, 0.4);
                });
                this.stormTimer = 2.0;
            }
        }
"""
js = js.replace("autoUseHeroSkills(){", passive_effects + "\n    autoUseHeroSkills(){")

# 4. mirrorImage in applyRawDamage
# Wait, mirrorImage is triggered on hit. We should put it in applyRawDamage.
# But applyRawDamage is in Entity.
# I'll just put it in Entity.applyRawDamage, checking if this.passiveSkills exists.
mirror_image = """
        if(this.passiveSkills && this.passiveSkills['mirrorImage'] > 0) {
            if(Math.random() < this.passiveSkills['mirrorImage'] * 0.15) {
                let clone = new Hero(this.x + rand(-30,30), this.y + rand(-30,30), this.faction, this.heroKey, false, this.laneRole);
                clone.hp = clone.maxHp * 0.5;
                clone.atk = this.atk * 0.5;
                clone.isClone = true;
                clone.life = 5.0; // 5초 유지
                entities.push(clone);
                spawnParticles(this.x, this.y, '#a855f7', 15, 60, 0.5);
            }
        }"""
js = js.replace("this.hp -= amount;", "this.hp -= amount;" + mirror_image)

# And clone expiration in Hero.update()
clone_logic = """
        if(this.isClone) {
            this.life -= dt;
            if(this.life <= 0) this.isDead = true;
        }"""
js = js.replace("super.update(dt);", "super.update(dt);" + clone_logic)


# 5. bloodFury in onKill
blood_fury = """
        if(this.passiveSkills && this.passiveSkills['bloodFury'] > 0) {
            this.atkSpdBuffTimer = 3.0;
            this.atkSpdBuffRate = 1.0 + this.passiveSkills['bloodFury'] * 0.5;
            spawnParticles(this.x, this.y, '#dc2626', 20, 80, 0.6);
            addText(this.x, this.y-50, '😡피의 분노!', '#ef4444', 16);
        }"""
js = js.replace("this.gold += goldReward;", "this.gold += goldReward;" + blood_fury)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied step 6 partial!")
