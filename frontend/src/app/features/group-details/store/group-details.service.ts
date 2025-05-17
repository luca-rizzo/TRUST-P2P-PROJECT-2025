import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { from, map, Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { GroupManagerContractService, GroupMetadata } from '../../shared/services/group-manager-contract.service';
import { DebtNodeStruct, ExpenseStruct, ExpenseStructOutput, GroupDetailsViewStruct, GroupViewStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { ToastrService } from 'ngx-toastr';
import { CreateExpense } from '../models/CreateExpense';
import { BigNumberish } from 'ethers';

interface GroupDetailsState {
  groupDetails: GroupDetailsViewStruct;
  groupDebts: DebtNodeStruct[];
  errorMessage: string
}

@Injectable()
export class GroupDetailsStore extends ComponentStore<GroupDetailsState> {

  private contractSevice: GroupManagerContractService = inject(GroupManagerContractService);
  private toastr: ToastrService = inject(ToastrService);

  constructor() {
    const initialState: GroupDetailsState = {
      groupDetails: {} as GroupDetailsViewStruct,
      errorMessage: '',
      groupDebts: []
    };
    super(initialState);
  }

  readonly groupDetails$ = this.select(state => state.groupDetails);
  readonly groupDebts$ = this.select(state => state.groupDebts);
  readonly errorMessage$ = this.select(state => state.errorMessage);

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
          (error: HttpErrorResponse) => this.patchState({
            errorMessage: error.message
          })
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
          (error: HttpErrorResponse) => this.patchState({
            errorMessage: error.message
          })
        )
      )
    })
  ));

  readonly createExpense = this.effect<CreateExpense>(createExpense$ => createExpense$.pipe(
    withLatestFrom(this.groupDetails$),
    switchMap(([createExpense, groupDetails]) => {
      return this.contractSevice.createExpense(groupDetails.id, createExpense).pipe(
        tapResponse(
          (tx) => {
            this.toastr.success("Transaction submitted: waiting for confirmation on the network...")
          },
          (error: HttpErrorResponse) => {
            this.patchState({ errorMessage: error.error });
            console.log(error)
            this.toastr.error(error.error)
          }
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.loadGroupDetails(groupDetails.id)
                this.toastr.success("Expense created successfully!");
              },
              (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
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
          (error: HttpErrorResponse) => {
            this.patchState({ errorMessage: error.error });
            console.log(error)
            this.toastr.error(error.error)
          }
        ),
        switchMap(tx => {
          return from(tx.wait()).pipe(
            tapResponse(
              (tx) => {
                this.loadGroupDebts(groupDetails.id);
                this.toastr.success("Debts simplified successfully!");
              },
              (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
            ),
          );
        }
        ))
    })
  ));

}