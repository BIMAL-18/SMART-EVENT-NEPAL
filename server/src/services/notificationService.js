import Notification from '../models/Notification.js';

let io = null;
export function attachSocket(socketIoInstance) { io = socketIoInstance; }

export async function notifyUser(userId, { type, title, message, event = null }) {
  const notif = await Notification.create({ user: userId, type, title, message, event });
  if (io) io.to(`user:${userId}`).emit('notification.created', notif);
  return notif;
}

export function emitToEventRoom(eventId, eventName, payload) {
  if (io) io.to(`event:${eventId}`).emit(eventName, payload);
}
