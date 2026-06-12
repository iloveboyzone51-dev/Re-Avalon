import sys

def patch_index():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    target = """                <button id="btnHeroBARBARIAN" onclick="selectHero('BARBARIAN')"
                        class="py-2 px-1 rounded-xl border-2 border-transparent bg-slate-800/60 flex flex-col items-center transition-all active:scale-90">
                    <span class="text-lg">🪓</span><span class="text-[10px] font-bold text-orange-400 mt-0.5">바바리안</span>
                </button>
            </div>"""
            
    new_buttons = """                <button id="btnHeroBARBARIAN" onclick="selectHero('BARBARIAN')"
                        class="py-2 px-1 rounded-xl border-2 border-transparent bg-slate-800/60 flex flex-col items-center transition-all active:scale-90">
                    <span class="text-lg">🪓</span><span class="text-[10px] font-bold text-orange-400 mt-0.5">바바리안</span>
                </button>
                <button id="btnHeroZEROS" onclick="selectHero('ZEROS')"
                        class="py-2 px-1 rounded-xl border-2 border-transparent bg-slate-800/60 flex flex-col items-center transition-all active:scale-90">
                    <span class="text-lg">🗡️</span><span class="text-[10px] font-bold text-red-500 mt-0.5">제로스</span>
                </button>
                <button id="btnHeroSYLVIA" onclick="selectHero('SYLVIA')"
                        class="py-2 px-1 rounded-xl border-2 border-transparent bg-slate-800/60 flex flex-col items-center transition-all active:scale-90">
                    <span class="text-lg">🎯</span><span class="text-[10px] font-bold text-teal-400 mt-0.5">실비아</span>
                </button>
                <button id="btnHeroZEPHYR" onclick="selectHero('ZEPHYR')"
                        class="py-2 px-1 rounded-xl border-2 border-transparent bg-slate-800/60 flex flex-col items-center transition-all active:scale-90">
                    <span class="text-lg">🌪️</span><span class="text-[10px] font-bold text-green-400 mt-0.5">제피르</span>
                </button>
            </div>"""

    if target in content:
        content = content.replace(target, new_buttons)
        print("Patched index.html buttons.")
    else:
        print("target not found")
        
    patch_note_target = "            <h2 class=\"text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-4\">✨ 업데이트 내역 (v1.0.13)</h2>"
    patch_note_replace = "            <h2 class=\"text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-4\">✨ 업데이트 내역 (v1.0.14)</h2>"
    
    if patch_note_target in content:
        content = content.replace(patch_note_target, patch_note_replace)
    
    ul_target = """                <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                    <li><span class="text-amber-400 font-bold">[신규]</span> 에픽 보스 레이드: 10분경 무작위 위치에 초대형 에픽 드래곤 출현</li>"""
    
    ul_replace = """                <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                    <li><span class="text-amber-400 font-bold">[신규]</span> 신규 영웅 3종 출시: 제로스(암살자), 실비아(저격수), 제피르(바람마법사)</li>
                    <li><span class="text-sky-400 font-bold">[수정]</span> 에메랄드 골렘 마법 데미지 감면 50%로 변경</li>
                    <li><span class="text-sky-400 font-bold">[수정]</span> 수호신 버벅임 패치 및 드래곤/마수 밸런스 완화</li>
                    <li><span class="text-amber-400 font-bold">[신규]</span> 에픽 보스 레이드: 10분경 무작위 위치에 초대형 에픽 드래곤 출현</li>"""

    if ul_target in content:
        content = content.replace(ul_target, ul_replace)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_index()
