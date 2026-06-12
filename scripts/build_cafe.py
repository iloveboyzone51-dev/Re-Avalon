import os
import base64
import shutil

if not os.path.exists('cafe'):
    os.makedirs('cafe')

# Copy index.html
shutil.copy('index.html', 'cafe/index.html')

# Obfuscate game.js
with open('game.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

encoded_bytes = base64.b64encode(js_content.encode('utf-8'))
encoded_str = encoded_bytes.decode('utf-8')

obfuscated_js = f"""
(function() {{
    const b64 = "{encoded_str}";
    const binStr = atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for(let i=0; i<len; i++) {{
        bytes[i] = binStr.charCodeAt(i);
    }}
    const code = new TextDecoder().decode(bytes);
    
    // Create a script tag to evaluate the decoded string globally
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
}})();
"""

with open('cafe/game.js', 'w', encoding='utf-8') as f:
    f.write(obfuscated_js)

print("Cafe deployment created successfully.")
