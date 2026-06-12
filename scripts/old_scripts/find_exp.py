import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('game.js', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if 'gainExp' in l or 'levelUp' in l:
        print(f"{i+1}: {l.strip()}")
