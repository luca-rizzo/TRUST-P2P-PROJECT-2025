import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GroupDetailsStore } from './store/group-details.service';
import { BigNumberish } from 'ethers';
import { Location } from '@angular/common';
import { NewExpenseComponent } from './new-expense/new-expense.component';
import { CreateExpense } from './models/CreateExpense';
import { DebsComponent } from "./debs/debs.component";


@Component({
  selector: 'app-group-details',
  standalone: true,
  providers: [GroupDetailsStore],
  imports: [CommonModule, NewExpenseComponent, DebsComponent],
  templateUrl: './group-details.component.html',
  styleUrl: './group-details.component.scss'
})
export class GroupDetailsComponent {
  Number = Number;
  private route = inject(ActivatedRoute);
  private groupDetailsStore = inject(GroupDetailsStore);
  private location: Location = inject(Location);
  newExpenseModalOpen = false;
  showDebsModal = false;
  groupDetails$ = this.groupDetailsStore.groupDetails$;
  groupDebts$ = this.groupDetailsStore.groupDebts$;
  errorMessage$ = this.groupDetailsStore.errorMessage$;

  constructor() {
    const groupId = this.route.snapshot.paramMap.get('id') || '-1';
    this.groupDetailsStore.loadGroupDetails(Number(groupId));
    this.groupDetailsStore.loadGroupDebts(Number(groupId));
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
}
