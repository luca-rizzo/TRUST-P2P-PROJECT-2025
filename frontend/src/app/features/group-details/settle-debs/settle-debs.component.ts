import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DebtEdgeStruct, DebtNodeStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { SettleDebt } from '../models/SettleDebt';
import { FormatBase18Pipe } from '../../shared/utility.ts/format-base18.pipe';

@Component({
  selector: 'app-settle-debs',
  standalone: true,
  imports: [FormsModule, CommonModule, FormatBase18Pipe],
  templateUrl: './settle-debs.component.html',
  styleUrl: './settle-debs.component.scss'
})
export class SettleDebsComponent {
  Number = Number;

  @Input() visible: boolean = false;
  @Input() currentUserDebts: DebtEdgeStruct[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() submit = new EventEmitter<SettleDebt>();

  selectedCreditor: string = '';
  debtsToSelected: number = 0;
  repaymentAmount: number = 0;

  handleSubmit() {
    if (!this.selectedCreditor || this.repaymentAmount <= 0) return;
    this.submit.emit({ to: this.selectedCreditor, amount: this.repaymentAmount });
    this.selectedCreditor = '';
    this.repaymentAmount = 0;
  }

  handleCreditorChange() {
    this.debtsToSelected = this.currentUserDebts
      .find(debt => debt.to === this.selectedCreditor)?.amount as number ?? 0;
  }

  handleClose() {
    this.closed.emit();
    this.selectedCreditor = '';
    this.repaymentAmount = 0;
  }
}
