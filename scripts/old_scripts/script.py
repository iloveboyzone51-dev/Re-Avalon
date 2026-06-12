import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove red background from respawnOverlay
html = html.replace('bg-red-950/75', 'bg-transparent')
html = html.replace('bg-slate-900/80', 'bg-slate-900/90')

# Inject UI elements
ui_injection = '''
    <!-- Kill Feed -->
    <div id="killFeed" class="absolute top-16 right-4 w-64 pointer-events-none z-20 flex flex-col items-end gap-1 overflow-hidden" style="max-height: 200px;"></div>
    <!-- AI Chat Log -->
    <div id="chatLog" class="absolute left-4 top-1/4 w-72 pointer-events-none z-20 flex flex-col justify-end gap-1 overflow-hidden" style="max-height: 300px;"></div>
'''
# Insert before <!-- 부활 오버레이 -->
if '<!-- Kill Feed -->' not in html:
    html = html.replace('<!-- 부활 오버레이 -->', ui_injection + '    <!-- 부활 오버레이 -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html updated")

# 2. Update game.js
with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 2.1 Hit stop
old_hitstop = '''if(isCrit || attacker === player) {
            GS.hitStopTimer = isCrit ? 0.04 : 0.02;
        }'''
new_hitstop = '''if(isCrit) {
            GS.hitStopTimer = 0.04;
        }'''
js = js.replace(old_hitstop, new_hitstop)

# 2.2 Mechanic Buff
old_mech_skill1 = "tw.maxHp=1000+sl*500; tw.hp=tw.maxHp; tw.atk=this.atk*1.2; tw.range=350; tw.radius=15; tw.life=15;"
new_mech_skill1 = "tw.maxHp=1500+sl*600; tw.hp=tw.maxHp; tw.atk=this.atk*1.5; tw.range=350; tw.radius=15; tw.life=18;"
js = js.replace(old_mech_skill1, new_mech_skill1)

old_mech_skill2 = '''                  let allies = entities.filter(e=>e.faction===this.faction&&!e.isDead&&dist(this,e)<=400);
                  allies.forEach(a => {
                      a.hp = Math.min(a.maxHp, a.hp + skillDmg*2);
                      spawnSpecial(a.x, a.y, '#10b981', 'plus', 5, 100, 0.6);
                  });
                  playSFX('heal');'''
new_mech_skill2 = '''                  let allies = entities.filter(e=>e.faction===this.faction&&!e.isDead&&dist(this,e)<=400);
                  allies.forEach(a => {
                      a.hp = Math.min(a.maxHp, a.hp + skillDmg*2);
                      a.atkSpdBuffTimer = 4; a.atkSpdBuffRate = 1.5;
                      spawnSpecial(a.x, a.y, '#10b981', 'plus', 5, 100, 0.6);
                      spawnParticles(a.x, a.y, '#f59e0b', 15, 150, 0.5);
                  });
                  playSFX('heal');'''
js = js.replace(old_mech_skill2, new_mech_skill2)

# 2.3 Death hook
old_ondeath = '''this.respawnTimer = Math.min(5 + this.level * 0.8, 25); // 부활 시간 조정'''
new_ondeath = '''this.respawnTimer = Math.min(5 + this.level * 0.8, 25); // 부활 시간 조정
        if (attacker && attacker.type === 'hero' && this.type === 'hero') {
            if(window.addKillFeed) addKillFeed(attacker, this);
            if(window.AIChat) window.AIChat.onKill(attacker, this);
        }'''
js = js.replace(old_ondeath, new_ondeath)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("game.js modified")
