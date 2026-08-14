import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Event, EventDocument } from './schemas/event.schema';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

import { User, UserDocument } from '../users/schemas/user.schema';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================================
  // CREATE EVENT
  // ============================================================

  // async create(dto: CreateEventDto): Promise<EventDocument> {
  //     try {
  //         // ----------------------------------------------------------
  //         // 1. Create Event
  //         // ----------------------------------------------------------

  //         const event = new this.eventModel(dto);

  //         const savedEvent = await event.save();

  //         // ----------------------------------------------------------
  //         // 2. Find Active Users
  //         // ----------------------------------------------------------

  //         const users = await this.userModel.find({
  //             isActive: true,
  //         });

  //         // ----------------------------------------------------------
  //         // 3. Send Notification Email
  //         // ----------------------------------------------------------

  //         // if (users.length > 0) {
  //         //     for (const user of users) {
  //         //         if (!user.email) {
  //         //             continue;
  //         //         }

  //         //         this.notificationsService
  //         //             .sendNewEventNotification(
  //         //                 user.email,
  //         //                 user.name || 'User',
  //         //                 savedEvent.title,
  //         //                 savedEvent.description,
  //         //                 savedEvent.location,
  //         //                 savedEvent.date?.toString(),
  //         //                 savedEvent.price,
  //         //             )
  //         //             .catch((error) => {
  //         //                 this.logger.error(
  //         //                     `Failed to send event notification to ${user.email}`,
  //         //                     error instanceof Error
  //         //                         ? error.stack
  //         //                         : String(error),
  //         //                 );
  //         //             });
  //         //     }
  //         // }
  //           `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

  //         // ----------------------------------------------------------
  //         // 4. Return Created Event
  //         // ----------------------------------------------------------

  //         return savedEvent;
  //     } catch (error) {
  //         throw new InternalServerErrorException(
  //             error.message || 'Failed to create event',
  //         );
  //     }
  // }

  // ============================================================
  // CREATE EVENT
  // ============================================================

  async create(dto: CreateEventDto): Promise<EventDocument> {
    try {
      // ============================================================
      // 1. CREATE EVENT
      // ============================================================

      const event = new this.eventModel(dto);

      const savedEvent = await event.save();

      this.logger.log(`Event created successfully: ${savedEvent._id}`);

      // ============================================================
      // 2. FIND ALL ACTIVE USERS
      // ============================================================

      const users = await this.userModel.find({
        isActive: true,
      });

      this.logger.log(`Active users found: ${users.length}`);

      // ============================================================
      // 3. CREATE NOTIFICATION + SEND EMAIL
      // ============================================================

      for (const user of users) {
        // ==========================================================
        // USER NAME
        // ==========================================================

        const userName =
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

        // ==========================================================
        // A. CREATE DATABASE NOTIFICATION
        // ==========================================================

        try {
          const notification =
            await this.notificationsService.createNewEventNotification(
              user._id.toString(),
              savedEvent._id.toString(),
              savedEvent.title,
            );

          this.logger.log(
            `Notification created for user ${user._id}: ${notification._id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create notification for user ${user._id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }

        // ==========================================================
        // B. SEND EMAIL NOTIFICATION
        // ==========================================================

        if (!user.email) {
          this.logger.warn(`User ${user._id} does not have an email`);

          continue;
        }

        this.notificationsService
          .sendNewEventNotification(
            user.email,
            userName,
            savedEvent.title,
            savedEvent.description,
            savedEvent.location,
            savedEvent.date?.toString(),
            savedEvent.price,
          )
          .then(() => {
            this.logger.log(`Event notification email sent to ${user.email}`);
          })
          .catch((error) => {
            this.logger.error(
              `Failed to send event email to ${user.email}`,
              error instanceof Error ? error.stack : String(error),
            );
          });
      }

      // ============================================================
      // 4. RETURN CREATED EVENT
      // ============================================================

      return savedEvent;
    } catch (error) {
      // ============================================================
      // ERROR HANDLING
      // ============================================================

      this.logger.error(
        'Failed to create event',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to create event',
      );
    }
  }
  // ============================================================
  // GET ALL EVENTS
  // ============================================================

  // async findAll(
  //     page: number,
  //     limit: number,
  //     search?: string,
  //     type?: string,
  // ) {
  //     const skip = (page - 1) * limit;

  //     const filter: any = {
  //         isActive: true,
  //     };

  //     if (search) {
  //         filter.$or = [
  //             {
  //                 title: {
  //                     $regex: search,
  //                     $options: 'i',
  //                 },
  //             },
  //             {
  //                 description: {
  //                     $regex: search,
  //                     $options: 'i',
  //                 },
  //             },
  //             {
  //                 location: {
  //                     $regex: search,
  //                     $options: 'i',
  //                 },
  //             },
  //         ];
  //     }

  //     if (type) {
  //         filter.type = type;
  //     }

  //     const [events, total] = await Promise.all([
  //         this.eventModel
  //             .find(filter)
  //             .sort({ createdAt: -1 })
  //             .skip(skip)
  //             .limit(limit),

  //         this.eventModel.countDocuments(filter),
  //     ]);

  //     return {
  //         events,

  //         pagination: {
  //             total,
  //             page,
  //             limit,
  //             totalPages: Math.ceil(total / limit),
  //         },
  //     };
  // }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    type?: 'STUDENT' | 'BUSINESS',
  ) {
    const skip = (page - 1) * limit;

    const filter: any = {
      isActive: true,
    };

    // =====================================================
    // ROLE FILTER
    // =====================================================

    if (type) {
      filter.type = type;
    }

    // =====================================================
    // SEARCH
    // =====================================================

    if (search?.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: 'i',
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: 'i',
          },
        },
        {
          location: {
            $regex: search.trim(),
            $options: 'i',
          },
        },
      ];
    }

    // =====================================================
    // QUERY
    // =====================================================

    const [events, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.eventModel.countDocuments(filter),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // ============================================================
  // GET EVENT BY ID
  // ============================================================

  async findById(id: string): Promise<EventDocument> {
    try {
      const event = await this.eventModel.findById(id);

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to fetch event',
      );
    }
  }

  // ============================================================
  // UPDATE EVENT
  // ============================================================

  async update(id: string, dto: UpdateEventDto): Promise<EventDocument> {
    try {
      const event = await this.eventModel.findByIdAndUpdate(id, dto, {
        new: true,
        runValidators: true,
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to update event',
      );
    }
  }

  // ============================================================
  // DELETE EVENT
  // ============================================================

  async remove(id: string) {
    try {
      const event = await this.eventModel.findByIdAndUpdate(
        id,
        {
          isActive: false,
        },
        {
          new: true,
        },
      );

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      return {
        success: true,
        message: 'Event deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to delete event',
      );
    }
  }
}
