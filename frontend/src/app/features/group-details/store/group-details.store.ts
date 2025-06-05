import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { distinctUntilChanged, filter, from, map, Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { DebtSettledOutput, GroupManagerContractService, GroupMetadata } from '../../shared/services/group-manager-contract.service';
import { DebtNodeStruct, DebtSettledEvent, ExpenseStruct, ExpenseStructOutput, GroupDetailsViewStruct, GroupViewStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { ToastrService } from 'ngx-toastr';
import { CreateExpense } from '../models/CreateExpense';
import { AddressLike, BigNumberish, ethers } from 'ethers';
import { TrustTokenService } from '../../shared/services/trust-token.service';
import { SettleDebt } from '../models/SettleDebt';


interface GroupDetailsState {
  groupDetails: GroupDetailsViewStruct;
  groupDebts: DebtNodeStruct[];
  settlementEvents: DebtSettledOutput[];
  errorMessage: string
}

@Injectable()
export class GroupDetailsStore extends ComponentStore<GroupDetailsState> {

  private contractSevice: GroupManagerContractService = inject(GroupManagerContractService);
  private tokenSevice: TrustTokenService = inject(TrustTokenService);
  private toastr: ToastrService = inject(ToastrService);

  constructor() {
    const initialState: GroupDetailsState = {
      groupDetails: {} as GroupDetailsViewStruct,
      errorMessage: '',
      groupDebts: [],
      settlementEvents: []
    };
    super(initialState);
    this.listenGroupSettlements();
  }

  readonly groupDetails$ = this.select(state => state.groupDetails);
  readonly settlementEvents$ = this.select(state => state.settlementEvents);
  readonly groupDebts$ = this.select(state => state.groupDebts);
  readonly errorMessage$ = this.select(state => state.errorMessage);

  private reloadAllGroupData(id: BigNumberish) {
    this.loadGroupSettlement(id);
    this.loadGroupDetails(id);
    this.loadGroupDebts(id);
  }

  readonly listenGroupSettlements = this.effect<void>(trigger$ => this.groupDetails$.pipe(
    filter(group => !!group.id),
    distinctUntilChanged((prev, curr) => prev.id === curr.id),
    switchMap((group) => {
      return this.contractSevice.getGroupSettlementEvents(group.id).pipe(
        tapResponse(
          (settlementEvent: any) => {
            this.reloadAllGroupData(group.id);
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    })));

  readonly loadGroupDetails = this.effect<BigNumberish>(ids$ => ids$.pipe(
    switchMap((id) => {
      return this.contractSevice.getGroupDetails(id).pipe(
        tapResponse(
          (group) => {
            group.expenses.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
            this.patchState({
              groupDetails: group
            })
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      )
    })
  ));

  readonly loadGroupDebts = this.effect<BigNumberish>(ids$ => ids$.pipe(
    switchMap((id) => {
      return this.contractSevice.getGroupDebts(id).pipe(
        tapResponse(
          (debts) => {
            this.patchState({
              groupDebts: debts
            })
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      )
    })
  ));

  readonly loadGroupSettlement = this.effect<BigNumberish>(ids$ => ids$.pipe(
    switchMap((id) => {
      return this.contractSevice.getSettlementEvents(id).pipe(
        tapResponse(
          (settlementEvents) => {
            this.patchState({
              settlementEvents: settlementEvents
            });
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      )
    }
    )));

  readonly createExpense = this.effect<CreateExpense>(createExpense$ => createExpense$.pipe(
    withLatestFrom(this.groupDetails$),
    switchMap(([createExpense, groupDetails]) => {
      return this.contractSevice.createExpense(groupDetails.id, createExpense).pipe(
        tapResponse(
          (tx) => {
            this.toastr.success("Transaction submitted: waiting for confirmation on the network...")
          },
          (error: HttpErrorResponse) => this.handleError(error)
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.loadGroupDetails(groupDetails.id)
                this.loadGroupDebts(groupDetails.id)
                this.toastr.success("Expense created successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }
        ))
    })
  ));

  readonly simplifyDebts = this.effect<void>(trigger$ => trigger$.pipe(
    withLatestFrom(this.groupDetails$),
    switchMap(([_, groupDetails]) => {
      return this.contractSevice.simplifyDebts(groupDetails.id).pipe(
        tapResponse(
          (tx) => {
            this.toastr.success("Transaction submitted: waiting for confirmation on the network...")
          },
          (error: HttpErrorResponse) => this.handleError(error)
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.loadGroupDebts(groupDetails.id);
                this.toastr.success("Debts simplified successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }
        ))
    })
  ));

  readonly approveJoinRequest = this.effect<AddressLike>(newMember$ => newMember$.pipe(
    withLatestFrom(this.groupDetails$),
    switchMap(([newMember, groupDetails]) => {
      return this.contractSevice.approveJoinRequest(groupDetails.id, newMember).pipe(
        tapResponse(
          (tx) => {
            this.toastr.success("Transaction submitted: waiting for confirmation on the network...")
          },
          (error: HttpErrorResponse) => this.handleError(error)
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.reloadAllGroupData(groupDetails.id);
                this.toastr.success("Join request approved successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }
        ))
    })))



  readonly settleDebt = this.effect<SettleDebt>(settleDebt$ => settleDebt$.pipe(
    withLatestFrom(this.groupDetails$),
    switchMap(([settleDebt, groupDetails]) => {
      return this.contractSevice.settleDebt(groupDetails.id, settleDebt.amount, settleDebt.to).pipe(
        tapResponse(
          (tx) => {
            this.toastr.success("Transaction submitted: waiting for confirmation on the network...")
          },
          (error: any) => this.handleError(error)
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.toastr.success("Debts settled successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }))
    })))

  handleError(error: any) {
    this.patchState({ errorMessage: error.reason });
    console.log(error)
    this.toastr.error(error.reason ?? 'Internal error: retry later');
  }
}