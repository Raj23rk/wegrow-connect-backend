import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name)
        private readonly eventModel: Model<EventDocument>,
    ) { }

    // Create Event
    async create(dto: CreateEventDto): Promise<EventDocument> {
        try {
            const event = new this.eventModel(dto);
            return await event.save();
        } catch (error) {
            throw new InternalServerErrorException(
                error.message || 'Failed to create event',
            );
        }
    }

    // Get All Events
    async findAll(
        page: number,
        limit: number,
        search?: string,
        type?: string,
    ) {
        const skip = (page - 1) * limit;

        const filter: any = {
            isActive: true,
        };

        if (search) {
            filter.$or = [
                {
                    title: {
                        $regex: search,
                        $options: 'i',
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: 'i',
                    },
                },
                {
                    location: {
                        $regex: search,
                        $options: 'i',
                    },
                },
            ];
        }

        if (type) {
            filter.type = type;
        }

        const [events, total] = await Promise.all([
            this.eventModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this.eventModel.countDocuments(filter),
        ]);

        return {
            events,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Get Event By ID
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

    // Update Event
    async update(
        id: string,
        dto: UpdateEventDto,
    ): Promise<EventDocument> {
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

    // Delete Event
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