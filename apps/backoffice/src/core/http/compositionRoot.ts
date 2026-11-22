// Único lugar donde los puertos se cablean a sus adapters. Se construye uno
// por request: los adapters solo guardan `env`; lo caro (Drizzle, aws4fetch,
// Lucia) está cacheado por isolate.
import { type Env, ConsoleEmailSender, ResendEmailSender } from '@/core/shared';

import {
  DrizzleRestaurantRepository,
  CreateRestaurantUseCase,
  ListRestaurantsUseCase,
  GetRestaurantUseCase,
  PatchRestaurantUseCase,
  DiscardChangesUseCase,
  DeleteRestaurantUseCase
} from '@/core/restaurants';
import {
  DrizzleUserRepository,
  DrizzleTokenGenerator,
  LuciaSessionRepository,
  ScryptPasswordHasher,
  LoginUseCase,
  LogoutUseCase,
  ListUserSessionsUseCase,
  RevokeSessionUseCase,
  RevokeOtherSessionsUseCase,
  RequestPasswordResetUseCase,
  ApplyPasswordChangeUseCase
} from '@/core/auth';
import {
  DrizzleLanguageRepository,
  ListLanguagesUseCase,
  CreateLanguageUseCase,
  UpdateLanguageUseCase,
  DeleteLanguageUseCase
} from '@/core/languages';
import {
  DrizzleSpaceRepository,
  ListSpacesUseCase,
  GetSpaceUseCase,
  CreateSpaceUseCase,
  PatchSpaceUseCase,
  DiscardSpaceChangesUseCase,
  DeleteSpaceUseCase
} from '@/core/spaces';
import {
  DrizzleDishRepository,
  DrizzleWineRepository,
  ListDishesUseCase,
  GetDishUseCase,
  CreateDishUseCase,
  UpdateDishUseCase,
  DeleteDishUseCase,
  ListDishCategoriesUseCase,
  CreateDishCategoryUseCase,
  UpdateDishCategoryUseCase,
  DeleteDishCategoryUseCase,
  ListWinesUseCase,
  GetWineUseCase,
  CreateWineUseCase,
  UpdateWineUseCase,
  DeleteWineUseCase,
  ListWineCategoriesUseCase,
  CreateWineCategoryUseCase,
  DeleteWineCategoryUseCase,
  UpdateWineCategoryUseCase
} from '@/core/menu';
import {
  DrizzleLegalPageRepository,
  ListLegalPagesUseCase,
  SaveLegalPageUseCase,
  DeleteLegalPageUseCase
} from '@/core/legal';
import {
  DrizzleMediaRepository,
  R2MediaStorage,
  ListMediaUseCase,
  RequestMediaUploadUseCase,
  ConfirmMediaUploadUseCase,
  UpdateMediaUseCase,
  GetMediaReferencesUseCase,
  DeleteMediaUseCase
} from '@/core/media';
import {
  FetchRebuildHookCaller,
  GetPendingTasksUseCase,
  GetPublishedSiteUseCase,
  RequestSiteRebuildUseCase,
  GetSiteStatusUseCase,
  FetchSiteProbe
} from '@/core/site';



import {
  ListUsersUseCase,
  CreateUserUseCase,
  UpdateUserUseCase,
  InviteUserUseCase,
  DeleteUserUseCase
} from '@/core/users';







export type Container = ReturnType<typeof buildContainer>;

export function buildContainer(env: Env) {
  const restaurantsRepo = new DrizzleRestaurantRepository(env);
  const usersRepo = new DrizzleUserRepository(env);
  const languagesRepo = new DrizzleLanguageRepository(env);
  const spacesRepo = new DrizzleSpaceRepository(env);
  const dishesRepo = new DrizzleDishRepository(env);
  const winesRepo = new DrizzleWineRepository(env);
  const mediaRepo = new DrizzleMediaRepository(env);
  const legalPagesRepo = new DrizzleLegalPageRepository(env);
  const sessionsRepo = new LuciaSessionRepository(env);
  const tokenGen = new DrizzleTokenGenerator(env);

  const hasher = new ScryptPasswordHasher();
  const email = env.RESEND_API_KEY
    ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new ConsoleEmailSender();
  const storage = new R2MediaStorage(env);
  const rebuildHook = new FetchRebuildHookCaller();
  const getSite = new GetPublishedSiteUseCase(
    restaurantsRepo, spacesRepo, dishesRepo, winesRepo, legalPagesRepo, mediaRepo, languagesRepo, env.R2_PUBLIC_URL
  );

  return {
    // Expuestos para middlewares que leen directo sin UC (p.ej. `requireRestaurant`).
    repos: {
      restaurantsRepo, usersRepo, sessionsRepo,
      spacesRepo, dishesRepo, winesRepo, mediaRepo, languagesRepo
    },
    services: { hasher, storage },

    restaurants: {
      create: new CreateRestaurantUseCase(restaurantsRepo, languagesRepo),
      list: new ListRestaurantsUseCase(restaurantsRepo, usersRepo),
      get: new GetRestaurantUseCase(restaurantsRepo),
      patch: new PatchRestaurantUseCase(restaurantsRepo, languagesRepo),
      discard: new DiscardChangesUseCase(restaurantsRepo, languagesRepo),
      delete: new DeleteRestaurantUseCase(restaurantsRepo),
      pendingTasks: new GetPendingTasksUseCase(restaurantsRepo, spacesRepo, dishesRepo, winesRepo, legalPagesRepo, mediaRepo)
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
      update: new UpdateUserUseCase(usersRepo, restaurantsRepo, hasher, sessionsRepo),
      invite: new InviteUserUseCase(usersRepo, tokenGen, email, env.APP_URL),
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
      patch: new PatchSpaceUseCase(spacesRepo, restaurantsRepo),
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
      updateCategory: new UpdateWineCategoryUseCase(winesRepo),
      deleteCategory: new DeleteWineCategoryUseCase(winesRepo)
    },

    legalPages: {
      list: new ListLegalPagesUseCase(legalPagesRepo, restaurantsRepo),
      save: new SaveLegalPageUseCase(legalPagesRepo, restaurantsRepo),
      delete: new DeleteLegalPageUseCase(legalPagesRepo, restaurantsRepo)
    },

    public: {
      getSite,
      requestRebuild: new RequestSiteRebuildUseCase(restaurantsRepo, spacesRepo, rebuildHook),
      siteStatus: new GetSiteStatusUseCase(restaurantsRepo, getSite, new FetchSiteProbe())
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
