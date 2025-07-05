#!/usr/bin/env python3
"""
Simple HTTP server for the Peppa & George Adventure Game
Run this script to serve the game locally and avoid CORS issues.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

# Configuration
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

def main():
    # Change to the script directory
    os.chdir(DIRECTORY)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🎮 Peppa & George Adventure Game Server")
        print(f"📁 Serving files from: {DIRECTORY}")
        print(f"🌐 Server running at: http://localhost:{PORT}")
        print(f"🎯 Open this URL in your browser: http://localhost:{PORT}")
        print(f"⏹️  Press Ctrl+C to stop the server")
        print()
        
        try:
            # Try to open browser automatically
            webbrowser.open(f'http://localhost:{PORT}')
            print("🚀 Browser should open automatically!")
        except:
            print("📝 Please manually open http://localhost:8000 in your browser")
        
        print("\n" + "="*60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            sys.exit(0)

if __name__ == "__main__":
    main()