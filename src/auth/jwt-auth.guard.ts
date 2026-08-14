import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('======================');
    console.log('ERR:', err);
    console.log('USER:', user);
    console.log('INFO:', info);
    console.log('======================');

    if (err || !user) {
      throw err || new UnauthorizedException(info?.message);
    }

    return user;
  }
}
