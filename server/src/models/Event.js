import mongoose from 'mongoose';

/*
|--------------------------------------------------------------------------
| Ticket Type Schema
|--------------------------------------------------------------------------
*/

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
      default: 0,
    },

    capacity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
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


/*
|--------------------------------------------------------------------------
| Event Schema
|--------------------------------------------------------------------------
*/

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
      trim: true,
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
      trim: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
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
      trim: true,
      index: true,
    },

    venue: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      lat: {
        type: Number,
      },

      lng: {
        type: Number,
      },
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

    /*
    |--------------------------------------------------------------------------
    | Ticket Types
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Language
    |--------------------------------------------------------------------------
    */

    language: {
      type: String,
      enum: ['English', 'Nepali', 'Both'],
      default: 'English',
    },

    /*
    |--------------------------------------------------------------------------
    | Visibility
    |--------------------------------------------------------------------------
    */

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Statistics
    |--------------------------------------------------------------------------
    */

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
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

eventSchema.index({
  status: 1,
  date: 1,
});

eventSchema.index({
  city: 1,
  category: 1,
  eventType: 1,
});


/*
|--------------------------------------------------------------------------
| Text Search Index
|--------------------------------------------------------------------------
*/

eventSchema.index(
  {
    title: 'text',
    description: 'text',
    tags: 'text',
  },
  {
    default_language: 'english',
    language_override: 'textLanguage',
  }
);


/*
|--------------------------------------------------------------------------
| Virtual: totalRegistered
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Old MongoDB records may not contain ticketTypes.
|
| Therefore we safely handle:
|
| undefined
| null
| empty array
|
|--------------------------------------------------------------------------
*/

eventSchema.virtual('totalRegistered').get(function () {
  const tickets = Array.isArray(this.ticketTypes)
    ? this.ticketTypes
    : [];

  return tickets.reduce((sum, ticket) => {
    return sum + Number(ticket?.sold || 0);
  }, 0);
});


/*
|--------------------------------------------------------------------------
| Return virtuals in JSON
|--------------------------------------------------------------------------
*/

eventSchema.set('toJSON', {
  virtuals: true,
});

eventSchema.set('toObject', {
  virtuals: true,
});


/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

const Event = mongoose.model('Event', eventSchema);

export default Event;