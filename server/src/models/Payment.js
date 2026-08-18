import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  provider: { type: String, enum: ['esewa', 'khalti', 'mock'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NPR' },
  status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING', index: true },
  providerRef: { type: String, default: '' }, // transaction id returned by provider
  verifiedAt: { type: Date, default: null },
  rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
