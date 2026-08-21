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
import { sendEmail } from '../services/emailService.js';

// Registers a user for an event + ticket type.
// Uses an atomic MongoDB update to prevent overbooking under concurrency.
export async function registerForEvent(req, res, next) {
  try {
    const { eventId, ticketTypeId, quantity = 1 } = req.body;

    // Validate IDs before querying MongoDB
    if (
      !mongoose.Types.ObjectId.isValid(eventId) ||
      !mongoose.Types.ObjectId.isValid(ticketTypeId)
    ) {
      return res.status(400).json({
        message: 'Invalid event ID or ticket type ID',
      });
    }

    const requestedQuantity = Number(quantity);

    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({
        message: 'Quantity must be a positive integer',
      });
    }

    // Get the event for validation and ticket information
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({
        message: 'This event is not open for registration',
      });
    }

    const now = new Date();

    if (
      now < event.registrationStart ||
      now > event.registrationEnd
    ) {
      return res.status(400).json({
        message: 'Registration is not currently open for this event',
      });
    }

    // Find the requested ticket type
    const ticketType = event.ticketTypes.id(ticketTypeId);

    if (!ticketType) {
      return res.status(404).json({
        message: 'Ticket type not found',
      });
    }

    // ---------------------------------------------------------
    // ATOMIC CAPACITY CHECK
    // ---------------------------------------------------------
    //
    // The update only happens when:
    //
    // ticket.sold + requestedQuantity <= ticket.capacity
    //
    // This prevents two simultaneous requests from overbooking.
    //
    // $expr must be at the TOP LEVEL of the MongoDB filter.
    //
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,

        // Make sure the requested ticket type exists
        'ticketTypes._id': new mongoose.Types.ObjectId(ticketTypeId),

        // Check capacity of the specific ticket type
        $expr: {
          $let: {
            vars: {
              ticket: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$ticketTypes',
                      as: 'ticket',
                      cond: {
                        $eq: [
                          '$$ticket._id',
                          new mongoose.Types.ObjectId(ticketTypeId),
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },

            in: {
              $lte: [
                {
                  $add: [
                    '$$ticket.sold',
                    requestedQuantity,
                  ],
                },
                '$$ticket.capacity',
              ],
            },
          },
        },
      },

      {
        $inc: {
          'ticketTypes.$.sold': requestedQuantity,
        },
      },

      {
        new: true,
      }
    );

    // If no document was updated, the ticket capacity was exceeded
    if (!updatedEvent) {
      return res.status(409).json({
        message: 'Not enough tickets remaining for this ticket type',
      });
    }

    // ---------------------------------------------------------
    // CREATE REGISTRATION
    // ---------------------------------------------------------

    const isFree = Number(ticketType.price) === 0;

    const registration = await Registration.create({
      user: req.user._id,
      event: eventId,
      ticketTypeId,
      ticketTypeName: ticketType.name,
      quantity: requestedQuantity,
      unitPrice: ticketType.price,
      totalAmount: ticketType.price * requestedQuantity,
      status: isFree ? 'CONFIRMED' : 'PENDING_PAYMENT',
    });

    // Record user interaction
    await Interaction.create({
      user: req.user._id,
      event: eventId,
      type: 'REGISTER',
      weight: 5,
    });

    // Free tickets can be issued immediately
    if (isFree) {
      await issueTicket(registration, event);
    }

    return res.status(201).json({
      registration,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// ISSUE TICKET
// ---------------------------------------------------------

export async function issueTicket(registration, event) {
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

  await notifyUser(registration.user, {
    type: 'TICKET_ISSUED',
    title: 'Your ticket is ready',
    message: `Your QR ticket for "${event.title}" has been generated.`,
    event: event._id,
  });

  return registration;
}


// ---------------------------------------------------------
// MY REGISTRATIONS
// ---------------------------------------------------------

export async function myRegistrations(req, res, next) {
  try {
    const registrations = await Registration.find({
      user: req.user._id,
    })
      .populate('event')
      .sort({ createdAt: -1 });

    return res.json({
      registrations,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// GET TICKET
// ---------------------------------------------------------

export async function getTicket(req, res, next) {
  try {
    const registration = await Registration.findById(
      req.params.id
    ).populate('event');

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    if (
      String(registration.user) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your ticket',
      });
    }

    if (
      !['CONFIRMED', 'ATTENDED'].includes(
        registration.status
      )
    ) {
      return res.status(400).json({
        message: 'Ticket not yet issued',
      });
    }

    const qrDataUrl = await generateQrDataUrl(
      registration.qrPayload
    );

    return res.json({
      registration,
      qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// CANCEL REGISTRATION
// ---------------------------------------------------------

export async function cancelRegistration(req, res, next) {
  try {
    const registration = await Registration.findById(
      req.params.id
    );

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    if (
      String(registration.user) !== String(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not your registration',
      });
    }

    if (registration.status === 'CANCELLED') {
      return res.status(400).json({
        message: 'Already cancelled',
      });
    }

    if (registration.status === 'ATTENDED') {
      return res.status(400).json({
        message:
          'This ticket has already been used to check in and cannot be cancelled',
      });
    }

    registration.status = 'CANCELLED';
    registration.cancelledAt = new Date();

    await registration.save();

    // Return the cancelled tickets to inventory
    await Event.findOneAndUpdate(
      {
        _id: registration.event,
        'ticketTypes._id': registration.ticketTypeId,
      },
      {
        $inc: {
          'ticketTypes.$.sold': -registration.quantity,
        },
      }
    );

    return res.json({
      registration,
    });
  } catch (err) {
    next(err);
  }
}


// ---------------------------------------------------------
// EVENT REGISTRATIONS
// ---------------------------------------------------------

export async function eventRegistrations(req, res, next) {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    if (
      String(event.organizer) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not your event',
      });
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
    }).populate('user', 'name email');

    return res.json({
      registrations,
    });
  } catch (err) {
    next(err);
  }
}