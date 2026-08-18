import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Category from '../models/Category.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Payment from '../models/Payment.js';
import Interaction from '../models/Interaction.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';

import {
  generateTicketId,
  buildQrPayload,
} from '../services/ticketService.js';

/*
|--------------------------------------------------------------------------
| Seed data
|--------------------------------------------------------------------------
*/

const CATEGORIES = [
  {
    name: 'Technology',
    slug: 'technology',
  },
  {
    name: 'Music',
    slug: 'music',
  },
  {
    name: 'Business',
    slug: 'business',
  },
  {
    name: 'Education',
    slug: 'education',
  },
  {
    name: 'Sports',
    slug: 'sports',
  },
  {
    name: 'Arts & Culture',
    slug: 'arts-culture',
  },
  {
    name: 'Food & Drink',
    slug: 'food-drink',
  },
  {
    name: 'Community',
    slug: 'community',
  },
];

const CITIES = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Chitwan',
];

const EVENT_TYPES = [
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
];

const TAG_POOL = [
  'ai',
  'ml',
  'startup',
  'networking',
  'live-music',
  'coding',
  'design',
  'career',
  'nightlife',
  'youth',
  'wellness',
  'outdoor',
];

const LANGUAGES = [
  'English',
  'Nepali',
  'Both',
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function rand(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function randInt(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function daysFromNow(numberOfDays) {
  const date = new Date();

  date.setDate(
    date.getDate() + numberOfDays
  );

  return date;
}

function passwordHash(password) {
  return bcrypt.hashSync(password, 10);
}

/*
|--------------------------------------------------------------------------
| Clear database
|--------------------------------------------------------------------------
*/

async function clearDatabase() {
  console.log('[seed] clearing existing data...');

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
    Payment.deleteMany({}),
    Interaction.deleteMany({}),
    Notification.deleteMany({}),
    Feedback.deleteMany({}),
  ]);

  console.log('[seed] database cleared');
}

/*
|--------------------------------------------------------------------------
| Rebuild Event indexes
|--------------------------------------------------------------------------
|
| This is the important fix.
|
| deleteMany() does NOT remove MongoDB indexes.
|
| The previous text index was effectively using:
|
| language_override: "language"
|
| So when an event had:
|
| language: "Both"
|
| MongoDB tried to interpret "Both" as a text-search
| language and produced:
|
| MongoServerError:
| language override unsupported: Both
|
| We completely remove the old Event indexes and then
| recreate them from Event.js.
|--------------------------------------------------------------------------
*/

async function rebuildEventIndexes() {
  console.log('[seed] rebuilding Event indexes...');

  try {
    await Event.collection.dropIndexes();

    console.log(
      '[seed] old Event indexes removed'
    );
  } catch (error) {
    /*
     * If there are no custom indexes, continue.
     */
    console.log(
      '[seed] no existing Event indexes to remove'
    );
  }

  await Event.createIndexes();

  console.log(
    '[seed] Event indexes recreated successfully'
  );
}

/*
|--------------------------------------------------------------------------
| Create categories
|--------------------------------------------------------------------------
*/

async function createCategories() {
  console.log('[seed] creating categories...');

  const categories =
    await Category.insertMany(
      CATEGORIES
    );

  console.log(
    `[seed] created ${categories.length} categories`
  );

  return categories;
}

/*
|--------------------------------------------------------------------------
| Create users
|--------------------------------------------------------------------------
*/

async function createUsers(categories) {
  console.log(
    '[seed] creating demo accounts...'
  );

  const admin =
    await User.create({
      name: 'Platform Admin',

      email:
        'admin@smarteventnepal.com',

      passwordHash:
        passwordHash('Admin@123'),

      role: 'admin',

      city: 'Kathmandu',

      status: 'active',
    });

  const organizerDemo =
    await User.create({
      name: 'Demo Organizer',

      email:
        'organizer@smarteventnepal.com',

      passwordHash:
        passwordHash('Organizer@123'),

      role: 'organizer',

      city: 'Kathmandu',

      status: 'active',

      organizerProfile: {
        orgName:
          'SmartEvent Productions',

        description:
          'Demo organizer account',

        verified: true,
      },
    });

  const attendeeDemo =
    await User.create({
      name: 'Demo Attendee',

      email:
        'user@smarteventnepal.com',

      passwordHash:
        passwordHash('User@123'),

      role: 'attendee',

      city: 'Kathmandu',

      status: 'active',

      interests: [
        'technology',
        'music',
      ],
    });

  const organizers = [
    organizerDemo,
  ];

  /*
   * Additional organizers
   */
  for (let i = 1; i <= 4; i++) {
    const organizer =
      await User.create({
        name: `Organizer ${i}`,

        email:
          `organizer${i}@smarteventnepal.com`,

        passwordHash:
          passwordHash(
            'Organizer@123'
          ),

        role: 'organizer',

        city: rand(CITIES),

        status: 'active',

        organizerProfile: {
          orgName:
            `Org ${i} Events`,

          description:
            'Seeded organizer',

          verified: true,
        },
      });

    organizers.push(organizer);
  }

  const attendees = [
    attendeeDemo,
  ];

  /*
   * Additional attendees
   */
  for (let i = 1; i <= 29; i++) {
    const interest1 =
      rand(categories).slug;

    const interest2 =
      rand(categories).slug;

    const attendee =
      await User.create({
        name: `Attendee ${i}`,

        email:
          `attendee${i}@smarteventnepal.com`,

        passwordHash:
          passwordHash('User@123'),

        role: 'attendee',

        city: rand(CITIES),

        status: 'active',

        interests: [
          interest1,
          interest2,
        ],
      });

    attendees.push(attendee);
  }

  console.log(
    `[seed] created ${organizers.length} organizers and ${attendees.length} attendees`
  );

  return {
    admin,
    organizerDemo,
    attendeeDemo,
    organizers,
    attendees,
  };
}

/*
|--------------------------------------------------------------------------
| Create events
|--------------------------------------------------------------------------
*/

async function createEvents(
  categories,
  organizers
) {
  console.log('[seed] creating events...');

  const events = [];

  for (let i = 0; i < 32; i++) {
    const category =
      rand(categories);

    const organizer =
      rand(organizers);

    /*
     * Some events are in the past,
     * some are upcoming.
     */
    const eventDateOffset =
      randInt(-10, 60);

    const date =
      daysFromNow(
        eventDateOffset
      );

    const capacity =
      randInt(40, 400);

    const isFree =
      Math.random() < 0.3;

    let ticketTypes;

    /*
     * Free event
     */
    if (isFree) {
      ticketTypes = [
        {
          name: 'Regular',
          price: 0,
          capacity,
          sold: 0,
        },
      ];
    }

    /*
     * Paid event
     */
    else {
      const earlyBirdCapacity =
        Math.max(
          1,
          Math.round(
            capacity * 0.2
          )
        );

      const regularCapacity =
        Math.max(
          1,
          Math.round(
            capacity * 0.6
          )
        );

      const vipCapacity =
        Math.max(
          1,
          capacity -
            earlyBirdCapacity -
            regularCapacity
        );

      ticketTypes = [
        {
          name: 'Early Bird',

          price:
            randInt(200, 500),

          capacity:
            earlyBirdCapacity,

          sold: 0,
        },

        {
          name: 'Regular',

          price:
            randInt(500, 1500),

          capacity:
            regularCapacity,

          sold: 0,
        },

        {
          name: 'VIP',

          price:
            randInt(1500, 4000),

          capacity:
            vipCapacity,

          sold: 0,
        },
      ];
    }

    /*
     * Event status
     */
    let status;

    if (eventDateOffset < 0) {
      status = 'COMPLETED';
    } else if (Math.random() < 0.85) {
      status = 'PUBLISHED';
    } else {
      status =
        'PENDING_APPROVAL';
    }

    /*
     * Time
     */
    const startHour =
      randInt(9, 18);

    const endHour =
      Math.min(
        startHour +
          randInt(2, 4),
        22
      );

    const city =
      rand(CITIES);

    const eventName =
      rand([
        'AI & Machine Learning',
        'Startup',
        'College Cultural',
        'Community',
        'Live Music',
        'Business Leaders',
        'Coding',
        'Wellness',
        'Sports Fest',
        'Design',
      ]);

    const eventType =
      rand(EVENT_TYPES);

    /*
     * Create event
     */
    const event =
      await Event.create({
        title:
          `${eventName} ${eventType}`,

        description:
          `A ${category.name.toLowerCase()} event ` +
          `bringing together enthusiasts across Nepal. ` +
          `Join us for talks, networking, and hands-on ` +
          `sessions in ${city}.`,

        organizer:
          organizer._id,

        category:
          category.slug,

        tags: [
          rand(TAG_POOL),
          rand(TAG_POOL),
        ],

        eventType,

        image: '',

        city,

        venue:
          rand([
            'Community Hall',
            'Convention Center',
            'Innovation Hub',
            'City Ground',
            'University Auditorium',
          ]),

        location: {
          lat:
            27.7 +
            Math.random() * 0.3,

          lng:
            85.3 +
            Math.random() * 0.3,
        },

        date,

        startTime:
          `${String(startHour).padStart(2, '0')}:00`,

        endTime:
          `${String(endHour).padStart(2, '0')}:00`,

        capacity,

        ticketTypes,

        registrationStart:
          daysFromNow(
            eventDateOffset - 30
          ),

        registrationEnd:
          daysFromNow(
            eventDateOffset - 1
          ),

        /*
         * IMPORTANT:
         *
         * These values are completely safe now:
         *
         * English
         * Nepali
         * Both
         */
        language:
          rand(LANGUAGES),

        visibility:
          'public',

        status,

        viewCount:
          randInt(10, 500),

        avgRating: 0,

        ratingCount: 0,
      });

    events.push(event);
  }

  console.log(
    `[seed] created ${events.length} events`
  );

  return events;
}

/*
|--------------------------------------------------------------------------
| Create interactions, registrations, payments and feedback
|--------------------------------------------------------------------------
*/

async function createInteractionsAndRegistrations(
  attendees,
  events
) {
  console.log(
    '[seed] generating interactions, registrations, payments...'
  );

  let interactionCount = 0;
  let registrationCount = 0;
  let paymentCount = 0;
  let feedbackCount = 0;

  for (const user of attendees) {
    const interestedEvents =
      events
        .filter(
          event =>
            event.category ===
              user.interests[0] ||
            Math.random() < 0.15
        )
        .slice(
          0,
          randInt(3, 10)
        );

    for (const event of interestedEvents) {
      /*
       * VIEW
       */
      await Interaction.create({
        user: user._id,
        event: event._id,
        type: 'VIEW',
        weight: 1,
      });

      interactionCount++;

      /*
       * CLICK
       */
      if (Math.random() < 0.6) {
        await Interaction.create({
          user: user._id,
          event: event._id,
          type: 'CLICK',
          weight: 2,
        });

        interactionCount++;
      }

      /*
       * FAVORITE
       */
      if (Math.random() < 0.2) {
        await Interaction.create({
          user: user._id,
          event: event._id,
          type: 'FAVORITE',
          weight: 3,
        });

        interactionCount++;
      }

      /*
       * Registration
       */
      if (Math.random() >= 0.35) {
        continue;
      }

      const ticketType =
        rand(event.ticketTypes);

      /*
       * Ticket sold out
       */
      if (
        ticketType.sold >=
        ticketType.capacity
      ) {
        continue;
      }

      const quantity = 1;

      /*
       * Create registration
       */
      const registration =
        await Registration.create({
          user: user._id,

          event: event._id,

          ticketTypeId:
            ticketType._id,

          ticketTypeName:
            ticketType.name,

          quantity,

          unitPrice:
            ticketType.price,

          totalAmount:
            ticketType.price *
            quantity,

          status:
            'CONFIRMED',
        });

      registrationCount++;

      /*
       * Update ticket sold count
       */
      ticketType.sold +=
        quantity;

      /*
       * Generate ticket
       */
      const ticketId =
        generateTicketId();

      registration.ticketId =
        ticketId;

      registration.qrPayload =
        buildQrPayload({
          ticketId,

          eventId:
            event._id.toString(),

          registrationId:
            registration._id.toString(),
        });

      /*
       * Check-in
       */
      const attended =
        event.status ===
          'COMPLETED' &&
        Math.random() < 0.75;

      if (attended) {
        registration.checkedIn =
          true;

        registration.checkedInAt =
          event.date;

        await Interaction.create({
          user: user._id,
          event: event._id,
          type: 'ATTEND',
          weight: 7,
        });

        interactionCount++;
      }

      await registration.save();

      /*
       * REGISTER interaction
       */
      await Interaction.create({
        user: user._id,
        event: event._id,
        type: 'REGISTER',
        weight: 5,
      });

      interactionCount++;

      /*
       * Payment for paid tickets
       */
      if (ticketType.price > 0) {
        await Payment.create({
          registration:
            registration._id,

          user: user._id,

          event: event._id,

          provider: 'mock',

          amount:
            registration.totalAmount,

          status: 'PAID',

          verifiedAt:
            registration.createdAt,

          providerRef:
            `MOCK-SEED-${registration._id}`,
        });

        paymentCount++;
      }

      /*
       * Feedback
       */
      if (
        attended &&
        Math.random() < 0.6
      ) {
        const eventRating =
          randInt(3, 5);

        await Feedback.create({
          user: user._id,

          event: event._id,

          registration:
            registration._id,

          eventRating,

          organizerRating:
            randInt(3, 5),

          review:
            'Great event, well organised!',
        });

        feedbackCount++;

        await Interaction.create({
          user: user._id,
          event: event._id,
          type: 'RATE',
          weight: 6,
        });

        interactionCount++;

        /*
         * Update event rating
         */
        const eventDocument =
          await Event.findById(
            event._id
          );

        if (eventDocument) {
          const oldCount =
            eventDocument.ratingCount;

          const newCount =
            oldCount + 1;

          eventDocument.avgRating =
            (
              eventDocument.avgRating *
                oldCount +
              eventRating
            ) /
            newCount;

          eventDocument.ratingCount =
            newCount;

          await eventDocument.save();
        }
      }
    }
  }

  /*
   * Save sold ticket counts.
   */
  for (const event of events) {
    await event.save();
  }

  console.log(
    `[seed] interactions created: ${interactionCount}`
  );

  console.log(
    `[seed] registrations created: ${registrationCount}`
  );

  console.log(
    `[seed] payments created: ${paymentCount}`
  );

  console.log(
    `[seed] feedback created: ${feedbackCount}`
  );
}

/*
|--------------------------------------------------------------------------
| Main
|--------------------------------------------------------------------------
*/

async function run() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/smart_event_nepal';

  try {
    console.log(
      '[seed] connecting to MongoDB...'
    );

    await mongoose.connect(uri);

    console.log(
      '[seed] connected to MongoDB'
    );

    /*
     * Clear old documents.
     */
    await clearDatabase();

    /*
     * VERY IMPORTANT:
     *
     * Delete old Event indexes and create the
     * indexes from the updated Event.js.
     */
    await rebuildEventIndexes();

    /*
     * Categories
     */
    const categories =
      await createCategories();

    /*
     * Users
     */
    const {
      organizers,
      attendees,
    } = await createUsers(
      categories
    );

    /*
     * Events
     */
    const events =
      await createEvents(
        categories,
        organizers
      );

    /*
     * Registrations, payments,
     * interactions and feedback.
     */
    await createInteractionsAndRegistrations(
      attendees,
      events
    );

    /*
     * Success
     */
    console.log('');
    console.log(
      '======================================'
    );
    console.log(
      '[seed] SEED COMPLETED SUCCESSFULLY'
    );
    console.log(
      '======================================'
    );

    console.log('');
    console.log(
      'Demo accounts:'
    );

    console.log(
      '  Admin:     admin@smarteventnepal.com / Admin@123'
    );

    console.log(
      '  Organizer: organizer@smarteventnepal.com / Organizer@123'
    );

    console.log(
      '  Attendee:  user@smarteventnepal.com / User@123'
    );

    console.log('');

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error(
      '======================================'
    );
    console.error(
      '[seed] SEED FAILED'
    );
    console.error(
      '======================================'
    );

    console.error(error);

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error(
        '[seed] MongoDB disconnect failed:',
        disconnectError
      );
    }

    process.exit(1);
  }
}

run();
