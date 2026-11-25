import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import {
    DatoGraficoReporte,
    EstadisticasReporte,
    ReporteVentasDiario,
} from './reporte-ventas.model';
import { ReporteVentasRepository } from './reporte-ventas.repository';

interface CompraReporte {
    id: string;
    total: number | string;
    proyeccion_id: number | null;
}

interface FuncionVistas {
    id: number;
    pelicula_id: number;
}

interface ProyeccionVistas {
    id: number;
    funcion_id: number;
}

interface CompraVistas {
    id: string;
    proyeccion_id: number;
}

interface ButacaReporte {
    compra_id: string;
}

interface DetalleCandyReporte {
    producto_id: number;
    nombre_item: string;
    cantidad: number | string;
}

interface PeliculaReporte {
    id: number;
    nombre: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseReporteVentasAdapter implements ReporteVentasRepository {
    private readonly limitePagina = 1000;
    private readonly tamanoLote = 500;

    constructor(private readonly supabaseService: SupabaseService) {}

    async obtenerPorDia(fecha: string): Promise<ReporteVentasDiario> {
        const compras = await this.listarComprasDelDia(fecha);

        if (compras.length === 0) {
            return {
                fecha,
                facturacionEntradasPesos: 0,
                facturacionCandyPesos: 0,
                facturacionPesos: 0,
                entradasVendidas: 0,
            };
        }

        const comprasDeEntradas = compras.filter((compra) => compra.proyeccion_id !== null);
        const comprasCandy = compras.filter((compra) => compra.proyeccion_id === null);
        const butacasVendidas = comprasDeEntradas.length
            ? await this.contarButacas(comprasDeEntradas.map((compra) => compra.id))
            : 0;
        const facturacionEntradasPesos = this.totalCompras(comprasDeEntradas);
        const facturacionCandyPesos = this.totalCompras(comprasCandy);

        return {
            fecha,
            facturacionEntradasPesos,
            facturacionCandyPesos,
            facturacionPesos: facturacionEntradasPesos + facturacionCandyPesos,
            entradasVendidas: butacasVendidas,
        };
    }

    private totalCompras(compras: CompraReporte[]): number {
        const totalCentavos = compras.reduce(
            (total, compra) => total + Math.round(Number(compra.total || 0) * 100),
            0,
        );

        return totalCentavos / 100;
    }

    async obtenerEstadisticas(anio: number, mes: number, semana: number): Promise<EstadisticasReporte> {
        const rangoSemana = this.rangoSemanaDelMes(anio, mes, semana);
        const rangoMes = this.rangoMes(anio, mes);
        const [peliculasSemana, peliculasMes, productosCandy] = await Promise.all([
            this.obtenerPeliculasVistas(...rangoSemana),
            this.obtenerPeliculasVistas(...rangoMes),
            this.obtenerProductosCandyMasVendidos(),
        ]);

        return { peliculasSemana, peliculasMes, productosCandy };
    }

    private async obtenerPeliculasVistas(
        desde: string,
        hasta: string,
    ): Promise<DatoGraficoReporte[]> {
        const funciones = await this.listarFunciones(desde, hasta);
        if (funciones.length === 0) {
            return [];
        }

        const proyecciones = await this.listarProyecciones(funciones.map(funcion => funcion.id));
        if (proyecciones.length === 0) {
            return [];
        }

        const compras = await this.listarComprasUtilizadas(proyecciones.map(proyeccion => proyeccion.id));
        if (compras.length === 0) {
            return [];
        }

        const butacas = await this.listarButacasUtilizadas(compras.map(compra => compra.id));
        const proyeccionPorCompra = new Map(compras.map(compra => [compra.id, compra.proyeccion_id]));
        const peliculaPorFuncion = new Map(funciones.map(funcion => [funcion.id, funcion.pelicula_id]));
        const funcionPorProyeccion = new Map(proyecciones.map(proyeccion => [proyeccion.id, proyeccion.funcion_id]));
        const vistasPorPelicula = new Map<number, number>();

        for (const butaca of butacas) {
            const proyeccionId = proyeccionPorCompra.get(butaca.compra_id);
            const funcionId = proyeccionId ? funcionPorProyeccion.get(proyeccionId) : undefined;
            const peliculaId = funcionId ? peliculaPorFuncion.get(funcionId) : undefined;

            if (peliculaId) {
                vistasPorPelicula.set(peliculaId, (vistasPorPelicula.get(peliculaId) ?? 0) + 1);
            }
        }

        return this.topPeliculas(vistasPorPelicula);
    }

    private async listarFunciones(desde: string, hasta: string): Promise<FuncionVistas[]> {
        const filas: FuncionVistas[] = [];
        const cliente = this.supabaseService.supabaseClient;

        for (let offset = 0; ; offset += this.limitePagina) {
            const { data, error } = await cliente.from('funcion')
                .select('id, pelicula_id')
                .gte('fecha', desde)
                .lt('fecha', hasta)
                .order('fecha', { ascending: true })
                .range(offset, offset + this.limitePagina - 1);

            if (error) {
                throw new Error(`No se pudieron consultar las funciones del período: ${error.message}`);
            }

            filas.push(...((data ?? []) as FuncionVistas[]));
            if (!data || data.length < this.limitePagina) {
                return filas;
            }
        }
    }

    private async listarProyecciones(funcionIds: number[]): Promise<ProyeccionVistas[]> {
        const filas: ProyeccionVistas[] = [];
        const cliente = this.supabaseService.supabaseClient;

        for (const lote of this.dividirEnLotes(funcionIds)) {
            for (let offset = 0; ; offset += this.limitePagina) {
                const { data, error } = await cliente.from('proyeccion')
                    .select('id, funcion_id')
                    .in('funcion_id', lote)
                    .range(offset, offset + this.limitePagina - 1);

                if (error) {
                    throw new Error(`No se pudieron consultar los horarios del período: ${error.message}`);
                }

                filas.push(...((data ?? []) as ProyeccionVistas[]));
                if (!data || data.length < this.limitePagina) {
                    break;
                }
            }
        }

        return filas;
    }

    private async listarComprasUtilizadas(proyeccionIds: number[]): Promise<CompraVistas[]> {
        const filas: CompraVistas[] = [];
        const cliente = this.supabaseService.supabaseClient;

        for (const lote of this.dividirEnLotes(proyeccionIds)) {
            for (let offset = 0; ; offset += this.limitePagina) {
                const { data, error } = await cliente.from('compra')
                    .select('id, proyeccion_id')
                    .eq('estado', 'utilizada')
                    .in('proyeccion_id', lote)
                    .range(offset, offset + this.limitePagina - 1);

                if (error) {
                    throw new Error(`No se pudieron consultar las entradas utilizadas: ${error.message}`);
                }

                filas.push(...((data ?? []) as CompraVistas[]));
                if (!data || data.length < this.limitePagina) {
                    break;
                }
            }
        }

        return filas;
    }

    private async listarButacasUtilizadas(compraIds: string[]): Promise<ButacaReporte[]> {
        const filas: ButacaReporte[] = [];
        const cliente = this.supabaseService.supabaseClient;

        for (const lote of this.dividirEnLotes(compraIds)) {
            for (let offset = 0; ; offset += this.limitePagina) {
                const { data, error } = await cliente.from('compra_butaca')
                    .select('compra_id')
                    .in('compra_id', lote)
                    .range(offset, offset + this.limitePagina - 1);

                if (error) {
                    throw new Error(`No se pudieron consultar las entradas utilizadas: ${error.message}`);
                }

                filas.push(...((data ?? []) as ButacaReporte[]));
                if (!data || data.length < this.limitePagina) {
                    break;
                }
            }
        }

        return filas;
    }

    private async topPeliculas(vistasPorPelicula: Map<number, number>): Promise<DatoGraficoReporte[]> {
        const peliculas = new Map<number, string>();
        const cliente = this.supabaseService.supabaseClient;

        for (const lote of this.dividirEnLotes([...vistasPorPelicula.keys()])) {
            const { data, error } = await cliente.from('pelicula')
                .select('id, nombre')
                .in('id', lote);

            if (error) {
                throw new Error(`No se pudieron cargar los nombres de películas: ${error.message}`);
            }

            for (const pelicula of (data ?? []) as PeliculaReporte[]) {
                peliculas.set(pelicula.id, pelicula.nombre);
            }
        }

        const ordenadas = [...vistasPorPelicula.entries()]
            .map(([id, cantidad]) => ({ etiqueta: peliculas.get(id) ?? 'Película sin nombre', cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
        const principales = ordenadas.slice(0, 5);
        const otrasVistas = ordenadas.slice(5).reduce((total, pelicula) => total + pelicula.cantidad, 0);

        if (otrasVistas > 0) {
            principales.push({ etiqueta: 'Otras películas', cantidad: otrasVistas });
        }

        return principales;
    }

    private async obtenerProductosCandyMasVendidos(): Promise<DatoGraficoReporte[]> {
        const cliente = this.supabaseService.supabaseClient;
        const compraIds: string[] = [];

        for (let offset = 0; ; offset += this.limitePagina) {
            const { data, error } = await cliente.from('compra')
                .select('id')
                .in('estado', ['confirmada', 'utilizada'])
                .range(offset, offset + this.limitePagina - 1);

            if (error) {
                throw new Error(`No se pudieron consultar las compras de candy: ${error.message}`);
            }

            compraIds.push(...(data ?? []).map(compra => compra.id as string));
            if (!data || data.length < this.limitePagina) {
                break;
            }
        }

        const unidadesPorProducto = new Map<number, { nombre: string; cantidad: number }>();

        for (const lote of this.dividirEnLotes(compraIds)) {
            for (let offset = 0; ; offset += this.limitePagina) {
                const { data, error } = await cliente.from('detalle_compra')
                    .select('producto_id, nombre_item, cantidad')
                    .eq('tipo_item', 'producto')
                    .not('producto_id', 'is', null)
                    .in('compra_id', lote)
                    .order('id', { ascending: true })
                    .range(offset, offset + this.limitePagina - 1);

                if (error) {
                    throw new Error(`No se pudieron consultar los productos vendidos: ${error.message}`);
                }

                for (const detalle of (data ?? []) as DetalleCandyReporte[]) {
                    const actual = unidadesPorProducto.get(detalle.producto_id);
                    unidadesPorProducto.set(detalle.producto_id, {
                        nombre: detalle.nombre_item || actual?.nombre || 'Producto sin nombre',
                        cantidad: (actual?.cantidad ?? 0) + Number(detalle.cantidad ?? 0),
                    });
                }

                if (!data || data.length < this.limitePagina) {
                    break;
                }
            }
        }

        return [...unidadesPorProducto.values()]
            .map(({ nombre, cantidad }) => ({ etiqueta: nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);
    }

    private rangoSemanaDelMes(anio: number, mes: number, semana: number): [string, string] {
        const primerDia = (semana - 1) * 7 + 1;
        const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
        const ultimoDia = Math.min(primerDia + 7, diasEnMes + 1);
        return [
            this.fechaIso(new Date(Date.UTC(anio, mes - 1, primerDia))),
            this.fechaIso(new Date(Date.UTC(anio, mes - 1, ultimoDia))),
        ];
    }

    private rangoMes(anio: number, mes: number): [string, string] {
        const inicio = new Date(Date.UTC(anio, mes - 1, 1));
        const fin = new Date(Date.UTC(anio, mes, 1));
        return [this.fechaIso(inicio), this.fechaIso(fin)];
    }

    private fechaIso(fecha: Date): string {
        return fecha.toISOString().slice(0, 10);
    }

    private dividirEnLotes<T>(items: T[]): T[][] {
        const lotes: T[][] = [];
        for (let indice = 0; indice < items.length; indice += this.tamanoLote) {
            lotes.push(items.slice(indice, indice + this.tamanoLote));
        }
        return lotes;
    }

    private async listarComprasDelDia(fecha: string): Promise<CompraReporte[]> {
        const fechaSiguiente = new Date(`${fecha}T00:00:00Z`);
        fechaSiguiente.setUTCDate(fechaSiguiente.getUTCDate() + 1);

        const inicio = new Date(`${fecha}T00:00:00-03:00`).toISOString();
        const fin = new Date(
            `${fechaSiguiente.toISOString().slice(0, 10)}T00:00:00-03:00`,
        ).toISOString();
        const compras: CompraReporte[] = [];
        const cliente = this.supabaseService.supabaseClient;

        for (let desde = 0; ; desde += this.limitePagina) {
            const { data, error } = await cliente
                .from('compra')
                .select('id, total, proyeccion_id')
                .in('estado', ['confirmada', 'utilizada'])
                .gte('fecha_compra', inicio)
                .lt('fecha_compra', fin)
                .order('fecha_compra', { ascending: true })
                .range(desde, desde + this.limitePagina - 1);

            if (error) {
                throw new Error(`No se pudieron consultar las compras: ${error.message}`);
            }

            compras.push(...((data ?? []) as CompraReporte[]));

            if (!data || data.length < this.limitePagina) {
                return compras;
            }
        }
    }

    private async contarButacas(compraIds: string[]): Promise<number> {
        const cliente = this.supabaseService.supabaseClient;
        let cantidad = 0;

        for (let inicio = 0; inicio < compraIds.length; inicio += this.limitePagina) {
            const loteCompraIds = compraIds.slice(inicio, inicio + this.limitePagina);

            for (let desde = 0; ; desde += this.limitePagina) {
                const { data, error } = await cliente
                    .from('compra_butaca')
                    .select('id')
                    .in('compra_id', loteCompraIds)
                    .range(desde, desde + this.limitePagina - 1);

                if (error) {
                    throw new Error(`No se pudieron contar las entradas vendidas: ${error.message}`);
                }

                cantidad += data?.length ?? 0;

                if (!data || data.length < this.limitePagina) {
                    break;
                }
            }
        }

        return cantidad;
    }
}
