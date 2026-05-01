import { Expose } from 'class-transformer';

/** Subconjunto do setup devolvido ao próprio utilizador para edição simples no cliente. */
export class ProfileEditFieldsDto {
  @Expose()
  username: string;

  @Expose()
  roleTitle: string;

  @Expose()
  company: string;

  @Expose()
  bio: string;

  @Expose()
  cityLabel: string;
}
