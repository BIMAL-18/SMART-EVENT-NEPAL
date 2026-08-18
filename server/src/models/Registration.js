import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },

    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    ticketTypeName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'CANCELLED',
        'REFUNDED',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },

    ticketId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    qrPayload: {
      type: String,
      default: null,
    },

    paymentId: {
      type: String,
      default: null,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    checkedIn: {
      type: Boolean,
      default: false,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

registrationSchema.index({
  user: 1,
  event: 1,
});

registrationSchema.index({
  event: 1,
  status: 1,
});

registrationSchema.index({
  createdAt: -1,
});


/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/

const Registration =
  mongoose.models.Registration ||
  mongoose.model(
    'Registration',
    registrationSchema
  );

export default Registration;