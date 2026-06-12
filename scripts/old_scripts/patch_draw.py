import sys

def patch_draw():
    with open('game.js', 'r', encoding='utf-8') as f:
        content = f.read()

    target = "        ctx.restore(); // 휠윈드 회전 종료\n    }"
    new_drawings = """        ctx.restore(); // 휠윈드 회전 종료
    } else if(type === 'zeros') {
        drawBody('#000000', '#3f3f46', '#27272a', '#dc2626'); // 검은 피부, 다크 브라운 아머, 빨간 눈
        // 다크 레드 망토
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.3-breath); ctx.lineTo(x+r*0.5, y-r*0.3-breath); ctx.lineTo(x+r*0.8, y+r*1.0-breath); ctx.lineTo(x-r*0.8, y+r*1.0-breath); ctx.fill();
        
        ctx.save();
        if(isAttacking) {
            ctx.translate(x+r*0.6, y); ctx.rotate((Math.PI/2.5) * rotDir);
            ctx.shadowColor = '#000000'; ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(127, 29, 29, 0.5)'; ctx.lineWidth = r*0.4;
            ctx.beginPath(); ctx.arc(-r*0.5, -r*0.5, r*1.5, -Math.PI*0.8, 0); ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            ctx.translate(x+r*0.5, y-r*0.1); ctx.rotate(Math.PI*0.1);
        }
        // 거대한 흑염검
        ctx.fillStyle = '#1c1917'; ctx.fillRect(-r*0.1, -r*2.0, r*0.3, r*2.5); // 자루 및 칼등
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.moveTo(-r*0.1, -r*2.0); ctx.lineTo(r*0.3, -r*2.5); ctx.lineTo(r*0.5, -r*1.5); ctx.lineTo(r*0.2, r*0); ctx.fill(); // 날
        // 붉은 화염 이펙트 (흑염검 오라)
        ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r*0.1, -r*2.0); ctx.lineTo(r*0.3, -r*2.5); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        
    } else if(type === 'sylvia') {
        drawBody('#fef08a', '#cffafe', '#f0fdf4', '#06b6d4'); // Cream white + Cyan
        // 헥스테크 후드
        ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.moveTo(x-r*0.5, y-r*0.5-breath); ctx.lineTo(x+r*0.5, y-r*0.5-breath); ctx.lineTo(x, y-r*1.3-breath); ctx.fill();
        
        ctx.save();
        if (isAttacking) {
            ctx.translate(x+r*0.6, y); ctx.rotate(Math.PI * 0.1); 
        } else {
            ctx.translate(x+r*0.4, y+r*0.2); ctx.rotate(Math.PI * 0.4); 
        }
        // 초장거리 저격총
        ctx.fillStyle = '#1e293b'; ctx.fillRect(-r*0.2, -r*0.2, r*2.2, r*0.3); // 총열
        ctx.fillStyle = '#06b6d4'; ctx.fillRect(r*0.5, -r*0.25, r*0.8, r*0.4); // 헥스테크 장식
        ctx.fillStyle = '#fef08a'; ctx.fillRect(r*2.0, -r*0.15, r*0.4, r*0.2); // 골드 장식
        
        // 레이저 포인터 이펙트
        if(!isAttacking) {
            ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 5;
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(r*2.4, -r*0.05); ctx.lineTo(r*10.0, -r*0.05); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
    } else if(type === 'zephyr') {
        drawBody('#fef08a', '#10b981', '#ffffff', '#4ade80', true); // Green, White, Light green aura
        // 동양풍 골드 장식 로브
        ctx.fillStyle = '#facc15'; ctx.fillRect(x-r*0.4, y+r*0.3-breath, r*0.8, r*0.2); 
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y-r*0.3-breath); ctx.lineTo(x, y+r*0.5-breath); ctx.stroke();

        // 양손 거대한 옥색 부채
        const drawFan = (offsetX, angle) => {
            ctx.save();
            ctx.translate(x+offsetX, y); ctx.rotate(angle);
            ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#10b981'; 
            ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, r*1.2, -Math.PI*0.3, Math.PI*0.3); ctx.fill();
            ctx.fillStyle = '#ffffff'; 
            ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, r*1.1, -Math.PI*0.25, Math.PI*0.25); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        };

        if(isAttacking) {
            drawFan(r*0.6, Math.PI*0.2 * rotDir);
            drawFan(-r*0.6, -Math.PI*0.2 * rotDir);
        } else {
            drawFan(r*0.5, Math.PI*0.4);
            drawFan(-r*0.5, Math.PI*0.6);
        }
    }"""
    
    if target in content:
        content = content.replace(target, new_drawings)
        print("Patched drawBlockyHero.")
    else:
        print("target not found")

    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_draw()
