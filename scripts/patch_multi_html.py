import re

def patch_html():
    with open(r'multi\index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Find the faction selection div closing tag
    target_text = """                </button>
            </div>
        </div>"""
    
    network_ui = """                </button>
            </div>
        </div>

        <!-- Network Connection UI -->
        <div id="networkUI" class="w-full max-w-sm bg-slate-900/70 border border-amber-500/50 rounded-2xl p-4 backdrop-blur-md text-center shadow-xl">
            <h3 class="text-sm font-bold text-amber-400 mb-3 tracking-widest uppercase">🤝 멀티플레이 로비 (Beta)</h3>
            
            <div id="netStartMenu" class="flex flex-col gap-3">
                <button onclick="netHostGame()" class="py-3 px-4 rounded-xl font-black bg-indigo-600 border border-indigo-400 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-lg text-sm tracking-wider">👑 방 만들기 (호스트)</button>
                <div class="flex items-center gap-2">
                    <div class="h-px bg-slate-700 flex-1"></div>
                    <span class="text-xs font-bold text-slate-500">OR</span>
                    <div class="h-px bg-slate-700 flex-1"></div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="joinCode" placeholder="참여 코드 입력" class="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-white outline-none focus:border-amber-400 text-center uppercase tracking-[0.2em] font-mono text-sm shadow-inner">
                    <button onclick="netJoinGame()" class="py-2 px-4 rounded-xl font-bold bg-emerald-600 border border-emerald-400 hover:bg-emerald-500 text-white transition-all active:scale-95 shadow-lg text-sm whitespace-nowrap">참여하기</button>
                </div>
                <div id="netStatusMsg" class="text-xs font-bold text-rose-400 mt-1 hidden"></div>
            </div>

            <!-- Lobby UI (Hidden initially) -->
            <div id="netLobby" class="hidden flex-col gap-3">
                <div class="bg-slate-800/80 rounded-xl p-3 border border-slate-600 shadow-inner">
                    <span class="text-xs font-bold text-slate-400 tracking-wider">내 참여 코드 (친구에게 공유)</span>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <span id="myRoomCode" class="text-2xl font-black text-amber-400 font-mono tracking-[0.2em] select-all bg-slate-900 px-3 py-1 rounded border border-amber-500/30">로딩중...</span>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('myRoomCode').innerText); alert('복사되었습니다!');" class="text-slate-300 hover:text-white px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors">복사</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 text-left">
                    <!-- Blue Team Slots -->
                    <div class="flex flex-col gap-1.5 border border-emerald-500/50 p-2.5 rounded-xl bg-emerald-950/20 shadow-inner">
                        <div class="text-xs font-black text-emerald-400 mb-1 tracking-wider text-center">🔵 BLUE TEAM</div>
                        <div id="slotB1" class="text-[11px] font-bold text-white bg-indigo-600 p-1.5 rounded text-center truncate border border-indigo-400 shadow">나 (방장)</div>
                        <div id="slotB2" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotB3" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotB4" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotB5" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                    </div>
                    <!-- Red Team Slots -->
                    <div class="flex flex-col gap-1.5 border border-rose-500/50 p-2.5 rounded-xl bg-rose-950/20 shadow-inner">
                        <div class="text-xs font-black text-rose-400 mb-1 tracking-wider text-center">🔴 RED TEAM</div>
                        <div id="slotR1" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotR2" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotR3" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotR4" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                        <div id="slotR5" class="text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600">AI (대기중)</div>
                    </div>
                </div>
                <div id="hostControls" class="hidden mt-2">
                    <button onclick="netStartMatch()" class="w-full py-3 bg-amber-600 border border-amber-400 hover:bg-amber-500 text-white font-black rounded-xl text-lg animate-pulse shadow-[0_0_15px_rgba(217,119,6,0.6)] transition-all">🔥 게임 시작! (Start)</button>
                </div>
                <div id="clientWaitMsg" class="hidden mt-2 text-sm text-amber-400 animate-pulse font-bold bg-amber-900/30 py-3 rounded-xl border border-amber-500/30">
                    방장이 게임을 시작할 때까지 대기하세요...
                </div>
            </div>
        </div>"""
    
    html = html.replace(target_text, network_ui, 1)

    # Disable the original startGame button initially, because we want players to use netStartMatch.
    # Actually, the original startGame button is `<button onclick="startGame()"`
    
    start_btn_target = """            <button onclick="startGame()"
                    class="mt-auto md:mt-0 w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl text-xl animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95 mb-4">
                ⚔️ 사냥 시작! ⚔️
            </button>"""
            
    start_btn_replace = """            <button onclick="startGame()" id="btnSinglePlayerStart"
                    class="mt-auto md:mt-0 w-full py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black rounded-2xl text-sm transition-all active:scale-95 mb-4">
                (혼자서 연습하기 모드)
            </button>"""
            
    html = html.replace(start_btn_target, start_btn_replace)

    with open(r'multi\index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Patched index.html with multiplayer lobby UI")

if __name__ == '__main__':
    patch_html()
