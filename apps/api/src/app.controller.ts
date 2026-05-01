import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(): { ok: boolean; message: string } {
    return this.appService.getHealth();
  }

  @Get('health')
  health(): { ok: boolean; message: string } {
    return this.appService.getHealth();
  }
}
