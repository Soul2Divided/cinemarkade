import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HostListener } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Loader } from '../loader/loader';
import { Modal } from '../modal/modal';
import { PeliculaService } from '../../core/pelicula/pelicula.service';

@Component({
    imports: [RouterLink, UpperCasePipe, Loader, Modal],
    selector: 'app-navbar',
    styleUrl: './navbar.scss',
    templateUrl: './navbar.html',
})
export class Navbar {
    mostrarModal = signal<boolean>(false);
    mostrarLoader = signal<boolean>(false);
    errorMessage: string = '';

    private readonly peliculaService = inject(PeliculaService);
    private readonly peliculas = this.peliculaService.peliculas;

    readonly busqueda = signal('');
    readonly buscadorAbierto = signal(false);
    readonly cargandoPeliculas = signal(false);
    readonly errorBusqueda = signal('');
    readonly resultados = computed(() => {
        const texto = this.normalizarBusqueda(this.busqueda());

        if (!texto) {
            return [];
        }

        return this.peliculas().filter(
            (pelicula) =>
                pelicula.activa && this.normalizarBusqueda(pelicula.nombre).includes(texto),
        );
    });

    constructor(
        public authService: AuthService,
        public router: Router,
    ) {}

    menuAbierto = signal<boolean>(false);

    toggleMenu(): void {
        this.menuAbierto.update((v) => !v);
    }

    cerrarMenu(): void {
        this.menuAbierto.set(false);
    }

    async cerrarSesion(): Promise<void> {
        this.cerrarMenu();
        this.mostrarLoader.set(true);

        try {
            await this.authService.signOut();
            await new Promise((resolve) => setTimeout(resolve, 700));
        } catch (error) {
            this.triggerError(
                error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
            );
        } finally {
            this.mostrarLoader.set(false);
            this.mostrarModal.set(true);
        }
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.router.navigate(['/']);
    }

    triggerError(msg: string): void {
        this.errorMessage = msg;
    }

    onSearch(event: Event): void {
        this.busqueda.set((event.target as HTMLInputElement).value);
        void this.abrirBuscador();
    }

    async abrirBuscador(): Promise<void> {
        this.buscadorAbierto.set(true);

        if (this.peliculaService.catalogoCargado() || this.cargandoPeliculas()) {
            return;
        }

        this.cargandoPeliculas.set(true);
        this.errorBusqueda.set('');

        try {
            await this.peliculaService.listarPeliculas();
        } catch {
            this.errorBusqueda.set('No se pudieron cargar las películas. Volvé a intentar.');
        } finally {
            this.cargandoPeliculas.set(false);
        }
    }

    cerrarBuscador(): void {
        this.buscadorAbierto.set(false);
    }

    salirDelBuscador(event: FocusEvent): void {
        const contenedor = event.currentTarget as HTMLElement;

        if (!contenedor.contains(event.relatedTarget as Node | null)) {
            this.cerrarBuscador();
        }
    }

    seleccionarResultado(): void {
        this.cerrarBuscador();
        this.busqueda.set('');
    }

    private normalizarBusqueda(texto: string): string {
        return texto
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-perfil-container')) {
            this.cerrarMenu();
        }

        if (!target.closest('.nav-search')) {
            this.cerrarBuscador();
        }
    }
}
