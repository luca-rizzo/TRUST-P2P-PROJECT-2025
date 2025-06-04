import { Component, inject } from '@angular/core';
import { WalletService } from '../services/wallet.service';
import { AsyncPipe } from '@angular/common';
import { EhtToTTComponent } from '../eht-to-tt/eht-to-tt.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AsyncPipe, EhtToTTComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  public walletService: WalletService = inject(WalletService);
  public address$ = this.walletService.address$;


}
