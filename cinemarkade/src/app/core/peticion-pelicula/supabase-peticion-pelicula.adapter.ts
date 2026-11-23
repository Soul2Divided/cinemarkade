import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { CrearPeticionPelicula, EstadoPeticionPelicula, PeticionPelicula } from './peticion-pelicula.model';
import { PeticionPeliculaRepository } from './peticion-pelicula.repository';

@Injectable({ providedIn: 'root' })
export class SupabasePeticionPeliculaAdapter implements PeticionPeliculaRepository {
    private readonly client = inject(SupabaseService).supabaseClient;

    async crear(peticion: CrearPeticionPelicula): Promise<void> {
        const { data: sesion, error: errorSesion } = await this.client.auth.getUser();

        if (errorSesion || !sesion.user) {
            throw new Error('Iniciá sesión como cliente para enviar una propuesta.');
        }

        const { error } = await this.client.from('peticiones').insert({
            usuario_id: sesion.user.id,
            titulo: peticion.titulo,
            descripcion: peticion.descripcion,
            motivo: peticion.motivo,
        });

        if (error) {
            if (error.code === '23505') {
                throw new Error('Ya tenés una petición pendiente');
            }

            throw new Error(error.message);
        }
    }

    async listarPendientes(): Promise<PeticionPelicula[]> {
        const { data, error } = await this.client
            .from('peticiones')
            .select(`
                id,
                usuario_id,
                titulo,
                descripcion,
                motivo,
                estado,
                created_at,
                usuario:usuario!peticiones_usuario_id_fkey (
                    nombre,
                    apellido
                )
            `)
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`No se pudieron cargar las peticiones: ${error.message}`);
        }

        type PeticionConUsuario = Omit<PeticionPelicula, 'usuario_nombre' | 'usuario_apellido'> & {
            usuario: {
                nombre: string | null;
                apellido: string | null;
            } | null;
        };

        return ((data ?? []) as unknown as PeticionConUsuario[]).map(peticion => ({
            id: peticion.id,
            usuario_id: peticion.usuario_id,
            titulo: peticion.titulo,
            descripcion: peticion.descripcion,
            motivo: peticion.motivo,
            estado: peticion.estado,
            created_at: peticion.created_at,
            usuario_nombre: peticion.usuario?.nombre ?? 'Cliente',
            usuario_apellido: peticion.usuario?.apellido ?? '',
        }));
    }

    async resolver(
        id: string,
        estado: Exclude<EstadoPeticionPelicula, 'pendiente'>,
        resueltaEn: string,
    ): Promise<void> {
        const { data: sesion, error: errorSesion } = await this.client.auth.getUser();

        if (errorSesion || !sesion.user) {
            throw new Error('Iniciá sesión para resolver la petición.');
        }

        const { data, error } = await this.client.from('peticiones')
            .update({
                estado,
                resuelta_at: resueltaEn,
                resuelta_por: sesion.user.id,
            })
            .eq('id', id)
            .eq('estado', 'pendiente')
            .select('id')
            .maybeSingle();

        if (error) {
            throw new Error(`No se pudo actualizar la petición: ${error.message}`);
        }

        if (!data) {
            throw new Error('La petición ya fue resuelta por otra persona. Actualizá la bandeja.');
        }
    }
}
