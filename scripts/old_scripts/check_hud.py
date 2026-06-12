with open('index.html', encoding='utf-8') as f:
    c = f.read()
    idx = c.find('id="gameHUD"')
    if idx != -1:
        end_idx = c.find('id="patchNotesModal"')
        between = c[idx:end_idx]
        print(f"div opens: {between.count('<div')}")
        print(f"div closes: {between.count('</div')}")
