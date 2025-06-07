import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { finalize, from, Observable, switchMap, tap } from 'rxjs';
import { GroupManagerContractService, GroupMetadata } from '../../shared/services/group-manager-contract.service';
import { ToastrService } from 'ngx-toastr';
import { BigNumberish } from 'ethers';
import { GroupDetailsViewStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { LoaderService } from '../../shared/services/loader.service';

interface GroupListState {
  groups: GroupDetailsViewStruct[];
  errorMessage: ''
}

@Injectable()
export class GroupListServiceStore extends ComponentStore<GroupListState> {

  private contractSevice: GroupManagerContractService = inject(GroupManagerContractService);
  private toastr: ToastrService = inject(ToastrService);
  private loader = inject(LoaderService);

  constructor() {
    const initialState: GroupListState = { groups: [], errorMessage: '' };
    super(initialState);
  }

  readonly groups$ = this.select(state => state.groups);

  readonly errorMessage$: Observable<string> = this.select(state => state.errorMessage);

  readonly refreshAllGroups = this.effect<void>(trigger$ => trigger$.pipe(
    tap(() => this.loader.show()),
    switchMap(() => {
      return this.contractSevice.myGroups$.pipe(
        tapResponse(
          (groups) => this.setGroups(groups),
          (error: HttpErrorResponse) => this.handleError(error),
        )
      )
    }),
    tap(() => this.loader.hide())
  ));

  readonly createGroup = this.effect<{ name: string, addresses: string[] }>(createGroup$ => createGroup$.pipe(
    switchMap((createGroup) => {
      return this.contractSevice.createGroup(createGroup.name, createGroup.addresses).pipe(
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
                this.refreshAllGroups();
                this.toastr.success("New group created successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }
        ))
    })
  ));

  readonly requestToJoin = this.effect<BigNumberish>(groupId$ => groupId$.pipe(
    switchMap((groupId) => {
      return this.contractSevice.requestToJoinGroup(groupId).pipe(
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
                this.toastr.success("Request to join group sent successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        }
        ))
    })));

  readonly setGroups = this.updater((state, groups: GroupDetailsViewStruct[]) => ({
    ...state,
    groups: groups
  }));

handleError(error: any) {
    console.log(error)
        this.toastr.error(error.reason ?? 'Internal error: retry later');

  }


}