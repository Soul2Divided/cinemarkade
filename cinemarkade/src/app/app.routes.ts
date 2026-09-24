import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { authGuard } from './guards/auth-guard';
import path from 'path';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/home-page/home-page').then((m) => m.HomePage),
    },
    {
        path: 'home',
        loadComponent: () => import('./components/home-page/home-page').then((m) => m.HomePage),
    },
    {
        path: 'invitado',
        loadComponent: () => import('./components/guest-screen/guest-screen').then((m) => m.GuestScreen),
    },
    {
        path: 'menu',
        loadComponent: () => import('./components/menu/menu').then((m) => m.Menu)
    },
    {
        path: 'select-login',
        loadComponent: () => import('./components/select-login/select-login').then((m) => m.SelectLogin),
    },
    {
        path: 'login',
        loadComponent: () => import('./components/login/login').then((m) => m.Login)
    },
    {
        path: 'register',
        loadComponent: () => import('./components/register/register').then((m) => m.Register)
    },
    {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./components/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
        children: [
            {
                path: 'peliculas',
                loadComponent: () => import('./components/admin/abm-pelicula/abm-pelicula').then((m) => m.AbmPelicula)
            },
            {
                path: 'nueva-pelicula',
                loadComponent: () => import('./components/admin/add-pelicula/add-pelicula').then((m) => m.AddPelicula)
            }
        ],
    },
    {
        path: 'perfil',
        canActivate: [authGuard],
        loadComponent: () => import('./components/cliente/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
    },
    {
        path: '**',
        loadComponent: () => import('./components/home-page/home-page').then((m) => m.HomePage)
    }
];
