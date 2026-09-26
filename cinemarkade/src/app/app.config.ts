import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { UserRepository } from './core/user/user.repository';
import { SupabaseUserAdapter } from './core/user/supabase-user.adapter';
import { PeliculaRepository } from './core/pelicula/pelicula.repository';
import { SupabasePeliculaAdapter } from './core/pelicula/supabase-pelicula.adapter';
import { SalaRepository } from './core/sala/sala.repository';
import { SupabaseSalaAdapter } from './core/sala/supabase-sala.adapter';
import { ProductoRepository } from './core/producto/producto.repository';
import { SupabaseProductoAdapter } from './core/producto/supabase-producto.adapter';
import { FuncionRepository } from './core/funcion/funcion.repository';
import { SupabaseFuncionAdapter } from './core/funcion/supabase-funcion.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: UserRepository, useClass: SupabaseUserAdapter },
    { provide: PeliculaRepository, useClass: SupabasePeliculaAdapter },
    { provide: SalaRepository, useClass: SupabaseSalaAdapter },
    { provide: ProductoRepository, useClass: SupabaseProductoAdapter },
    { provide: FuncionRepository, useClass: SupabaseFuncionAdapter}
  ]
};
