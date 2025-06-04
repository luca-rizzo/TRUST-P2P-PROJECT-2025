import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tapResponse } from '@ngrx/operators';
import { combineLatest, from, map, Observable, switchMap, tap, withLatestFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { BigNumberish, ethers } from 'ethers';
import { TrustTokenService } from '../../services/trust-token.service';
import { WalletService } from '../../services/wallet.service';
import { formatBase18 } from '../../utility.ts/to_base_converter';
import { GroupManagerContractService } from '../../services/group-manager-contract.service';

interface CurrentAccountAmount {
  wei: bigint;
  tg: bigint;
  conversionRate: number;
  allowanceToContractManager: bigint
}

@Injectable()
export class TTEthStore extends ComponentStore<CurrentAccountAmount> {

  private tokenSevice: TrustTokenService = inject(TrustTokenService);
  private walletSevice: WalletService = inject(WalletService);
  private groupManagerService: GroupManagerContractService = inject(GroupManagerContractService);
  private toastr: ToastrService = inject(ToastrService);

  constructor() {
    const initialState: CurrentAccountAmount = {
      wei: 0n,
      tg: 0n,
      conversionRate: 100,
      allowanceToContractManager: 0n
    };
    super(initialState);
    this.refreshIfNewSettlement();
  }

  readonly eth$ = this.select(state => state.wei);

  readonly tt$ = this.select(state => state.tg);

  readonly conversionRate$ = this.select(state => state.conversionRate);
  readonly allowance$ = this.select(state => state.allowanceToContractManager);

  readonly refreshIfNewSettlement = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => this.groupManagerService.mySettlementEvent$.pipe(
      tap(() => {
        this.loadCurrentAccountAmount();
        this.loadAllowanceToContractManager();

      }
      ))))
  );

  readonly loadCurrentAccountAmount = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => {
      return combineLatest([
        this.tokenSevice.getTTTokenBalance(),
        this.walletSevice.getEthAmount()
      ]).pipe(
        tapResponse(
          ([tg, wei]) => this.patchState({
            wei: wei, tg: tg
          }),
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    })
  ));

  readonly loadAllowanceToContractManager = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => {
      return this.tokenSevice.allowanceToGroupManager().pipe(
        tapResponse(
          (allowance) => {
            this.patchState({ allowanceToContractManager: allowance });
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    })));

  readonly loadConversionRate = this.effect<void>(trigger$ => trigger$.pipe(
    switchMap(() => {
      return this.tokenSevice.getRate().pipe(
        tapResponse(
          (rate) => {
            this.patchState({ conversionRate: Number(rate) });
          },
          (error: HttpErrorResponse) => this.handleError(error)
        )
      );
    }
    ))
  );

  readonly setNewAllowance = this.effect<number>(amount$ => amount$.pipe(
    switchMap((amount) => {
      return this.tokenSevice.setAllowanceToGroupManager(amount).pipe(
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
                this.loadAllowanceToContractManager();
                this.toastr.success("Allowance updated successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        })
      )
    })));

  readonly buyTTWithEth = this.effect<number>(amount$ => amount$.pipe(
    switchMap((amount) => {
      return this.tokenSevice.ethToTT(amount).pipe(
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
                this.loadCurrentAccountAmount();
                this.toastr.success("TT bought successfully!");
              },
              (error: HttpErrorResponse) => this.handleError(error)
            ),
          );
        })
      )
    })));

  handleError(error: any) {
    console.log(error)
    this.toastr.error(error.reason);
  }

}