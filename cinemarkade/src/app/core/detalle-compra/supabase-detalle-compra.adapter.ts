import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { DetalleCompra, DetalleCompraInput } from './detalle-compra.model';
import { DetalleCompraRepository } from './detalle-compra.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseDetalleCompraAdapter implements DetalleCompraRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async listarPorCompra(compraId: string): Promise<DetalleCompra[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('detalle_compra')
            .select('*')
            .eq('compra_id', compraId)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Error al listar los detalles de la compra: ${error.message}`);
        }

        return (data ?? []) as DetalleCompra[];
    }

    async listarPorCompras(compraIds: string[]): Promise<DetalleCompra[]> {
        if (compraIds.length === 0) {
            return [];
        }

        const { data, error } = await this.supabaseService.supabaseClient
            .from('detalle_compra')
            .select('*')
            .in('compra_id', compraIds)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`No se pudieron cargar los detalles del historial: ${error.message}`);
        }

        return data ?? [];
    }

    async crearVarios(detalles: DetalleCompraInput[]): Promise<DetalleCompra[]> {
        if (detalles.length === 0) {
            return [];
        }

        const { data, error } = await this.supabaseService.supabaseClient
            .from('detalle_compra')
            .insert(detalles)
            .select('*');

        if (error) {
            throw new Error(`Error al guardar los detalles de la compra: ${error.message}`);
        }

        return (data ?? []) as DetalleCompra[];
    }
}
