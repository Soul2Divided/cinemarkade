import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { CompraService } from '../../../core/compra/compra.service';
import { registrarErrorUsuario } from '../../../core/services/error-usuario';
import { Funcion, Proyeccion } from '../../../core/funcion/funcion.model';
import { FuncionService } from '../../../core/funcion/funcion.service';
import { Pelicula } from '../../../core/pelicula/pelicula.model';
import { PeliculaService } from '../../../core/pelicula/pelicula.service';
import { ResenaService } from '../../../core/resena/resena.service';
import { Navbar } from '../../navbar/navbar';

interface PeliculaVista {
    compraId: string;
    pelicula: Pelicula;
    fechaVista: string;
    horario: string;
    estrellas: number | null;
}

@Component({
    selector: 'app-mis-peliculas',
    imports: [DatePipe, Navbar, RouterLink],
    templateUrl: './mis-peliculas.html',
    styleUrl: './mis-peliculas.scss',
})
export class MisPeliculas implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly compraService = inject(CompraService);
    private readonly funcionService = inject(FuncionService);
    private readonly peliculaService = inject(PeliculaService);
    private readonly resenaService = inject(ResenaService);

    readonly peliculas = signal<PeliculaVista[]>([]);
    readonly cargando = signal(true);
    readonly error = signal('');

    ngOnInit(): void {
        void this.cargarPeliculas();
    }

    async cargarPeliculas(): Promise<void> {
        this.cargando.set(true);
        this.error.set('');

        try {
            const usuarioId = this.authService.usuarioActual()?.id;

            if (!usuarioId) {
                throw new Error('Iniciá sesión para consultar tus películas.');
            }

            const compras = await this.compraService.listarPorUsuario(usuarioId);
            const comprasValidas = compras.filter(
                (compra) =>
                    ['confirmada', 'utilizada'].includes(compra.estado?.toLowerCase() ?? '') &&
                    compra.proyeccion_id !== null,
            );

            if (comprasValidas.length === 0) {
                this.peliculas.set([]);
                return;
            }

            const [funciones, resenas] = await Promise.all([
                this.funcionService.listarFunciones(),
                this.resenaService.listarPropias(),
            ]);
            const proyeccionesPorId = this.crearIndiceProyecciones(funciones);
            const fechaActual = Date.now();
            const vistas: Array<{
                compraId: string;
                peliculaId: number;
                fechaVista: string;
                horario: string;
                instante: number;
            }> = [];

            for (const compra of comprasValidas) {
                const proyeccion = proyeccionesPorId.get(compra.proyeccion_id!);

                if (!proyeccion) {
                    continue;
                }

                const fechaVista = this.fechaDeProyeccion(proyeccion.funcion, proyeccion.proyeccion);

                const instante = new Date(fechaVista).getTime();

                if (instante > fechaActual) {
                    continue;
                }

                vistas.push({
                    compraId: compra.id,
                    peliculaId: proyeccion.funcion.pelicula_id,
                    fechaVista: `${proyeccion.funcion.fecha}T12:00:00Z`,
                    horario: proyeccion.proyeccion.horario.slice(0, 5),
                    instante,
                });
            }

            const peliculasPorId = new Map<number, Pelicula>();
            const idsPeliculas = [...new Set(vistas.map((vista) => vista.peliculaId))];

            await Promise.all(
                idsPeliculas.map(async (peliculaId) => {
                    peliculasPorId.set(peliculaId, await this.peliculaService.obtenerPorId(peliculaId));
                }),
            );

            const peliculas = vistas.map((vista) => ({
                compraId: vista.compraId,
                pelicula: peliculasPorId.get(vista.peliculaId)!,
                fechaVista: vista.fechaVista,
                horario: vista.horario,
                instante: vista.instante,
                estrellas:
                    resenas.find((resena) => resena.pelicula_id === vista.peliculaId)?.estrellas ?? null,
            }));

            peliculas.sort((a, b) => b.instante - a.instante);
            this.peliculas.set(
                peliculas.map(({ compraId, pelicula, fechaVista, horario, estrellas }) => ({
                    compraId,
                    pelicula,
                    fechaVista,
                    horario,
                    estrellas,
                })),
            );
        } catch (error) {
            this.error.set(registrarErrorUsuario('Error al cargar Mis películas:', error));
        } finally {
            this.cargando.set(false);
        }
    }

    private crearIndiceProyecciones(
        funciones: Funcion[],
    ): Map<number, { funcion: Funcion; proyeccion: Proyeccion }> {
        const indice = new Map<number, { funcion: Funcion; proyeccion: Proyeccion }>();

        for (const funcion of funciones) {
            for (const proyeccion of funcion.proyecciones) {
                indice.set(proyeccion.id, { funcion, proyeccion });
            }
        }

        return indice;
    }

    private fechaDeProyeccion(funcion: Funcion, proyeccion: Proyeccion): string {
        const horario =
            proyeccion.horario.length === 5
                ? `${proyeccion.horario}:00`
                : proyeccion.horario;

        return `${funcion.fecha}T${horario}-03:00`;
    }
}
