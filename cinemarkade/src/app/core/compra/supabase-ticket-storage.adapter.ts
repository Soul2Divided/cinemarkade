import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { GuardarTicketInput } from './ticket-storage.model';
import { TicketStorageRepository } from './ticket-storage.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseTicketStorageAdapter implements TicketStorageRepository {
    private readonly supabase = inject(SupabaseService).supabaseClient;
    private readonly bucket = 'tickets';

    async guardar(datos: GuardarTicketInput): Promise<string | null> {
        const { data: sesion, error: errorSesion } = await this.supabase.auth.getSession();
        if (errorSesion) {
            throw new Error(`No se pudo consultar la sesión activa: ${errorSesion.message}`);
        }

        const usuarioId = sesion.session?.user.id;
        if (!usuarioId) {
            return null;
        }

        const ruta = `${usuarioId}/${datos.compraId}.pdf`;
        const { error } = await this.supabase.storage
            .from(this.bucket)
            .upload(ruta, datos.archivo, { contentType: 'application/pdf', upsert: true });

        if (error) {
            throw new Error(`No se pudo guardar el PDF del ticket: ${error.message}`);
        }

        return ruta;
    }

    async obtenerUrlDescarga(ruta: string): Promise<string> {
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUrl(ruta, 60);

        if (error || !data?.signedUrl) {
            throw new Error(`No se pudo preparar la descarga del ticket: ${error?.message ?? 'URL no disponible'}`);
        }

        return data.signedUrl;
    }

    async eliminar(ruta: string): Promise<void> {
        const { error } = await this.supabase.storage.from(this.bucket).remove([ruta]);

        if (error) {
            throw new Error(`No se pudo eliminar el archivo del ticket: ${error.message}`);
        }
    }
}
