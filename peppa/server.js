#!/usr/bin/env node
/**
 * Simple HTTP server for the Peppa & George Adventure Game
 * Run this script to serve the game locally and avoid CORS issues.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const DIRECTORY = __dirname;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Parse URL and get file path
    let filePath = path.join(DIRECTORY, req.url === '/' ? 'index.html' : req.url);
    
    // Get file extension
    const extname = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // Read and serve file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content);
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log('🎮 Peppa & George Adventure Game Server');
    console.log(`📁 Serving files from: ${DIRECTORY}`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🎯 Open this URL in your browser: http://localhost:${PORT}`);
    console.log(`⏹️  Press Ctrl+C to stop the server`);
    console.log();
    
    // Try to open browser automatically
    const open = (url) => {
        const start = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${start} ${url}`);
    };
    
    try {
        open(`http://localhost:${PORT}`);
        console.log('🚀 Browser should open automatically!');
    } catch (e) {
        console.log('📝 Please manually open http://localhost:8000 in your browser');
    }
    
    console.log('\n' + '='.repeat(60));
});

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped by user');
    process.exit(0);
});