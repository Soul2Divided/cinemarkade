import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { CompraButaca, CompraButacaInput } from './compra-butaca.model';
import { CompraButacaRepository } from './compra-butaca.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseCompraButacaAdapter implements CompraButacaRepository {
    constructor(private readonly supabaseService: SupabaseService) { }

    async listarPorCompra(compraId: string): Promise<CompraButaca[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('compra_butaca')
            .select('*')
            .eq('compra_id', compraId)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Error al listar las butacas de la compra: ${error.message}`);
        }

        return (data ?? []) as CompraButaca[];
    }

    async crearVarios(butacas: CompraButacaInput[]): Promise<CompraButaca[]> {
        if (butacas.length === 0) {
            return [];
        }

        const { data, error } = await this.supabaseService.supabaseClient
            .from('compra_butaca')
            .insert(butacas)
            .select('*');

        if (error) {
            throw new Error(`Error al guardar las butacas de la compra: ${error.message}`);
        }

        return (data ?? []) as CompraButaca[];
    }
}