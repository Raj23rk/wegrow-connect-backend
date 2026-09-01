import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
  ) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const existing = await this.campaignModel.findOne({
      campaignId: createCampaignDto.campaignId.toUpperCase(),
    });
    if (existing) {
      throw new BadRequestException(
        `Campaign with ID ${createCampaignDto.campaignId} already exists`,
      );
    }

    const campaign = new this.campaignModel({
      ...createCampaignDto,
      campaignId: createCampaignDto.campaignId.toUpperCase(),
    });

    return campaign.save();
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByCampaignId(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignModel
      .findOne({ campaignId: campaignId.toUpperCase() })
      .exec();

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async update(
    id: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign> {
    if (updateCampaignDto.campaignId) {
      updateCampaignDto.campaignId = updateCampaignDto.campaignId.toUpperCase();
    }
    const updated = await this.campaignModel
      .findByIdAndUpdate(id, updateCampaignDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return updated;
  }
}
