import { inject, Injectable } from "@angular/core";
import { SupabaseService } from "../core/services/supabase.service";
import { SignUpWithPasswordCredentials } from "@supabase/supabase-js";

@Injectable({providedIn: 'root'})
export class AuthService {

    private _supabaseClient = inject(SupabaseService).supabaseClient;

    register(credentials: SignUpWithPasswordCredentials) {
        return this._supabaseClient.auth.signUp(credentials);
    }

    login(credentials: SignUpWithPasswordCredentials) {
        return this._supabaseClient.auth.signInWithPassword(credentials);
    }

    signOut() {
        return this._supabaseClient.auth.signOut();
    }
}