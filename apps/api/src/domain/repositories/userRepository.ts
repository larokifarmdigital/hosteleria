import type { User, UserRole } from '../models/user.js';

/**
 * Puerto de persistencia para `User`.
 */
export interface UserRepository {
  /** Devuelve el user por email (lowercased) o `null`. */
  findByEmail(email: string): Promise<User | null>;

  /** Devuelve el user por id o `null`. */
  findById(id: string): Promise<User | null>;

  /** Listado para gestión en el backoffice (admin only). */
  list(): Promise<User[]>;

  /** Crea un user nuevo (admin creando otro). Lanza `EmailTakenError` si duplica. */
  create(input: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    avatarColor: string;
  }): Promise<User>;

  /** Patch general del user. */
  update(id: string, patch: Partial<Pick<User, 'name' | 'role' | 'avatarColor'>>): Promise<void>;

  /** Set del password hash (al crear via setup, al reset). */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;

  /** Actualiza `lastAccessAt` — best-effort, puede fallar sin romper el login. */
  touchLastAccess(id: string): Promise<void>;

  /** Hard delete. */
  deleteById(id: string): Promise<void>;

  /**
   * Reemplaza qué restaurantes puede editar un user (m2m `user_restaurants`).
   * Vacío = sin acceso (useful para "bloquear" un editor sin borrarlo).
   */
  setRestaurants(userId: string, restaurantIds: string[]): Promise<void>;

  /** Devuelve ids de restaurantes que un editor tiene asignados. */
  listRestaurantIds(userId: string): Promise<string[]>;
}
