import { Routes } from '@angular/router';

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
        path: 'login',
        loadComponent: () => import('./components/login/login').then((m) => m.Login)
    },
    {
        path: 'select-login',
        loadComponent: () => import('./components/select-login/select-login').then((m) => m.SelectLogin),
        children: [
            {
                path: 'login',
                loadComponent: () => import('./components/login/login').then((m) => m.Login)
            },
            // {
            //     path: 'registro',
            //     loadComponent: () => import('./components/registro/registro').then((m) => m.Registro)
            // }
        ]
    },
    // {
    //     path: 'register',
    //     // loadComponent: () => import('./components/register/register').then((m) => m.Register),
    // },
    {
        path: '**',
        loadComponent: () => import('./components/home-page/home-page').then((m) => m.HomePage)
    }
];
