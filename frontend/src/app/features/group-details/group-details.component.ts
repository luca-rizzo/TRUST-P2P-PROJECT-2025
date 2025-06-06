import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GroupDetailsStore } from './store/group-details.store';
import { AddressLike, BigNumberish } from 'ethers';
import { Location } from '@angular/common';
import { NewExpenseComponent } from './new-expense/new-expense.component';
import { CreateExpense } from './models/CreateExpense';
import { DebsComponent } from "./debs/debs.component";
import { SettleDebsComponent } from './settle-debs/settle-debs.component';
import { WalletService } from '../shared/services/wallet.service';
import { combineLatest, map } from 'rxjs';
import { SettleDebt } from './models/SettleDebt';
import { FormatBase18Pipe } from '../shared/utility.ts/format-base18.pipe';
import { PendingJoinReqComponent } from './pending-join-req/pending-join-req.component';
import { ExpenseRegisteredOutput } from '../shared/services/group-manager-contract.service';


@Component({
  selector: 'app-group-details',
  standalone: true,
  providers: [GroupDetailsStore],
  imports: [CommonModule, NewExpenseComponent, DebsComponent, SettleDebsComponent, FormatBase18Pipe,
    PendingJoinReqComponent],
  templateUrl: './group-details.component.html',
  styleUrl: './group-details.component.scss'
})
export class GroupDetailsComponent {
  Number = Number;
  private route = inject(ActivatedRoute);
  private groupDetailsStore = inject(GroupDetailsStore);
  private wallet = inject(WalletService);
  private location: Location = inject(Location);
  newExpenseModalOpen = false;
  settleDebtsModalOpen = false;
  showDebsModal = false;
  groupDetails$ = this.groupDetailsStore.groupDetails$;
  groupSettlements$ = this.groupDetailsStore.settlementEvents$;
  groupExpenseEvents$ = this.groupDetailsStore.expenseEvents$;
  groupDebts$ = this.groupDetailsStore.groupDebts$;
  errorMessage$ = this.groupDetailsStore.errorMessage$;

  currentUserDebts$ = combineLatest([
    this.groupDebts$,
    this.wallet.address$
  ]).pipe(
    map(([debts, address]) => debts.find(debt => debt.from === address)?.edges ?? [])
  )

  showSettleDebtsButton$ = this.currentUserDebts$.pipe(
    map(edges => edges.length > 0)
  );

  groupActivity$ = combineLatest([
    this.groupExpenseEvents$,
    this.groupSettlements$
  ]).pipe(
    map(([exps, settlements]) => {
      const expenses = exps?.map((exp: ExpenseRegisteredOutput) => ({
        ...exp,
        type: 'expense' as const
      })) ?? [];

      const settled = settlements?.map(s => ({
        ...s,
        type: 'settlement' as const
      })) ?? [];

      return [...expenses, ...settled].sort(
        (a, b) => Number(b.timestamp) - Number(a.timestamp)
      );
    })
  );

  constructor() {
    const groupId = this.route.snapshot.paramMap.get('id') || '-1';
    this.groupDetailsStore.loadGroupDetails(Number(groupId));
    this.groupDetailsStore.loadGroupSettlement(Number(groupId));
    this.groupDetailsStore.loadGroupDebts(Number(groupId));
    this.groupDetailsStore.loadExpenseEvents(Number(groupId));
  }

  isPositive(amount: BigNumberish): boolean {
    return amount.valueOf() as number >= 0;
  }

  isNegative(amount: BigNumberish): boolean {
    return amount.valueOf() as number < 0;
  }

  goBack() {
    this.location.back();
  }

  handleNewExpense(createExpense: CreateExpense) {
    this.groupDetailsStore.createExpense(createExpense);
    this.newExpenseModalOpen = false;
  }

  simplifyDebts() {
    this.groupDetailsStore.simplifyDebts();
  }


  showDebtsModal(id: BigNumberish) {
    this.groupDetailsStore.loadGroupDebts(id);
    this.showDebsModal = true;
  }

  payDebts(event: SettleDebt) {
    this.groupDetailsStore.settleDebt(event);
    this.settleDebtsModalOpen = false;
  }

  approveJoinRequest(address: AddressLike) {
    this.groupDetailsStore.approveJoinRequest(address);
  }
}
