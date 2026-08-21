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
import { generateTicketId, buildQrPayload } from '../services/ticketService.js';

const CATEGORIES = [
  { name: 'Technology', slug: 'technology' },
  { name: 'Music', slug: 'music' },
  { name: 'Business', slug: 'business' },
  { name: 'Education', slug: 'education' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Arts & Culture', slug: 'arts-culture' },
  { name: 'Food & Drink', slug: 'food-drink' },
  { name: 'Community', slug: 'community' },
];

const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan'];
const EVENT_TYPES = ['Birthday Party', 'College Event', 'Workshop', 'Seminar', 'Hackathon', 'Conference', 'Concert', 'Sports', 'Corporate Event', 'Community Event', 'Festival', 'Other'];
const TAG_POOL = ['ai', 'ml', 'startup', 'networking', 'live-music', 'coding', 'design', 'career', 'nightlife', 'youth', 'wellness', 'outdoor'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_event_nepal';
  await mongoose.connect(uri);
  console.log('[seed] connected to', uri);

  console.log('[seed] clearing existing data...');
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), Event.deleteMany({}), Registration.deleteMany({}),
    Payment.deleteMany({}), Interaction.deleteMany({}), Notification.deleteMany({}), Feedback.deleteMany({}),
  ]);

  console.log('[seed] creating categories...');
  const categories = await Category.insertMany(CATEGORIES);

  console.log('[seed] creating demo accounts...');
  const passwordHash = (pw) => bcrypt.hashSync(pw, 10);

  const admin = await User.create({
    name: 'Platform Admin', email: 'admin@smarteventnepal.com', passwordHash: passwordHash('Admin@123'),
    role: 'admin', city: 'Kathmandu', status: 'active',
  });

  const organizerDemo = await User.create({
    name: 'Demo Organizer', email: 'organizer@smarteventnepal.com', passwordHash: passwordHash('Organizer@123'),
    role: 'organizer', city: 'Kathmandu', status: 'active',
    organizerProfile: { orgName: 'SmartEvent Productions', description: 'Demo organizer account', verified: true },
  });

  const attendeeDemo = await User.create({
    name: 'Demo Attendee', email: 'user@smarteventnepal.com', passwordHash: passwordHash('User@123'),
    role: 'attendee', city: 'Kathmandu', status: 'active',
    interests: ['technology', 'music'],
  });

  const organizers = [organizerDemo];
  for (let i = 1; i <= 4; i++) {
    organizers.push(await User.create({
      name: `Organizer ${i}`, email: `organizer${i}@smarteventnepal.com`, passwordHash: passwordHash('Organizer@123'),
      role: 'organizer', city: rand(CITIES), status: 'active',
      organizerProfile: { orgName: `Org ${i} Events`, description: 'Seeded organizer', verified: true },
    }));
  }

  const attendees = [attendeeDemo];
  for (let i = 1; i <= 29; i++) {
    attendees.push(await User.create({
      name: `Attendee ${i}`, email: `attendee${i}@smarteventnepal.com`, passwordHash: passwordHash('User@123'),
      role: 'attendee', city: rand(CITIES), status: 'active',
      interests: [rand(categories).slug, rand(categories).slug],
    }));
  }

  console.log('[seed] creating events...');
  const events = [];
  for (let i = 0; i < 32; i++) {
    const category = rand(categories);
    const organizer = rand(organizers);
    const eventDateOffset = randInt(-10, 60); // some past (for COMPLETED demo), some upcoming
    const date = daysFromNow(eventDateOffset);
    const capacity = randInt(40, 400);
    const isFree = Math.random() < 0.3;

    const ticketTypes = isFree
      ? [{ name: 'Regular', price: 0, capacity, sold: 0 }]
      : [
          { name: 'Early Bird', price: randInt(200, 500), capacity: Math.round(capacity * 0.2), sold: 0 },
          { name: 'Regular', price: randInt(500, 1500), capacity: Math.round(capacity * 0.6), sold: 0 },
          { name: 'VIP', price: randInt(1500, 4000), capacity: Math.round(capacity * 0.2), sold: 0 },
        ];

    const status = eventDateOffset < 0 ? 'COMPLETED' : (Math.random() < 0.85 ? 'PUBLISHED' : 'PENDING_APPROVAL');

    const event = await Event.create({
      title: `${rand(['AI & Machine Learning', 'Startup', 'College Cultural', 'Community', 'Live Music', 'Business Leaders', 'Coding', 'Wellness', 'Sports Fest', 'Design'])} ${rand(EVENT_TYPES)}`,
      description: `A ${category.name.toLowerCase()} event bringing together enthusiasts across Nepal. Join us for talks, networking, and hands-on sessions in ${rand(CITIES)}.`,
      organizer: organizer._id,
      category: category.slug,
      tags: [rand(TAG_POOL), rand(TAG_POOL)],
      eventType: rand(EVENT_TYPES),
      city: rand(CITIES),
      venue: `${rand(['Community Hall', 'Convention Center', 'Innovation Hub', 'City Ground', 'University Auditorium'])}`,
      location: { lat: 27.7 + Math.random() * 0.3, lng: 85.3 + Math.random() * 0.3 },
      date, startTime: `${randInt(9, 18)}:00`, endTime: `${randInt(19, 22)}:00`,
      capacity, ticketTypes,
      registrationStart: daysFromNow(eventDateOffset - 30),
      registrationEnd: daysFromNow(eventDateOffset - 1),
      language: rand(['English', 'Nepali', 'Both']),
      visibility: 'public',
      status,
      viewCount: randInt(10, 500),
    });
    events.push(event);
  }

  console.log('[seed] generating interactions, registrations, payments...');
  for (const user of attendees) {
    const interestedEvents = events.filter(e => e.category === user.interests[0] || Math.random() < 0.15).slice(0, randInt(3, 10));
    for (const event of interestedEvents) {
      await Interaction.create({ user: user._id, event: event._id, type: 'VIEW', weight: 1 });
      if (Math.random() < 0.6) await Interaction.create({ user: user._id, event: event._id, type: 'CLICK', weight: 2 });
      if (Math.random() < 0.2) await Interaction.create({ user: user._id, event: event._id, type: 'FAVORITE', weight: 3 });

      if (Math.random() < 0.35) {
        const ticketType = rand(event.ticketTypes);
        if (ticketType.sold < ticketType.capacity) {
          const quantity = 1;
          const registration = await Registration.create({
            user: user._id, event: event._id, ticketTypeId: ticketType._id, ticketTypeName: ticketType.name,
            quantity, unitPrice: ticketType.price, totalAmount: ticketType.price * quantity,
            status: 'CONFIRMED',
          });
          ticketType.sold += quantity;

          const ticketId = generateTicketId();
          registration.ticketId = ticketId;
          registration.qrPayload = buildQrPayload({ ticketId, eventId: event._id.toString(), registrationId: registration._id.toString() });

          const attended = event.status === 'COMPLETED' ? Math.random() < 0.75 : false;
          if (attended) {
            registration.checkedIn = true;
            registration.checkedInAt = event.date;
            await Interaction.create({ user: user._id, event: event._id, type: 'ATTEND', weight: 7 });
          }
          await registration.save();

          await Interaction.create({ user: user._id, event: event._id, type: 'REGISTER', weight: 5 });

          if (ticketType.price > 0) {
            await Payment.create({
              registration: registration._id, user: user._id, event: event._id,
              provider: 'mock', amount: registration.totalAmount, status: 'PAID', verifiedAt: registration.createdAt,
              providerRef: `MOCK-SEED-${registration._id}`,
            });
          }

          if (attended && Math.random() < 0.6) {
            const eventRating = randInt(3, 5);
            await Feedback.create({
              user: user._id, event: event._id, registration: registration._id,
              eventRating, organizerRating: randInt(3, 5), review: 'Great event, well organised!',
            });
            await Interaction.create({ user: user._id, event: event._id, type: 'RATE', weight: 6 });
            const ev = await Event.findById(event._id);
            const newCount = ev.ratingCount + 1;
            ev.avgRating = ((ev.avgRating * ev.ratingCount) + eventRating) / newCount;
            ev.ratingCount = newCount;
            await ev.save();
          }
        }
      }
    }
    for (const event of events) {
      const idx = event.ticketTypes.findIndex(t => t.sold !== undefined);
    }
  }

  // persist ticketType.sold updates (mutated in memory above via `event.ticketTypes` docs)
  for (const event of events) {
    await event.save();
  }

  console.log('[seed] done!\n');
  console.log('Demo accounts:');
  console.log('  Admin:     admin@smarteventnepal.com / Admin@123');
  console.log('  Organizer: organizer@smarteventnepal.com / Organizer@123');
  console.log('  Attendee:  user@smarteventnepal.com / User@123\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
