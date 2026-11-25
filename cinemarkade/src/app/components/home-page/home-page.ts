import { registrarErrorUsuario } from '../../core/services/error-usuario';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';
import { ComboService } from '../../core/combo/combo.service';
import { Combo } from '../../core/combo/combo.model';
import { ProductoService } from '../../core/producto/producto.service';
import { Producto } from '../../core/producto/producto.model';
import { FuncionService } from '../../core/funcion/funcion.service';
import { Funcion } from '../../core/funcion/funcion.model';
import { Loader } from '../loader/loader';
import { ItemHero } from './components/hero/hero';
import { Hero } from './components/hero/hero';
import { Genero } from './components/genero/genero';
import { CardPelicula } from './components/card-pelicula/card-pelicula';
import { ModalPelicula } from './components/modal-pelicula/modal-pelicula';
import { AuthService } from '../../auth/auth.service';
import { NotificacionService } from '../../core/notificacion/notificacion.service';
import { environment } from '../../../environments/environment';

@Component({
    imports: [Navbar, CommonModule, Loader, Hero, Genero, CardPelicula, ModalPelicula],
    selector: 'app-home-page',
    styleUrl: './home-page.scss',
    templateUrl: './home-page.html',
})

export class HomePage implements OnInit {
    private peliculaService = inject(PeliculaService);
    private comboService = inject(ComboService);
    private productoService = inject(ProductoService);
    private funcionService = inject(FuncionService);
    private router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly notificacionService = inject(NotificacionService);

    readonly ventasPorPelicula = signal<Map<number, number>>(new Map());
    readonly errorRanking = signal('');
    readonly peliculas = computed(() =>
        [...this.peliculaService.peliculas().filter((pelicula) => pelicula.activa)].sort((a, b) =>
            (this.ventasPorPelicula().get(b.id) ?? 0) - (this.ventasPorPelicula().get(a.id) ?? 0)
            || a.nombre.localeCompare(b.nombre, 'es'),
        ),
    );
    readonly topTresPeliculas = computed(() =>
        this.peliculas()
            .map(pelicula => ({ pelicula, entradas: this.ventasPorPelicula().get(pelicula.id) ?? 0 }))
            .filter(item => item.entradas > 0)
            .slice(0, 3),
    );
    combos = signal<Combo[]>([]);
    productos = signal<Producto[]>([]);
    peliculaSeleccionada = signal<Pelicula | null>(null);
    funciones = signal<Funcion[]>([]);
    idsConRecordatorio = signal<Set<number>>(new Set());
    funcionConRecordatorioEnProceso = signal<number | null>(null);
    mensajeRecordatorio = signal('');

    mostrarLoader = signal<boolean>(false);

    estrenosProgramados = computed(() => {
        const hoy = this.hoyEnBuenosAires();
        return this.funciones()
            .filter((funcion) => funcion.es_estreno && this.tieneFuncionFutura(funcion, hoy))
            .flatMap((funcion) => {
                const pelicula = this.peliculas().find((item) => item.id === funcion.pelicula_id);

                return pelicula ? [{ pelicula, funcion }] : [];
            });
    });

    preventasProgramadas = computed(() => {
        const hoy = this.hoyEnBuenosAires();
        const porPelicula = new Map<number, Funcion>();
        const funciones = this.funciones()
            .filter((funcion) => funcion.es_preventa && this.tieneFuncionFutura(funcion, hoy))
            .sort(
                (a, b) =>
                    (a.fecha_disponible_preventa ?? '').localeCompare(
                        b.fecha_disponible_preventa ?? '',
                    ) || a.fecha.localeCompare(b.fecha),
            );

        for (const funcion of funciones) {
            if (!porPelicula.has(funcion.pelicula_id)) {
                porPelicula.set(funcion.pelicula_id, funcion);
            }
        }

        return [...porPelicula.values()].flatMap((funcion) => {
            const pelicula = this.peliculas().find((item) => item.id === funcion.pelicula_id);

            return pelicula && funcion.fecha_disponible_preventa
                ? [{ pelicula, funcion, fechaDisponible: funcion.fecha_disponible_preventa }]
                : [];
        });
    });

    elementosHero = computed<ItemHero[]>(() => {
            const peliculasDestacadas = this.peliculas()
                .filter((p) => p.banner && p.banner.trim() !== '')
                .slice(0, 3)
                .map((p) => ({
                    id: p.id,
                    nombre: p.nombre,
                    banner: p.banner!,
                    genero: p.genero,
                    duracion: p.duracion,
                    restriccion_edad: p.restriccion_edad,
                    sinopsis: p.sinopsis,
                    esCombo: false,
                }));
    
            const combosDestacados = this.combos()
                .filter((combo) => combo.activo && combo.destacado && this.comboVigente(combo))
                .map((combo) => {
                    const primerProducto = combo.items
                        ?.map((item) =>
                            this.productos().find((producto) => producto.id === item.producto_id),
                        )
                        .find((producto): producto is Producto => !!producto);
                    return {
                        id: -combo.id,
                        nombre: combo.nombre,
                        banner: combo.imagen || primerProducto?.imagen || '',
                        genero: 'CANDY BAR',
                        duracion: 0,
                        restriccion_edad: '',
                        sinopsis:
                            combo.descripcion ||
                            'Una oferta especial para disfrutar durante la película.',
                        esCombo: true,
                        precio: combo.precio,
                    };
                })
                .filter((combo) => combo.banner.trim() !== '');
    
            return [...peliculasDestacadas, ...combosDestacados];
        });

    async ngOnInit(): Promise<void> {
        this.mostrarLoader.set(true);

        try {
            const [, combos, productos, funciones, ventas] = await Promise.all([
                this.peliculaService.listarPeliculas(),
                this.comboService.listarCombos(),
                this.productoService.listarProductos(),
                this.funcionService.listarFuncionesActivas(),
                this.peliculaService.obtenerVentasPorPelicula().catch((error) => {
                    console.error('No se pudo cargar el ranking de películas:', error);
                    this.errorRanking.set(
                        registrarErrorUsuario('Error en home-page.ts:', error),
                    );
                    return [];
                }),
            ]);

            this.combos.set(combos || []);
            this.productos.set((productos || []).filter((producto) => producto.activa));
            this.funciones.set(funciones || []);
            this.ventasPorPelicula.set(new Map(ventas.map(item => [item.pelicula_id, item.entradas_vendidas])));
        } catch (error) {
            console.error('Error al cargar los datos de la homepage:', error);
        } finally {
            this.mostrarLoader.set(false);
        }
    }

    ejecutarAccionHero(heroItem: ItemHero): void {
        if (heroItem.esCombo) {
            this.router.navigate(['/tienda']);
            return;
        }
        const peliculaEncontrada = this.peliculas().find((p) => p.id === heroItem.id);
        if (peliculaEncontrada) {
            this.seleccionarPelicula(peliculaEncontrada);
        }
    }

    seleccionarPelicula(pelicula: Pelicula): void {
        this.peliculaSeleccionada.set(pelicula);
    }

    cerrarDetalle(): void {
        this.peliculaSeleccionada.set(null);
    }

    async activarRecordatorio(funcion: Funcion): Promise<void> {
        if (this.funcionConRecordatorioEnProceso() !== null) {
            return;
        }

        if (!this.authService.usuarioActual()) {
            this.mensajeRecordatorio.set('Iniciá sesión para activar un recordatorio de estreno.');
            return;
        }

        this.funcionConRecordatorioEnProceso.set(funcion.id);
        this.mensajeRecordatorio.set('');

        try {
            await this.notificacionService.suscribirPush(
                this.authService.usuarioActual()!.id,
                environment.VAPID_PUBLIC_KEY,
            );
            await this.notificacionService.activarRecordatorioEstreno(funcion.id);
            this.idsConRecordatorio.update((actuales) => new Set([...actuales, funcion.id]));
            this.mensajeRecordatorio.set('Te avisaremos el día del estreno.');
        } catch (error) {
            this.mensajeRecordatorio.set(
                registrarErrorUsuario('Error en home-page.ts:', error),
            );
        } finally {
            this.funcionConRecordatorioEnProceso.set(null);
        }
    }

    irAFunciones(peliculaId: number): void {
        this.cerrarDetalle();
        this.router.navigate(['/funciones', peliculaId]);
    }

    hoyEnBuenosAires(): string {
        const partes = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date());
        const get = (type: string) => partes.find((part) => part.type === type)!.value;
        return `${get('year')}-${get('month')}-${get('day')}`;
    }

    private horaEnBuenosAires(): string {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date());
        const get = (type: string) => parts.find((part) => part.type === type)!.value;
        return `${get('hour')}:${get('minute')}`;
    }

    private tieneFuncionFutura(funcion: Funcion, hoy: string): boolean {
        return (
            funcion.activa &&
            funcion.fecha >= hoy &&
            funcion.proyecciones.some(
                (proyeccion) =>
                    proyeccion.activa &&
                    (funcion.fecha > hoy || proyeccion.horario.slice(0, 5) > this.horaEnBuenosAires()),
            )
        );
    }

    private comboVigente(combo: Combo): boolean {
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
        }).format(new Date());
        const desde = combo.fecha_inicio?.slice(0, 10);
        const hasta = combo.fecha_fin?.slice(0, 10);
        return (!desde || desde <= hoy) && (!hasta || hasta >= hoy);
    }
}
