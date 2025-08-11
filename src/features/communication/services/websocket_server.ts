import * as WebSocket from 'ws';
import { Message } from '../types/message';

class WebSocketServer {
  private server: WebSocket.Server;

  constructor(port: number) {
    this.server = new WebSocket.Server({ port });
    this.server.on('connection', (ws) => this.handleConnection(ws));
    console.log(`WebSocket server running on port ${port}`);
  }

  private handleConnection(ws: WebSocket) {
    ws.addEventListener('message', (event: WebSocket.MessageEvent) => {
      const data = event.data.toString();
      this.handleMessage(data, ws);
    });
    ws.addEventListener('close', () => {
      console.log('Client disconnected');
    });
  }

  private handleMessage(data: string, ws: WebSocket) {
    try {
      const message: Message = JSON.parse(data);
      
      // Broadcast message to all connected clients
      this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  public close() {
    this.server.close();
  }
}

const port = 8080; // Set the port number
const server = new WebSocketServer(port);
