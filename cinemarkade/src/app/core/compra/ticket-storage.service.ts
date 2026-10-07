import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class TicketStorageService {
  private readonly bucket = 'tickets';

  constructor(private readonly supabaseService: SupabaseService) {}

  async guardar(compraId: string, pdf: Blob): Promise<string | null> {
    const { data: sesion } = await this.supabaseService.supabaseClient.auth.getSession();
    const usuarioId = sesion.session?.user.id;
    if (!usuarioId) return null;

    const ruta = `${usuarioId}/${compraId}.pdf`;
    const { error } = await this.supabaseService.supabaseClient.storage
      .from(this.bucket)
      .upload(ruta, pdf, { contentType: 'application/pdf', upsert: true });

    if (error) throw new Error(`No se pudo guardar el PDF del ticket: ${error.message}`);
    return ruta;
  }

  async obtenerUrlDescarga(ruta: string): Promise<string> {
    const { data, error } = await this.supabaseService.supabaseClient.storage
      .from(this.bucket)
      .createSignedUrl(ruta, 60);

    if (error || !data?.signedUrl) {
      throw new Error(`No se pudo preparar la descarga del ticket: ${error?.message ?? 'URL no disponible'}`);
    }
    return data.signedUrl;
  }

  async eliminar(ruta: string): Promise<void> {
    const { error } = await this.supabaseService.supabaseClient.storage
      .from(this.bucket)
      .remove([ruta]);
    if (error) throw new Error(`No se pudo eliminar el archivo del ticket: ${error.message}`);
  }
}
