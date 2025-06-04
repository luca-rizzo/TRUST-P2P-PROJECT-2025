import { Injectable } from '@angular/core';
import { filter, from, fromEventPattern, map, merge, mergeMap, Observable, switchMap, tap, toArray } from 'rxjs';
import { DebtSettledEvent, ExpenseShareStruct, ExpenseStruct, GroupDetailsViewStruct, TrustGroupManager } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { TrustGroupManager__factory } from '../../../../../../hardhat/typechain-types/factories/contracts/TrustGroupManager__factory';
import { GROUP_MANAGER_CONTRACT } from '../../../environments/deployed-contracts';
import { WalletService } from './wallet.service';
import { CreateExpense, SplitMethod, SplitMethodIndex } from '../../group-details/models/CreateExpense';
import { AddressLike, BaseContract, BigNumberish, ethers, Log } from 'ethers';
import { parseToBase18 } from '../utility.ts/to_base_converter';
import { createObservableFromEvent } from '../utility.ts/observable_from_event';

export interface GroupMetadata {
  groupId: number;
  name: string;
  members: string[]
}

export type DebtSettledOutput = DebtSettledEvent.OutputObject & {
  timestamp: number; 
};

@Injectable({
  providedIn: 'root'
})
export class GroupManagerContractService {
  

  private contract: TrustGroupManager;

  mySettlementEvent$ = this.walletService.address$.pipe(
    switchMap((address: string) => {
      return createObservableFromEvent<DebtSettledEvent.OutputObject>(
        'DebtSettled',
        this.contract,
        ['groupId', 'from', 'to', 'amount'],
        (e: DebtSettledEvent.OutputObject) => e.from === address || e.to === address
      )
    })
  );

  constructor(private walletService: WalletService) {
    this.contract = TrustGroupManager__factory.connect(
      GROUP_MANAGER_CONTRACT.publicAddress,
      this.walletService.wallet
    );

  }

  public getAllMyGroups() {
    return from(this.contract.retrieveMyGroups());
  }

  public requestToJoinGroup(id: BigNumberish) {
    return from(this.contract.requestToJoin(id));
  }

  public getGroupSettlementEvents(id: BigNumberish): Observable<DebtSettledEvent.OutputObject> {
    console.log("Retrieving settlement events for group ID:", id);
    return createObservableFromEvent<DebtSettledEvent.OutputObject>(
        'DebtSettled',
        this.contract,
        ['groupId', 'from', 'to', 'amount'],
        (e: DebtSettledEvent.OutputObject) => e.groupId == id.valueOf() as bigint
      )
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
    const parsedAmount = ethers.parseUnits(createExpense.amount.toString(), 18);
    const parsedValues = createExpense.splitMethod === SplitMethod.EXACT ?
      createExpense.values.map(parseToBase18) : createExpense.values;
    return from(this.contract.registerExpenses(
      groupId,
      createExpense.description,
      parsedAmount,
      createExpense.splitWith,
      SplitMethodIndex[createExpense.splitMethod],
      parsedValues
    ));
  }

  public settleDebt(groupId: BigNumberish, amount: number, address: string) {
    const parsedAmount = parseToBase18(amount);
    return from(this.contract.settleDebt(groupId, parsedAmount, address));
  }

  public getSettlementEvents(groupId: BigNumberish): Observable<DebtSettledOutput[]> {
    return from(
      this.contract.queryFilter(
        this.contract.filters.DebtSettled(groupId, undefined, undefined),
        0,
        'latest'
      )
    ).pipe(
      mergeMap(events =>
        from(events).pipe(
          mergeMap(event =>
            from(this.walletService.provider.getBlock(event.blockNumber)).pipe(
              map(block => ({
                groupId: event.args[0],
                from: event.args[1],
                to: event.args[2],
                amount: event.args[3],
                timestamp: block?.timestamp || 0
              }))
            )
          ),
          toArray()
        )
      )
    );
  }

  approveJoinRequest(id: BigNumberish, newMember: AddressLike) {
    return from(this.contract.approveAddress(id, newMember));
  }

}
