import http.server
import socketserver
import urllib.parse
import threading
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        print("\n=== JAVASCRIPT ERROR CAUGHT ===")
        print(urllib.parse.unquote(post_data))
        print("===============================\n")
        self.send_response(200)
        self.end_headers()
        sys.exit(0)

def run():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("Server running at port", PORT)
        httpd.serve_forever()

if __name__ == "__main__":
    with open('test_runner.html', 'w', encoding='utf-8') as f:
        f.write('''
<!DOCTYPE html>
<html>
<head>
    <script>
        window.onerror = function(msg, url, line, col, error) {
            fetch('http://localhost:8080/error', {
                method: 'POST',
                body: "MSG: " + msg + "\\nLINE: " + line + "\\nCOL: " + col + "\\nERR: " + (error ? error.stack : "")
            });
            return true;
        };
    </script>
    <script src="game.js"></script>
</head>
<body><h1>Testing</h1></body>
</html>
        ''')
    run()
