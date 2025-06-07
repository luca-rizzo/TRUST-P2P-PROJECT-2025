import { Injectable } from '@angular/core';
import { AddressLike, BigNumberish, ethers, Log } from 'ethers';
import { catchError, combineLatest, EMPTY, filter, from, map, mergeMap, Observable, of, scan, startWith, switchMap, tap, toArray } from 'rxjs';
import { DebtSettledEvent, ExpenseRegisteredEvent, GroupDetailsViewStruct, TrustGroupManager } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { TrustGroupManager__factory } from '../../../../../../hardhat/typechain-types/factories/contracts/TrustGroupManager__factory';
import { environment } from '../../../../../environments/environment';
import { CreateExpense, SplitMethod, SplitMethodIndex } from '../../group-details/models/CreateExpense';
import { createObservableFromEvent } from '../utility.ts/observable_from_event';
import { parseToBase18 } from '../utility.ts/to_base_converter';
import { WalletService } from './wallet.service';
import { TypedEventLog, TypedContractEvent } from '../../../../../../hardhat/typechain-types/common';

export interface GroupMetadata {
  groupId: number;
  name: string;
  members: string[]
}

export type DebtSettledOutput = DebtSettledEvent.OutputObject & {
  timestamp: number;
};

export type ExpenseRegisteredOutput = ExpenseRegisteredEvent.OutputObject & {
  timestamp: number;
};

@Injectable({
  providedIn: 'root'
})
export class GroupManagerContractService {
  private groupManagerAddress = environment.trustContracts.groupManagerAddress;

  constructor(private walletService: WalletService) { }

  private contract$: Observable<TrustGroupManager> = this.walletService.wallet$.pipe(
    filter(wallet => !!wallet),
    switchMap(wallet => {
      return of(TrustGroupManager__factory.connect(this.groupManagerAddress, wallet));
    })
  );

  public mySettlementEvent$ = combineLatest([
    this.contract$,
    this.walletService.address$
  ]).pipe(
    switchMap(([contract, address]) =>
      createObservableFromEvent<DebtSettledEvent.OutputObject>(
        'DebtSettled',
        contract,
        ['groupId', 'from', 'to', 'amount'],
        (e) => e.from === address || e.to === address
      )
    )
  );

  public myGroups$ = combineLatest([this.contract$, this.walletService.address$]).pipe(
    filter(([contract, address]) => !!address && !!contract),
    switchMap(([contract, address]) => {
      return from(
        contract.queryFilter(
          contract.filters.UserApproved(undefined, address ?? undefined),
          8490100,
          'latest'
        )
      ).pipe(
        switchMap(events => {
          if (events.length === 0) {
            return of([]);
          }
          return from(events).pipe(
            mergeMap(event => this.getGroupDetails(event.args[0]).pipe(
              catchError(err => {
                console.error('Error fetching group details:', err);
                return EMPTY;
              })
            )),
            scan((acc: GroupDetailsViewStruct[], group) => [...acc, group], [])
          )
        }))
      })
    );


  public requestToJoinGroup(id: BigNumberish) {
    return this.contract$.pipe(
      switchMap(contract => from(contract.requestToJoin(id)))
    );
  }

  public getLiveGroupSettlementEvents(id: BigNumberish): Observable<DebtSettledOutput> {
    return this.contract$.pipe(
      switchMap(contract =>
        createObservableFromEvent<DebtSettledOutput>(
          'DebtSettled',
          contract,
          ['groupId', 'from', 'to', 'amount'],
          (e) => e.groupId == id.valueOf() as bigint
        )
      )
    );
  }

  public getLiveGroupExpenseEvents(id: BigNumberish): Observable<ExpenseRegisteredOutput> {
    return this.contract$.pipe(
      switchMap(contract =>
        createObservableFromEvent<ExpenseRegisteredOutput>(
          'ExpenseRegistered',
          contract,
          ['groupId', 'expenseId', 'payer', 'amount', 'description', 'splitWith', 'amountForEach'],
          (e) => e.groupId == id.valueOf() as bigint
        )
      )
    );
  }

  public getGroupDetails(id: BigNumberish): Observable<GroupDetailsViewStruct> {
    return this.contract$.pipe(
      switchMap(contract =>
        from(contract.retrieveGroup(id))
      )
    );
  }

  public getGroupDebts(id: BigNumberish) {
    return this.contract$.pipe(
      switchMap(contract => from(contract.allGroupDebts(id)))
    );
  }

  public createGroup(name: string, addresses: string[]) {
    return this.contract$.pipe(
      switchMap(contract => from(contract.createGroup(name, addresses)))
    );
  }

  public simplifyDebts(id: BigNumberish) {
    return this.contract$.pipe(
      switchMap(contract => from(contract.simplifyDebt(id)))
    );
  }

  public createExpense(groupId: BigNumberish, createExpense: CreateExpense) {
    const parsedAmount = ethers.parseUnits(createExpense.amount.toString(), 18);
    const parsedValues =
      createExpense.splitMethod === SplitMethod.EXACT
        ? createExpense.values.map(parseToBase18)
        : createExpense.values;

    return this.contract$.pipe(
      switchMap(contract =>
        from(
          contract.registerExpenses(
            groupId,
            createExpense.description,
            parsedAmount,
            createExpense.splitWith,
            SplitMethodIndex[createExpense.splitMethod],
            parsedValues
          )
        )
      )
    );
  }

  public settleDebt(groupId: BigNumberish, amount: number, address: string) {
    const parsedAmount = parseToBase18(amount);
    return this.contract$.pipe(
      switchMap(contract => from(contract.settleDebt(groupId, parsedAmount, address)))
    );
  }

  public getSettlementEvents(groupId: BigNumberish): Observable<DebtSettledOutput[]> {
    return this.contract$.pipe(
      switchMap(contract =>
        from(contract.queryFilter(
          contract.filters.DebtSettled(groupId, undefined, undefined),
          8490300,
          'latest'
        )).pipe(
          switchMap(events => {
            if (events.length === 0) {
              return of([]);
            }

            return from(events).pipe(
              mergeMap(event =>
                from(this.walletService.provider.getBlock(event.blockNumber)).pipe(
                  catchError(this.blockNotFound(event)),
                  map(block => ({
                    groupId: event.args[0],
                    from: event.args[1],
                    to: event.args[2],
                    amount: event.args[3],
                    timestamp: block?.timestamp || 0
                  }))
                )
              ),
              scan((acc: DebtSettledOutput[], group) => [...acc, group], [])
            );
          })

        )
      )
    );
  }

  public getExpenseEvents(groupId: BigNumberish): Observable<ExpenseRegisteredOutput[]> {
    return this.contract$.pipe(
      switchMap(contract =>
        from(contract.queryFilter(
          contract.filters.ExpenseRegistered(groupId, undefined, undefined),
          8490300,
          'latest'
        )).pipe(
          switchMap(events => {
            if (events.length === 0) {
              return of([]);
            }
            return from(events).pipe(
              mergeMap(event =>
                from(this.walletService.provider.getBlock(event.blockNumber)).pipe(
                  catchError(this.blockNotFound(event)),
                  map(block => ({
                    groupId: event.args[0],
                    expenseId: event.args[1],
                    payer: event.args[2],
                    amount: event.args[3],
                    description: event.args[4],
                    splitWith: event.args[5],
                    amountForEach: event.args[6],
                    timestamp: block?.timestamp || 0
                  }))
                )
              ),
              scan((acc: ExpenseRegisteredOutput[], group) => [...acc, group], [])
            );
          })

        )
      ),
    );
  }

  private blockNotFound(event: any): (err: any, caught: Observable<ethers.Block | null>) => Observable<null> {
    return () => {
      console.error('Block not found for event:', event);
      return of(null);
    };
  }

  public approveJoinRequest(id: BigNumberish, newMember: AddressLike) {
    return this.contract$.pipe(
      switchMap(contract => from(contract.approveAddress(id, newMember)))
    );
  }
}

