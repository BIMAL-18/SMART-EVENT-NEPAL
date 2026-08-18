// import mongoose from 'mongoose';
// import Event from '../models/Event.js';
// import Registration from '../models/Registration.js';
// import Interaction from '../models/Interaction.js';
// import { generateTicketId, buildQrPayload, generateQrDataUrl } from '../services/ticketService.js';
// import { notifyUser } from '../services/notificationService.js';
// import { sendEmail } from '../services/emailService.js';

// // Registers a user for an event + ticket type, enforcing capacity atomically
// // via a MongoDB conditional update (prevents overbooking under concurrency).
// export async function registerForEvent(req, res, next) {
//   try {
//     const { eventId, ticketTypeId, quantity = 1 } = req.body;
//     const event = await Event.findById(eventId);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (event.status !== 'PUBLISHED') return res.status(400).json({ message: 'This event is not open for registration' });

//     const now = new Date();
//     if (now < event.registrationStart || now > event.registrationEnd) {
//       return res.status(400).json({ message: 'Registration is not currently open for this event' });
//     }

//     const ticketType = event.ticketTypes.id(ticketTypeId);
//     if (!ticketType) return res.status(404).json({ message: 'Ticket type not found' });
//     if (ticketType.sold + Number(quantity) > ticketType.capacity) {
//       return res.status(409).json({ message: 'Not enough tickets remaining for this ticket type' });
//     }

//     // Atomic capacity check-and-increment to prevent overbooking races
//     const updated = await Event.findOneAndUpdate(
//       { _id: eventId, 'ticketTypes._id': ticketTypeId, $expr: { $lte: [{ $add: [{ $arrayElemAt: ['$ticketTypes.sold', 0] }, Number(quantity)] }, { $arrayElemAt: ['$ticketTypes.capacity', 0] }] } },
//       { $inc: { 'ticketTypes.$.sold': Number(quantity) } },
//       { new: false }
//     );
//     // Fallback safe path: re-check with a fresh read + conditional inc (works regardless of array position)
//     const fresh = await Event.findOneAndUpdate(
//       { _id: eventId, ticketTypes: { $elemMatch: { _id: ticketTypeId, $expr: { $lte: [{ $add: ['$sold', Number(quantity)] }, '$capacity'] } } } },
//       { $inc: { 'ticketTypes.$.sold': updated ? 0 : Number(quantity) } },
//       { new: true }
//     );

//     const isFree = ticketType.price === 0;
//     const registration = await Registration.create({
//       user: req.user._id,
//       event: eventId,
//       ticketTypeId,
//       ticketTypeName: ticketType.name,
//       quantity,
//       unitPrice: ticketType.price,
//       totalAmount: ticketType.price * quantity,
//       status: isFree ? 'CONFIRMED' : 'PENDING_PAYMENT',
//     });

//     await Interaction.create({ user: req.user._id, event: eventId, type: 'REGISTER', weight: 5 });

//     if (isFree) {
//       await issueTicket(registration, event);
//     }

//     res.status(201).json({ registration });
//   } catch (err) { next(err); }
// }

// export async function issueTicket(registration, event) {
//   const ticketId = generateTicketId();
//   const qrPayload = buildQrPayload({ ticketId, eventId: event._id.toString(), registrationId: registration._id.toString() });
//   registration.ticketId = ticketId;
//   registration.qrPayload = qrPayload;
//   registration.status = 'CONFIRMED';
//   await registration.save();

//   await notifyUser(registration.user, {
//     type: 'TICKET_ISSUED',
//     title: 'Your ticket is ready',
//     message: `Your QR ticket for "${event.title}" has been generated.`,
//     event: event._id,
//   });
//   return registration;
// }

// export async function myRegistrations(req, res, next) {
//   try {
//     const registrations = await Registration.find({ user: req.user._id }).populate('event').sort({ createdAt: -1 });
//     res.json({ registrations });
//   } catch (err) { next(err); }
// }

// export async function getTicket(req, res, next) {
//   try {
//     const registration = await Registration.findById(req.params.id).populate('event');
//     if (!registration) return res.status(404).json({ message: 'Registration not found' });
//     if (String(registration.user) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not your ticket' });
//     }
//     if (registration.status !== 'CONFIRMED') return res.status(400).json({ message: 'Ticket not yet issued' });

//     const qrDataUrl = await generateQrDataUrl(registration.qrPayload);
//     res.json({ registration, qrDataUrl });
//   } catch (err) { next(err); }
// }

// export async function cancelRegistration(req, res, next) {
//   try {
//     const registration = await Registration.findById(req.params.id);
//     if (!registration) return res.status(404).json({ message: 'Registration not found' });
//     if (String(registration.user) !== String(req.user._id)) return res.status(403).json({ message: 'Not your registration' });
//     if (registration.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });

//     registration.status = 'CANCELLED';
//     registration.cancelledAt = new Date();
//     await registration.save();

//     await Event.findOneAndUpdate(
//       { _id: registration.event, 'ticketTypes._id': registration.ticketTypeId },
//       { $inc: { 'ticketTypes.$.sold': -registration.quantity } }
//     );

//     res.json({ registration });
//   } catch (err) { next(err); }
// }

// export async function eventRegistrations(req, res, next) {
//   try {
//     const event = await Event.findById(req.params.eventId);
//     if (!event) return res.status(404).json({ message: 'Event not found' });
//     if (String(event.organizer) !== String(req.user._id) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not your event' });
//     }
//     const registrations = await Registration.find({ event: req.params.eventId }).populate('user', 'name email');
//     res.json({ registrations });
//   } catch (err) { next(err); }
// }
import mongoose from 'mongoose';

import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Interaction from '../models/Interaction.js';

import {
  generateTicketId,
  buildQrPayload,
  generateQrDataUrl,
} from '../services/ticketService.js';

import { notifyUser } from '../services/notificationService.js';


/**
 * ============================================================
 * REGISTER FOR EVENT
 * POST /api/registrations
 * ============================================================
 */
export async function registerForEvent(req, res, next) {
  try {
    const {
      eventId,
      ticketTypeId,
      quantity = 1,
    } = req.body;

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------

    if (!req.user?._id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    // ---------------------------------------------------------
    // Required fields
    // ---------------------------------------------------------

    if (!eventId) {
      return res.status(400).json({
        message: 'Event ID is required',
      });
    }

    if (!ticketTypeId) {
      return res.status(400).json({
        message: 'Ticket type ID is required',
      });
    }

    // ---------------------------------------------------------
    // Validate ObjectIds
    // ---------------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: 'Invalid event ID',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      return res.status(400).json({
        message: 'Invalid ticket type ID',
      });
    }

    // ---------------------------------------------------------
    // Validate quantity
    // ---------------------------------------------------------

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        message: 'Quantity must be a positive integer',
      });
    }

    if (parsedQuantity > 10) {
      return res.status(400).json({
        message: 'Maximum 10 tickets can be registered at once',
      });
    }

    // ---------------------------------------------------------
    // Find event
    // ---------------------------------------------------------

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // ---------------------------------------------------------
    // Check event status
    // ---------------------------------------------------------

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({
        message: 'This event is not open for registration',
      });
    }

    // ---------------------------------------------------------
    // Registration period
    // ---------------------------------------------------------

    const now = new Date();

    if (
      event.registrationStart &&
      now < new Date(event.registrationStart)
    ) {
      return res.status(400).json({
        message: 'Registration has not started yet',
      });
    }

    if (
      event.registrationEnd &&
      now > new Date(event.registrationEnd)
    ) {
      return res.status(400).json({
        message: 'Registration period has ended',
      });
    }

    // ---------------------------------------------------------
    // Find ticket type
    // ---------------------------------------------------------

    if (!Array.isArray(event.ticketTypes)) {
      return res.status(400).json({
        message: 'This event has no ticket types configured',
      });
    }

    const ticketType = event.ticketTypes.id(ticketTypeId);

    if (!ticketType) {
      return res.status(404).json({
        message: 'Ticket type not found',
      });
    }

    // ---------------------------------------------------------
    // Check capacity
    // ---------------------------------------------------------

    const sold = Number(ticketType.sold || 0);
    const capacity = Number(ticketType.capacity || 0);
    const remaining = Math.max(0, capacity - sold);

    if (remaining <= 0) {
      return res.status(409).json({
        message: 'This ticket type is sold out',
      });
    }

    if (parsedQuantity > remaining) {
      return res.status(409).json({
        message: `Only ${remaining} ticket(s) remaining`,
      });
    }

    // ---------------------------------------------------------
    // Prevent duplicate active registration
    // ---------------------------------------------------------

    const existingRegistration =
      await Registration.findOne({
        user: req.user._id,
        event: eventId,
        status: {
          $ne: 'CANCELLED',
        },
      });

    if (existingRegistration) {
      return res.status(409).json({
        message: 'You are already registered for this event',
        registration: existingRegistration,
      });
    }

    // ---------------------------------------------------------
    // Reserve ticket
    // ---------------------------------------------------------
    //
    // We use a transaction-like application-level flow:
    //
    // 1. Check current availability
    // 2. Increment sold
    // 3. Create registration
    // 4. Rollback if registration creation fails
    //
    // ---------------------------------------------------------

    const latestEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: 'PUBLISHED',
        ticketTypes: {
          $elemMatch: {
            _id: new mongoose.Types.ObjectId(ticketTypeId),
          },
        },
      },
      {
        $inc: {
          'ticketTypes.$.sold': parsedQuantity,
        },
      },
      {
        new: true,
      }
    );

    if (!latestEvent) {
      return res.status(409).json({
        message: 'Unable to reserve ticket',
      });
    }

    // ---------------------------------------------------------
    // Get updated ticket
    // ---------------------------------------------------------

    const updatedTicket =
      latestEvent.ticketTypes.id(ticketTypeId);

    if (!updatedTicket) {
      return res.status(409).json({
        message: 'Ticket type is no longer available',
      });
    }

    // ---------------------------------------------------------
    // Safety capacity check
    // ---------------------------------------------------------

    if (
      Number(updatedTicket.sold || 0) >
      Number(updatedTicket.capacity || 0)
    ) {
      await Event.updateOne(
        {
          _id: eventId,
          'ticketTypes._id': ticketTypeId,
        },
        {
          $inc: {
            'ticketTypes.$.sold': -parsedQuantity,
          },
        }
      );

      return res.status(409).json({
        message: 'Not enough tickets remaining',
      });
    }

    // ---------------------------------------------------------
    // Price
    // ---------------------------------------------------------

    const unitPrice = Number(ticketType.price || 0);

    const totalAmount =
      unitPrice * parsedQuantity;

    const isFree = totalAmount === 0;

    // ---------------------------------------------------------
    // Registration status
    // ---------------------------------------------------------

    const registrationStatus = isFree
      ? 'CONFIRMED'
      : 'PENDING_PAYMENT';

    // ---------------------------------------------------------
    // Create registration
    // ---------------------------------------------------------

    let registration;

    try {
      registration = await Registration.create({
        user: req.user._id,
        event: eventId,
        ticketTypeId,
        ticketTypeName: ticketType.name,
        quantity: parsedQuantity,
        unitPrice,
        totalAmount,
        status: registrationStatus,
      });
    } catch (registrationError) {

      // Rollback inventory
      await Event.updateOne(
        {
          _id: eventId,
          'ticketTypes._id': ticketTypeId,
        },
        {
          $inc: {
            'ticketTypes.$.sold': -parsedQuantity,
          },
        }
      );

      console.error(
        'REGISTRATION CREATE ERROR:',
        registrationError
      );

      throw registrationError;
    }

    // ---------------------------------------------------------
    // Track interaction
    // ---------------------------------------------------------

    try {
      await Interaction.create({
        user: req.user._id,
        event: eventId,
        type: 'REGISTER',
        weight: 5,
        metadata: {
          registrationId: registration._id,
          ticketTypeId,
          quantity: parsedQuantity,
          totalAmount,
        },
      });
    } catch (interactionError) {
      console.error(
        '[registration] Interaction tracking failed:',
        interactionError.message
      );
    }

    // ---------------------------------------------------------
    // Free event -> issue ticket immediately
    // ---------------------------------------------------------

    if (isFree) {
      try {
        await issueTicket(
          registration,
          event
        );
      } catch (ticketError) {
        console.error(
          '[registration] Ticket generation failed:',
          ticketError
        );

        return res.status(201).json({
          message:
            'Registration successful, but ticket generation is pending.',
          registration,
        });
      }
    }

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: isFree
        ? 'Registration successful'
        : 'Registration created. Payment required.',
      registration,
    });

  } catch (error) {
    console.error(
      '================================================='
    );

    console.error(
      'REGISTER FOR EVENT ERROR'
    );

    console.error(
      error
    );

    console.error(
      '================================================='
    );

    next(error);
  }
}


/**
 * ============================================================
 * ISSUE TICKET
 * ============================================================
 */
export async function issueTicket(
  registration,
  event
) {
  const ticketId = generateTicketId();

  const qrPayload = buildQrPayload({
    ticketId,
    eventId: event._id.toString(),
    registrationId: registration._id.toString(),
  });

  registration.ticketId = ticketId;
  registration.qrPayload = qrPayload;
  registration.status = 'CONFIRMED';

  await registration.save();

  // Notification is optional.
  // A notification failure must NOT break ticket generation.

  try {
    await notifyUser(
      registration.user,
      {
        type: 'TICKET_ISSUED',
        title: 'Your ticket is ready',
        message:
          `Your QR ticket for "${event.title}" has been generated.`,
        event: event._id,
      }
    );
  } catch (error) {
    console.error(
      '[ticket] Notification failed:',
      error.message
    );
  }

  return registration;
}


/**
 * ============================================================
 * MY REGISTRATIONS
 * ============================================================
 * GET /api/registrations/my
 * ============================================================
 */
export async function myRegistrations(
  req,
  res,
  next
) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const registrations =
      await Registration.find({
        user: req.user._id,
      })
        .populate(
          'event',
          'title description date startTime endTime venue city image status'
        )
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,
      registrations,
    });

  } catch (error) {
    next(error);
  }
}


/**
 * ============================================================
 * GET TICKET
 * ============================================================
 * GET /api/registrations/:id/ticket
 * ============================================================
 */
export async function getTicket(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid registration ID',
      });
    }

    const registration =
      await Registration.findById(id)
        .populate('event');

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    // ---------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------

    if (
      String(registration.user) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your ticket',
      });
    }

    // ---------------------------------------------------------
    // Status
    // ---------------------------------------------------------

    if (registration.status !== 'CONFIRMED') {
      return res.status(400).json({
        message: 'Ticket not yet issued',
      });
    }

    if (!registration.qrPayload) {
      return res.status(400).json({
        message: 'QR ticket data is not available',
      });
    }

    // ---------------------------------------------------------
    // Generate QR
    // ---------------------------------------------------------

    const qrDataUrl =
      await generateQrDataUrl(
        registration.qrPayload
      );

    return res.json({
      success: true,
      registration,
      qrDataUrl,
    });

  } catch (error) {
    next(error);
  }
}


/**
 * ============================================================
 * CANCEL REGISTRATION
 * ============================================================
 * POST /api/registrations/:id/cancel
 * ============================================================
 */
export async function cancelRegistration(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid registration ID',
      });
    }

    const registration =
      await Registration.findById(id);

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    // ---------------------------------------------------------
    // Authorization
    // ---------------------------------------------------------

    if (
      String(registration.user) !==
      String(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not your registration',
      });
    }

    // ---------------------------------------------------------
    // Already cancelled
    // ---------------------------------------------------------

    if (registration.status === 'CANCELLED') {
      return res.status(400).json({
        message: 'Already cancelled',
      });
    }

    // ---------------------------------------------------------
    // Find event
    // ---------------------------------------------------------

    const event =
      await Event.findById(
        registration.event
      );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // ---------------------------------------------------------
    // Return ticket inventory
    // ---------------------------------------------------------

    const ticket =
      event.ticketTypes?.id(
        registration.ticketTypeId
      );

    if (ticket) {
      ticket.sold = Math.max(
        0,
        Number(ticket.sold || 0) -
        Number(registration.quantity || 0)
      );

      await event.save();
    }

    // ---------------------------------------------------------
    // Cancel registration
    // ---------------------------------------------------------

    registration.status = 'CANCELLED';
    registration.cancelledAt = new Date();

    await registration.save();

    return res.json({
      success: true,
      message: 'Registration cancelled successfully',
      registration,
    });

  } catch (error) {
    next(error);
  }
}


/**
 * ============================================================
 * EVENT REGISTRATIONS
 * ============================================================
 * GET /api/registrations/event/:eventId
 * ============================================================
 */
export async function eventRegistrations(
  req,
  res,
  next
) {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        message: 'Invalid event ID',
      });
    }

    const event =
      await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // ---------------------------------------------------------
    // Organizer authorization
    // ---------------------------------------------------------

    if (
      String(event.organizer) !==
        String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    // ---------------------------------------------------------
    // Get registrations
    // ---------------------------------------------------------

    const registrations =
      await Registration.find({
        event: eventId,
      })
        .populate(
          'user',
          'name email'
        )
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,
      registrations,
    });

  } catch (error) {
    next(error);
  }
}