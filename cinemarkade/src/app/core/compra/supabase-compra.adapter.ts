import { Injectable } from '@angular/core';
import { Compra, CompraInput, CompraValidadaQr, ConfirmarCompraInput, EstadoCompra } from './compra.model';
import { CompraRepository } from './compra.repository';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseCompraAdapter implements CompraRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async obtenerPorId(id: string): Promise<Compra> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('compra')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw new Error(`Error al obtener la compra: ${error.message}`);
        }

        return data as Compra;
    }

    async listarPorUsuario(usuarioId: string): Promise<Compra[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('compra')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha_compra', { ascending: false });

        if (error) {
            throw new Error(`Error al listar las compras del usuario: ${error.message}`);
        }

        return (data ?? []) as Compra[];
    }

    async crear(datos: CompraInput): Promise<Compra> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('compra')
            .insert(datos)
            .select('*')
            .single();

        if (error) {
            throw new Error(`Error al crear la compra: ${error.message}`);
        }

        return data as Compra;
    }

    async confirmarCompra(datos: ConfirmarCompraInput): Promise<string> {
        const { data, error } = await this.supabaseService.supabaseClient
            .rpc('confirmar_compra', {
                p_proyeccion_id: datos.proyeccion_id,
                p_total: datos.total,
                p_creditos_usados: datos.creditos_usados,
                p_puntos_generados: datos.puntos_generados,
                p_butacas: datos.butacas,
                p_detalles: datos.detalles,
            });

        if (error) {
            throw new Error(`No se pudo confirmar la compra: ${error.message}`);
        }
        if (typeof data !== 'string' || !data) {
            throw new Error('Supabase no devolvió el identificador de la compra confirmada.');
        }
        return data;
    }

    async validarQr(codigoQr: string): Promise<CompraValidadaQr | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .rpc('validar_qr_compra', { p_codigo_qr: codigoQr });

        if (error) throw new Error(`No se pudo validar la entrada: ${error.message}`);
        return data as CompraValidadaQr | null;
    }

    async cancelarCompra(compraId: string): Promise<number> {
        const { data, error } = await this.supabaseService.supabaseClient
            .rpc('cancelar_compra', { p_compra_id: compraId });

        if (error) throw new Error(`No se pudo cancelar la compra: ${error.message}`);
        const puntosReintegrados = Number(data);
        if (!Number.isInteger(puntosReintegrados) || puntosReintegrados < 0) {
            throw new Error('Supabase no devolvió una cantidad válida de puntos reintegrados.');
        }
        return puntosReintegrados;
    }

    async cambiarEstado(id: string, estado: EstadoCompra): Promise<void> {
        const { error } = await this.supabaseService.supabaseClient
            .from('compra')
            .update({ estado })
            .eq('id', id)
            .select('id')
            .single();

        if (error) {
            throw new Error(`Error al cambiar el estado de la compra: ${error.message}`);
        }
    }
}
