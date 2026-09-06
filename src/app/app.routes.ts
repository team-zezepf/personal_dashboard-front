import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
