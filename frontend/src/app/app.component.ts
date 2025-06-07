import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './features/shared/header/header.component';
import { CommonModule } from '@angular/common';
import { TTEthStore } from './features/shared/eht-to-tt/store/tt-eth-store';
import { WalletService } from './features/shared/services/wallet.service';
import { combineLatest, delay, interval, map, skip, tap, timer, withLatestFrom } from 'rxjs';
import { SpinnerComponent } from './features/shared/spinner/spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CommonModule, SpinnerComponent],
  providers: [TTEthStore],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  title = 'trust-fe';

  private walletService = inject(WalletService);

  walletNotInitialized$ = interval(1000).pipe( 
    withLatestFrom(this.walletService.wallet$),
    skip(1),
    map(([_, wallet]) => wallet === null)
  );

  retryMetaMask() {
    this.walletService.askForMetaMask();
  }
}
