import { Injectable } from '@angular/core';
import { from, map } from 'rxjs';
import { ExpenseShareStruct, ExpenseStruct, GroupDetailsViewStruct, TrustGroupManager } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { TrustGroupManager__factory } from '../../../../../../hardhat/typechain-types/factories/contracts/TrustGroupManager__factory';
import { GROUP_MANAGER_CONTRACT } from '../../../environments/group-manager-contract';
import { WalletService } from './wallet.service';
import { CreateExpense } from '../../group-details/models/CreateExpense';
import { BigNumberish } from 'ethers';

export interface GroupMetadata {
  groupId: number;
  name: string;
  members: string[]
}

@Injectable({
  providedIn: 'root'
})
export class GroupManagerContractService {

  private contract: TrustGroupManager;

  constructor(private walletService: WalletService) {
    this.contract = TrustGroupManager__factory.connect(
      GROUP_MANAGER_CONTRACT.publicAddress,
      this.walletService.wallet
    );

  }

  public getAllMyGroups() {
    return from(this.contract.retrieveMyGroups());
  }

  public getGroupDetails(id: BigNumberish) {
    return from(this.contract.retrieveGroup(id)).pipe(
      //necessario per non avere proxy e poter poi ordinare array
      map((groupRaw: GroupDetailsViewStruct): GroupDetailsViewStruct => {
        return {
          id: Number(groupRaw.id),
          name: groupRaw.name,
          members: Array.from(groupRaw.members),
          requestsToJoin: Array.from(groupRaw.requestsToJoin),
          balances: Array.from(groupRaw.balances).map((b: any) => ({
            member: b.member,
            amount: b.amount
          })),
          expenses: Array.from(groupRaw.expenses).map((e: ExpenseStruct) => ({
            id: e.id,
            description: e.description,
            timestamp: e.timestamp,
            amount: e.amount,
            paidBy: e.paidBy,
            shares: Array.from(e.shares).map((s: ExpenseShareStruct) => ({
              participant: s.participant,
              amount: s.amount
            }))
          }))
        };
      })
    );
  }

  public getGroupDebts(id: BigNumberish) {
    return from(this.contract.allGroupDebts(id));
  }

  public createGroup(name: string, addresses: string[]) {
    return from(this.contract.createGroup(name, addresses));
  }
  public simplifyDebts(id: BigNumberish) {
    return from(this.contract.simplifyDebt(id));
  }

  public createExpense(groupId: BigNumberish, createExpense: CreateExpense) {
    return from(this.contract.registerExpenses(
      groupId,
      createExpense.description,
      createExpense.amount,
      createExpense.splitWith,
      createExpense.splitMethod,
      createExpense.values
    ));
  }
}
