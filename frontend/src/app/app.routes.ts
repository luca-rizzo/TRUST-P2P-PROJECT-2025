import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'groups',
        loadComponent: () =>
            import('./features/my-groups-list/my-groups-list.component').then(m => m.MyGroupsListComponent)
    },
    {
        path: 'groups/:id',
        loadComponent: () =>
            import('./features/group-details/group-details.component').then(m => m.GroupDetailsComponent)
    },
    {
        path: '',
        redirectTo: 'groups',
        pathMatch: 'full'
    }
];
