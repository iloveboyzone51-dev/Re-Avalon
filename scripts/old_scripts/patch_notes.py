import sys
import re

def rewrite_patch_notes():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start and end of the patch notes content inside the modal
    start_tag = '<div class="flex-1 overflow-y-auto pr-4 text-sm md:text-base text-slate-300 space-y-4 custom-scrollbar">'
    end_tag = '            <button onclick="document.getElementById(\'patchNotesModal\').classList.add(\'hidden\')" class="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl active:scale-95 transition">'

    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag)

    if start_idx == -1 or end_idx == -1:
        print("Could not find the patch notes section.")
        return

    new_patch_notes = f"""{start_tag}
                <!-- v1.0.14 -->
                <details class="bg-slate-800/80 rounded-xl border border-amber-500/50 shadow-lg overflow-hidden" open>
                    <summary class="cursor-pointer p-4 font-black text-amber-400 hover:bg-slate-700/50 transition select-none flex justify-between items-center">
                        <div class="flex items-center gap-2"><span class="text-xl">✨</span> v1.0.14 - 신규 영웅 3종 출시 및 UI/UX 대개편</div>
                        <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full border border-amber-500/30">LATEST</span>
                    </summary>
                    <div class="p-4 pt-2 text-sm text-slate-300 space-y-3 bg-slate-900/50">
                        <ul class="list-disc pl-5 space-y-2">
                            <li><span class="font-bold text-amber-400">[신규 영웅]</span> <b>제로스(암살자), 실비아(저격수), 제피르(바람마법사)</b> 3종이 새롭게 참전합니다! 각 영웅의 고유한 컨셉과 화려한 캔버스 렌더링을 경험해 보세요.</li>
                            <li><span class="font-bold text-emerald-400">[UX 개편]</span> 모든 영웅(15종)의 하단 스킬 1, 스킬 2 버튼에 각 스킬을 대표하는 고유 아이콘(이모지)이 적용되어 가독성이 대폭 상승했습니다.</li>
                            <li><span class="font-bold text-sky-400">[시스템 개선]</span> 타워/수호 타워가 동일한 적을 연속 공격할 때 데미지가 누적(15%~25%)되어 증가하는 로직이 추가되었습니다. 무리한 다이브나 라인 푸시가 더 위험해졌습니다.</li>
                            <li><span class="font-bold text-rose-400">[영웅 폴리싱]</span> 실비아의 공격 사거리 인디케이터 시각화 및 제로스의 흑염참/그림자 습격 무기 잔상 효과, 제피르의 3갈래 다단히트 회오리가 추가되었습니다.</li>
                        </ul>
                    </div>
                </details>

                <!-- v1.0.13 -->
                <details class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <summary class="cursor-pointer p-4 font-bold text-emerald-400 hover:bg-slate-700/50 transition select-none flex justify-between items-center">
                        <div class="flex items-center gap-2"><span class="text-lg">🔥</span> v1.0.13 - 대규모 밸런스 및 크리처 경제 개편</div>
                        <span class="text-slate-500 text-xs">▼</span>
                    </summary>
                    <div class="p-4 pt-2 text-sm text-slate-300 space-y-2 bg-slate-900/30">
                        <ul class="list-disc pl-5 space-y-1">
                            <li><span class="font-bold text-sky-400">자원 최적화:</span> 불필요한 필드 재화(Souls) 삭제, 공용 골드(Gold)만 사용되도록 정비</li>
                            <li><span class="font-bold text-amber-400">크리처 소환:</span> 6분마다 공용 자원을 소모하여 보스급 크리처를 출격시킵니다.</li>
                            <li><span class="font-bold text-rose-400">보스 특성:</span> 화룡 광역 화염, 에메랄드 골렘 스킬 데미지 50% 감면, 황금 마수 뎀감 및 기절 포효 추가</li>
                            <li><span class="font-bold text-purple-400">수호신 밸런스:</span> 수호신의 공격속도 2배 증가, 원거리 공격에 대한 데미지 70% 감소 철벽 패시브 추가</li>
                        </ul>
                    </div>
                </details>

                <!-- v1.0.12 & v1.0.11 -->
                <details class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <summary class="cursor-pointer p-4 font-bold text-sky-400 hover:bg-slate-700/50 transition select-none flex justify-between items-center">
                        <div class="flex items-center gap-2"><span class="text-lg">⚔️</span> v1.0.11 ~ v1.0.12 - 전투 대격변 및 아이템 대규모 추가</div>
                        <span class="text-slate-500 text-xs">▼</span>
                    </summary>
                    <div class="p-4 pt-2 text-sm text-slate-300 space-y-2 bg-slate-900/30">
                        <ul class="list-disc pl-5 space-y-1">
                            <li><span class="font-bold text-sky-400">전장 템포:</span> 미니언 젠 주기를 18초에서 9초로 대폭 단축, 드래곤 팀 스탯 버프 1.5배 상향</li>
                            <li><span class="font-bold text-rose-400">신규 아이템:</span> 티아맷의 도끼, 서리불꽃 건틀릿, 괴수의 뼈갑옷, 수호천사의 은총, 헤르메스의 장화 추가</li>
                            <li><span class="font-bold text-purple-400">시너지 활성화:</span> 얼어붙은 학살자, 불사조의 분노 등 특정 전설 장비 조합 시 초강력 히든 시너지 발동</li>
                        </ul>
                    </div>
                </details>

                <!-- v1.0.08 ~ v1.0.10 -->
                <details class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <summary class="cursor-pointer p-4 font-bold text-indigo-400 hover:bg-slate-700/50 transition select-none flex justify-between items-center">
                        <div class="flex items-center gap-2"><span class="text-lg">🛡️</span> v1.0.08 ~ v1.0.10 - 신규 영웅 및 서든데스 모드</div>
                        <span class="text-slate-500 text-xs">▼</span>
                    </summary>
                    <div class="p-4 pt-2 text-sm text-slate-300 space-y-2 bg-slate-900/30">
                        <ul class="list-disc pl-5 space-y-1">
                            <li><span class="font-bold text-amber-400">영웅 및 크리처:</span> 크래그(골렘 탱커), 아리엘(전담 힐러) 추가. 넥서스 수호신 재탄생</li>
                            <li><span class="font-bold text-rose-400">서든데스 & 이벤트:</span> 18분 서든데스(넥서스 체력 감소), 8분 황금 고블린 이벤트 추가</li>
                            <li><span class="font-bold text-emerald-400">UI/UX:</span> 타워 철거 글로벌 배너 알림, 이모지 스팸 방지 및 상황별 이모지 출력, 무기 진화 수치 완화(9강->7강)</li>
                        </ul>
                    </div>
                </details>

                <!-- v1.0.03 ~ v1.0.07 -->
                <details class="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <summary class="cursor-pointer p-4 font-bold text-slate-400 hover:bg-slate-700/50 transition select-none flex justify-between items-center">
                        <div class="flex items-center gap-2"><span class="text-lg">📜</span> 이전 업데이트 내역 (v1.0.03 ~ v1.0.07)</div>
                        <span class="text-slate-500 text-xs">▼</span>
                    </summary>
                    <div class="p-4 pt-2 text-sm text-slate-400 space-y-2 bg-slate-900/30">
                        <ul class="list-disc pl-5 space-y-1">
                            <li>미니맵 정상화, 상태 이상(기절/둔화/빙결) 그래픽 렌더링 연출 도입</li>
                            <li>영웅 썸네일 미리보기 추가 및 로비 화면 스킬 상세 정보 제공</li>
                            <li>상점 아이템 배열 2열 격자 구조 변경 및 설명 보강</li>
                            <li>결과창 닉네임 입력 및 명예의 전당 기능 구현, 치명적인 무적/체력 버그 핫픽스</li>
                        </ul>
                    </div>
                </details>
            </div>
"""
    
    new_content = content[:start_idx] + new_patch_notes + content[end_idx:]
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patch notes organized successfully.")

if __name__ == '__main__':
    rewrite_patch_notes()
