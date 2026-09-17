import { Injectable } from '@angular/core';
import { UserRepository } from './user.repository';
import { CrearUserData, User } from './user.model';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabaseUserAdapter implements UserRepository {
    constructor(private supabaseService: SupabaseService) { }

    async createUser(user: CrearUserData): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.mail,
            password: user.password,
        });

        if (authError) {
            throw new Error(`Error al crear usuario en auth: ${authError.message}`);
        }
        if (!authData.user) {
            throw new Error('No se pudo crear el usuario');
        }

        const { data: perfil, error: perfilError } = await supabase
            .from('usuario')
            .insert({
                id: authData.user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                mail: user.mail,
                fecha_nacimiento: user.fecha_nacimiento,
                tipo_sangre: user.tipo_sangre,
                color_ojos: user.color_ojos,
                cantidad_dias_vacaciones: user.cantidad_dias_vacaciones,
                puntos: user.puntos,
                rol: user.rol,
            })
            .select()
            .single();

        if (perfilError) {
            throw new Error(`Error al crear perfil: ${perfilError.message}`);
        }

        return this.mapToModel(perfil);
    }

    private mapToModel(row: User): User {
        return {
            id: row.id,
            nombre: row.nombre,
            apellido: row.apellido,
            mail: row.mail,
            fecha_nacimiento: row.fecha_nacimiento,
            tipo_sangre: row.tipo_sangre,
            color_ojos: row.color_ojos,
            cantidad_dias_vacaciones: row.cantidad_dias_vacaciones,
            puntos: row.puntos,
            rol: row.rol,
        };
    }

    async findByEmail(mail: string): Promise<User | null> {
        const supabase = this.supabaseService.supabaseClient;
        const { data, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('mail', mail)
            .maybeSingle();

        if (error) {
            throw new Error(`Error al buscar usuario: ${error.message}`);
        }

        return data as User | null;
    }

    async signIn(mail: string, password: string): Promise<User> {
        const supabase = this.supabaseService.supabaseClient;
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: mail,
            password,
        });

        if (authError || !authData.user) {
            throw new Error('El email o la contraseña son incorrectos');
        }

        const { data: perfil, error: perfilError } = await supabase
            .from('usuario')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (perfilError) {
            throw new Error(`Error al obtener el perfil: ${perfilError.message}`);
        }

        return this.mapToModel(perfil);
    }
}