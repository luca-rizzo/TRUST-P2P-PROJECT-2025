import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DebtNodeStruct } from '../../../../../../hardhat/typechain-types/contracts/TrustGroupManager';
import { FormatBase18Pipe } from '../../shared/utility.ts/format-base18.pipe';

@Component({
  selector: 'app-debs',
  standalone: true,
  imports: [CommonModule, FormatBase18Pipe],
  templateUrl: './debs.component.html',
  styleUrl: './debs.component.scss'
})
export class DebsComponent {
  
  @Input() visible = false;
  @Input() debts: DebtNodeStruct[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() simplifyDebts = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }

  _simplyfyDebts() {
    this.simplifyDebts.emit();
  }

}
