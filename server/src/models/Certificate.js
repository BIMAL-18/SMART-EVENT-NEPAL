import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  certificateNumber: { type: String, required: true, unique: true },
  verificationCode: { type: String, required: true, unique: true, index: true },
  issuedAt: { type: Date, default: Date.now },
  fileUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Certificate', certificateSchema);
