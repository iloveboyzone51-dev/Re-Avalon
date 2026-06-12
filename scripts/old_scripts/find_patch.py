import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', encoding='utf-8') as f:
    lines = f.readlines()
idx=next(i for i,l in enumerate(lines) if 'id="patchNotesModal"' in l)
for i in range(idx, idx+150):
    if '<li' in lines[i] or '<summary' in lines[i]:
        print(f"{i+1}: {lines[i].strip()}")
