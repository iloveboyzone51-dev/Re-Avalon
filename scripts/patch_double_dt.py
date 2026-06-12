def patch_double_dt():
    with open(r'multi\game.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(r'multi\game.js', 'w', encoding='utf-8') as f:
        for i, line in enumerate(lines):
            # Line 4664: let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;
            if "let dt=Math.min((now-GS.lastFrame)/1000, 0.2); GS.lastFrame=now;" in line and i < 4680:
                print(f"Removed line {i}: {line.strip()}")
                continue
            f.write(line)

if __name__ == '__main__':
    patch_double_dt()
