import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { Pelicula } from '../../core/pelicula/pelicula.model';

export interface ItemHero {
  id: number;
  nombre: string;
  banner: string;
  genero: string;
  duracion: number;
  restriccion_edad: string;
  sinopsis: string;
  esCombo?: boolean;
}

@Component({
  imports: [Navbar, CommonModule, UpperCasePipe],
  selector: 'app-home-page',
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})

export class HomePage implements OnInit {
  private peliculaService = inject(PeliculaService);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  peliculaSeleccionada = signal<Pelicula | null>(null);
  peliculaDestacada = computed(() => this.peliculas()[0] ?? null);

  generos: string[] = ['Acción', 'Ciencia Ficción', 'Terror', 'Aventura', 'Comedia', 'Animación'];

  indiceHeroActual: number = 0;

  elementosHero = computed<ItemHero[]>(() => {
    const pelisBanner: ItemHero[] = this.peliculas()
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
        esCombo: false
      }));

    const promosCandy: ItemHero[] = [
      {
        id: -1,
        nombre: 'COMBO POP & SODA',
        banner: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=1000',
        genero: 'CANDYBAR',
        duracion: 0,
        restriccion_edad: 'ATP',
        sinopsis: '¡Llevate un balde de pochoclos gigante + 2 gaseosas con 20% de descuento!',
        esCombo: true
      },
      {
        id: -2,
        nombre: 'CANDY ARCADE PACK',
        banner: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?q=80&w=1000',
        genero: 'PROMO',
        duracion: 0,
        restriccion_edad: 'ATP',
        sinopsis: '2 Entradas + Pochoclos XL + Golosinas a elección para disfrutar en pareja.',
        esCombo: true
      }
    ];

    return [...pelisBanner, ...promosCandy];
  });

  heroActual = computed(() => {
    const lista = this.elementosHero();
    return lista[this.indiceHeroActual] ?? null;
  });

  peliculasTendencias = computed(() => {
    return this.peliculas().slice(0, 4);
  });

  peliculasEstrenos = computed(() => {
    return this.peliculas().slice(4, 8);
  });

  peliculasProximas = computed(() => {
    return this.peliculas().slice(8, 12);
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.peliculaService.listarPeliculas();
      this.peliculas.set((data || []).filter(p => p.activa));
    } catch (error) {
      console.error('Error al cargar la cartelera:', error);
    }
  }

  seleccionarHero(index: number): void {
    this.indiceHeroActual = index;
  }

  ejecutarAccionHero(heroItem: ItemHero): void {
    if (heroItem.esCombo) {
      this.router.navigate(['/candybar']);
    } else {
      const peliculaEncontrada = this.peliculas().find(p => p.id === heroItem.id);
      if (peliculaEncontrada) {
        this.seleccionarPelicula(peliculaEncontrada);
      }
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
}
