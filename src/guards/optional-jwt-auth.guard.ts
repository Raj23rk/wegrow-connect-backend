import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      const result = await super.canActivate(
        context,
      );

      return !!result;
    } catch (error) {
      // No token / invalid token:
      // allow public access
      return true;
    }
  }
}