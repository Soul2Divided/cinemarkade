import { Component, signal, computed, output, input } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Pelicula } from '../../../../core/pelicula/pelicula.model';
import { CardPelicula } from '../card-pelicula/card-pelicula';


@Component({
    imports: [UpperCasePipe, CardPelicula],
    selector: 'app-genero',
    styleUrl: './genero.scss',
    templateUrl: './genero.html',
})
export class Genero {
    readonly peliculas = input.required<Pelicula[]>();
    seleccionarPelicula = output<Pelicula>();

    generoSeleccionado = signal<string | null>(null);

    generos = computed(() => {
        const generosUnicos = new Map<string, string>();
        for (const pelicula of this.peliculas()) {
            const nombre = pelicula.genero?.trim();
            if (!nombre) continue;
            const clave = this.normalizarGenero(nombre);
            if (!generosUnicos.has(clave)) generosUnicos.set(clave, nombre);
        }
        return [...generosUnicos.values()].sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' }),
        );
    });

    peliculasPorGenero = computed(() => {
        const seleccionado = this.generoSeleccionado();
        if (!seleccionado) return [];
        const clave = this.normalizarGenero(seleccionado);
        return this.peliculas().filter(
            (pelicula) => this.normalizarGenero(pelicula.genero) === clave,
        );
    });

    peliculasVisibles = computed(() =>
        this.generoSeleccionado() ? this.peliculasPorGenero() : this.peliculas(),
    );

    seleccionarGenero(genero: string): void {
        this.generoSeleccionado.update((actual) => (actual === genero ? null : genero));
    }

    limpiarGeneroSeleccionado(): void {
        this.generoSeleccionado.set(null);
    }

    contarPeliculasDelGenero(genero: string): number {
        const clave = this.normalizarGenero(genero);
        return this.peliculas().filter(
            (pelicula) => this.normalizarGenero(pelicula.genero) === clave,
        ).length;
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

    private normalizarGenero(genero: string): string {
        return genero
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase();
    }
}
