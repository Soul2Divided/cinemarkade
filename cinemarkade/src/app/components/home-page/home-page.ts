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
import { Loader } from '../loader/loader';
import { ItemHero } from './components/hero/hero';
import { Hero } from './components/hero/hero';
import { Genero } from './components/genero/genero';
import { CardPelicula } from './components/card-pelicula/card-pelicula';
import { ModalPelicula } from './components/modal-pelicula/modal-pelicula';

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

    readonly peliculas = computed(() =>
        this.peliculaService.peliculas().filter((pelicula) => pelicula.activa),
    );
    combos = signal<Combo[]>([]);
    productos = signal<Producto[]>([]);
    peliculaSeleccionada = signal<Pelicula | null>(null);

    mostrarLoader = signal<boolean>(false);

    peliculasEstrenos = computed(() => {
        return this.peliculas().slice(4, 8);
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
            const [, combos, productos] = await Promise.all([
                this.peliculaService.listarPeliculas(),
                this.comboService.listarCombos(),
                this.productoService.listarProductos(),
            ]);

            this.combos.set(combos || []);
            this.productos.set((productos || []).filter((producto) => producto.activa));
        } catch (error) {
            console.error('Error al cargar los datos de la homepage:', error);
        } finally {
            this.mostrarLoader.set(false);
        }
    }

    ejecutarAccionHero(heroItem: ItemHero): void {
        if (heroItem.esCombo) {
            this.router.navigate(['/menu']);
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

    irAFunciones(peliculaId: number): void {
        this.cerrarDetalle();
        this.router.navigate(['/funciones', peliculaId]);
    }

    private hoyEnBuenosAires(): string {
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

    private comboVigente(combo: Combo): boolean {
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
        }).format(new Date());
        const desde = combo.fecha_inicio?.slice(0, 10);
        const hasta = combo.fecha_fin?.slice(0, 10);
        return (!desde || desde <= hoy) && (!hasta || hasta >= hoy);
    }
}
