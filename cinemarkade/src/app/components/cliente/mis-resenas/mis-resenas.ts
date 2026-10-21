import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { GuardarResenaEvento, Resena as ResenaModel } from '../../../core/resena/resena.model';
import { ResenaService } from '../../../core/resena/resena.service';
import { Navbar } from '../../navbar/navbar';
import { Resena } from '../../resena/resena';

@Component({
    selector: 'app-mis-resenas',
    imports: [Navbar, RouterLink, Resena],
    templateUrl: './mis-resenas.html',
    styleUrl: './mis-resenas.scss',
})
export class MisResenas implements OnInit {
    readonly authService = inject(AuthService);
    private readonly resenaService = inject(ResenaService);

    readonly resenas = signal<ResenaModel[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly error = signal('');
    readonly mensaje = signal('');

    async ngOnInit(): Promise<void> {
        await this.cargarResenas();
    }

    async cargarResenas(): Promise<void> {
        if (this.guardando()) {
            return;
        }

        this.cargando.set(true);
        this.error.set('');
        this.mensaje.set('');

        try {
            this.resenas.set(await this.resenaService.listarPropias());
        } catch (error) {
            this.error.set(
                error instanceof Error ? error.message : 'No se pudieron cargar tus reseñas.',
            );
        } finally {
            this.cargando.set(false);
        }
    }

    async guardarResena(datos: GuardarResenaEvento): Promise<void> {
        if (datos.id === null || this.guardando()) {
            return;
        }

        this.guardando.set(true);
        this.error.set('');
        this.mensaje.set('');

        try {
            const resena = await this.resenaService.actualizar(datos.id, datos);
            this.resenas.update((actuales) =>
                actuales.map((actual) => (actual.id === resena.id ? resena : actual)),
            );
            this.mensaje.set('Tu reseña se actualizó correctamente.');
        } catch (error) {
            this.error.set(
                error instanceof Error ? error.message : 'No se pudo actualizar tu reseña.',
            );
        } finally {
            this.guardando.set(false);
        }
    }

    async eliminarResena(id: number): Promise<void> {
        if (this.guardando()) {
            return;
        }

        this.guardando.set(true);
        this.error.set('');
        this.mensaje.set('');

        try {
            await this.resenaService.eliminar(id);
            this.resenas.update((actuales) => actuales.filter((resena) => resena.id !== id));
            this.mensaje.set('Tu reseña se eliminó correctamente.');
        } catch (error) {
            this.error.set(
                error instanceof Error ? error.message : 'No se pudo eliminar tu reseña.',
            );
        } finally {
            this.guardando.set(false);
        }
    }
}
