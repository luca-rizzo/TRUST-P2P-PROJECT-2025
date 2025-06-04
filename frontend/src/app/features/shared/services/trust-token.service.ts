import { Injectable } from '@angular/core';
import { TrustToken } from '../../../../../../hardhat/typechain-types/contracts/TrustToken';
import { TrustToken__factory } from '../../../../../../hardhat/typechain-types/factories/contracts/TrustToken__factory';
import { WalletService } from './wallet.service';
import { TRUST_TOKEN_CONTRACT } from '../../../environments/deployed-contracts';
import { GROUP_MANAGER_CONTRACT } from '../../../environments/deployed-contracts';
import { from } from 'rxjs';

import { parseToBase18 } from '../utility.ts/to_base_converter';
@Injectable({
  providedIn: 'root'
})
export class TrustTokenService {

  private contract: TrustToken;

  constructor(private walletService: WalletService) {
    this.contract = TrustToken__factory.connect(
      TRUST_TOKEN_CONTRACT.publicAddress,
      this.walletService.wallet
    );
  }

  ethToTT(amount: number) {
    const value = parseToBase18(amount);
    return from(this.contract.buyToken({ value }));
  }

  getTTTokenBalance() {
    return from(this.contract.balanceOf(this.walletService.wallet.address));
  }

  getRate() {
    return from(this.contract.rate());
  }

  allowanceToGroupManager() {
    return from(this.contract.allowance(
      this.walletService.wallet.address,
      GROUP_MANAGER_CONTRACT.publicAddress
    ));
  }

  setAllowanceToGroupManager(amount: number) {
    const parsedAmount = parseToBase18(amount);
    return from(this.contract.approve(
      GROUP_MANAGER_CONTRACT.publicAddress,
      parsedAmount
    ));
  }

}
