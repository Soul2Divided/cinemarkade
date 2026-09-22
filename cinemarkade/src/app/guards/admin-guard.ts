import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).supabaseClient;
  const router = inject(Router);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return router.createUrlTree(['/home']);
  }

  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (error || usuario?.rol !== 'admin') {
    return router.createUrlTree(['/home']);
  }

  return true;
};