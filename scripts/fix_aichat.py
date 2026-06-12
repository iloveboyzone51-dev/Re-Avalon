import re

def fix():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    aichat_pat = re.compile(r'window\.AIChat = \{[\s]*timer: 0,[\s]*chatLog: null,')
    chat_methods = """window.AIChat = {
    timer: 0,
    chatLog: null,
    triggerOrderChat: function(commander, orderType, faction) {
        if(!commander) return;
        const p={
            call_dragon:    ["용 잡으러 갑시다","드래곤 집결!","빠르게 드래곤 치자","용 먹으면 이김 ㄱㄱ","드래곤!"],
            call_defend:    ["수비!!","넥서스로 다 모여","빨리 들어와","방어 라인 잡아!","수비 안하면 진다","넥서스 위험"],
            order_push:     ["라인 밀자","집결해서 넥서스!","약한 라인 ㄱㄱ","다 모여서 밀자","오더: 라인 집중"],
            call_teamfight: ["한타 간다","뭉쳐 한타 박자","집결!","5명 모이면 이김","한타 각 나왔다"],
            nexus_open:     ["넥서스 무방비다!!","지금이야!!","다 버리고 넥서스!","가즈아!!!!","열렸다 ㄱ"],
        };
        let msgs=p[orderType]; if(!msgs) return;
        let msg=msgs[Math.floor(Math.random()*msgs.length)];
        setTimeout(()=>this.addChat(commander,msg), 200+Math.random()*400);
        
        let tColor = faction === 'BLUE' ? '#3b82f6' : '#ef4444';
        if(orderType==='call_dragon') {
            let dg = entities.find(e=>(e.mtype==='boss_epic_dragon'||e.mtype==='boss')&&!e.isDead);
            if(dg) { spawnRing(dg.x, dg.y, tColor, 200, 1.0); spawnParticles(dg.x, dg.y, tColor, 30, 200, 1.5); }
        } else if(orderType==='call_defend') {
            let nx = entities.find(e=>e.type==='nexus'&&e.faction===faction);
            if(nx) { spawnRing(nx.x, nx.y, tColor, 250, 1.0); spawnParticles(nx.x, nx.y, tColor, 40, 250, 1.5); }
        }
    },
    triggerStateChat: function(hero, from, to) {
        const p={
            'LANE->ASSASSINATE':     ["잠깐 저놈 잡고올게","피 낮네 ㅋ 치고빠짐","컷하고올게"],
            'ATTACK->RETREAT':       ["아 ㅅㅂ 피 없어","일단 튀어야겠다","렉임 ㅈㅅ","후퇴"],
            'LANE->SPLITPUSH':       ["나 반대 라인 밀게","혼자 탑 밀고올게","스플릿 갑니다","딴데 압박걸게"],
            'RETREAT->RECALL':       ["본진 잠깐","아이템 사러","회복 좀 하고올게","귀환"],
            'ATTACK->TEAMFIGHT_JOIN':["한타 합류","간다!","같이 함"],
            'LANE->FOLLOW_ORDER':    ["오더 대로","알겠음","합류","ㅇㅇ"],
            'LANE->SIEGE':           ["타워 딜 넣자","미니언 탱크 고마워","공성 간다"],
            'RECALL->LANE':          ["복귀","왔다","준비됨","ㄱㄱ"],
            'LANE->ESCORT':          ["내가 지킴","뒤에 있어","커버 간다"],
        };
        let key=from+'->'+to, msgs=p[key];
        if(!msgs||Math.random()>0.30) return;
        this.addChat(hero, msgs[Math.floor(Math.random()*msgs.length)]);
    },
"""
    content = aichat_pat.sub(chat_methods, content)
    
    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix()
