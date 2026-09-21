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
    }

    private escucharCambiosDeSesion(): void {
        this._supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user?.email) {
                const perfil = await this.userService.buscarPorEmail(session.user.email);
                this._usuarioActual.set(perfil);
            } else {
                this._usuarioActual.set(null);
            }
        });
    }

    login(credentials: SignInWithPasswordCredentials) {
        return this._supabaseClient.auth.signInWithPassword(credentials);
    }

    signOut() {
        return this._supabaseClient.auth.signOut();
    }

    async haySesionActiva(): Promise<boolean> {
        const { data } = await this._supabaseClient.auth.getSession();
        return !!data.session;
    }
}