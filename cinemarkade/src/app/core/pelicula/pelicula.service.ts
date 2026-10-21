import { Injectable, Inject, signal } from '@angular/core';

import { PeliculaRepository } from './pelicula.repository';
import { Pelicula, PeliculaInput, RESTRICCIONES_EDAD } from './pelicula.model';

@Injectable({ providedIn: 'root' })
export class PeliculaService {
    private readonly catalogo = signal<Pelicula[]>([]);
    private readonly cargado = signal(false);
    private cargaPendiente: Promise<Pelicula[]> | null = null;
    private versionCatalogo = 0;

    readonly peliculas = this.catalogo.asReadonly();
    readonly catalogoCargado = this.cargado.asReadonly();

    constructor(@Inject(PeliculaRepository) private peliculaRepository: PeliculaRepository) {}

    async listarPeliculas(): Promise<Pelicula[]> {
        if (this.cargado()) {
            return this.catalogo();
        }

        if (this.cargaPendiente) {
            return this.cargaPendiente;
        }

        const version = this.versionCatalogo;
        const consulta = this.peliculaRepository.listar().then((peliculas) => {
            if (version !== this.versionCatalogo) {
                return this.listarPeliculas();
            }

            this.catalogo.set(peliculas);
            this.cargado.set(true);

            return peliculas;
        });

        this.cargaPendiente = consulta;

        try {
            return await consulta;
        } finally {
            if (this.cargaPendiente === consulta) {
                this.cargaPendiente = null;
            }
        }
    }

    async obtenerPorId(id: number): Promise<Pelicula> {
        return this.peliculaRepository.obtenerPorId(id);
    }

    async crearPelicula(datos: PeliculaInput): Promise<Pelicula> {
        this.validarDatosBasicos(datos);
        const pelicula = await this.peliculaRepository.crear(datos);
        this.actualizarCatalogo(pelicula);

        return pelicula;
    }

    async actualizarPelicula(id: number, datos: PeliculaInput): Promise<Pelicula> {
        this.validarDatosBasicos(datos);
        const pelicula = await this.peliculaRepository.actualizar(id, datos);
        this.actualizarCatalogo(pelicula);

        return pelicula;
    }

    async cambiarActiva(id: number, activa: boolean): Promise<void> {
        await this.peliculaRepository.cambiarActiva(id, activa);
        this.versionCatalogo++;
        this.cargaPendiente = null;
        this.catalogo.update((peliculas) =>
            peliculas.map((pelicula) => (pelicula.id === id ? { ...pelicula, activa } : pelicula)),
        );
    }

    private actualizarCatalogo(pelicula: Pelicula): void {
        this.versionCatalogo++;
        this.cargaPendiente = null;

        if (!this.cargado()) {
            return;
        }

        this.catalogo.update((peliculas) =>
            [...peliculas.filter((actual) => actual.id !== pelicula.id), pelicula].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es'),
            ),
        );
    }

    private validarDatosBasicos(datos: PeliculaInput): void {
        if (!datos.nombre || !datos.nombre.trim()) {
            throw new Error('El nombre de la película es obligatorio');
        }
        if (!datos.genero) {
            throw new Error('Debe seleccionar un género');
        }
        if (!datos.duracion || datos.duracion < 1) {
            throw new Error('La duración debe ser mayor a 0 minutos');
        }
        if (!datos.imagen || !datos.imagen.trim()) {
            throw new Error('La imagen es obligatoria');
        }
        if (!datos.sinopsis || !datos.sinopsis.trim()) {
            throw new Error('La sinopsis es obligatoria');
        }
        if (!RESTRICCIONES_EDAD.includes(datos.restriccion_edad)) {
            throw new Error('Debe seleccionar una restricción de edad válida');
        }
    }
}
