import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';
import { ComboService } from '../../core/combo/combo.service';
import { Combo } from '../../core/combo/combo.model';
import { ProductoService } from '../../core/producto/producto.service';
import { Producto } from '../../core/producto/producto.model';
import { FuncionService } from '../../core/funcion/funcion.service';

export interface ItemHero {
  id: number;
  nombre: string;
  banner: string;
  genero: string;
  duracion: number;
  restriccion_edad: string;
  sinopsis: string;
  esCombo?: boolean;
  precio?: number;
}

@Component({
  imports: [Navbar, CommonModule, UpperCasePipe],
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

  peliculas = signal<Pelicula[]>([]);
  combos = signal<Combo[]>([]);
  productos = signal<Producto[]>([]);
  peliculaSeleccionada = signal<Pelicula | null>(null);
  generoSeleccionado = signal<string | null>(null);

  generos = computed(() => {
    const generosUnicos = new Map<string, string>();
    for (const pelicula of this.peliculas()) {
      const nombre = pelicula.genero?.trim();
      if (!nombre) continue;
      const clave = this.normalizarGenero(nombre);
      if (!generosUnicos.has(clave)) generosUnicos.set(clave, nombre);
    }
    return [...generosUnicos.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  });

  peliculasPorGenero = computed(() => {
    const seleccionado = this.generoSeleccionado();
    if (!seleccionado) return [];
    const clave = this.normalizarGenero(seleccionado);
    return this.peliculas().filter(pelicula => this.normalizarGenero(pelicula.genero) === clave);
  });

  indiceHeroActual: number = 0;

  elementosHero = computed<ItemHero[]>(() => {
    const peliculasDestacadas = this.peliculas()
      .filter(p => p.banner && p.banner.trim() !== '')
      .slice(0, 3)
      .map(p => ({
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
      .filter(combo => combo.activo && combo.destacado && this.comboVigente(combo))
      .map(combo => {
        const primerProducto = combo.items?.map(item =>
          this.productos().find(producto => producto.id === item.producto_id)
        ).find((producto): producto is Producto => !!producto);
        return {
          id: -combo.id,
          nombre: combo.nombre,
          banner: combo.imagen || primerProducto?.imagen || '',
          genero: 'CANDY BAR',
          duracion: 0,
          restriccion_edad: '',
          sinopsis: combo.descripcion || 'Una oferta especial para disfrutar durante la película.',
          esCombo: true,
          precio: combo.precio,
        };
      })
      .filter(combo => combo.banner.trim() !== '');

    return [...peliculasDestacadas, ...combosDestacados];
  });

  peliculasEstrenos = computed(() => {
    return this.peliculas().slice(4, 8);
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.peliculaService.listarPeliculas();
      this.peliculas.set((data || []).filter(p => p.activa));
    } catch (error) {
      console.error('Error al cargar la cartelera:', error);
    }

    try {
      const [combos, productos] = await Promise.all([
        this.comboService.listarCombos(),
        this.productoService.listarProductos(),
      ]);
      this.combos.set(combos || []);
      this.productos.set((productos || []).filter(producto => producto.activa));
    } catch (error) {
      console.error('Error al cargar los combos destacados:', error);
    }

  }

  seleccionarHero(index: number): void {
    this.indiceHeroActual = index;
  }

  ejecutarAccionHero(heroItem: ItemHero): void {
    if (heroItem.esCombo) {
      this.router.navigate(['/menu']);
      return;
    }
    const peliculaEncontrada = this.peliculas().find(p => p.id === heroItem.id);
    if (peliculaEncontrada) {
      this.seleccionarPelicula(peliculaEncontrada);
    }
  }

  seleccionarGenero(genero: string): void {
    this.generoSeleccionado.update(actual => actual === genero ? null : genero);
  }

  limpiarGeneroSeleccionado(): void {
    this.generoSeleccionado.set(null);
  }

  contarPeliculasDelGenero(genero: string): number {
    const clave = this.normalizarGenero(genero);
    return this.peliculas().filter(pelicula => this.normalizarGenero(pelicula.genero) === clave).length;
  }

  iconoGenero(genero: string): string {
    const clave = this.normalizarGenero(genero);
    if (clave.includes('accion')) return '🥊';
    if (clave.includes('ciencia')) return '👽';
    if (clave.includes('terror')) return '👻';
    if (clave.includes('aventura')) return '🧭';
    if (clave.includes('comedia')) return '🎭';
    if (clave.includes('animacion')) return '🎨';
    if (clave.includes('drama')) return '🎬';
    return '👾';
  }

  async seleccionarPelicula(pelicula: Pelicula): Promise<void> {
    try {
      const funciones = await this.funcionService.listarFuncionesPorPelicula(pelicula.id);
      const hoy = this.hoyEnBuenosAires();
      const tieneHorarioDisponible = funciones.some(funcion =>
        funcion.activa && funcion.fecha >= hoy && funcion.proyecciones.some(proyeccion =>
          proyeccion.activa && (funcion.fecha > hoy || proyeccion.horario.slice(0, 5) > this.horaEnBuenosAires())
        )
      );
      if (tieneHorarioDisponible) {
        await this.router.navigate(['/funciones', pelicula.id]);
        return;
      }
    } catch (error) {
      console.error('No se pudieron consultar las funciones de la película:', error);
    }
    this.peliculaSeleccionada.set(pelicula);
  }

  cerrarDetalle(): void {
    this.peliculaSeleccionada.set(null);
  }

  irAFunciones(peliculaId: number): void {
    this.cerrarDetalle();
    this.router.navigate(['/funciones', peliculaId]);
  }

  private normalizarGenero(genero: string): string {
    return genero.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  }

  private comboVigente(combo: Combo): boolean {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    const desde = combo.fecha_inicio?.slice(0, 10);
    const hasta = combo.fecha_fin?.slice(0, 10);
    return (!desde || desde <= hoy) && (!hasta || hasta >= hoy);
  }

  private hoyEnBuenosAires(): string {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const get = (type: string) => partes.find(part => part.type === type)!.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private horaEnBuenosAires(): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)!.value;
    return `${get('hour')}:${get('minute')}`;
  }
}
