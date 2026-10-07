import { inject, Injectable, signal } from "@angular/core";
import { SupabaseService } from "../core/services/supabase.service";
import { SignInWithPasswordCredentials } from "@supabase/supabase-js";
import { UserService } from "../core/user/user.service";
import { User } from "../core/user/user.model";

@Injectable({ providedIn: 'root' })
export class AuthService {

    private _supabaseClient = inject(SupabaseService).supabaseClient;
    private userService = inject(UserService);
    private _usuarioActual = signal<User | null>(null);

    usuarioActual = this._usuarioActual.asReadonly();

    constructor() {
        this.escucharCambiosDeSesion();
        void this.cargarUsuarioDeSesion();
    }

    private escucharCambiosDeSesion(): void {
        this._supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                this._usuarioActual.set(null);
            }
        });
    }

    async iniciarSesion(mail: string, password: string): Promise<User> {
        const usuario = await this.userService.iniciarSesion(mail, password);
        this._usuarioActual.set(usuario);
        return usuario;
    }

    async login(credentials: SignInWithPasswordCredentials): Promise<User> {
        if (!('email' in credentials) || !credentials.email || !credentials.password) {
            throw new Error('Se requiere un email y una contraseña para iniciar sesión.');
        }
        return this.iniciarSesion(credentials.email, credentials.password);
    }

    signOut() {
        return this._supabaseClient.auth.signOut();
    }

    async haySesionActiva(): Promise<boolean> {
        const { data } = await this._supabaseClient.auth.getSession();
        return !!data.session;
    }

    async obtenerIdUsuarioSesion(): Promise<string | null> {
        const { data, error } = await this._supabaseClient.auth.getSession();
        if (error) throw error;
        return data.session?.user.id ?? null;
    }

    async refrescarUsuarioActual(): Promise<void> {
        await this.cargarUsuarioDeSesion();
    }

    private async cargarUsuarioDeSesion(): Promise<void> {
        try {
            const { data, error } = await this._supabaseClient.auth.getSession();
            if (error) throw error;

            const usuarioId = data.session?.user.id;
            if (!usuarioId) {
                this._usuarioActual.set(null);
                return;
            }

            const usuario = await this.userService.buscarPorId(usuarioId);
            this._usuarioActual.set(usuario);
        } catch (error) {
            console.error('No se pudo recuperar el perfil de la sesión:', error);
            this._usuarioActual.set(null);
        }
    }
}
