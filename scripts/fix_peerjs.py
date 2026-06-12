def fix_peerjs():
    with open(r'multi\index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    target = '<script src="network.js"></script>'
    replace = '<script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>\n<script src="network.js"></script>'
    
    html = html.replace(target, replace)

    with open(r'multi\index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed peerjs")

if __name__ == '__main__':
    fix_peerjs()
