import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { distinctUntilChanged, filter, from, map, Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { DebtSettledOutput, ExpenseRegisteredOutput, GroupManagerContractService, GroupMetadata } from '../../shared/services/group-manager-contract.service';
import { DebtNodeStruct, DebtSettledEvent, GroupDetailsViewStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { ToastrService } from 'ngx-toastr';
import { CreateExpense } from '../models/CreateExpense';
import { AddressLike, BigNumberish, ethers } from 'ethers';
import { TrustTokenService } from '../../shared/services/trust-token.service';
import { SettleDebt } from '../models/SettleDebt';
import { LoaderService } from '../../shared/services/loader.service';


interface GroupDetailsState {
  groupDetails: GroupDetailsViewStruct;
  groupDebts: DebtNodeStruct[];
  settlementEvents: DebtSettledOutput[];
  expenseEvents: ExpenseRegisteredOutput[];
  errorMessage: string
}

@Injectable()
export class GroupDetailsStore extends ComponentStore<GroupDetailsState> {

  private contractSevice: GroupManagerContractService = inject(GroupManagerContractService);
  private tokenSevice: TrustTokenService = inject(TrustTokenService);
  private toastr: ToastrService = inject(ToastrService);
  private loader = inject(LoaderService);


  constructor() {
    const initialState: GroupDetailsState = {
      groupDetails: {} as GroupDetailsViewStruct,
      errorMessage: '',
      groupDebts: [],
      settlementEvents: [],
      expenseEvents: []
    };
    super(initialState);
    this.listenGroupSettlements();
    this.listenExpenseEvents();
  }

  readonly groupDetails$ = this.select(state => state.groupDetails);
  readonly settlementEvents$ = this.select(state => state.settlementEvents);
  readonly expenseEvents$ = this.select(state => state.expenseEvents);
  readonly groupDebts$ = this.select(state => state.groupDebts);
  readonly errorMessage$ = this.select(state => state.errorMessage);

  private reloadAllGroupData(id: BigNumberish) {
    this.loadGroupDetails(id);
    this.loadGroupDebts(id);
  }

  readonly listenGroupSettlements = this.effect<void>(trigger$ => this.groupDetails$.pipe(
    filter(group => !!group.id),
    distinctUntilChanged((prev, curr) => prev.id === curr.id),
    switchMap((group) => {
      return this.contractSevice.getLiveGroupSettlementEvents(group.id).pipe(
        tapResponse(
          (settlementEvent: DebtSettledOutput) => {
            this.reloadAllGroupData(group.id);
            this.loadGroupSettlement(group.id);
            this.toastr.success("New settlement registered!");
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    })));

  readonly addSettlementEvent = this.updater<DebtSettledOutput>((state, settlementEvent) => {
    const newSettlementEvents = [...state.settlementEvents, settlementEvent];
    return {
      ...state,
      settlementEvents: newSettlementEvents
    };
  }
  );

  readonly listenExpenseEvents = this.effect<void>(trigger$ => this.groupDetails$.pipe(
    filter(group => !!group.id),
    distinctUntilChanged((prev, curr) => prev.id === curr.id),
    switchMap((group) => {
      return this.contractSevice.getLiveGroupExpenseEvents(group.id).pipe(
        tapResponse(
          (expenseEvent: ExpenseRegisteredOutput) => {
            console.log("Expense event received:", expenseEvent);
            this.loadExpenseEvents(group.id);
            this.reloadAllGroupData(group.id);
            this.toastr.success("New expenses registered!");
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    })));

  readonly addExpenseEvent = this.updater<ExpenseRegisteredOutput>((state, expenseEvent) => {
    const newExpenseEvents = [...state.expenseEvents, expenseEvent];
    return {
      ...state,
      expenseEvents: newExpenseEvents
    };
  }
  );

  readonly loadGroupDetails = this.effect<BigNumberish>(ids$ => ids$.pipe(
    tap(() => this.loader.show()),
    switchMap((id) => {
      return this.contractSevice.getGroupDetails(id).pipe(
        tapResponse(
          (group) => {
            this.patchState({
              groupDetails: group
            })
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      )
    }),
    tap(() => this.loader.hide())
  ));

  readonly loadGroupDebts = this.effect<BigNumberish>(ids$ => ids$.pipe(
    tap(() => this.loader.show()),
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
    }),
    tap(() => this.loader.hide())
  ));

  readonly loadGroupSettlement = this.effect<BigNumberish>(ids$ => ids$.pipe(
    tap(() => this.loader.show()),
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
    ),
    tap(() => this.loader.hide())));

  readonly loadExpenseEvents = this.effect<BigNumberish>(ids$ => ids$.pipe(
    tap(() => this.loader.show()),
    switchMap((id) => {
      return this.contractSevice.getExpenseEvents(id).pipe(
        tapResponse(
          (expenseEvents) => {
            this.patchState({
              expenseEvents: expenseEvents
            });
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      )
    }),
    tap(() => this.loader.hide())
  ));

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
      )
    }
    )));

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
        ))
    })))

  handleError(error: any) {
    this.patchState({ errorMessage: error.reason });
    console.log(error)
    this.toastr.error(error.reason ?? 'Internal error: retry later');
  }
}