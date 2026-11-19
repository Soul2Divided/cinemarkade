import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { ReporteVentasDiario } from './reporte-ventas.model';
import { ReporteVentasRepository } from './reporte-ventas.repository';

interface CompraReporte {
    id: string;
    total: number | string;
    proyeccion_id: number | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseReporteVentasAdapter implements ReporteVentasRepository {
    private readonly limitePagina = 1000;

    constructor(private readonly supabaseService: SupabaseService) {}

    async obtenerPorDia(fecha: string): Promise<ReporteVentasDiario> {
        const compras = await this.listarComprasDelDia(fecha);

        if (compras.length === 0) {
            return { fecha, facturacionPesos: 0, entradasVendidas: 0 };
        }

        const comprasDeEntradas = compras.filter((compra) => compra.proyeccion_id !== null);
        const butacasVendidas = comprasDeEntradas.length
            ? await this.contarButacas(comprasDeEntradas.map((compra) => compra.id))
            : 0;

        return {
            fecha,
            facturacionPesos: compras.reduce(
                (total, compra) => total + Number(compra.total || 0),
                0,
            ),
            entradasVendidas: butacasVendidas,
        };
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
