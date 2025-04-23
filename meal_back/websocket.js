const WebSocket = require('ws');
const clients = new Set();

function setupWebSocket() {
    const wss = new WebSocket.Server({ port: 3001 });

    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log('New client connected');

        ws.on('close', () => {
            clients.delete(ws);
            console.log('Client disconnected');
        });
    });
}

function broadcast(message) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = { setupWebSocket, broadcast };
