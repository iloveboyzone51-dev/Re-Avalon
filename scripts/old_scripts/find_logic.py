import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('game.js', encoding='utf-8') as f:
    lines = f.readlines()
for j in range(4374, 4410):
    print(f"{j+1}: {lines[j].strip()}")
