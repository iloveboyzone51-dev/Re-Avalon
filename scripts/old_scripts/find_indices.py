with open('index.html', encoding='utf-8') as f:
    content = f.read()
    s_idx = content.find('id="gameScreen"')
    p_idx = content.find('id="patchNotesModal"')
    e_idx = content.find('id="multiKillAnnouncer"')
    print(f"gameScreen starts at: {s_idx}")
    print(f"patchNotesModal starts at: {p_idx}")
    print(f"multiKillAnnouncer starts at: {e_idx}")
