# LiveKit Voice Chat Integration

## Overview

This document describes the LiveKit voice chat integration with role-based access control and admin privileges in the NestJS backend.

## Features Implemented

### Core Features

- ✅ Voice-only rooms (no video/screen share)
- ✅ Role-based access control (Admin, Moderator, Participant)
- ✅ Room creation and management
- ✅ Participant management (mute, unmute, kick, block)
- ✅ Room settings (mic control, default mute, audio quality)
- ✅ Integration with existing user authentication system
- ✅ Permission-based guards for endpoints
- ✅ Swagger/OpenAPI documentation

### Database Entities Created

1. **Room** - Main room entity with LiveKit integration
2. **RoomSettings** - Configurable room settings
3. **RoomParticipant** - Tracks participants and their roles
4. **BlockedParticipant** - Manages blocked users per room

## Database Migration Required

Run the following SQL to create the necessary tables:

```sql
-- Create rooms table
CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `livekit_room_name` varchar(255) NOT NULL UNIQUE,
  `description` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `max_participants` int NOT NULL DEFAULT 50,
  `requires_approval` tinyint NOT NULL DEFAULT 0,
  `created_by_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `closed_at` datetime NULL,
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_rooms_created_by` (`created_by_id`),
  CONSTRAINT `FK_rooms_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create room_settings table
CREATE TABLE `room_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL UNIQUE,
  `allow_mic_control` tinyint NOT NULL DEFAULT 1,
  `default_muted_on_join` tinyint NOT NULL DEFAULT 0,
  `only_admin_can_unmute` tinyint NOT NULL DEFAULT 0,
  `audio_quality` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_room_settings_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create room_participants table
CREATE TABLE `room_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `participant_role` enum('admin','moderator','participant') NOT NULL DEFAULT 'participant',
  `is_muted` tinyint NOT NULL DEFAULT 0,
  `muted_by` int NULL,
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `left_at` datetime NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_room_user` (`room_id`, `user_id`),
  KEY `FK_participants_room` (`room_id`),
  KEY `FK_participants_user` (`user_id`),
  CONSTRAINT `FK_participants_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create blocked_participants table
CREATE TABLE `blocked_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `blocked_by_id` int NOT NULL,
  `reason` text NULL,
  `blocked_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_blocked_room_user` (`room_id`, `user_id`),
  KEY `FK_blocked_room` (`room_id`),
  KEY `FK_blocked_user` (`user_id`),
  KEY `FK_blocked_by` (`blocked_by_id`),
  CONSTRAINT `FK_blocked_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_blocked_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_blocked_by` FOREIGN KEY (`blocked_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## API Endpoints

### Room Management (`/rooms`)

#### Create Room

```
POST /rooms
Authorization: Bearer {token}
Permission: rooms:create

Body:
{
  "name": "Team Meeting",
  "description": "Weekly team sync",
  "maxParticipants": 50,
  "requiresApproval": false,
  "settings": {
    "allowMicControl": true,
    "defaultMutedOnJoin": false,
    "onlyAdminCanUnmute": false,
    "audioQuality": "medium"
  }
}
```

#### List Rooms

```
GET /rooms?isActive=true&page=1&limit=10
Authorization: Bearer {token}
```

#### Get Room Details

```
GET /rooms/:id
Authorization: Bearer {token}
```

#### Update Room

```
PATCH /rooms/:id
Authorization: Bearer {token}
Permission: rooms:update
Guard: RoomAdminGuard
```

#### Delete Room

```
DELETE /rooms/:id
Authorization: Bearer {token}
Permission: rooms:delete
Guard: RoomAdminGuard
```

#### Close Room

```
POST /rooms/:id/close
Authorization: Bearer {token}
Permission: rooms:close
Guard: RoomAdminGuard
```

#### Get Room Participants

```
GET /rooms/:id/participants
Authorization: Bearer {token}
```

### Participant Operations (`/rooms/:roomId/participants`)

#### Join Room

```
POST /rooms/:roomId/participants/join
Authorization: Bearer {token}

Response:
{
  "token": "livekit_token_here",
  "participant": { ... }
}
```

#### Leave Room

```
POST /rooms/:roomId/participants/leave
Authorization: Bearer {token}
```

#### Mute/Unmute Self

```
POST /rooms/:roomId/participants/mute-self
Authorization: Bearer {token}

Body:
{
  "muted": true
}
```

### Admin Operations (`/rooms/:roomId/admin`)

All admin endpoints require:

- JWT Authentication
- RoomAdminGuard (user must be admin/moderator of the room)
- Specific permission

#### Mute Participant

```
POST /rooms/:roomId/admin/participants/:userId/mute
Permission: participants:mute
```

#### Unmute Participant

```
POST /rooms/:roomId/admin/participants/:userId/unmute
Permission: participants:unmute
```

#### Kick Participant

```
POST /rooms/:roomId/admin/participants/:userId/kick
Permission: participants:kick
```

#### Block Participant

```
POST /rooms/:roomId/admin/participants/:userId/block
Permission: participants:block

Body:
{
  "reason": "Disruptive behavior"
}
```

#### Unblock Participant

```
DELETE /rooms/:roomId/admin/participants/:userId/block
Permission: participants:block
```

#### Promote to Moderator

```
POST /rooms/:roomId/admin/participants/:userId/promote
Permission: participants:promote
```

#### Demote to Participant

```
POST /rooms/:roomId/admin/participants/:userId/demote
Permission: participants:promote
```

#### Mute All Participants

```
POST /rooms/:roomId/admin/mute-all
Permission: participants:mute
```

#### Unmute All Participants

```
POST /rooms/:roomId/admin/unmute-all
Permission: participants:unmute
```

## Permissions

The following permissions have been added to `permissions.json`:

```json
{
  "rooms": ["create", "read", "update", "delete", "close"],
  "participants": ["read", "mute", "unmute", "kick", "block", "promote"]
}
```

### Assigning Permissions to Roles

To allow a role to manage rooms, update the role's permissions:

```
PATCH /roles/:roleId

Body:
{
  "permissions": {
    "rooms": ["create", "read", "update", "delete", "close"],
    "participants": ["read", "mute", "unmute", "kick", "block", "promote"]
  }
}
```

## Room Roles

### Admin

- First participant to join becomes admin automatically
- Cannot be kicked or demoted
- Full control over room and participants

### Moderator

- Can be promoted by admin
- Can mute/unmute/kick participants
- Cannot kick admin

### Participant

- Standard room member
- Can control own mic (based on room settings)
- Can be managed by admin/moderator

## Usage Flow

### 1. Create a Room

User with `rooms:create` permission creates a room.

### 2. Join Room

- User calls `/rooms/:roomId/participants/join`
- Receives LiveKit token
- Uses token to connect to LiveKit client

### 3. Room Management

- First joiner becomes admin
- Admin can promote moderators
- Admin/moderators manage participants

### 4. Close Room

- Admin closes room when finished
- All participants are disconnected
- Room marked as inactive

## Environment Variables

Ensure the following are set in `.env`:

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-livekit-server.com
```

## Testing Checklist

- [ ] User can create room with proper permissions
- [ ] First participant becomes admin
- [ ] Participants can join room and receive token
- [ ] Admin can mute/unmute participants
- [ ] Admin can kick participants
- [ ] Blocked users cannot rejoin
- [ ] Room settings are enforced
- [ ] Participants can control own mic (when allowed)
- [ ] Room closes properly with all cleanup
- [ ] Only voice is allowed (no video/screen share)

## Security Considerations

1. **Permission-based access** - All endpoints check user permissions
2. **Room admin guards** - Admin actions require room ownership/moderator role
3. **Token-based LiveKit access** - Tokens generated per-participant with proper grants
4. **Voice-only enforcement** - LiveKit tokens restrict to microphone only
5. **Blocked user tracking** - Blocked users cannot rejoin rooms

## API Documentation

Access Swagger documentation at: `http://localhost:3030/api/api-docs`

All LiveKit endpoints are documented with:

- Request/response schemas
- Authentication requirements
- Permission requirements
- Example payloads
