import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export const SECCIONES_ADMIN = [
    { permiso: 'peliculas', route: '/admin/peliculas', label: 'Películas', icon: '🎬' },
    { permiso: 'salas', route: '/admin/salas', label: 'Salas y butacas', icon: '🏛️' },
    { permiso: 'funciones', route: '/admin/funciones', label: 'Funciones', icon: '⏰' },
    { permiso: 'productos', route: '/admin/productos', label: 'Productos candy', icon: '🍿' },
    { permiso: 'combos', route: '/admin/combos', label: 'Combos', icon: '🎟️' },
    { permiso: 'recompensas', route: '/admin/puntos', label: 'Recompensas', icon: '🪙' },
    { permiso: 'cupones', route: '/admin/cupones', label: 'Cupones', icon: '🏷️' },
    { permiso: 'reportes', route: '/admin/reportes', label: 'Reportes y estadísticas', icon: '📊' },
    { permiso: 'auditoria', route: '/admin/log-actividad', label: 'Registro de actividad', icon: '📜' },
    { permiso: 'validacion', route: '/empleado', label: 'Validar entradas y pedidos', icon: '▦' }
];

@Injectable({ providedIn: 'root' })
export class PermisosAdminService {
    private readonly client = inject(SupabaseService).supabaseClient;
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
        const { data: autenticacion, error: errorSesion } = await this.client.auth.getUser();

        if (errorSesion || !autenticacion.user) {
            return;
        }

        const { data: usuario, error } = await this.client.from('usuario')
            .select('rol, permisos_admin').eq('id', autenticacion.user.id).single();

        if (error) {
            throw new Error(`No se pudieron consultar los accesos: ${error.message}`);
        }

        this.esAdmin.set(usuario.rol === 'admin');

        this.esEmpleado.set(usuario.rol === 'empleado');
        this.secciones.set(this.esEmpleado() ? usuario.permisos_admin ?? [] : []);
    }
}
