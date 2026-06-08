import re

with open('game.js', 'r', encoding='utf-8') as f:
    js = f.read()

split_str = "// ====== AI Chat & Kill Feed Systems ======"
parts = js.split(split_str)
if len(parts) == 2:
    base_js = parts[0]
else:
    base_js = js

ai_system = """// ====== AI Chat & Kill Feed Systems ======
window.killStreaks = {};
window.mapPings = [];

function getHeroName(e) {
    if(!e) return '알수없음';
    if(e.heroKey && HERO_TMPL[e.heroKey]) return HERO_TMPL[e.heroKey].name;
    if(e.type === 'tower') return '타워';
    if(e.type === 'minion') return '미니언';
    if(e.type === 'nexus') return '넥서스';
    if(e.mtype) return '몬스터';
    return '알수없음';
}

window.addKillFeed = function(attacker, victim) {
    if (!attacker || !victim) return;
    const feed = document.getElementById('killFeed');
    if (!feed) return;
    
    let aName = getHeroName(attacker);
    let vName = getHeroName(victim);
    
    // Update streak
    if(attacker.heroKey) {
        window.killStreaks[attacker.heroKey] = (window.killStreaks[attacker.heroKey] || 0) + 1;
        let streakCount = window.killStreaks[attacker.heroKey];
        let streakText = '';
        if (streakCount >= 3) {
            streakText = `<span class="text-amber-400 animate-pulse font-black"> [${streakCount}연속 킬!]</span>`;
            if (window.AIChat) window.AIChat.triggerEvent('streak', attacker, streakCount);
        }
        
        let el = document.createElement('div');
        el.className = 'text-[11px] md:text-sm font-bold bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg flex gap-2 items-center text-white animate-fade-in-down';
        let aCol = attacker.faction==='BLUE'?'#60a5fa':'#f87171';
        let vCol = victim.faction==='BLUE'?'#60a5fa':'#f87171';
        
        el.innerHTML = `<span style="color:${aCol}">${aName}</span> ⚔️ <span style="color:${vCol}">${vName}</span> ${streakText}`;
        
        feed.prepend(el);
        if(feed.children.length > 5) feed.lastChild.remove();
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            el.style.transition = 'all 0.5s';
            setTimeout(() => el.remove(), 500);
        }, 5000);
    }
    
    if(victim.heroKey) {
        window.killStreaks[victim.heroKey] = 0;
    }
};

window.addPing = function(x, y, faction, type='danger') {
    window.mapPings.push({x, y, faction, type, life: 2.0, maxLife: 2.0});
    playSFX('button');
};

window.AIChat = {
    timer: 0,
    chatLog: null,
    pendingResponses: [],
    
    patterns: {
        kill: [
            "컷~ ㅅㄱ", "벌레컷ㅋㅋ", "아 달다~", "?? 쟤 뭐함?", "개못하네 진짜ㅋㅋ", "꺼어어억", "잘가시고~", "딜량 실화냐?", "이게 게임이지", "나이스!", 
            "캐리머신 ON", "바닥 쓸고가네ㅋㅋ", "마우스 발로함?", "AI한테도 지냐?", "응 컷~", "너무 달달하고~", "수고링", "이걸 사네ㅋㅋ 나이스", "막타 개꿀", "센스 미쳤고", 
            "피지컬 차이ㅋㅋ", "손가락 몇개심?", "걍 지우개네 ㅋㅋ", "숨쉬듯 킬먹노", "아 너무 쉽다", "ㅋㅋ 수준", "삭제완료", "경험치 자판기노", "한대 치면 죽네", "그냥 샌드백이쥬?", 
            "살살 할게요~", "어우 눈부셔 내 피지컬", "너넨 이런거 못하지?", "아~ 꿀맛", "버스타라 걍"
        ],
        death: [
            "아 ㄲㅂ", "억까 ㅈ대네", "아니 백업 좀;;", "렉걸림 ㅈㅅ", "운빨 망겜 수준", "ㅅㅂ 이게 죽어?", "아니 피 1남았는데", "우리팀 뭐함?", "정글차이 개심하네", "아 핑킥 ㅈㅅ", 
            "마우스 선 뽑힘", "저게 사네 ㅡㅡ", "밸런스 꼬라지", "아니 내 킬인데", "힐 좀 주지;;", "아 눈부셔", "손 풀고 있음", "봐준거임ㅋㅋ", "진짜 억까 너무심하네", "아 샷건마렵네", 
            "아니 팀원들 왜구경함?", "이건 억까지 ㅅㅂ", "아니 딜 왜저래", "한대충 혐오스럽네", "팀운 ㅈㅈ", "아 프레임 드랍ㅡㅡ", "내가 앞에서 다맞아주는데", "저걸 못잡네", "와 저걸 사네", "버그망겜 진짜"
        ],
        team_fight_win: [
            "다 닦았죠? ㅅㄱ", "나이스 ㅋㅋ", "캐리 개꿀", "우물 대기하셈", "서렌 치셈 걍ㅋㅋ", "오합지졸이네 아주", "팀워크 미쳤다", "이게 팀이지", "걍 밀죠 ㄱㄱ", "바론이나 먹죠", 
            "게임 ㅈㄴ쉽네", "개압살ㅋㅋ", "차이 너무나고~", "전광판 싹 비웠고", "넥서스 밀자", "오픈해라 걍", "겜 끝났네 ㅅㄱ", "너무 압도적인데", "벌레들 소탕 완료", "아 달달하다", "이판 이겼네"
        ],
        team_fight_lose: [
            "아니 딜 왜저럼", "우리팀 딜러들 다어디감?", "포지션 개에반데", "서렌 치자 걍", "아니 왜 한타를 지금함?", "이걸 지네;;", "진짜 팀운 ㅈ같다", "아니 스킬 다빠졌는데 왜들어감?", "답답하네 진짜", "걍 우물에 있어라", 
            "아~ 눈물나네", "이게 게임이냐", "왜 다 던짐?", "아이고 의미없다", "이거 못막음 ㅅㄱ", "벌써 겜 터졌누", "역전 가능하냐 이거", "멘탈 나가네", "팀워크 0이네 진짜", "다 따로노네"
        ],
        idle: [
            "아니 ㅅㅂ 맵 좀 보라고", "합류 ㅈㄴ 안하네", "쟤 뭐함? 겜안폰가", "빨리 좀 와라", "혼자 RPG하네", "구경났냐?", "지금 미드 뚫리는데 머함", "아 진짜 1인분만 하자", "왜 자꾸 짤림?", "진짜 속터지네", 
            "제발 합류좀 ㅠㅠ", "아니 언제옴?", "언제까지 파밍만 할래", "라인 관리 ㅈ같이 하네", "빨리 센터 모이라고!!", "님들 겜 던짐?", "눈팅만 하냐", "아니 거기서 뭐해", "혼자 겜하냐고", "제발 같이좀 다니자"
        ],
        streak: [
            "내가 캐리중이다", "누가 날 막냐 ㅋㅋㅋ", "핵 아님 ㅅㄱ", "손 씻고 왔다", "다 덤벼라", "나 안죽음 ㅅㄱ", "이 판은 내가 지배한다", "MVP는 내꺼", "폼 미쳤다 나", "학살 시작합니다", "그냥 신임ㅋㅋ", "누가 나좀 멈춰봐라", "이게 실력이다 벌레들아"
        ],
        response: [
            "ㅇㅈ", "ㄹㅇㅋㅋ", "니가 할말은 아님", "ㅋㅋㅋ 개웃기네", "네 다음 벌레", "입만 살았네", "조용히좀 해라", "응 니얼굴", "팩트 묵직하고", "차단함 ㅅㄱ", 
            "핑계는 ㅋㅋㅋ", "잘좀 해봐라", "싸우지마셈;;", "채팅칠 시간에 겜이나 해", "니가 젤 못해", "남탓 오지네", "ㅋㅋㅋㅋㅋ", "아 뼈맞음", "그만 싸워라 쫌", "둘다 똑같음 걍", 
            "그러는 넌 잘함?", "키보드 워리어 컷", "채팅 ㅈㄴ 치네", "응 아니야~", "니 실력이나 봐라", "웃고갑니다", "현실은 시궁창", "겜 끝나고 1:1 ㄱ?", "방빼라 그냥", "한숨만 나온다"
        ],
        emojis: {
            killer: ["😎", "😆", "🤪", "👻", "😈", "🥳", "🤣", "👅", "🔥", "✌️"],
            victim: ["🤬", "💀", "😭", "😱", "🤮", "💢", "☠️", "💧", "👎", "🤡"]
        }
    },
    
    addChat: function(hero, msg) {
        if(!this.chatLog) this.chatLog = document.getElementById('chatLog');
        if(!this.chatLog || !hero) return;
        
        let aName = getHeroName(hero);
        let hCol = hero.faction === 'BLUE' ? '#60a5fa' : '#f87171';
        let bgCol = hero.faction === 'BLUE' ? 'bg-blue-950/60 border-blue-800' : 'bg-red-950/60 border-red-800';
        let align = hero.faction === 'BLUE' ? 'self-start' : 'self-end';
        
        let el = document.createElement('div');
        el.className = `text-[12px] md:text-[14px] font-bold px-3 py-1.5 rounded-xl border shadow-lg text-white w-fit ${bgCol} ${align} animate-fade-in-up`;
        
        // Randomly use [ALL] or [TEAM]
        let scope = Math.random() < 0.3 ? '[전체]' : '[팀]';
        el.innerHTML = `<span style="color:${hCol}"> ${scope} ${aName}</span>: ${msg}`;
        
        this.chatLog.append(el);
        if(this.chatLog.children.length > 8) this.chatLog.firstChild.remove();
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.8s';
            setTimeout(() => el.remove(), 800);
        }, 7000);
        
        // Tiki-taka logic
        if(Math.random() < 0.5) {
            this.pendingResponses.push({ timer: 0.5 + Math.random()*1.5, srcFaction: hero.faction, msgType: 'response' });
        }
    },
    
    onKill: function(killer, victim) {
        if(killer && killer.type === 'hero' && victim && victim.type === 'hero') {
            // Emojis above heads
            if(window.addText) {
                let kEmoji = this.patterns.emojis.killer[Math.floor(Math.random()*this.patterns.emojis.killer.length)];
                let vEmoji = this.patterns.emojis.victim[Math.floor(Math.random()*this.patterns.emojis.victim.length)];
                addText(killer.x, killer.y - 60, kEmoji, '#ffffff', 28);
                addText(victim.x, victim.y - 60, vEmoji, '#ffffff', 28);
            }
            
            // Killer BM
            if (Math.random() < 0.8) {
                let msg = this.patterns.kill[Math.floor(Math.random() * this.patterns.kill.length)];
                setTimeout(() => this.addChat(killer, msg), 500);
            }
            // Victim complain
            if (Math.random() < 0.8) {
                let msg = this.patterns.death[Math.floor(Math.random() * this.patterns.death.length)];
                setTimeout(() => this.addChat(victim, msg), 1500);
            }
        }
    },
    
    triggerEvent: function(type, hero, val) {
        if(type === 'streak' && Math.random() < 0.9) {
            this.addChat(hero, this.patterns.streak[Math.floor(Math.random()*this.patterns.streak.length)]);
        }
    },
    
    update: function(dt) {
        this.timer += dt;
        
        // Ping logic
        for(let i=window.mapPings.length-1; i>=0; i--) {
            window.mapPings[i].life -= dt;
            if(window.mapPings[i].life <= 0) window.mapPings.splice(i, 1);
        }
        
        // Process Tiki-taka responses
        for(let i=this.pendingResponses.length-1; i>=0; i--) {
            let pr = this.pendingResponses[i];
            pr.timer -= dt;
            if(pr.timer <= 0) {
                let allies = entities.filter(e => e.type === 'hero' && e.faction === pr.srcFaction && !e.isDead);
                if(allies.length > 0) {
                    let responder = allies[Math.floor(Math.random() * allies.length)];
                    let msg = this.patterns.response[Math.floor(Math.random() * this.patterns.response.length)];
                    this.addChat(responder, msg);
                }
                this.pendingResponses.splice(i, 1);
            }
        }
        
        // Check every 1.5 seconds for random events
        if (this.timer < 1.5) return;
        this.timer = 0;
        
        if(entities && Math.random() < 0.35) { // 35% chance every 1.5s -> very active
            let heroes = entities.filter(e => e.type === 'hero' && !e.isDead);
            if (heroes.length > 0) {
                let rHero = heroes[Math.floor(Math.random() * heroes.length)];
                
                let rnd = Math.random();
                if(rnd < 0.4) {
                    // Complain about idle + Ping
                    let msg = this.patterns.idle[Math.floor(Math.random() * this.patterns.idle.length)];
                    this.addChat(rHero, msg);
                    window.addPing(rHero.x + (Math.random()-0.5)*300, rHero.y + (Math.random()-0.5)*300, rHero.faction);
                    if(Math.random() < 0.5) {
                        setTimeout(() => this.addChat(rHero, "핑 찍은데 안보이냐 빨리 와라 좀"), 1000);
                    }
                } else if(rnd < 0.6) {
                    // Team fight win/lose evaluation based on health
                    if (rHero.hp / rHero.maxHp > 0.7) {
                        let msg = this.patterns.team_fight_win[Math.floor(Math.random() * this.patterns.team_fight_win.length)];
                        this.addChat(rHero, msg);
                    } else {
                        let msg = this.patterns.team_fight_lose[Math.floor(Math.random() * this.patterns.team_fight_lose.length)];
                        this.addChat(rHero, msg);
                    }
                }
            }
        }
    }
};
"""

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(base_js + ai_system)

print("game.js AI V3 injected successfully")
