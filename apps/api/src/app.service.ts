import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { ok: boolean; message: string } {
    return { ok: true, message: 'TopLynk API' };
  }
}
