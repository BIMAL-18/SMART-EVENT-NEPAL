import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  eventRating: { type: Number, min: 1, max: 5, required: true },
  organizerRating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String, default: '' },
}, { timestamps: true });

feedbackSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model('Feedback', feedbackSchema);
