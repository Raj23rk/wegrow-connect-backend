import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { Payment } from './schemas/payment.schema';
import { SingAlongBooking } from '../sing-along/schemas/sing-along-booking.schema';

describe('PaymentsService - Razorpay Integration', () => {
  let service: PaymentsService;
  const mockKeyId = 'rzp_test_TmuypQyjFrQM5V';
  const mockKeySecret = '8GIfIKItUEqU2EMtLbXQdJBg';

  const mockPaymentModel = {
    create: jest.fn().mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'mock_pay_id' })),
    findOneAndUpdate: jest.fn().mockImplementation((filter, update) => Promise.resolve({ ...filter, ...update })),
    findOne: jest.fn(),
  };

  const mockBookingModel = {
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return mockKeyId;
      if (key === 'RAZORPAY_KEY_SECRET') return mockKeySecret;
      return undefined;
    }),
  };

  beforeEach(async () => {
    process.env.RAZORPAY_KEY_ID = mockKeyId;
    process.env.RAZORPAY_KEY_SECRET = mockKeySecret;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken(SingAlongBooking.name),
          useValue: mockBookingModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('getConfig', () => {
    it('should return public keyId and never expose keySecret', () => {
      const config = service.getConfig();
      expect(config.keyId).toBe(mockKeyId);
      expect((config as any).keySecret).toBeUndefined();
      expect(config.currency).toBe('INR');
    });
  });

  describe('createOrder - Validation & Execution', () => {
    it('should reject amount less than 100 paise with BadRequestException', async () => {
      await expect(
        service.createOrder({ amount: 50, currency: 'INR' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject amount 0 with BadRequestException', async () => {
      await expect(
        service.createOrder({ amount: 0, currency: 'INR' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call Razorpay orders.create when amount is >= 100 paise', async () => {
      const mockOrder = {
        id: 'order_test_123456',
        amount: 50000,
        currency: 'INR',
        receipt: 'rcpt_test_1',
      };

      // Mock razorpay orders.create
      (service as any).razorpay = {
        orders: {
          create: jest.fn().mockResolvedValue(mockOrder),
        },
      };

      const result = await service.createOrder({
        amount: 50000,
        currency: 'INR',
        receipt: 'rcpt_test_1',
      });

      expect(result.order_id).toBe('order_test_123456');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('INR');
    });
  });

  describe('verifyPayment - Signature Verification', () => {
    const orderId = 'order_test_123456';
    const paymentId = 'pay_test_789012';

    // Generate valid HMAC SHA256 signature
    const validSignature = crypto
      .createHmac('sha256', mockKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    it('should throw BadRequestException if order_id is missing', async () => {
      await expect(
        service.verifyPayment({
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment_id is missing', async () => {
      await expect(
        service.verifyPayment({
          razorpay_order_id: orderId,
          razorpay_signature: validSignature,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if signature is missing', async () => {
      await expect(
        service.verifyPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid signature mismatch with BadRequestException', async () => {
      await expect(
        service.verifyPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'invalid_fraudulent_signature_hex',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid signature and return success', async () => {
      const result = await service.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.order_id).toBe(orderId);
      expect(result.payment_id).toBe(paymentId);
      expect(result.status).toBe('PAID');
    });
  });
});
