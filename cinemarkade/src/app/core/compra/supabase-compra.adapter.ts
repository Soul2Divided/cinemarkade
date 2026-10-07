import { Injectable } from '@angular/core';
import { Compra, CompraInput, EstadoCompra } from './compra.model';
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