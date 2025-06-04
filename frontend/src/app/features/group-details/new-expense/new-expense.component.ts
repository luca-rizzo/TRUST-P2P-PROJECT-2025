import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AddressLike } from 'ethers';
import { CreateExpense, SplitMethod } from '../models/CreateExpense';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
  selector: 'app-new-expense',
  templateUrl: './new-expense.component.html',
  styleUrl: './new-expense.component.scss'
})
export class NewExpenseComponent {
  @Input() visible = false;
  @Input() members: AddressLike[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<CreateExpense>();
  SplitMethod = SplitMethod;

  description = '';
  amount: number | null = null;
  splitMethod: SplitMethod = SplitMethod.EQUAL;
  selectedParticipants: AddressLike[] = [];
  participantValues: { [address: string]: number } = {};


  toggleParticipant(member: AddressLike, e: Event) {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedParticipants.push(member);
    } else {
      this.selectedParticipants = this.selectedParticipants.filter(m => m !== member);
      this.participantValues[member.toString()] = 0
    }
  }

  onValueChange(member: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.participantValues[member] = Number(input.value);
  }

  submit() {
    const values = this.splitMethod === SplitMethod.EQUAL ? []
      : this.selectedParticipants.map((a: AddressLike) => this.participantValues[a.toString()])
    this.created.emit({
      description: this.description,
      amount: this.amount ?? 0,
      splitMethod: this.splitMethod,
      values,
      splitWith: this.selectedParticipants.map(a => a.toString())
    });
    this.reset();
  }

  isSelected(member: AddressLike): boolean {
    return this.selectedParticipants.includes(member);
  }

  close() {
    this.closed.emit();
    this.reset();
  }

  private reset() {
    this.description = '';
    this.amount = null;
    this.splitMethod = SplitMethod.EXACT;
    this.participantValues = {};
    this.selectedParticipants = [];
  }
}

