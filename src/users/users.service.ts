import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import {
  User,
  UserDocument,
} from './schemas/user.schema';

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

  async create(
    createUserDto: any,
  ): Promise<UserDocument> {
    const createdUser =
      new this.userModel(createUserDto);

    return createdUser.save();
  }

  // ============================================================
  // FIND USER BY EMAIL
  // ============================================================

  async findOneByEmail(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        email: email.trim().toLowerCase(),
      })
      .exec();
  }

  // ============================================================
  // FIND USER BY ID
  // ============================================================

  async findById(
    id: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('-password')
      .exec();
  }

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  async updateProfile(
    id: string,
    updateData: any,
  ): Promise<UserDocument | null> {
    const user =
      await this.userModel
        .findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
          },
        )
        .select('-password')
        .exec();

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  // ============================================================
  // DELETE PROFILE
  // ============================================================

  async deleteProfile(id: string) {
    const user =
      await this.userModel.findByIdAndDelete(id);

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return {
      message:
        'User profile deleted successfully',
    };
  }

  // ============================================================
  // UPLOAD DOCUMENT
  // ============================================================

  async uploadDocument(
    id: string,
    field:
      | 'idCardUrl'
      | 'visitingCardUrl',
    filePath: string,
  ) {
    const user =
      await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    user[field] = filePath;

    await user.save();

    return {
      message:
        'Document uploaded successfully',
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
    await this.userModel.findByIdAndUpdate(
      userId,
      {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: expiresAt,
      },
    );
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

  async updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,

        // Invalidate reset token
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    );
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    const email =
      forgotPasswordDto.email
        .trim()
        .toLowerCase();

    // IMPORTANT:
    // We are already inside UsersService.
    // Do NOT use this.usersService
    const user =
      await this.findOneByEmail(email);

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

    const resetToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    // ========================================================
    // HASH TOKEN
    // ========================================================

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // ========================================================
    // TOKEN EXPIRATION - 15 MINUTES
    // ========================================================

    const expiresAt =
      new Date(
        Date.now() +
          15 * 60 * 1000,
      );

    // ========================================================
    // SAVE TOKEN
    // ========================================================

    await this.setResetPasswordToken(
      user._id.toString(),
      tokenHash,
      expiresAt,
    );

    // ========================================================
    // FRONTEND RESET URL
    // ========================================================

    const resetUrl =
      `http://localhost:5173/home/login/forgotpassword/setpassword?token=${resetToken}`;

    // ========================================================
    // SEND EMAIL
    // ========================================================

    await this.notificationsService
      .sendPasswordResetEmail(
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

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ) {
    const {
      token,
      newPassword,
      confirmPassword,
    } = resetPasswordDto;

    // ========================================================
    // CHECK PASSWORD MATCH
    // ========================================================

    if (
      newPassword !== confirmPassword
    ) {
      throw new BadRequestException(
        'Passwords do not match',
      );
    }

    // ========================================================
    // CHECK PASSWORD LENGTH
    // ========================================================

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters',
      );
    }

    // ========================================================
    // HASH RESET TOKEN
    // ========================================================

    const tokenHash =
      crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // ========================================================
    // FIND USER BY VALID TOKEN
    // ========================================================

    const user =
      await this.findByResetPasswordToken(
        tokenHash,
      );

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset link',
      );
    }

    // ========================================================
    // HASH NEW PASSWORD
    // ========================================================

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10,
      );

    // ========================================================
    // UPDATE PASSWORD
    // ========================================================

    await this.updatePassword(
      user._id.toString(),
      hashedPassword,
    );

    return {
      success: true,

      message:
        'Password reset successfully',
    };
  }
}