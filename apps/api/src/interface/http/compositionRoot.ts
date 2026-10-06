/**
 * Composition root — único lugar donde se cablean las implementaciones
 * concretas (adapters) a los puertos (interfaces del dominio).
 *
 * Si querés cambiar scrypt por argon2, o Resend por SendGrid, cambias UNA
 * sola línea aquí y nada más del código se entera.
 *
 * **Lifecycle**: una instancia por request. Las clases adapter son baratas
 * (solo guardan `env`), así que construir el grafo entero por request no
 * tiene coste medible. La parte cara (cliente Drizzle, cliente aws4fetch,
 * Lucia) ya está cacheada a nivel de isolate dentro de los adapters.
 */
import type { Env } from '../../env.js';

// ─── Adapters (infrastructure) ───────────────────────────────────
import { DrizzleRestaurantRepository } from '../../infrastructure/persistence/drizzle/drizzleRestaurantRepository.js';
import { DrizzleUserRepository } from '../../infrastructure/persistence/drizzle/drizzleUserRepository.js';
import { DrizzleLanguageRepository } from '../../infrastructure/persistence/drizzle/drizzleLanguageRepository.js';
import { DrizzleSpaceRepository } from '../../infrastructure/persistence/drizzle/drizzleSpaceRepository.js';
import { DrizzleDishRepository } from '../../infrastructure/persistence/drizzle/drizzleDishRepository.js';
import { DrizzleWineRepository } from '../../infrastructure/persistence/drizzle/drizzleWineRepository.js';
import { DrizzleMediaRepository } from '../../infrastructure/persistence/drizzle/drizzleMediaRepository.js';
import { DrizzleTokenGenerator } from '../../infrastructure/persistence/drizzle/drizzleTokenGenerator.js';
import { LuciaSessionRepository } from '../../infrastructure/auth/luciaSessionRepository.js';
import { ScryptPasswordHasher } from '../../infrastructure/auth/scryptPasswordHasher.js';
import { ConsoleEmailSender } from '../../infrastructure/email/consoleEmailSender.js';
import { ResendEmailSender } from '../../infrastructure/email/resendEmailSender.js';
import { R2MediaStorage } from '../../infrastructure/storage/r2MediaStorage.js';
import { FetchRebuildHookCaller } from '../../infrastructure/integrations/fetchRebuildHookCaller.js';

// ─── Use cases (application) ─────────────────────────────────────
import { CreateRestaurantUseCase } from '../../application/restaurants/createRestaurantUseCase.js';
import { ListRestaurantsUseCase } from '../../application/restaurants/listRestaurantsUseCase.js';
import { GetRestaurantUseCase } from '../../application/restaurants/getRestaurantUseCase.js';
import { PatchRestaurantUseCase } from '../../application/restaurants/patchRestaurantUseCase.js';
import { DiscardChangesUseCase } from '../../application/restaurants/discardChangesUseCase.js';
import { DeleteRestaurantUseCase } from '../../application/restaurants/deleteRestaurantUseCase.js';

import { LoginUseCase } from '../../application/auth/loginUseCase.js';
import { LogoutUseCase } from '../../application/auth/logoutUseCase.js';
import { ListUserSessionsUseCase } from '../../application/auth/listUserSessionsUseCase.js';
import { RevokeSessionUseCase } from '../../application/auth/revokeSessionUseCase.js';
import { RevokeOtherSessionsUseCase } from '../../application/auth/revokeOtherSessionsUseCase.js';
import { RequestPasswordResetUseCase } from '../../application/auth/requestPasswordResetUseCase.js';
import { ApplyPasswordChangeUseCase } from '../../application/auth/applyPasswordChangeUseCase.js';

import { ListUsersUseCase } from '../../application/users/listUsersUseCase.js';
import { CreateUserUseCase } from '../../application/users/createUserUseCase.js';
import { UpdateUserUseCase } from '../../application/users/updateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/users/deleteUserUseCase.js';

import { ListLanguagesUseCase } from '../../application/languages/listLanguagesUseCase.js';
import { CreateLanguageUseCase } from '../../application/languages/createLanguageUseCase.js';
import { UpdateLanguageUseCase } from '../../application/languages/updateLanguageUseCase.js';
import { DeleteLanguageUseCase } from '../../application/languages/deleteLanguageUseCase.js';

import { ListSpacesUseCase } from '../../application/spaces/listSpacesUseCase.js';
import { GetSpaceUseCase } from '../../application/spaces/getSpaceUseCase.js';
import { CreateSpaceUseCase } from '../../application/spaces/createSpaceUseCase.js';
import { PatchSpaceUseCase } from '../../application/spaces/patchSpaceUseCase.js';
import { DiscardSpaceChangesUseCase } from '../../application/spaces/discardSpaceChangesUseCase.js';
import { DeleteSpaceUseCase } from '../../application/spaces/deleteSpaceUseCase.js';

import { ListDishesUseCase } from '../../application/dishes/listDishesUseCase.js';
import { GetDishUseCase } from '../../application/dishes/getDishUseCase.js';
import { CreateDishUseCase } from '../../application/dishes/createDishUseCase.js';
import { UpdateDishUseCase } from '../../application/dishes/updateDishUseCase.js';
import { DeleteDishUseCase } from '../../application/dishes/deleteDishUseCase.js';
import { ListDishCategoriesUseCase } from '../../application/dishes/listDishCategoriesUseCase.js';
import { CreateDishCategoryUseCase } from '../../application/dishes/createDishCategoryUseCase.js';
import { UpdateDishCategoryUseCase } from '../../application/dishes/updateDishCategoryUseCase.js';
import { DeleteDishCategoryUseCase } from '../../application/dishes/deleteDishCategoryUseCase.js';

import { ListWinesUseCase } from '../../application/wines/listWinesUseCase.js';
import { GetWineUseCase } from '../../application/wines/getWineUseCase.js';
import { CreateWineUseCase } from '../../application/wines/createWineUseCase.js';
import { UpdateWineUseCase } from '../../application/wines/updateWineUseCase.js';
import { DeleteWineUseCase } from '../../application/wines/deleteWineUseCase.js';
import { ListWineCategoriesUseCase } from '../../application/wines/listWineCategoriesUseCase.js';
import { CreateWineCategoryUseCase } from '../../application/wines/createWineCategoryUseCase.js';
import { DeleteWineCategoryUseCase } from '../../application/wines/deleteWineCategoryUseCase.js';

import { ListMediaUseCase } from '../../application/media/listMediaUseCase.js';
import { RequestMediaUploadUseCase } from '../../application/media/requestMediaUploadUseCase.js';
import { ConfirmMediaUploadUseCase } from '../../application/media/confirmMediaUploadUseCase.js';
import { UpdateMediaUseCase } from '../../application/media/updateMediaUseCase.js';
import { GetMediaReferencesUseCase } from '../../application/media/getMediaReferencesUseCase.js';
import { DeleteMediaUseCase } from '../../application/media/deleteMediaUseCase.js';

export type Container = ReturnType<typeof buildContainer>;

export function buildContainer(env: Env) {
  // ─── Repos (ports → adapters) ──────────────────────────────────
  const restaurantsRepo = new DrizzleRestaurantRepository(env);
  const usersRepo = new DrizzleUserRepository(env);
  const languagesRepo = new DrizzleLanguageRepository(env);
  const spacesRepo = new DrizzleSpaceRepository(env);
  const dishesRepo = new DrizzleDishRepository(env);
  const winesRepo = new DrizzleWineRepository(env);
  const mediaRepo = new DrizzleMediaRepository(env);
  const sessionsRepo = new LuciaSessionRepository(env);
  const tokenGen = new DrizzleTokenGenerator(env);

  // ─── Services (ports → adapters) ───────────────────────────────
  const hasher = new ScryptPasswordHasher();
  const email = env.RESEND_API_KEY
    ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new ConsoleEmailSender();
  const storage = new R2MediaStorage(env);
  const rebuildHook = new FetchRebuildHookCaller();

  // ─── Use cases ─────────────────────────────────────────────────
  return {
    // raw refs — rutas pueden querer leer el repo (p.ej. middleware auth
    // chequea user_restaurants) sin pasar por un UC
    repos: { restaurantsRepo, usersRepo, sessionsRepo },
    services: { hasher, storage },

    restaurants: {
      create: new CreateRestaurantUseCase(restaurantsRepo, languagesRepo),
      list: new ListRestaurantsUseCase(restaurantsRepo, usersRepo),
      get: new GetRestaurantUseCase(restaurantsRepo),
      patch: new PatchRestaurantUseCase(restaurantsRepo, languagesRepo, rebuildHook),
      discard: new DiscardChangesUseCase(restaurantsRepo),
      delete: new DeleteRestaurantUseCase(restaurantsRepo)
    },

    auth: {
      login: new LoginUseCase(usersRepo, sessionsRepo, hasher),
      logout: new LogoutUseCase(sessionsRepo),
      listSessions: new ListUserSessionsUseCase(sessionsRepo),
      revokeSession: new RevokeSessionUseCase(sessionsRepo),
      revokeOthers: new RevokeOtherSessionsUseCase(sessionsRepo),
      requestPasswordReset: new RequestPasswordResetUseCase(usersRepo, tokenGen, email, env.APP_URL),
      applyPasswordChange: new ApplyPasswordChangeUseCase(usersRepo, sessionsRepo, tokenGen, hasher)
    },

    users: {
      list: new ListUsersUseCase(usersRepo),
      create: new CreateUserUseCase(usersRepo, restaurantsRepo, hasher, tokenGen, email, env.APP_URL),
      update: new UpdateUserUseCase(usersRepo, restaurantsRepo, hasher),
      delete: new DeleteUserUseCase(usersRepo)
    },

    languages: {
      list: new ListLanguagesUseCase(languagesRepo),
      create: new CreateLanguageUseCase(languagesRepo),
      update: new UpdateLanguageUseCase(languagesRepo),
      delete: new DeleteLanguageUseCase(languagesRepo)
    },

    spaces: {
      list: new ListSpacesUseCase(spacesRepo),
      get: new GetSpaceUseCase(spacesRepo),
      create: new CreateSpaceUseCase(spacesRepo),
      patch: new PatchSpaceUseCase(spacesRepo),
      discard: new DiscardSpaceChangesUseCase(spacesRepo),
      delete: new DeleteSpaceUseCase(spacesRepo)
    },

    dishes: {
      list: new ListDishesUseCase(dishesRepo),
      get: new GetDishUseCase(dishesRepo),
      create: new CreateDishUseCase(dishesRepo),
      update: new UpdateDishUseCase(dishesRepo),
      delete: new DeleteDishUseCase(dishesRepo),
      listCategories: new ListDishCategoriesUseCase(dishesRepo),
      createCategory: new CreateDishCategoryUseCase(dishesRepo),
      updateCategory: new UpdateDishCategoryUseCase(dishesRepo),
      deleteCategory: new DeleteDishCategoryUseCase(dishesRepo)
    },

    wines: {
      list: new ListWinesUseCase(winesRepo),
      get: new GetWineUseCase(winesRepo),
      create: new CreateWineUseCase(winesRepo),
      update: new UpdateWineUseCase(winesRepo),
      delete: new DeleteWineUseCase(winesRepo),
      listCategories: new ListWineCategoriesUseCase(winesRepo),
      createCategory: new CreateWineCategoryUseCase(winesRepo),
      deleteCategory: new DeleteWineCategoryUseCase(winesRepo)
    },

    media: {
      list: new ListMediaUseCase(mediaRepo),
      requestUpload: new RequestMediaUploadUseCase(mediaRepo, storage),
      confirmUpload: new ConfirmMediaUploadUseCase(mediaRepo, storage),
      update: new UpdateMediaUseCase(mediaRepo),
      references: new GetMediaReferencesUseCase(mediaRepo),
      delete: new DeleteMediaUseCase(mediaRepo, storage)
    }
  };
}
