/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

import { User, UserDocument } from './schemas/user.schema';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================================
  // CREATE USER
  // ============================================================

  async create(createUserDto: any): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);

    return createdUser.save();
  }

  // ============================================================
  // FIND USER BY EMAIL
  // ============================================================

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        email: email.trim().toLowerCase(),
      })
      .exec();
  }

  // ============================================================
  // FIND USER BY ID
  // ============================================================

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  async updateProfile(
    id: string,
    updateData: any,
  ): Promise<UserDocument | null> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
      })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ============================================================
  // DELETE PROFILE
  // ============================================================

  async deleteProfile(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User profile deleted successfully',
    };
  }

  // ============================================================
  // UPLOAD DOCUMENT
  // ============================================================

  async uploadDocument(
    id: string,
    field: 'idCardUrl' | 'visitingCardUrl',
    filePath: string,
  ) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user[field] = filePath;

    await user.save();

    return {
      message: 'Document uploaded successfully',
      data: user,
    };
  }

  // ============================================================
  // SAVE RESET PASSWORD TOKEN
  // ============================================================

  async setResetPasswordToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expiresAt,
    });
  }

  // ============================================================
  // FIND USER BY RESET TOKEN
  // ============================================================

  async findByResetPasswordToken(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetPasswordToken: tokenHash,

        resetPasswordExpires: {
          $gt: new Date(),
        },
      })
      .exec();
  }

  // ============================================================
  // UPDATE PASSWORD
  // ============================================================

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,

      // Invalidate reset token
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const email = forgotPasswordDto.email.trim().toLowerCase();

    // IMPORTANT:
    // We are already inside UsersService.
    // Do NOT use this.usersService
    const user = await this.findOneByEmail(email);

    // Don't reveal whether email exists
    if (!user) {
      return {
        success: true,

        message:
          'If this email is registered, a password reset link has been sent.',
      };
    }

    // ========================================================
    // GENERATE SECURE TOKEN
    // ========================================================

    const resetToken = crypto.randomBytes(32).toString('hex');

    // ========================================================
    // HASH TOKEN
    // ========================================================

    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // ========================================================
    // TOKEN EXPIRATION - 15 MINUTES
    // ========================================================

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // ========================================================
    // SAVE TOKEN
    // ========================================================

    await this.setResetPasswordToken(user._id.toString(), tokenHash, expiresAt);

    // ========================================================
    // FRONTEND RESET URL
    // ========================================================

    const resetUrl = `http://localhost:5173/home/login/forgotpassword/setpassword?token=${resetToken}`;

    // ========================================================
    // SEND EMAIL
    // ========================================================

    await this.notificationsService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetUrl,
    );

    return {
      success: true,

      message:
        'If this email is registered, a password reset link has been sent.',
    };
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword, confirmPassword } = resetPasswordDto;

    // ========================================================
    // CHECK PASSWORD MATCH
    // ========================================================

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // ========================================================
    // CHECK PASSWORD LENGTH
    // ========================================================

    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // ========================================================
    // HASH RESET TOKEN
    // ========================================================

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // ========================================================
    // FIND USER BY VALID TOKEN
    // ========================================================

    const user = await this.findByResetPasswordToken(tokenHash);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset link');
    }

    // ========================================================
    // HASH NEW PASSWORD
    // ========================================================

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ========================================================
    // UPDATE PASSWORD
    // ========================================================

    await this.updatePassword(user._id.toString(), hashedPassword);

    return {
      success: true,

      message: 'Password reset successfully',
    };
  }
  // ============================================================
  // ADMIN - CREATE USER
  // ============================================================

  async adminCreateUser(dto: AdminCreateUserDto) {
    // Check email
    const existingUser = await this.userModel.findOne({
      email: dto.email.trim().toLowerCase(),
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check phone if provided
    if (dto.phone) {
      const existingPhone = await this.userModel.findOne({
        phone: dto.phone,
      });

      if (existingPhone) {
        throw new BadRequestException(
          'User with this phone number already exists',
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = new this.userModel({
      firstName: dto.firstName,
      lastName: dto.lastName || '',
      email: dto.email.trim().toLowerCase(),
      password: hashedPassword,
      phone: dto.phone,
      role: dto.role,

      // Student fields
      college: dto.college,
      course: dto.course,
      department: dto.department,
      year: dto.year,

      // Business fields
      companyName: dto.companyName,
      businessType: dto.businessType,
      designation: dto.designation,

      // Location
      city: dto.city,
      state: dto.state,

      // Status
      isActive: dto.isActive !== undefined ? dto.isActive : true,

      isEmailVerified: false,
    });

    const savedUser = await user.save();

    // Convert to plain object
    const result = savedUser.toObject();

    // Remove password safely
    const { ...safeUser } = result;

    return {
      success: true,
      message: 'User created successfully',
      data: safeUser,
    };
  }

  // ============================================================
  // ADMIN - GET ALL USERS
  // ============================================================

  // async adminFindAll(
  //   page: number = 1,
  //   limit: number = 10,
  //   search?: string,
  //   role?: string,
  // ) {
  //   page = Math.max(Number(page) || 1, 1);

  //   limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  //   const skip = (page - 1) * limit;

  //   const filter: any = {};

  //   // Role filter
  //   if (role && role !== 'ALL') {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     filter.role = role;
  //   }

  //   // Search
  //   if (search && search.trim()) {
  //     const searchText = search.trim();

  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     filter.$or = [
  //       {
  //         firstName: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //       {
  //         lastName: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //       {
  //         name: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //       {
  //         email: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //       {
  //         phone: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //       {
  //         organization: {
  //           $regex: searchText,
  //           $options: 'i',
  //         },
  //       },
  //     ];
  //   }

  //   const [users, total, studentCount, businessCount, adminCount, mentorCount] =
  //     await Promise.all([
  //       this.userModel
  //         .find(filter)
  //         .select('-password -resetPasswordToken -resetPasswordExpires')
  //         .sort({ createdAt: -1 })
  //         .skip(skip)
  //         .limit(limit)
  //         .lean(),

  //       this.userModel.countDocuments(filter),

  //       this.userModel.countDocuments({
  //         ...filter,
  //         role: 'STUDENT',
  //       }),

  //       this.userModel.countDocuments({
  //         ...filter,
  //         role: 'BUSINESS',
  //       }),

  //       this.userModel.countDocuments({
  //         ...filter,
  //         role: 'ADMIN',
  //       }),

  //       this.userModel.countDocuments({
  //         ...filter,
  //         role: 'MENTOR',
  //       }),
  //     ]);

  //   return {
  //     success: true,

  //     users,

  //     counts: {
  //       total: total,
  //       students: studentCount,
  //       businesses: businessCount,
  //       admins: adminCount,
  //       mentors: mentorCount,
  //     },

  //     pagination: {
  //       page,
  //       limit,
  //       total,
  //       totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  //     },
  //   };
  // }

  async adminFindAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
  ) {
    // ============================================================
    // PAGINATION
    // ============================================================

    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (page - 1) * limit;

    // ============================================================
    // BASE FILTER
    // ============================================================

    const filter: any = {};

    // ============================================================
    // ROLE FILTER
    // ============================================================

    if (role && role !== 'ALL') {
      filter.role = role.toUpperCase();
    }

    // ============================================================
    // SEARCH FILTER
    // ============================================================

    if (search && search.trim()) {
      const searchText = search.trim();

      filter.$or = [
        // First Name
        {
          firstName: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // Last Name
        {
          lastName: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // Email
        {
          email: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // Phone
        {
          phone: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // Student college
        {
          college: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // Business company
        {
          companyName: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // City
        {
          city: {
            $regex: searchText,
            $options: 'i',
          },
        },

        // State
        {
          state: {
            $regex: searchText,
            $options: 'i',
          },
        },
      ];
    }

    // ============================================================
    // GET USERS + COUNTS
    // ============================================================

    const [users, total, studentCount, businessCount, adminCount] =
      await Promise.all([
        // ----------------------------------------------------------
        // USER LIST
        // ----------------------------------------------------------

        this.userModel
          .find(filter)
          .select('-password -resetPasswordToken -resetPasswordExpires')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        // ----------------------------------------------------------
        // TOTAL USERS
        // ----------------------------------------------------------

        this.userModel.countDocuments(filter),

        // ----------------------------------------------------------
        // STUDENT COUNT
        // ----------------------------------------------------------

        this.userModel.countDocuments({
          ...filter,
          role: 'STUDENT',
        }),

        // ----------------------------------------------------------
        // BUSINESS COUNT
        // ----------------------------------------------------------

        this.userModel.countDocuments({
          ...filter,
          role: 'BUSINESS',
        }),

        // ----------------------------------------------------------
        // ADMIN COUNT
        // ----------------------------------------------------------

        this.userModel.countDocuments({
          ...filter,
          role: 'ADMIN',
        }),
      ]);

    // ============================================================
    // FORMAT RESPONSE
    // ============================================================

    const formattedUsers = users.map((user: any) => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...user,

        name: fullName,

        // Student → college
        // Business → company
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        organization:
          user.role === 'STUDENT'
            ? user.college || null
            : user.role === 'BUSINESS'
              ? user.companyName || null
              : null,
      };
    });

    // ============================================================
    // RESPONSE
    // ============================================================

    return {
      success: true,

      users: formattedUsers,

      counts: {
        total,
        students: studentCount,
        businesses: businessCount,
        admins: adminCount,
      },

      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // ADMIN - GET USER BY ID
  // ============================================================

  async adminFindOne(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  // ============================================================
  // ADMIN - UPDATE USER
  // ============================================================

  async adminUpdateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ================================
    // BASIC DETAILS
    // ================================

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }

    if (dto.email !== undefined) {
      user.email = dto.email.trim().toLowerCase();
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }

    // ================================
    // ROLE
    // ================================

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    // ================================
    // PASSWORD
    // ================================

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    // ================================
    // STUDENT
    // ================================

    if (dto.college !== undefined) {
      user.college = dto.college;
    }

    if (dto.course !== undefined) {
      user.course = dto.course;
    }

    if (dto.department !== undefined) {
      user.department = dto.department;
    }

    if (dto.year !== undefined) {
      user.year = dto.year;
    }

    // ================================
    // BUSINESS
    // ================================

    if (dto.companyName !== undefined) {
      user.companyName = dto.companyName;
    }

    if (dto.businessType !== undefined) {
      user.businessType = dto.businessType;
    }

    if (dto.designation !== undefined) {
      user.designation = dto.designation;
    }

    if (dto.experience !== undefined) {
      user.experience = dto.experience;
    }

    if (dto.website !== undefined) {
      user.website = dto.website;
    }

    // ================================
    // LOCATION
    // ================================

    if (dto.city !== undefined) {
      user.city = dto.city;
    }

    if (dto.state !== undefined) {
      user.state = dto.state;
    }

    // ================================
    // STATUS
    // ================================

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    // ================================
    // SAVE
    // ================================

    const savedUser = await user.save();

    // ================================
    // REMOVE PASSWORD
    // ================================

    const result = savedUser.toObject();

    const { ...safeUser } = result;

    return {
      success: true,
      message: 'User updated successfully',
      data: safeUser,
    };
  }

  // ============================================================
  // ADMIN - DELETE USER
  // ============================================================

  async adminDeleteUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
