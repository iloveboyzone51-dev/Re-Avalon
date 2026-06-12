import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Task 7 & 12: Accurate Assist, Multi-kill logic
# We need to hook into onDeath of Hero
old_hero_ondeath = """    onDeath(attacker){
        this.deaths++;
        this.respawnTimer = Math.min(5 + this.level * 0.8, 25); // 부활시간 조정
        if (attacker && attacker.type === 'hero' && this.type === 'hero') {
            attacker.kills++;
            window.addKillFeed(attacker, this);
            if(attacker === player) {
                GS.scoreBlue++;
            } else if(this === player) {
                GS.scoreRed++;
            } else {
                if(attacker.faction === 'BLUE') GS.scoreBlue++;
                else GS.scoreRed++;
            }
        }
    }"""

new_hero_ondeath = """    onDeath(attacker){
        this.deaths++;
        this.respawnTimer = Math.min(5 + this.level * 0.8, 25);
        if (attacker && attacker.type === 'hero' && this.type === 'hero') {
            attacker.kills++;
            
            // Calculate Assists
            entities.forEach(e => {
                if(e.type === 'hero' && e.faction === attacker.faction && e !== attacker && !e.isDead && dist(this, e) <= 400) {
                    e.assists++;
                }
            });
            
            window.addKillFeed(attacker, this);
            if(attacker.faction === 'BLUE') GS.scoreBlue++;
            else GS.scoreRed++;
        }
    }"""
js = js.replace(old_hero_ondeath, new_hero_ondeath)

# In addKillFeed, trigger MultiKill Announcer
old_streak_logic = """        if (streakCount >= 3) {
            streakText = `<span class="text-amber-400 animate-pulse font-black"> [${streakCount}연속 킬!]</span>`;
            if (window.AIChat) window.AIChat.triggerEvent('streak', attacker, streakCount);
        }"""
new_streak_logic = """        if (streakCount >= 2) {
            streakText = `<span class="text-amber-400 animate-pulse font-black"> [${streakCount}연속 킬!]</span>`;
            if(window.showMultiKillAnnouncer) window.showMultiKillAnnouncer(streakCount);
            if (window.AIChat && streakCount >= 3) window.AIChat.triggerEvent('streak', attacker, streakCount);
        }"""
js = js.replace(old_streak_logic, new_streak_logic)

# Multi-Kill Announcer implementation in UI loop (added to index.html actually, let's put the function in game.js)
multikill_func = """
window.showMultiKillAnnouncer = function(count) {
    const texts = { 2:'DOUBLE KILL!', 3:'TRIPLE KILL!', 4:'QUADRA KILL!', 5:'PENTA KILL!', 6:'LEGENDARY KILL!', 7:'HEPTA KILL!', 8:'OCTA KILL!', 9:'NONA KILL!', 10:'DECA KILL!' };
    let t = count <= 10 ? texts[count] : 'GODLIKE!';
    let el = document.getElementById('multiKillAnnouncer');
    let textEl = document.getElementById('multiKillText');
    if(!el || !textEl) return;
    textEl.innerText = t;
    el.classList.remove('hidden');
    textEl.style.opacity = '1';
    textEl.style.transform = 'scale(1)';
    playSFX('skill_cast');
    setTimeout(() => {
        textEl.style.opacity = '0';
        textEl.style.transform = 'scale(1.5)';
        setTimeout(() => { el.classList.add('hidden'); }, 300);
    }, 2000);
};

window.showBuffAnnouncer = function(msg) {
    let el = document.getElementById('buffAnnouncer');
    let textEl = document.getElementById('buffAnnouncerText');
    if(!el || !textEl) return;
    textEl.innerText = msg;
    el.classList.remove('hidden');
    playSFX('heal');
    setTimeout(() => {
        el.classList.add('hidden');
    }, 3000);
};
"""
if "window.showMultiKillAnnouncer =" not in js:
    js += multikill_func

# Task 9: Double Tower stats
old_building_constructor = """        if(btype==='nexus'){ this.maxHp=10000; this.atk=0; this.range=0; this.radius=50; }
        else if(btype==='nexus_turret') { this.maxHp=8000; this.atk=400; this.aspd=1.5; this.range=350; this.radius=22; }
        else { this.maxHp=6000; this.atk=280; this.aspd=1.2; this.range=360; this.radius=28; } // 사거리 버프"""
new_building_constructor = """        if(btype==='nexus'){ this.maxHp=20000; this.atk=0; this.range=0; this.radius=50; }
        else if(btype==='nexus_turret') { this.maxHp=16000; this.atk=800; this.aspd=1.5; this.range=350; this.radius=22; }
        else { this.maxHp=12000; this.atk=560; this.aspd=1.2; this.range=360; this.radius=28; }"""
js = js.replace(old_building_constructor, new_building_constructor)

# Task 10: Replace builder with Grrr in HERO_TMPL
grrr_tmpl = """grrr: { name:'그르르', hp:1600, atk:70, aspd:0.9, move:150, range:60,
        skill1:{name:'거대화', type:'self_buff', cooldown:18, desc:'몸집이 2배 커지며 물리/마법 방어력과 체력 증가, 이속/공속 증가'},
        skill2:{name:'포효', type:'aoe_stun', cooldown:12, desc:'주변 넓은 반경의 적을 2초간 스턴시키고 데미지를 입힘'} },
"""
# remove builder, add grrr
js = re.sub(r"builder:.*?\},\n", grrr_tmpl, js, flags=re.DOTALL)
if 'builder' in js and 'grrr' not in js: # fallback
    pass

# Task 13: Necromancer summon logic fix
old_summon_update = """            if(dist(this,target)>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }"""
new_summon_update = """            if(this.mtype === 'summon' && this.owner && dist(this, this.owner) > 300) {
                target = this.owner; // return to owner
            }
            if(dist(this,target)>this.range){ let a=Math.atan2(target.y-this.y,target.x-this.x); this.vx=Math.cos(a)*this.moveSpd; this.vy=Math.sin(a)*this.moveSpd; }"""
js = js.replace(old_summon_update, new_summon_update)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Part 2 changes applied")
