import { Injectable } from '@angular/core';
import { WalletService } from './wallet.service';
import { ethers } from 'ethers';
import { GROUP_MANAGER_CONTRACT } from '../../../environments/group-manager-contract';
import { from } from 'rxjs';
import { TrustGroupManager } from '../../../../../../typechain-types/TrustGroupManager';
import { TrustGroupManager__factory } from '../../../../../../typechain-types/factories/TrustGroupManager__factory';

@Injectable({
  providedIn: 'root'
})
export class GroupManagerContractService {

  public contract: TrustGroupManager;

  constructor(private walletService: WalletService) {
    this.contract = TrustGroupManager__factory.connect(
      GROUP_MANAGER_CONTRACT.publicAddress,
      this.walletService.wallet
    );

  }

  public getAllMyGroups() {
    return from(this.contract.re(0));
  }
}
