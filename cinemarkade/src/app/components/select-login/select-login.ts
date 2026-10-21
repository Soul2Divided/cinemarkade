import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { UsuarioPruebaService } from '../../core/usuario-prueba/usuario-prueba.service';
import { UsuarioPrueba } from '../../core/usuario-prueba/usuario-prueba.model';

@Component({
    imports: [Navbar],
    selector: 'app-select-login',
    styleUrl: './select-login.scss',
    templateUrl: './select-login.html',
})
export class SelectLogin {
    private readonly usuarioPruebaService = inject(UsuarioPruebaService);

    readonly pruebasHabilitadas = this.usuarioPruebaService.habilitado;
    readonly menuPruebasAbierto = signal(false);
    readonly perfiles = signal<UsuarioPrueba[]>([]);
    readonly cargandoPerfiles = signal(false);
    readonly errorPerfiles = signal('');
    private perfilesCargados = false;

    constructor(private router: Router) {}

    irALogin(): void {
        this.router.navigate(['/login']);
    }

    irARegistro(): void {
        this.router.navigate(['/register']);
    }

    async alternarPerfiles(): Promise<void> {
        this.menuPruebasAbierto.update((abierto) => !abierto);

        if (this.menuPruebasAbierto()) {
            await this.cargarPerfiles();
        }
    }

    async cargarPerfiles(): Promise<void> {
        if (!this.pruebasHabilitadas || this.cargandoPerfiles() || this.perfilesCargados) {
            return;
        }

        this.cargandoPerfiles.set(true);
        this.errorPerfiles.set('');

        try {
            this.perfiles.set(await this.usuarioPruebaService.listar());
            this.perfilesCargados = true;
        } catch (error) {
            this.errorPerfiles.set(
                error instanceof Error ? error.message : 'No se pudieron cargar los perfiles.',
            );
        } finally {
            this.cargandoPerfiles.set(false);
        }
    }

    elegirPerfil(id: number): void {
        try {
            this.usuarioPruebaService.prepararAutocompletado(id);
            this.menuPruebasAbierto.set(false);
            void this.router.navigate(['/login']);
        } catch (error) {
            this.errorPerfiles.set(
                error instanceof Error ? error.message : 'No se pudo elegir el perfil.',
            );
        }
    }

    cerrarAlSalir(event: FocusEvent): void {
        const contenedor = event.currentTarget as HTMLElement;

        if (!contenedor.contains(event.relatedTarget as Node | null)) {
            this.menuPruebasAbierto.set(false);
        }
    }

    @HostListener('document:click', ['$event'])
    cerrarAlHacerClickFuera(event: MouseEvent): void {
        if (!(event.target as HTMLElement).closest('.test-users')) {
            this.menuPruebasAbierto.set(false);
        }
    }
}
