import type { User, UserRole } from '../models/user.js';

export interface UserRepository {
  /** `email` se busca lowercased. */
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;

  create(input: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    avatarColor: string;
  }): Promise<User>;

  update(id: string, patch: Partial<Pick<User, 'name' | 'role' | 'avatarColor'>>): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;

  /** Best-effort; nunca lanza (el login no debe romper por esto). */
  touchLastAccess(id: string): Promise<void>;

  deleteById(id: string): Promise<void>;

  /** Vacío = editor sin acceso a ningún restaurant (útil para suspender sin borrar). */
  setRestaurants(userId: string, restaurantIds: string[]): Promise<void>;
  listRestaurantIds(userId: string): Promise<string[]>;
}
