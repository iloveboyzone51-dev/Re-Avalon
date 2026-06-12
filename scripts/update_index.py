import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove chatLog
html = re.sub(r'<!-- AI Chat Log -->\s*<div id="chatLog".*?</div>', '', html, flags=re.DOTALL)

# 2. Update Title Screen (Add Hall of Fame Button)
if '명예의 전당' not in html:
    start_btn_html = '<button onclick="startGame()" class="w-full py-4 text-2xl font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg transform transition active:scale-95 orbitron">GAME START</button>'
    new_btns = start_btn_html + '\n                    <button onclick="showHoF()" class="w-full py-3 text-xl font-bold rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg transform transition active:scale-95 orbitron mt-4">🏆 명예의 전당</button>'
    html = html.replace(start_btn_html, new_btns)

# 3. Add Hall of Fame Modal & Multi-kill Announcer & Buff Announcer
if 'hofScreen' not in html:
    hof_modal = """
    <!-- 명예의 전당 모달 -->
    <div id="hofScreen" class="hidden absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div class="bg-slate-900 border-2 border-amber-500 p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            <h2 class="text-4xl font-black text-amber-500 text-center mb-6 orbitron">🏆 HALL OF FAME 🏆</h2>
            <div class="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                <table class="w-full text-left text-sm md:text-base">
                    <thead class="bg-slate-800 text-slate-300">
                        <tr>
                            <th class="p-2 rounded-tl">닉네임</th>
                            <th class="p-2">영웅</th>
                            <th class="p-2 text-center">K / D / A</th>
                            <th class="p-2 text-right rounded-tr">지배력</th>
                        </tr>
                    </thead>
                    <tbody id="hofTableBody" class="text-white">
                        <!-- JS injected -->
                    </tbody>
                </table>
            </div>
            <button onclick="document.getElementById('hofScreen').classList.add('hidden')" class="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl active:scale-95 transition">닫기</button>
        </div>
    </div>
    """
    
    multi_kill_announcer = """
    <!-- 다중 킬 전광판 -->
    <div id="multiKillAnnouncer" class="hidden absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
        <div id="multiKillText" class="text-7xl md:text-[100px] font-black italic orbitron text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-rose-600 drop-shadow-[0_10px_20px_rgba(225,29,72,0.8)] scale-150 opacity-0 transition-all duration-300">
            DOUBLE KILL!
        </div>
    </div>
    
    <!-- 진영 버프 알림판 -->
    <div id="buffAnnouncer" class="hidden absolute inset-x-0 top-1/4 z-40 pointer-events-none flex flex-col items-center justify-center">
        <div class="bg-gradient-to-r from-transparent via-amber-600/80 to-transparent w-full py-4 text-center">
            <h3 id="buffAnnouncerText" class="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse">UNDERDOG BUFF!</h3>
        </div>
    </div>
    """
    
    html = html.replace('</body>', hof_modal + multi_kill_announcer + '\n</body>')

# 4. Modify Game Over Screen for KDA and Dominance input
if 'id="kdaResult"' not in html:
    old_game_over = """<p class="text-slate-400">Score:</p>
                <div class="text-4xl font-bold text-white mb-8"><span id="goScoreBlue" class="text-blue-400">0</span> : <span id="goScoreRed" class="text-red-400">0</span></div>"""
    
    new_game_over = """<p class="text-slate-400">Score:</p>
                <div class="text-4xl font-bold text-white mb-4"><span id="goScoreBlue" class="text-blue-400">0</span> : <span id="goScoreRed" class="text-red-400">0</span></div>
                
                <div class="w-full bg-slate-800 rounded-xl p-4 mb-8 text-center border border-slate-700 shadow-inner">
                    <p class="text-sm text-slate-400 mb-1">내 기록 (K / D / A)</p>
                    <p id="kdaResult" class="text-2xl font-bold text-amber-400 tracking-widest mb-2">0 / 0 / 0</p>
                    <p class="text-xs text-slate-500 mb-1">게임 지배력</p>
                    <p id="dominanceResult" class="text-lg font-bold text-emerald-400">0%</p>
                </div>
                
                <div class="w-full mb-6">
                    <input type="text" id="playerNameInput" placeholder="닉네임을 입력하세요" class="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 text-center text-lg" maxlength="10">
                </div>
                """
    html = html.replace(old_game_over, new_game_over)

# Update the "Title로 돌아가기" button to save Hof record
html = html.replace('onclick="location.reload()"', 'onclick="saveAndReload()"')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html updated successfully.")
