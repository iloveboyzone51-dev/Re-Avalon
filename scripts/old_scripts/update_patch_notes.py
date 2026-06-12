import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    html = f.read()

patch_html = """                <details class="bg-slate-700/50 rounded-lg border border-slate-600/50" open>
                    <summary class="cursor-pointer p-3 font-bold text-emerald-400 hover:text-emerald-300 transition select-none flex justify-between items-center">
                        v1013 - 대규모 밸런스 및 크리처 경제 개편
                        <span class="text-xs text-slate-400 font-normal ml-2 text-emerald-400 font-bold">NEW</span>
                    </summary>
                    <div class="p-3 pt-0 text-sm text-slate-200 space-y-2 border-t border-slate-600/50 mt-1 pb-3 px-4">
                        <ul class="list-disc pl-4 space-y-1">
                            <li><span class="font-bold text-sky-400">자원 최적화:</span> 불필요한 필드 재화(Souls)를 삭제하고 오직 공용 골드(Gold)만 사용되도록 시스템을 정비했습니다.</li>
                            <li><span class="font-bold text-amber-400">크리처 군단 소환:</span> 이제 6분마다 공용 자원(1마리당 600G)을 소모하여 크리처를 출격시킵니다. (보유 골드에 따라 최대 3마리 스폰, 골드 부족 시 스킵)</li>
                            <li><span class="font-bold text-rose-400">보스 및 크리처 특성 부여:</span> 
                                <br>- <b>화룡:</b> 광역 평타 및 지속 화염 장판 패시브
                                <br>- <b>에메랄드 골렘:</b> 체력 대폭 상향 및 <b>모든 스킬 데미지 면역</b>
                                <br>- <b>황금 마수:</b> 받는 데미지 상시 25% 감소 및 6초마다 주변 기절 포효
                            </li>
                            <li><span class="font-bold text-purple-400">수호신 밸런스:</span> 수호신의 공격속도가 2배로 증가했으며, 사거리가 150 이상이거나 스킬 공격에 대해 데미지를 70% 감소시키는 철벽 패시브가 추가되었습니다.</li>
                        </ul>
                    </div>
                </details>
"""

html = html.replace('<div class="flex-1 overflow-y-auto pr-4 text-sm md:text-base text-slate-300 space-y-4 custom-scrollbar">', 
                    '<div class="flex-1 overflow-y-auto pr-4 text-sm md:text-base text-slate-300 space-y-4 custom-scrollbar">\n' + patch_html)

# Also remove 'NEW' tag from v1012
html = html.replace('<span class="text-xs text-slate-400 font-normal ml-2 text-sky-400 font-bold">NEW</span>', '<span class="text-xs text-slate-400 font-normal ml-2">최신</span>')

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(html)
print("patch html done")
