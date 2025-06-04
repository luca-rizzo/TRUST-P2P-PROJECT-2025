import { Component, inject } from '@angular/core';
import { TTEthStore } from './store/tt-eth-store';
import { CommonModule, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import { FormatBase18Pipe } from '../utility.ts/format-base18.pipe';

@Component({
  selector: 'app-eht-to-tt',
  standalone: true,
  imports: [FormsModule, CommonModule, FormatBase18Pipe],
  templateUrl: './eht-to-tt.component.html',
  providers: [],
  styleUrl: './eht-to-tt.component.scss'
})
export class EhtToTTComponent {

  Number = Number;

  private readonly store = inject(TTEthStore);
  modalVisible = false;
  ethToConvert: number = 0;
  eth$ = this.store.eth$;
  tt$ = this.store.tt$;
  rate$ = this.store.conversionRate$;
  allowance$ = this.store.allowance$;

  newAllowance: number = 0;

  //combine to subscribe with async pipe eth$ and tt$
  viewData$ = combineLatest([this.eth$, this.tt$, this.rate$, this.allowance$]).pipe(
    map(([eth, tt, rate, allowance]) => ({
      eth: eth,
      tt: tt,
      rate: rate,
      allowance: allowance
    }))
  );

  constructor() {
    this.store.loadConversionRate();
    this.store.loadCurrentAccountAmount();
    this.store.loadAllowanceToContractManager();
  }

  buyTT() {
    this.store.buyTTWithEth(this.ethToConvert);
    this.ethToConvert = 0;
  }

  closeModal() {
    this.modalVisible = false;
    this.ethToConvert = 0;
  }

  showModal(){
    this.modalVisible = true;
    this.ethToConvert = 0;
  }

  setNewAllowance() {
    if (this.newAllowance <= 0) return;
    this.store.setNewAllowance(this.newAllowance);
    this.newAllowance = 0;
  }
}
