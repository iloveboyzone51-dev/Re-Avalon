import re

def patch_html():
    with open(r'multi\index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    target = '<script src="game.js?v=1014"></script>'
    replace = '<script src="network.js"></script>\n<script src="game.js?v=1014"></script>'
    
    html = html.replace(target, replace)

    with open(r'multi\index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Added network.js to index.html")

if __name__ == '__main__':
    patch_html()
