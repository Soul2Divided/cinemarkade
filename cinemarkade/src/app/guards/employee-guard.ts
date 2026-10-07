import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

export const employeeGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService).supabaseClient;
  const router = inject(Router);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return router.createUrlTree(['/login']);

  const { data: usuario, error } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (error || usuario?.rol !== 'empleado') return router.createUrlTree(['/home']);
  return true;
};
