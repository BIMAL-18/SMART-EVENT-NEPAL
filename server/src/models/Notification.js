import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
