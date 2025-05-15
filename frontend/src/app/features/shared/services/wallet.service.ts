import { ethers } from 'ethers';
import { DEV_WALLET } from '../../../environments/dev-wallet';
import { from, Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class WalletService {

  public wallet: ethers.Wallet;
  public provider: ethers.JsonRpcProvider;

  public address$: Observable<string>;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(DEV_WALLET.providerUrl);
    this.wallet = new ethers.Wallet(DEV_WALLET.privateKey, this.provider);
    this.address$ = of(this.wallet.address);
  }

}
