import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
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
    // {
    //     path: 'register',
    //     // loadComponent: () => import('./components/register/register').then((m) => m.Register),
    // },
    // {
    //     path: 'login',
    //     // loadComponent: () => import('./components/login/login).then((m) => m.Login),
    // }
];
