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
import { CuponRepository } from './core/cupon/cupon.repository';
import { SupabaseCuponAdapter } from './core/cupon/supabase-cupon.adapter';
import { ComboRepository } from './core/combo/combo.repository';
import { SupabaseComboAdapter } from './core/combo/supabase-combo.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: UserRepository, useClass: SupabaseUserAdapter },
    { provide: PeliculaRepository, useClass: SupabasePeliculaAdapter },
    { provide: SalaRepository, useClass: SupabaseSalaAdapter },
    { provide: ProductoRepository, useClass: SupabaseProductoAdapter },
    { provide: FuncionRepository, useClass: SupabaseFuncionAdapter},
    { provide: CuponRepository, useClass: SupabaseCuponAdapter},
    { provide: ComboRepository, useClass: SupabaseComboAdapter}
  ]
};
