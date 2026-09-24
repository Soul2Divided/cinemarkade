import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { UserRepository } from './core/user/user.repository';
import { SupabaseUserAdapter } from './core/user/supabase-user.adapter';
import { PeliculaRepository } from './core/pelicula/pelicula.repository';
import { SupabasePeliculaAdapter } from './core/pelicula/supabase-pelicula.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: UserRepository, useClass: SupabaseUserAdapter },
    { provide: PeliculaRepository, useClass: SupabasePeliculaAdapter }
  ]
};
