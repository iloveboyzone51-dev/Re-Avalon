def create_network_js():
    content = """
// 네트워크 매니저 (PeerJS 기반)
class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = {}; // id -> dataConnection
        this.mode = 'SINGLE'; // 'SINGLE', 'HOST', 'CLIENT'
        this.myId = null;
        this.hostId = null;
        this.isReady = false;
        
        // 로비용 상태
        this.lobbyState = {
            blue: [], // {id, isHost, isAI, name}
            red: []
        };
    }

    generateCode() {
        // 4자리 영숫자 랜덤 코드
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return 'AVALON-' + code;
    }

    initHost() {
        this.mode = 'HOST';
        this.myId = this.generateCode();
        this.peer = new Peer(this.myId, { debug: 2 });

        this.peer.on('open', (id) => {
            console.log('Host initialized:', id);
            document.getElementById('myRoomCode').innerText = id;
            this.isReady = true;
            this.updateLobbySlot(id, 'BLUE', true, '나 (방장)');
        });

        this.peer.on('connection', (conn) => {
            console.log('Client connected:', conn.peer);
            this.connections[conn.peer] = conn;
            
            // 새 클라이언트 슬롯 할당 (임시로 빈 자리에 넣기)
            this.assignClientSlot(conn.peer);

            conn.on('data', (data) => {
                this.handleDataFromClient(conn.peer, data);
            });

            conn.on('close', () => {
                console.log('Client disconnected:', conn.peer);
                delete this.connections[conn.peer];
                this.removeClientSlot(conn.peer);
            });
            
            // 호스트가 연결된 즉시 현재 로비 상태 전송
            this.broadcastLobbyState();
        });
        
        this.peer.on('error', (err) => {
            console.error('PeerJS Host Error:', err);
            alert('네트워크 오류: ' + err.message);
        });
    }

    initClient(hostId) {
        this.mode = 'CLIENT';
        this.hostId = hostId.toUpperCase();
        this.peer = new Peer({ debug: 2 });

        this.peer.on('open', (id) => {
            this.myId = id;
            console.log('Client initialized:', id, 'Connecting to:', this.hostId);
            
            const conn = this.peer.connect(this.hostId, { reliable: true });
            
            conn.on('open', () => {
                console.log('Connected to Host!');
                this.connections[this.hostId] = conn;
                this.isReady = true;
                
                document.getElementById('clientWaitMsg').classList.remove('hidden');
                document.getElementById('netStatusMsg').innerText = '호스트에 연결되었습니다!';
                document.getElementById('netStatusMsg').classList.remove('hidden');
                document.getElementById('netStatusMsg').classList.replace('text-rose-400', 'text-emerald-400');
            });

            conn.on('data', (data) => {
                this.handleDataFromHost(data);
            });

            conn.on('close', () => {
                console.log('Connection closed by Host');
                alert('호스트와 연결이 끊어졌습니다.');
                location.reload();
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS Client Error:', err);
                alert('접속 실패: 코드를 확인해주세요.');
                location.reload();
            });
        });
    }
    
    assignClientSlot(clientId) {
        if(this.lobbyState.blue.length < 5) {
            this.lobbyState.blue.push({ id: clientId, isHost: false, isAI: false, name: '유저' });
        } else if(this.lobbyState.red.length < 5) {
            this.lobbyState.red.push({ id: clientId, isHost: false, isAI: false, name: '유저' });
        }
        this.broadcastLobbyState();
        this.renderLobbyUI();
    }
    
    removeClientSlot(clientId) {
        this.lobbyState.blue = this.lobbyState.blue.filter(c => c.id !== clientId);
        this.lobbyState.red = this.lobbyState.red.filter(c => c.id !== clientId);
        this.broadcastLobbyState();
        this.renderLobbyUI();
    }
    
    updateLobbySlot(id, faction, isHost, name) {
        if(faction === 'BLUE') this.lobbyState.blue.push({ id, isHost, isAI: false, name });
        else this.lobbyState.red.push({ id, isHost, isAI: false, name });
        this.renderLobbyUI();
    }

    renderLobbyUI() {
        // BLUE 팀 렌더링
        for(let i=0; i<5; i++) {
            let slot = document.getElementById('slotB' + (i+1));
            if(!slot) continue;
            if(i < this.lobbyState.blue.length) {
                let p = this.lobbyState.blue[i];
                slot.innerText = p.name;
                slot.className = p.isHost ? "text-[11px] font-bold text-white bg-indigo-600 p-1.5 rounded text-center truncate border border-indigo-400 shadow" : "text-[11px] font-bold text-white bg-sky-600 p-1.5 rounded text-center truncate border border-sky-400 shadow";
            } else {
                slot.innerText = 'AI (대기중)';
                slot.className = "text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600";
            }
        }
        // RED 팀 렌더링
        for(let i=0; i<5; i++) {
            let slot = document.getElementById('slotR' + (i+1));
            if(!slot) continue;
            if(i < this.lobbyState.red.length) {
                let p = this.lobbyState.red[i];
                slot.innerText = p.name;
                slot.className = p.isHost ? "text-[11px] font-bold text-white bg-rose-600 p-1.5 rounded text-center truncate border border-rose-400 shadow" : "text-[11px] font-bold text-white bg-orange-600 p-1.5 rounded text-center truncate border border-orange-400 shadow";
            } else {
                slot.innerText = 'AI (대기중)';
                slot.className = "text-[11px] text-slate-400 bg-slate-800/50 p-1.5 rounded text-center border border-dashed border-slate-600";
            }
        }
    }

    broadcastLobbyState() {
        if(this.mode !== 'HOST') return;
        const msg = { type: 'LOBBY_STATE', state: this.lobbyState };
        Object.values(this.connections).forEach(conn => {
            if(conn.open) conn.send(msg);
        });
    }

    handleDataFromHost(data) {
        if(data.type === 'LOBBY_STATE') {
            this.lobbyState = data.state;
            this.renderLobbyUI();
        } else if (data.type === 'GAME_START') {
            // 게임 시작!
            document.getElementById('titleScreen').classList.add('hidden');
            document.getElementById('gameHUD').classList.remove('hidden');
            document.getElementById('gameHUD').classList.add('flex');
            // TODO: 실제 게임 로직 시작 연동
        } else if (data.type === 'GAME_STATE') {
            // 호스트로부터 맵 전체 정보 수신
            window.serverGameState = data.state;
        }
    }

    handleDataFromClient(clientId, data) {
        if(data.type === 'INPUT') {
            // 클라이언트의 키 입력(조이스틱, 스킬 등) 수신
            // 서버측(호스트)의 해당 영웅 객체 업데이트
            let clientHero = window.entities.find(e => e.netId === clientId);
            if(clientHero) {
                clientHero.keys = data.keys;
                clientHero.joystick = data.joystick;
            }
        }
    }

    broadcastGameState() {
        if(this.mode !== 'HOST') return;
        // 매우 가벼운 형태로 게임 상태 압축 (Serialization)
        // 이 부분은 game.js 내부에 긴밀하게 연동됨
    }
}

window.Net = new NetworkManager();

window.netHostGame = () => {
    document.getElementById('netStartMenu').classList.add('hidden');
    document.getElementById('netLobby').classList.remove('hidden');
    document.getElementById('netLobby').classList.add('flex');
    document.getElementById('hostControls').classList.remove('hidden');
    window.Net.initHost();
};

window.netJoinGame = () => {
    let code = document.getElementById('joinCode').value.trim();
    if(!code || code.length < 5) {
        alert('참여 코드를 정확히 입력해주세요. (예: AVALON-ABCD)');
        return;
    }
    document.getElementById('netStatusMsg').innerText = '연결 중...';
    document.getElementById('netStatusMsg').classList.remove('hidden');
    
    document.getElementById('netStartMenu').classList.add('hidden');
    document.getElementById('netLobby').classList.remove('hidden');
    document.getElementById('netLobby').classList.add('flex');
    
    window.Net.initClient(code);
};

window.netStartMatch = () => {
    if(window.Net.mode === 'HOST') {
        const msg = { type: 'GAME_START' };
        Object.values(window.Net.connections).forEach(conn => {
            if(conn.open) conn.send(msg);
        });
        
        // 나도 게임 시작 (게임 초기화)
        // TODO: window.startGameNet(window.Net.lobbyState) 호출 등 연동
        console.log("Game Starting!");
        // startGame(); // 원래 싱글플레이 시작 함수
    }
};
"""
    with open(r'multi\network.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Created network.js")

if __name__ == '__main__':
    create_network_js()
