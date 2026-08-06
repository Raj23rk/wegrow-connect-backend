import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: any): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec();
  }


  // Update Profile
  async updateProfile(
    id: string,
    updateData: any,
  ): Promise<UserDocument | null> {

    const user = await this.userModel
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
      throw new NotFoundException('User not found');
    }

    return user;
  }


  // Delete Profile
  async deleteProfile(id: string) {

    const user = await this.userModel.findByIdAndDelete(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User profile deleted successfully',
    };
  }

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
}