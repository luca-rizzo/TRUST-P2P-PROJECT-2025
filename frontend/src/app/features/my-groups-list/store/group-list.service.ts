import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { from, Observable, switchMap } from 'rxjs';
import { GroupManagerContractService, GroupMetadata } from '../../shared/services/group-manager-contract.service';
import { GroupViewStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { ToastrService } from 'ngx-toastr';

interface GroupListState {
  groups: GroupViewStruct[];
  errorMessage: ''
}

@Injectable()
export class GroupListServiceStore extends ComponentStore<GroupListState> {

  private contractSevice: GroupManagerContractService = inject(GroupManagerContractService);
  private toastr: ToastrService = inject(ToastrService);

  constructor() {
    const initialState: GroupListState = { groups: [], errorMessage: '' };
    super(initialState);
  }

  readonly groups$ = this.select(state => state.groups);

  readonly errorMessage$: Observable<string> = this.select(state => state.errorMessage);

  readonly refreshAllGroups = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => {
      return this.contractSevice.getAllMyGroups().pipe(
        tapResponse(
          (groups) => this.setGroups(groups),
          (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
        )
      )
    })
  ));

  readonly createGroup = this.effect<{ name: string, addresses: string[] }>(createGroup$ => createGroup$.pipe(
    switchMap((createGroup) => {
      return this.contractSevice.createGroup(createGroup.name, createGroup.addresses).pipe(
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
                this.refreshAllGroups();
                this.toastr.success("New group created successfully!");
              },
              (error: HttpErrorResponse) => this.patchState({ errorMessage: error.error })
            ),
          );
        }
        ))
    })
  ));

  readonly setGroups = this.updater((state, groups: GroupViewStruct[]) => ({
    ...state,
    groups: groups
  }));

}