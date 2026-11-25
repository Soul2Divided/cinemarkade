import { registrarErrorUsuario } from '../../core/services/error-usuario';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HostListener } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Loader } from '../loader/loader';
import { Modal } from '../modal/modal';
import { PeliculaService } from '../../core/pelicula/pelicula.service';
import { NotificacionService } from '../../core/notificacion/notificacion.service';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { PeticionPeliculaService } from '../../core/peticion-pelicula/peticion-pelicula.service';

@Component({
    imports: [RouterLink, UpperCasePipe, Loader, Modal, ReactiveFormsModule],
    selector: 'app-navbar',
    styleUrl: './navbar.scss',
    templateUrl: './navbar.html',
})
export class Navbar {
    mostrarModal = signal<boolean>(false);
    mostrarLoader = signal<boolean>(false);
    errorMessage: string = '';
    readonly mostrarPeticion = signal(false);
    readonly enviandoPeticion = signal(false);
    readonly mensajePeticion = signal('');
    readonly errorPeticion = signal('');
    readonly formularioPeticion = new FormGroup({
        titulo: new FormControl('', [Validators.required, Validators.maxLength(150)]),
        descripcion: new FormControl('', [Validators.required, Validators.maxLength(3000)]),
        motivo: new FormControl('', [Validators.required, Validators.maxLength(2000)]),
    });

    private readonly peliculaService = inject(PeliculaService);
    private readonly peticionService = inject(PeticionPeliculaService);
    readonly notificacionService = inject(NotificacionService);
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
    ) {
        effect(() => {
            const usuario = this.authService.usuarioActual();

            if (usuario?.rol === 'cliente') {
                void this.notificacionService.listar().catch((error) => {
                    console.error('No se pudo cargar el contador de notificaciones:', error);
                });
            } else {
                this.notificacionService.limpiar();
            }
        });
    }

    menuAbierto = signal<boolean>(false);

    toggleMenu(): void {
        this.menuAbierto.update((v) => !v);
    }

    cerrarMenu(): void {
        this.menuAbierto.set(false);
    }

    abrirFormularioPeticion(): void {
        this.cerrarMenu();
        this.formularioPeticion.reset();
        this.formularioPeticion.enable();
        this.errorPeticion.set('');
        this.mensajePeticion.set('');
        this.mostrarPeticion.set(true);
    }

    cerrarFormularioPeticion(): void {
        this.mostrarPeticion.set(false);
    }

    async enviarPeticion(): Promise<void> {
        if (this.formularioPeticion.invalid || this.enviandoPeticion()) {
            this.formularioPeticion.markAllAsTouched();
            return;
        }

        this.enviandoPeticion.set(true);
        this.errorPeticion.set('');

        try {
            const valores = this.formularioPeticion.getRawValue();
            const catalogo = await this.peliculaService.listarPeliculas();
            const tituloPropuesto = this.normalizarBusqueda(valores.titulo ?? '');
            const yaEnCartelera = catalogo.some(pelicula =>
                pelicula.activa && this.normalizarBusqueda(pelicula.nombre) === tituloPropuesto,
            );

            if (yaEnCartelera) {
                throw new Error('Esa película ya está en nuestra cartelera.');
            }

            await this.peticionService.crear({
                titulo: valores.titulo?.trim() ?? '',
                descripcion: valores.descripcion?.trim() ?? '',
                motivo: valores.motivo?.trim() ?? '',
            });
            this.mensajePeticion.set('Tu propuesta fue enviada. Gracias por ayudarnos a elegir películas.');
            this.formularioPeticion.disable();
        } catch (error) {
            if (error instanceof Error && [
                'Esa película ya está en nuestra cartelera.',
                'Ya tenés una propuesta pendiente de revisión.',
            ].includes(error.message)) {
                this.errorPeticion.set(error.message);
            } else {
                this.errorPeticion.set(registrarErrorUsuario('Error al enviar una propuesta:', error));
            }
        } finally {
            this.enviandoPeticion.set(false);
        }
    }

    async cerrarSesion(): Promise<void> {
        this.cerrarMenu();
        this.mostrarLoader.set(true);

        try {
            await this.authService.signOut();
            await new Promise((resolve) => setTimeout(resolve, 700));
        } catch (error) {
            this.triggerError(
                registrarErrorUsuario('Error en navbar.ts:', error),
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
