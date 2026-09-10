import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/menu/menu').then((m) => m.Menu),
    },
    {
        path: 'invitado',
        loadComponent: () => import('./components/guest-screen/guest-screen').then((m) => m.GuestScreen),
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
