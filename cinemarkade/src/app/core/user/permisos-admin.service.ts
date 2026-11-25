import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { UserRepository } from './user.repository';

export const SECCIONES_ADMIN = [
    { permiso: 'peliculas', route: '/admin/peliculas', label: 'Películas', icon: '🎬' },
    { permiso: 'peticiones', route: '/admin/peticiones', label: 'Peticiones de usuarios', icon: '📨' },
    { permiso: 'salas', route: '/admin/salas', label: 'Salas y butacas', icon: '🏛️' },
    { permiso: 'funciones', route: '/admin/funciones', label: 'Funciones', icon: '⏰' },
    { permiso: 'productos', route: '/admin/productos', label: 'Productos candy', icon: '🍿' },
    { permiso: 'combos', route: '/admin/combos', label: 'Combos', icon: '🎟️' },
    { permiso: 'recompensas', route: '/admin/puntos', label: 'Recompensas', icon: '🏆' },
    { permiso: 'cupones', route: '/admin/cupones', label: 'Cupones', icon: '🏷️' },
    { permiso: 'reportes', route: '/admin/reportes', label: 'Reportes y estadísticas', icon: '📊' },
    { permiso: 'auditoria', route: '/admin/log-actividad', label: 'Registro de actividad', icon: '📜' },
    { permiso: 'validacion', route: '/empleado', label: 'Validar entradas y pedidos', icon: '▦' }
];

@Injectable({ providedIn: 'root' })
export class PermisosAdminService {
    private readonly authService = inject(AuthService);
    private readonly userRepository = inject(UserRepository);
    readonly esAdmin = signal(false);
    readonly esEmpleado = signal(false);
    readonly secciones = signal<string[]>([]);

    permite(seccion: string): boolean {
        return this.esAdmin() || (this.esEmpleado() &&
            (seccion === 'validacion' || this.secciones().includes(seccion)));
    }

    primeraRuta(): string {
        return SECCIONES_ADMIN.find(seccion => this.permite(seccion.permiso))?.route ?? '/home';
    }

    async cargarAccesos(): Promise<void> {
        this.esAdmin.set(false);
        this.esEmpleado.set(false);
        this.secciones.set([]);
        const usuarioId = await this.authService.obtenerIdUsuarioSesion();

        if (!usuarioId) {
            return;
        }

        const usuario = await this.userRepository.findById(usuarioId);

        if (!usuario) {
            throw new Error('No se encontró el perfil del usuario autenticado.');
        }

        this.esAdmin.set(usuario.rol === 'admin');

        this.esEmpleado.set(usuario.rol === 'empleado');
        this.secciones.set(this.esEmpleado() ? usuario.permisos_admin ?? [] : []);
    }
}
