import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    capacity: {
      type: Number,
      required: true,
      min: 0,
    },

    sold: {
      type: Number,
      default: 0,
      min: 0,
    },

    saleStart: {
      type: Date,
    },

    saleEnd: {
      type: Date,
    },
  },
  {
    _id: true,
  }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      index: true,
    },

    tags: [
      {
        type: String,
        index: true,
      },
    ],

    eventType: {
      type: String,
      enum: [
        'Birthday Party',
        'College Event',
        'Workshop',
        'Seminar',
        'Hackathon',
        'Conference',
        'Concert',
        'Sports',
        'Corporate Event',
        'Community Event',
        'Festival',
        'Other',
      ],
      required: true,
      index: true,
    },

    image: {
      type: String,
      default: '',
    },

    city: {
      type: String,
      required: true,
      index: true,
    },

    venue: {
      type: String,
      required: true,
    },

    location: {
      lat: Number,
      lng: Number,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Ticket types
    ticketTypes: {
      type: [ticketTypeSchema],
      default: [],
    },

    registrationStart: {
      type: Date,
      required: true,
    },

    registrationEnd: {
      type: Date,
      required: true,
    },

    language: {
      type: String,
      enum: ['English', 'Nepali', 'Both'],
      default: 'English',
    },

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'PUBLISHED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'DRAFT',
      index: true,
    },

    viewCount: {
      type: Number,
      default: 0,
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


// ---------------------------------------------------------
// INDEXES
// ---------------------------------------------------------

eventSchema.index({
  status: 1,
  date: 1,
});

eventSchema.index({
  city: 1,
  category: 1,
  eventType: 1,
});

eventSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
});


// ---------------------------------------------------------
// VIRTUAL: TOTAL REGISTERED
// ---------------------------------------------------------

eventSchema.virtual('totalRegistered').get(function () {
  const tickets = Array.isArray(this.ticketTypes)
    ? this.ticketTypes
    : [];

  return tickets.reduce(
    (sum, ticket) => sum + (Number(ticket.sold) || 0),
    0
  );
});


// ---------------------------------------------------------
// JSON SETTINGS
// ---------------------------------------------------------

eventSchema.set('toJSON', {
  virtuals: true,
});


// ---------------------------------------------------------
// EXPORT
// ---------------------------------------------------------

export default mongoose.model('Event', eventSchema);