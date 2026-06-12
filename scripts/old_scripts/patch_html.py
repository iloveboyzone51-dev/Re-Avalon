import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace souls UI
content = re.sub(r'<span class="text-emerald-300"><span id="hudVaultSouls">0</span>.*?</span>', '', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('index.html patched')
