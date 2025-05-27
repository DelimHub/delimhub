import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { Server as SocketIOServer } from 'socket.io';

// Interface for WebSocket with user data
interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  channelId?: number;
}

// Interface for message structure
interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'typing';
  channelId: number;
  content?: string;
  userId?: number;
  username?: string;
}

// Interface for WebRTC signaling
interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: string;
  candidate?: RTCIceCandidate;
  userId: number;
  targetUserId: number;
  roomId: number;
}

// Map of active connections
const clients = new Map<number, AuthenticatedWebSocket[]>();

// Setup WebSocket and Socket.IO servers
export function setupWebSocketServer(server: Server) {
  // Regular WebSocket server for chat
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Socket.IO server for video/voice calls
  const io = new SocketIOServer(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });
  
  // Track active calls and participants
  const activeRooms = new Map<number, Set<number>>();
  
  // Socket.IO for WebRTC signaling
  io.use((socket, next) => {
    // Simplified authentication for development
    const { userId, username } = socket.handshake.auth;
    
    if (userId && username) {
      // Directly use provided user info
      socket.data.userId = userId;
      socket.data.username = username;
      console.log(`Socket.IO: User ${username} (ID: ${userId}) connected`);
      return next();
    }
    
    // Fallback for development
    console.log("Socket.IO: No user info provided, using default");
    socket.data.userId = 1; // Default to admin user
    socket.data.username = "admin";
    next();
  });
  
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.userId} connected to video call service`);
    
    // Join a call room
    socket.on('join-room', async (roomId: number) => {
      // Store room membership
      socket.join(`room-${roomId}`);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      
      activeRooms.get(roomId)?.add(socket.data.userId);
      
      // Get user details
      const user = await storage.getUser(socket.data.userId);
      
      // Notify others in the room
      io.to(`room-${roomId}`).emit('user-joined', {
        userId: socket.data.userId,
        username: socket.data.username,
        profileImageUrl: user?.profileImageUrl
      });
      
      // Send list of participants to the new user
      const participants = Array.from(activeRooms.get(roomId) || []);
      socket.emit('room-users', participants);
    });
    
    // Handle WebRTC signaling
    socket.on('signal', (data: SignalData) => {
      // Forward the signal to the specific user
      io.to(`user-${data.targetUserId}`).emit('signal', {
        type: data.type,
        sdp: data.sdp,
        candidate: data.candidate,
        userId: socket.data.userId
      });
    });
    
    // Leave a call room
    socket.on('leave-room', (roomId: number) => {
      socket.leave(`room-${roomId}`);
      
      const roomParticipants = activeRooms.get(roomId);
      if (roomParticipants) {
        roomParticipants.delete(socket.data.userId);
        
        if (roomParticipants.size === 0) {
          activeRooms.delete(roomId);
        }
      }
      
      // Notify others in the room
      io.to(`room-${roomId}`).emit('user-left', {
        userId: socket.data.userId
      });
    });
    
    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.userId} disconnected from video call service`);
      
      // Remove user from all active rooms
      activeRooms.forEach((participants, roomId) => {
        if (participants.has(socket.data.userId)) {
          participants.delete(socket.data.userId);
          
          // Notify others in the room
          io.to(`room-${roomId}`).emit('user-left', {
            userId: socket.data.userId
          });
          
          // Clean up empty rooms
          if (participants.size === 0) {
            activeRooms.delete(roomId);
          }
        }
      });
    });
  });
  
  // Regular WebSocket server for chat messages
  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    try {
      // Get params from URL
      const url = new URL(req.url || '', 'http://localhost');
      const userId = parseInt(url.searchParams.get('userId') || '1');
      const username = url.searchParams.get('username') || 'admin';
      const channelId = parseInt(url.searchParams.get('channelId') || '0');
      
      console.log(`WebSocket: User ${username} (ID: ${userId}) connected to channel ${channelId}`);

      // Set user data on WebSocket connection
      ws.userId = userId;
      ws.username = username;
      ws.channelId = channelId;

      // Add client to clients map
      if (!clients.has(channelId)) {
        clients.set(channelId, []);
      }
      clients.get(channelId)?.push(ws);

      // Send join message to channel
      const joinMessage: ChatMessage = {
        type: 'join',
        channelId,
        userId: ws.userId,
        username: ws.username,
      };

      broadcastToChannel(channelId, joinMessage);

      // Handle incoming messages
      ws.on('message', async (data: string) => {
        try {
          const parsedData: ChatMessage = JSON.parse(data);
          
          if (parsedData.type === 'message' && parsedData.content) {
            // Save message to database
            const message = await storage.createMessage({
              content: parsedData.content,
              channelId: parsedData.channelId,
              userId: ws.userId!,
            });

            // Broadcast message to channel
            const chatMessage: ChatMessage = {
              type: 'message',
              channelId: parsedData.channelId,
              content: parsedData.content,
              userId: ws.userId,
              username: ws.username,
            };

            broadcastToChannel(parsedData.channelId, chatMessage);
          } else if (parsedData.type === 'typing') {
            // Broadcast typing notification
            const typingMessage: ChatMessage = {
              type: 'typing',
              channelId: parsedData.channelId,
              userId: ws.userId,
              username: ws.username,
            };

            broadcastToChannel(parsedData.channelId, typingMessage, [ws.userId!]);
          }
        } catch (error) {
          console.error('Message parsing error:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        const channelClients = clients.get(channelId);
        if (channelClients) {
          clients.set(
            channelId,
            channelClients.filter((client) => client !== ws)
          );
        }

        // Send leave message to channel
        const leaveMessage: ChatMessage = {
          type: 'leave',
          channelId,
          userId: ws.userId,
          username: ws.username,
        };

        broadcastToChannel(channelId, leaveMessage);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(4002, 'Authentication failed');
    }
  });

  return { wss, io };
}

// Broadcast message to all clients in a channel
function broadcastToChannel(channelId: number, message: ChatMessage, excludeUserIds: number[] = []) {
  const channelClients = clients.get(channelId) || [];
  
  channelClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && !excludeUserIds.includes(client.userId!)) {
      client.send(JSON.stringify(message));
    }
  });
}
