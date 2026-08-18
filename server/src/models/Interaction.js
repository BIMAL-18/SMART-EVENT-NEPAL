import mongoose from 'mongoose';

export const INTERACTION_WEIGHTS = {
  VIEW: 1,
  CLICK: 2,
  FAVORITE: 3,
  REGISTER: 5,
  RATE: 6,
  ATTEND: 7,
  SEARCH: 1,
};

const interactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', index: true },
  type: { type: String, enum: Object.keys(INTERACTION_WEIGHTS), required: true, index: true },
  weight: { type: Number, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

interactionSchema.index({ user: 1, event: 1, type: 1 });

export default mongoose.model('Interaction', interactionSchema);
