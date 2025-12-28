const MAX_USERS_PER_ROOM = 6;

type ExtendedWebSocket = WebSocket & {
  userId?: string;
  roomId?: string;
  userName?: string;
};

export { MAX_USERS_PER_ROOM, ExtendedWebSocket };
