import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { UsuarioPrueba } from './usuario-prueba.model';
import { UsuarioPruebaRepository } from './usuario-prueba.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseUsuarioPruebaAdapter implements UsuarioPruebaRepository {
    constructor(private readonly supabaseService: SupabaseService) {}

    async listar(): Promise<UsuarioPrueba[]> {
        const { data, error } = await this.supabaseService.supabaseClient
            .from('usuario_prueba_disponible')
            .select('id, etiqueta, mail, tipo, orden')
            .eq('activo', true)
            .in('tipo', ['empleado', 'cliente', 'cliente_menor'])
            .order('orden', { ascending: true });

        if (error) {
            console.error('No se pudieron consultar los usuarios de prueba:', error);

            throw new Error('No se pudieron cargar los perfiles de prueba. Intentá nuevamente.');
        }

        return data ?? [];
    }
}
