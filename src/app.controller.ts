import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('spin-and-win')
  getSpinAndWin(@Res() res: Response) {
    return res.redirect('/spin-and-win.html');
  }

  @Get('diwali-challenge')
  getDiwaliChallenge(@Res() res: Response) {
    return res.redirect('/diwali-challenge.html');
  }
}
