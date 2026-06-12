import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Hook AIChat.update into gameLoop
target_gameloop = "entities=entities.filter(e=>!e.isDead||e.type==='hero'||e.type==='jungle');"
replacement_gameloop = "if(window.AIChat) window.AIChat.update(dt);\n        " + target_gameloop
if "window.AIChat.update(dt);" not in js:
    js = js.replace(target_gameloop, replacement_gameloop)

# Hook Minimap ping into drawMinimap
target_minimap = "entities.forEach(e=>{"
replacement_minimap = '''if(window.mapPings) {
        let sx = mCanvas.width / MAP_SIZE, sy = mCanvas.height / MAP_SIZE;
        window.mapPings.forEach(p => {
            let col = p.faction === 'BLUE' ? '#3b82f6' : '#ef4444';
            let r = 8 + Math.abs(Math.sin(p.life * 10)) * 6; // Blinking
            mCtx.strokeStyle = col;
            mCtx.lineWidth = 2;
            mCtx.beginPath();
            mCtx.arc(p.x * sx, p.y * sy, r, 0, Math.PI * 2);
            mCtx.stroke();
        });
    }
    ''' + target_minimap
if "window.mapPings.forEach" not in js:
    js = js.replace(target_minimap, replacement_minimap)

# Add AI System
ai_system = '''

// ====== AI Chat & Kill Feed Systems ======
window.killStreaks = {};
window.mapPings = [];

window.addKillFeed = function(attacker, victim) {
    if (!attacker || !victim) return;
    const feed = document.getElementById('killFeed');
    if (!feed) return;
    
    window.killStreaks[attacker.heroKey] = (window.killStreaks[attacker.heroKey] || 0) + 1;
    window.killStreaks[victim.heroKey] = 0;
    
    let streakCount = window.killStreaks[attacker.heroKey];
    let streakText = '';
    if (streakCount >= 3) {
        streakText = `<span class="text-amber-400 animate-pulse font-black"> [학살 중입니다!!]</span>`;
        if (window.AIChat) window.AIChat.triggerEvent('streak', attacker, streakCount);
    }
    
    let el = document.createElement('div');
    el.className = 'text-[11px] md:text-sm font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700 flex gap-2 items-center text-white';
    let aCol = attacker.faction==='BLUE'?'#60a5fa':'#f87171';
    let vCol = victim.faction==='BLUE'?'#60a5fa':'#f87171';
    
    el.innerHTML = `<span style="color:${aCol}">[${attacker.faction==='BLUE'?'아군':'적군'} ${attacker.name}]</span> ⚔️ <span style="color:${vCol}">[${victim.faction==='BLUE'?'아군':'적군'} ${victim.name}]</span> ${streakText}`;
    
    feed.prepend(el);
    if(feed.children.length > 5) feed.lastChild.remove();
    
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s';
        setTimeout(() => el.remove(), 500);
    }, 4000);
};

window.addPing = function(x, y, faction, type='danger') {
    window.mapPings.push({x, y, faction, type, life: 3.0, maxLife: 3.0});
    playSFX('button');
};

window.AIChat = {
    timer: 0,
    chatLog: null,
    
    patterns: {
        kill: [
            "컷~ ㅅㄱ", "벌레컷ㅋㅋ", "이걸 죽어주네", "아 달다~", "?? 쟤 뭐함?", "개못하네 진짜ㅋㅋ", "꺼어어억"
        ],
        death: [
            "아 ㄲㅂ", "억까 ㅈ대네", "아니 백업 좀;;", "렉걸림 ㅈㅅ", "운빨 망겜 수준", "ㅅㅂ 이게 죽어?"
        ],
        team_fight_win: [
            "다 닦았죠? ㅅㄱ", "나이스 ㅋㅋ", "캐리 개꿀", "우물 대기하셈", "서렌 치셈 걍ㅋㅋ"
        ],
        idle: [
            "아니 ㅅㅂ 맵 좀 보라고", "합류 ㅈㄴ 안하네", "쟤 뭐함? 겜안폰가", "빨리 좀 와라", "혼자 RPG하네"
        ],
        streak: [
            "내가 캐리중이다", "누가 날 막냐 ㅋㅋㅋ", "핵 아님 ㅅㄱ"
        ]
    },
    
    addChat: function(hero, msg, faction) {
        if(!this.chatLog) this.chatLog = document.getElementById('chatLog');
        if(!this.chatLog) return;
        
        let el = document.createElement('div');
        el.className = 'text-[11px] md:text-sm font-bold bg-black/50 px-2 py-1 rounded text-white w-fit shadow-md';
        let hCol = faction === 'BLUE' ? '#60a5fa' : '#f87171';
        el.innerHTML = `<span style="color:${hCol}">[${faction==='BLUE'?'아군':'적군'} ${hero.name}]</span>: ${msg}`;
        
        this.chatLog.append(el);
        if(this.chatLog.children.length > 8) this.chatLog.firstChild.remove();
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
            setTimeout(() => el.remove(), 500);
        }, 6000);
    },
    
    onKill: function(killer, victim) {
        if (Math.random() < 0.4) {
            this.addChat(killer, this.patterns.kill[Math.floor(Math.random() * this.patterns.kill.length)], killer.faction);
        }
        if (Math.random() < 0.3) {
            this.addChat(victim, this.patterns.death[Math.floor(Math.random() * this.patterns.death.length)], victim.faction);
        }
    },
    
    triggerEvent: function(type, hero, val) {
        if(type === 'streak' && Math.random() < 0.8) {
            this.addChat(hero, this.patterns.streak[Math.floor(Math.random()*this.patterns.streak.length)], hero.faction);
        }
    },
    
    update: function(dt) {
        this.timer += dt;
        
        for(let i=window.mapPings.length-1; i>=0; i--) {
            window.mapPings[i].life -= dt;
            if(window.mapPings[i].life <= 0) window.mapPings.splice(i, 1);
        }
        
        if (this.timer < 4) return;
        this.timer = 0;
        
        if(entities && Math.random() < 0.25) {
            let heroes = entities.filter(e => e.type === 'hero' && !e.isDead);
            if (heroes.length > 0) {
                let rHero = heroes[Math.floor(Math.random() * heroes.length)];
                
                if(Math.random() < 0.5) {
                    let msg = this.patterns.idle[Math.floor(Math.random() * this.patterns.idle.length)];
                    this.addChat(rHero, msg, rHero.faction);
                    window.addPing(rHero.x, rHero.y, rHero.faction);
                    this.addChat(rHero, "11시 핑찍은 곳 빨리 합류좀", rHero.faction);
                } else {
                    let msg = this.patterns.team_fight_win[Math.floor(Math.random() * this.patterns.team_fight_win.length)];
                    this.addChat(rHero, msg, rHero.faction);
                }
            }
        }
    }
};
'''

if "window.AIChat =" not in js:
    js += ai_system

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("game.js AI injected")
