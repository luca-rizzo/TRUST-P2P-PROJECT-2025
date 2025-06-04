import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './join-group.component.html',
  styleUrl: './join-group.component.scss'
})
export class JoinGroupComponent {
  @Input() showModal = false;
  @Output() closed = new EventEmitter<void>();
  @Output() joinGroupSubmitted = new EventEmitter<bigint>();
  
  groupId: number | undefined;

  requestToJoin() {
    if (!this.groupId) {
      return;
    }
    this.joinGroupSubmitted.emit(BigInt(this.groupId || 0));
    this.reset();
  }

  close() {
    this.closed.emit();
    this.reset();
  }

  private reset() {
    this.groupId = undefined;
  }
}
