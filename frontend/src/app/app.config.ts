import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { loaderInterceptor } from './features/shared/services/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([loaderInterceptor])),
    importProvidersFrom(BrowserAnimationsModule),
    provideAnimations(),
    provideToastr()
  ]
};