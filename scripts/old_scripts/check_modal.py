with open('index.html', encoding='utf-8') as f:
    c = f.read()
    print("Count:", c.count('id="patchNotesModal"'))
