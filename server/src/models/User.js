import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['attendee', 'organizer', 'admin'], default: 'attendee', index: true },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  interests: [{ type: String, index: true }],
  favoriteEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  organizerProfile: {
    orgName: String,
    description: String,
    verified: { type: Boolean, default: false },
  },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  refreshTokenHash: { type: String, default: null },
  resetPasswordTokenHash: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ role: 1, status: 1 });

export default mongoose.model('User', userSchema);
