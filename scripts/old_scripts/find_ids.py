import re

with open('game.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'document.getElementById(' in line:
        m = re.search(r"getElementById\(['\"](.*?)['\"]\)", line)
        if m and ('screen' in m.group(1).lower() or 'modal' in m.group(1).lower()):
            print(f"game.js:{i+1}: {line.strip()}")

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    m = re.search(r"id=['\"](.*?)['\"]", line)
    if m and ('screen' in m.group(1).lower() or 'modal' in m.group(1).lower()):
        print(f"index.html:{i+1}: {m.group(1)}")
