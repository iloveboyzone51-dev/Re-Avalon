import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Remove all window.mapPings logic (red donuts bug)
ping_def = r"window\.mapPings\s*=\s*\[\];"
js = re.sub(ping_def, "", js)

ping_push = r"window\.mapPings\.push\(\{x, y, faction, type, life: 2\.0, maxLife: 2\.0\}\);"
js = re.sub(ping_push, "", js)

ping_loop = r"""        for\(let i=window\.mapPings\.length-1; i>=0; i--\) \{
            window\.mapPings\[i\]\.life -= dt;
            if\(window\.mapPings\[i\]\.life <= 0\) window\.mapPings\.splice\(i, 1\);
        \}"""
js = re.sub(ping_loop, "", js)

ping_draw = r"""\s*if\(window\.mapPings\)\s*\{\s*let sx = mCanvas\.width / MAP_SIZE, sy = mCanvas\.height / MAP_SIZE;\s*window\.mapPings\.forEach\(p => \{\s*let col = p\.faction === 'BLUE' \? '#3b82f6' : '#ef4444';\s*let r = 8 \+ Math\.abs\(Math\.sin\(p\.life \* 10\)\) \* 6;\s*// Blinking\s*mCtx\.strokeStyle = col;\s*mCtx\.lineWidth = 2;\s*mCtx\.beginPath\(\);\s*mCtx\.arc\(p\.x \* sx, p\.y \* sy, r, 0, Math\.PI \* 2\);\s*mCtx\.stroke\(\);\s*\}\);\s*\}"""
js = re.sub(ping_draw, "", js)

ping_draw_mctx = r"""\s*let sx = mCanvas\.width / MAP_SIZE, sy = mCanvas\.height / MAP_SIZE;\s*window\.mapPings\.forEach\(p => \{\s*let col = p\.faction === 'BLUE' \? '#3b82f6' : '#ef4444';\s*let r = 8 \+ Math\.abs\(Math\.sin\(p\.life \* 10\)\) \* 6;\s*// Blinking\s*mCtx\.strokeStyle = col;\s*mCtx\.lineWidth = 2;\s*mCtx\.beginPath\(\);\s*mCtx\.arc\(p\.x \* sx, p\.y \* sy, r, 0, Math\.PI \* 2\);\s*mCtx\.stroke\(\);\s*\}\);"""
js = re.sub(ping_draw_mctx, "", js)

# 2. Fix Grrr skill blink and duration
grrr_skill_old = """        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = 10;
            addText(this.x, this.y-50, '거대화! 체력+50% 공방+50% 이속+20%', '#fcd34d', 18);
        } else if(idx === 2 && k === 'grrr') {
            spawnAOE(this.x, this.y, 180, '#f59e0b88', 0.5);
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 180);
            targets.forEach(t => { t.applyRawDamage(this.atk*1.8, this); t.stunTimer = 2.0; });
            addText(this.x, this.y-50, '포효!', '#ef4444', 24);
        }"""
grrr_skill_new = """        if(idx === 1 && k === 'grrr') {
            this.grrrGiantTimer = cd * 0.66; // 2/3 of cooldown
            this.emote = '🦍'; this.emoteTimer = 2.0;
            addText(this.x, this.y-50, '거대화! 체력+50% 공방+50% 이속+20%', '#fcd34d', 18);
            return;
        } else if(idx === 2 && k === 'grrr') {
            spawnAOE(this.x, this.y, 180, '#f59e0b88', 0.5);
            this.emote = '🤬'; this.emoteTimer = 2.0;
            let targets = entities.filter(e => e.faction !== this.faction && !e.isDead && dist(this, e) <= 180);
            targets.forEach(t => { t.applyRawDamage(this.atk*1.8, this); t.stunTimer = 2.0; });
            addText(this.x, this.y-50, '포효!', '#ef4444', 24);
            return;
        }"""
js = js.replace(grrr_skill_old, grrr_skill_new)

# 3. Add dynamic emote states
hero_update_ai_old = """          if(this.hp/this.maxHp < 0.25) this.aiState = 'RETREAT';
          else if(this.hp/this.maxHp > 0.8) this.aiState = 'PUSH';"""
hero_update_ai_new = """          if(this.hp/this.maxHp < 0.25) {
              if(this.aiState !== 'RETREAT') { this.emote = ['😰','🤕','🥵','🚑'][Math.floor(Math.random()*4)]; this.emoteTimer=3; }
              this.aiState = 'RETREAT';
          }
          else if(this.hp/this.maxHp > 0.8) {
              if(this.aiState !== 'PUSH' && Math.random()<0.05) { this.emote = ['😎','👊','🔥','😈'][Math.floor(Math.random()*4)]; this.emoteTimer=2; }
              this.aiState = 'PUSH';
          }"""
js = js.replace(hero_update_ai_old, hero_update_ai_new)

nexus_heal_old = """        if(dist(this, home) < 400 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * dt);
            if(Math.random()<0.05) { spawnParticles(this.x,this.y-10,'#22c55e',3,50,0.5); addText(this.x,this.y-this.radius-20,'\\u2795','#22c55e',20); }
        }"""
nexus_heal_new = """        if(dist(this, home) < 400 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * dt);
            if(Math.random()<0.05) { spawnParticles(this.x,this.y-10,'#22c55e',3,50,0.5); addText(this.x,this.y-this.radius-20,'\\u2795','#22c55e',20); }
            if(Math.random()<0.01 && !this.emote) { this.emote = ['🤤','👼','💖'][Math.floor(Math.random()*3)]; this.emoteTimer=2; }
        }"""
js = js.replace(nexus_heal_old, nexus_heal_new)

# Improve chat emoji logic slightly
chat_emote_old = """            if (event === 'kill' || event === 'streak') {
                if (Math.random() < 0.5) character.emote = ['🤣','😎','🤪','🔥'][Math.floor(Math.random()*4)];
            } else if (event === 'death') {
                character.emote = ['😭','🤬','💀','💢'][Math.floor(Math.random()*4)];
            }"""
chat_emote_new = """            if (event === 'kill' || event === 'streak') {
                character.emote = ['🤣','😎','🤪','🔥','👽','👻','🤑'][Math.floor(Math.random()*7)];
            } else if (event === 'death') {
                character.emote = ['😭','🤬','💀','💢','😱','💩'][Math.floor(Math.random()*6)];
            }"""
js = js.replace(chat_emote_old, chat_emote_new)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Applied fixes to game.js")
