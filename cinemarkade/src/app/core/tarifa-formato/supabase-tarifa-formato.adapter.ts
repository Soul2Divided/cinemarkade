import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { FormatoSala } from '../sala/sala.model';
import { TarifaFormato } from './tarifa-formato.model';
import { TarifaFormatoRepository } from './tarifa-formato.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseTarifaFormatoAdapter implements TarifaFormatoRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async obtenerPorFormato(formato: FormatoSala): Promise<TarifaFormato | null> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('tarifa_formato')
            .select('*')
            .eq('formato', formato)
            .maybeSingle();

        if (error) {
            throw new Error(`Error al obtener la tarifa del formato ${formato}: ${error.message}`);
        }

        if (!data) return null;

        return {
            ...data,
            precio_base: Number(data.precio_base),
        } as TarifaFormato;
    }
}
