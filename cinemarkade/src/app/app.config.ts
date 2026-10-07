import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
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
import { CompraRepository } from './core/compra/compra.repository';
import { SupabaseCompraAdapter } from './core/compra/supabase-compra.adapter';
import { DetalleCompraRepository } from './core/detalle-compra/detalle-compra.repository';
import { SupabaseDetalleCompraAdapter } from './core/detalle-compra/supabase-detalle-compra.adapter';
import { TarifaFormatoRepository } from './core/tarifa-formato/tarifa-formato.repository';
import { SupabaseTarifaFormatoAdapter } from './core/tarifa-formato/supabase-tarifa-formato.adapter';
import { ButacaRepository } from './core/butaca/butaca.repository';
import { SupabaseButacaAdapter } from './core/butaca/supabase-butaca.adapter';
import { ButacaProyeccionRepository } from './core/butaca-proyeccion/butaca-proyeccion.repository';
import { SupabaseButacaProyeccionAdapter } from './core/butaca-proyeccion/supabase-butaca-proyeccion.adapter';

registerLocaleData(localeEsAr, 'es-AR');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-AR' },
    provideBrowserGlobalErrorListeners(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideRouter(routes),
    { provide: UserRepository, useClass: SupabaseUserAdapter },
    { provide: PeliculaRepository, useClass: SupabasePeliculaAdapter },
    { provide: SalaRepository, useClass: SupabaseSalaAdapter },
    { provide: ProductoRepository, useClass: SupabaseProductoAdapter },
    { provide: FuncionRepository, useClass: SupabaseFuncionAdapter},
    { provide: CuponRepository, useClass: SupabaseCuponAdapter},
    { provide: ComboRepository, useClass: SupabaseComboAdapter},
    { provide: CompraRepository, useClass: SupabaseCompraAdapter},
    { provide: DetalleCompraRepository, useClass: SupabaseDetalleCompraAdapter},
    { provide: TarifaFormatoRepository, useClass: SupabaseTarifaFormatoAdapter},
    { provide: ButacaRepository, useClass: SupabaseButacaAdapter},
    { provide: ButacaProyeccionRepository, useClass: SupabaseButacaProyeccionAdapter}
  ]
};
