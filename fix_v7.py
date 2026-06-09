import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Grrr character drawing logic
grrr_draw = """    } else if(type === 'grrr') {
        drawBody('#d97706', '#92400e', '#78350f');
        // 사자 갈기
        ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, -r*0.6, r*0.85, 0, Math.PI*2); ctx.fill();
        // 머리 (약간 둥글게)
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, -r*0.6, r*0.5, 0, Math.PI*2); ctx.fill();
        // 귀
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(-r*0.4, -r*1.0, r*0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.4, -r*1.0, r*0.2, 0, Math.PI*2); ctx.fill();
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*1.2*rotDir, y);
            // 앞발 공격
            ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    } else if(type === 'thor') {"""
if "type === 'grrr'" not in js:
    js = js.replace("} else if(type === 'thor') {", grrr_draw)

# 2. Adjust tower positions (Bottom towers from 2700 to 2400)
bad_towers = "entities.push(new Building(1500,2700,'BLUE','tower')); entities.push(new Building(2200,2700,'BLUE','tower')); entities.push(new Building(2700,1500,'RED','tower')); entities.push(new Building(2700,2200,'RED','tower'));"
good_towers = "entities.push(new Building(1500,2400,'BLUE','tower')); entities.push(new Building(2200,2400,'BLUE','tower')); entities.push(new Building(2400,1500,'RED','tower')); entities.push(new Building(2400,2200,'RED','tower'));"
js = js.replace(bad_towers, good_towers)

# 3. Multi-kill announcer texts & buff text
old_streak_call = "if(window.showMultiKillAnnouncer) window.showMultiKillAnnouncer(streakCount);"
new_streak_call = "if(window.showMultiKillAnnouncer) window.showMultiKillAnnouncer(streakCount, getHeroName(attacker));"
js = js.replace(old_streak_call, new_streak_call)

old_mk_func = "window.showMultiKillAnnouncer = function(count) {"
new_mk_func = "window.showMultiKillAnnouncer = function(count, heroName) {"
js = js.replace(old_mk_func, new_mk_func)

old_mk_text = "textEl.innerText = t;"
new_mk_text = "textEl.innerHTML = `<div class=\"text-2xl md:text-4xl text-white mb-2 drop-shadow-md font-sans\">[${heroName||'알수없음'}]이(가) 날뛰고 있습니다!</div><div>${t}</div>`;"
js = js.replace(old_mk_text, new_mk_text)

old_buff_call = "window.showBuffAnnouncer(buffFaction + ' 진영 언더독 버프 발동!');"
new_buff_call = """let fName = buffFaction === 'BLUE' ? '블루' : '레드';
                window.showBuffAnnouncer(`지금부터 30초간 ${fName}진영 언더독 버프 (이속/공속 20% 증가) 적용됩니다!`);"""
js = js.replace(old_buff_call, new_buff_call)

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Hall of Fame Button
old_btn = """<button onclick="startGame()"
                class="relative px-14 py-4 rounded-full font-black text-xl tracking-widest active:scale-95 transition-all orbitron overflow-hidden"
                style="background:linear-gradient(135deg,#10b981,#6366f1);box-shadow:0 0 30px rgba(16,185,129,0.4);">
            <span class="relative z-10">⚔️ 전장 진입</span>
        </button>"""
new_btn = """<div class="flex flex-col md:flex-row gap-4 justify-center items-center w-full">
            <button onclick="startGame()"
                    class="relative px-14 py-4 rounded-full font-black text-xl tracking-widest active:scale-95 transition-all orbitron overflow-hidden"
                    style="background:linear-gradient(135deg,#10b981,#6366f1);box-shadow:0 0 30px rgba(16,185,129,0.4);">
                <span class="relative z-10">⚔️ 전장 진입</span>
            </button>
            <button onclick="showHoF()" class="px-8 py-4 rounded-full font-black text-xl active:scale-95 transition-all orbitron bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-500/30 border-2 border-amber-300 text-white">
                🏆 명예의 전당
            </button>
        </div>"""
html = html.replace(old_btn, new_btn)

# 2. MultiKill Announcer CSS (top instead of inset-0, smaller font)
old_mk_html = """<div id="multiKillAnnouncer" class="hidden absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
        <div id="multiKillText" class="text-7xl md:text-[100px] font-black italic orbitron text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-rose-600 drop-shadow-[0_10px_20px_rgba(225,29,72,0.8)] scale-150 opacity-0 transition-all duration-300">"""
new_mk_html = """<div id="multiKillAnnouncer" class="hidden absolute top-28 inset-x-0 z-40 pointer-events-none flex flex-col items-center justify-center">
        <div id="multiKillText" class="text-center text-4xl md:text-7xl font-black italic orbitron text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-rose-600 drop-shadow-[0_10px_20px_rgba(225,29,72,0.8)] scale-150 opacity-0 transition-all duration-300">"""
html = html.replace(old_mk_html, new_mk_html)

# 3. Buff Announcer CSS (smaller and positioned near top)
old_buff_html = """<div id="buffAnnouncer" class="hidden absolute inset-x-0 top-1/4 z-40 pointer-events-none flex flex-col items-center justify-center">
        <div class="bg-gradient-to-r from-transparent via-amber-600/80 to-transparent w-full py-4 text-center">
            <h3 id="buffAnnouncerText" class="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse">UNDERDOG BUFF!</h3>"""
new_buff_html = """<div id="buffAnnouncer" class="hidden absolute top-48 inset-x-0 z-40 pointer-events-none flex flex-col items-center justify-center px-4">
        <div class="bg-gradient-to-r from-transparent via-amber-600/90 to-transparent w-full max-w-xl py-3 rounded-full text-center shadow-lg border-y border-amber-400">
            <h3 id="buffAnnouncerText" class="text-lg md:text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] animate-pulse">UNDERDOG BUFF!</h3>"""
html = html.replace(old_buff_html, new_buff_html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Fixes applied successfully.")
