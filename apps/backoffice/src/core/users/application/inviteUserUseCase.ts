import { type UserRepository, type TokenGenerator, UserNotFoundError } from '@/core/auth';
import type { EmailSender } from '@/core/shared';
import { issueInvitation, type Invitation } from './createUserUseCase';

/** Enlace nuevo para que un usuario elija (o vuelva a elegir) su contraseña. */
export class InviteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenGenerator,
    private readonly email: EmailSender,
    private readonly appUrl: string
  ) {}

  async execute(id: string, inviterName: string): Promise<Invitation> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return issueInvitation({ user, inviterName, tokens: this.tokens, email: this.email, appUrl: this.appUrl });
  }
}
