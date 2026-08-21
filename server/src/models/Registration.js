import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ticketTypeName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  // ATTENDED is set automatically the moment the ticket is scanned/checked in
  // at the event (see attendanceController.checkIn) - it's the authoritative
  // record that this registration became a real attendance, separate from
  // the checkedIn boolean/timestamp which stores the raw scan event.
  status: { type: String, enum: ['PENDING_PAYMENT', 'CONFIRMED', 'ATTENDED', 'CANCELLED'], default: 'PENDING_PAYMENT', index: true },
  ticketId: { type: String, unique: true, sparse: true }, // human readable unique ticket code
  qrPayload: { type: String, default: '' },
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

registrationSchema.index({ event: 1, user: 1 });
registrationSchema.index({ event: 1, status: 1 });

export default mongoose.model('Registration', registrationSchema);
