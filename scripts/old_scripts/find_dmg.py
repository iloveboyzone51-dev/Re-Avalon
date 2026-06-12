import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('game.js', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if 'applyRawDamage(amount' in l:
        for j in range(i, i+30):
            print(f"{j+1}: {lines[j].strip()}")
        break
