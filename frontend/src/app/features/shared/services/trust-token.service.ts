import { Injectable } from '@angular/core';
import { TrustToken } from '../../../../../../hardhat/typechain-types/contracts/TrustToken';
import { TrustToken__factory } from '../../../../../../hardhat/typechain-types/factories/contracts/TrustToken__factory';
import { WalletService } from './wallet.service';

import { combineLatest, filter, from, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { parseToBase18 } from '../utility.ts/to_base_converter';
import { ethers } from 'ethers';

@Injectable({
  providedIn: 'root'
})
export class TrustTokenService {
  private trustTokenAddress = environment.trustContracts.trustTokenAddress;
  private groupManagerAddress = environment.trustContracts.groupManagerAddress;

  constructor(private walletService: WalletService) { }

  /**
   * Emits the connected contract once the wallet is available
   */
  private contract$ = this.walletService.wallet$.pipe(
    filter(wallet => !!wallet),
    switchMap(wallet => {
      const contract = TrustToken__factory.connect(this.trustTokenAddress, wallet);
      return of(contract);
    }),
  );

  TTBalance$ = combineLatest([this.contract$, this.walletService.address$]).pipe(
    filter(([contract, address]) => !!address && !!contract),
    switchMap(([contract, address]) => {
      address = address as string; // Ensure address is a string
      return contract.balanceOf(address);
    })
  );

  allowance$ = combineLatest([this.contract$, this.walletService.address$]).pipe(
    filter(([contract, address]) => !!address && !!contract),
    switchMap(([contract, address]) => {
      address = address as string; // Ensure address is a string
      return contract.allowance(address, this.groupManagerAddress);
    })
  );

  ethToTT(amount: number): Observable<ethers.ContractTransactionResponse> {
    return this.contract$.pipe(
      switchMap(contract => {
        const value = parseToBase18(amount);
        return from(contract.buyTokens({ value }));
      })
    );
  }

  getRate(): Observable<bigint> {
    return this.contract$.pipe(
      switchMap(contract => from(contract.rate()))
    );
  }

  setAllowanceToGroupManager(amount: number): Observable<ethers.ContractTransactionResponse> {
    return this.contract$.pipe(
      switchMap(contract => {
        const parsedAmount = parseToBase18(amount);
        return from(contract.approve(this.groupManagerAddress, parsedAmount));
      })
    );
  }
}
