# WebSocket Client Usage Guide

## Connection

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000/rooms', {
  auth: {
    token: 'YOUR_JWT_TOKEN', // JWT token from login
  },
});
```

## Event Map

### Room Events (No Auth Required for Read Operations)

#### List Rooms

```typescript
// Request
socket.emit('room:list', { isActive: true, page: 1, limit: 10 }, (response) => {
  if (response.ok) {
    console.log('Rooms:', response.data);
  } else {
    console.error('Error:', response.error);
  }
});
```

#### Get Room Details

```typescript
// Request
socket.emit('room:get', { id: roomId }, (response) => {
  if (response.ok) {
    console.log('Room details:', response.data);
  } else {
    console.error('Error:', response.error);
  }
});
```

#### Get Room Participants

```typescript
// Request
socket.emit('room:participants', { id: roomId }, (response) => {
  if (response.ok) {
    console.log('Participants:', response.data);
  } else {
    console.error('Error:', response.error);
  }
});
```

### Room Events (Auth + Permissions Required)

#### Update Room (Requires 'rooms:update' permission)

```typescript
// Request
socket.emit(
  'room:update',
  {
    id: roomId,
    dto: { name: 'Updated Room Name', maxParticipants: 100 },
  },
  (response) => {
    if (response.ok) {
      console.log('Room updated:', response.data);
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

#### Delete Room (Requires 'rooms:delete' permission)

```typescript
// Request
socket.emit('room:delete', { id: roomId }, (response) => {
  if (response.ok) {
    console.log('Room deleted');
  } else {
    console.error('Error:', response.error);
  }
});
```

#### Close Room (Requires 'rooms:close' permission)

```typescript
// Request
socket.emit('room:close', { id: roomId }, (response) => {
  if (response.ok) {
    console.log('Room closed');
  } else {
    console.error('Error:', response.error);
  }
});
```

### Participant Events

#### Join Room (Authenticated Users)

```typescript
// Request
socket.emit(
  'participant:join',
  {
    roomId: roomId,
    token: 'user_123', // Your unique user token
    name: 'John Doe',
  },
  (response) => {
    if (response.ok) {
      console.log('Joined room:', response.data);
      // response.data contains { token: livekitToken, participant: participantData }
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

#### Join Room as Guest (No Auth Required)

```typescript
// Request
socket.emit(
  'participant:joinGuest',
  {
    roomId: roomId,
    token: 'guest_abc123', // Unique guest identifier
    name: 'Guest User',
  },
  (response) => {
    if (response.ok) {
      console.log('Joined as guest:', response.data);
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

#### Leave Room

```typescript
// Request
socket.emit(
  'participant:leave',
  {
    roomId: roomId,
    token: 'user_123', // Your user token
  },
  (response) => {
    if (response.ok) {
      console.log('Left room');
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

#### Mute/Unmute Self

```typescript
// Request
socket.emit(
  'participant:muteSelf',
  {
    roomId: roomId,
    token: 'user_123', // Your user token
    muted: true, // true to mute, false to unmute
  },
  (response) => {
    if (response.ok) {
      console.log('Mute status changed');
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

### Admin Events (Auth + Permissions Required)

#### Kick Participant (Requires 'participants:kick' permission)

```typescript
// Request
socket.emit(
  'admin:kickParticipant',
  {
    roomId: roomId,
    userId: targetUserId,
  },
  (response) => {
    if (response.ok) {
      console.log('Participant kicked');
    } else {
      console.error('Error:', response.error);
    }
  },
);
```

## Listening to Broadcast Events

```typescript
// When a room is updated
socket.on('room:updated', (room) => {
  console.log('Room updated:', room);
});

// When a room is deleted
socket.on('room:deleted', (data) => {
  console.log('Room deleted:', data.id);
});

// When a room is closed
socket.on('room:closed', (data) => {
  console.log('Room closed:', data.id);
});

// When participants change (join/leave/kick)
socket.on('room:participantsUpdated', (data) => {
  console.log('Participants updated:', data);
  // data contains: { roomId, participant?, userToken?, userId?, action: 'joined'|'left'|'kicked' }
});

// When participant mute status changes
socket.on('room:participantMutedChanged', (data) => {
  console.log('Participant muted changed:', data);
  // data contains: { roomId, userToken, muted }
});
```

## Error Handling

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## HTTP Endpoint (Still Available)

The only HTTP endpoint that remains is for creating rooms:

```typescript
// POST /rooms
const response = await fetch('http://localhost:3000/rooms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwtToken}`,
  },
  body: JSON.stringify({
    name: 'New Room',
    description: 'Room description',
    maxParticipants: 50,
    requiresApproval: false,
    settings: {
      allowMicControl: true,
      audioQuality: 'medium',
    },
  }),
});

const room = await response.json();
```

## Full Example

```typescript
import { io, Socket } from 'socket.io-client';

class RoomWebSocketClient {
  private socket: Socket;
  private jwtToken: string;

  constructor(jwtToken: string) {
    this.jwtToken = jwtToken;
    this.connect();
  }

  connect() {
    this.socket = io('http://localhost:3000/rooms', {
      auth: {
        token: this.jwtToken,
      },
    });

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('room:participantsUpdated', (data) => {
      // Update UI with new participants
      this.handleParticipantsUpdate(data);
    });

    this.socket.on('room:participantMutedChanged', (data) => {
      // Update UI with mute status
      this.handleMuteChange(data);
    });
  }

  async joinRoom(roomId: number, userToken: string, name: string) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'participant:join',
        { roomId, token: userToken, name },
        (response) => {
          if (response.ok) {
            resolve(response.data);
          } else {
            reject(new Error(response.error));
          }
        },
      );
    });
  }

  async leaveRoom(roomId: number, userToken: string) {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'participant:leave',
        { roomId, token: userToken },
        (response) => {
          if (response.ok) {
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        },
      );
    });
  }

  // ... other methods

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
```
