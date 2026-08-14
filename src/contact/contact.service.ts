import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Contact, QueryAbout } from './schemas/contact.schema';

import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<Contact>,
  ) {}

  // =====================================================
  // CREATE CONTACT QUERY
  // =====================================================

  async create(createContactDto: CreateContactDto) {
    const contact = await this.contactModel.create(createContactDto);

    return contact;
  }

  // =====================================================
  // GET ALL CONTACT QUERIES
  // =====================================================

  async findAll(page = 1, limit = 10, search?: string, queryAbout?: string) {
    const skip = (page - 1) * limit;

    const filter: any = {
      isActive: true,
    };

    // ===================================================
    // SEARCH
    // ===================================================

    if (search) {
      filter.$or = [
        {
          fullName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          email: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          mobileNumber: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          query: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // ===================================================
    // QUERY ABOUT FILTER
    // ===================================================

    if (
      queryAbout &&
      Object.values(QueryAbout).includes(queryAbout.toUpperCase() as QueryAbout)
    ) {
      filter.queryAbout = queryAbout.toUpperCase();
    }

    // ===================================================
    // DATABASE
    // ===================================================

    const [contacts, total] = await Promise.all([
      this.contactModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.contactModel.countDocuments(filter),
    ]);

    return {
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================================================
  // GET CONTACT BY ID
  // =====================================================

  async findById(id: string) {
    const contact = await this.contactModel.findOne({
      _id: id,
      isActive: true,
    });

    if (!contact) {
      throw new NotFoundException('Contact query not found');
    }

    return contact;
  }

  // =====================================================
  // MARK AS RESOLVED
  // =====================================================

  async resolve(id: string) {
    const contact = await this.contactModel.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      {
        isResolved: true,
      },
      {
        new: true,
      },
    );

    if (!contact) {
      throw new NotFoundException('Contact query not found');
    }

    return contact;
  }

  // =====================================================
  // DELETE / DEACTIVATE
  // =====================================================

  async remove(id: string) {
    const contact = await this.contactModel.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      {
        isActive: false,
      },
      {
        new: true,
      },
    );

    if (!contact) {
      throw new NotFoundException('Contact query not found');
    }

    return contact;
  }
}
