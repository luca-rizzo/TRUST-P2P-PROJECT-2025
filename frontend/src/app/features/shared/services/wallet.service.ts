import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { defer, from, of, switchMap, BehaviorSubject, Observable, shareReplay, filter, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';

declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  public provider!: ethers.JsonRpcProvider | ethers.BrowserProvider;

  private walletSubject = new BehaviorSubject<ethers.Wallet | ethers.JsonRpcSigner | null>(null);
  public wallet$ = this.walletSubject.asObservable();

  private addressSubject = new BehaviorSubject<string | null>(null);
  public address$ = this.addressSubject.asObservable();

  public ethAmount$ = this.address$.pipe(
    filter(addr => !!addr),
    switchMap(addr => {
      if (!addr) throw new Error('Wallet not initialized');
      return from(this.provider.getBalance(addr))
    }),
    shareReplay(1)
  );

  constructor() {
    this.askForMetaMask();
  }

  askForMetaMask(): void {
    this.setupProviderAndWallet$().subscribe(); 
  }

  private setupProviderAndWallet$(): Observable<void> {
    return defer(async () => {
      if (!environment.production) {
        this.provider = new ethers.JsonRpcProvider(environment.devWallet.providerUrl);
        const wallet = new ethers.Wallet(environment.devWallet.privateKey, this.provider);
        this.walletSubject.next(wallet);
        this.addressSubject.next(wallet.address);
      } else {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        await this.provider.send('eth_requestAccounts', []);
        const signer = await this.provider.getSigner();
        const address = await signer.getAddress();
        this.walletSubject.next(signer);
        this.addressSubject.next(address);
      }
    });
  }

}
