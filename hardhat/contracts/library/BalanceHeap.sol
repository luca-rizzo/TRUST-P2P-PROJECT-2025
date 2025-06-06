// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Balance.sol";

library BalanceHeap {
    struct Heap {
        Balance[] data;
        uint256 size;
        bool isMinHeap;
    }

    // initializes a min-heap with a fixed maximum number of elements
    // it is foundamental to know the maximum number of elements in advance
    // because the heap is implemented as a fixed-size array and Solidity
    // does not support dynamic arrays size in memory
    function initMinHeap(
        uint256 maxElements
    ) internal pure returns (Heap memory) {
        return
            Heap({data: new Balance[](maxElements), size: 0, isMinHeap: true});
    }

    // initializes a max-heap with a fixed maximum number of elements
    // it is foundamental to know the maximum number of elements in advance
    // because the heap is implemented as a fixed-size array and Solidity
    // does not support dynamic arrays size in memory
    function initMaxHeap(
        uint256 maxElements
    ) internal pure returns (Heap memory) {
        return
            Heap({data: new Balance[](maxElements), size: 0, isMinHeap: false});
    }

    // inserts a new value into the heap and maintains the heap property
    function insert(Heap memory heap, Balance memory value) internal pure {
        require(heap.size < heap.data.length, "Heap full");
        heap.data[heap.size] = value;
        siftUp(heap, heap.size);
        heap.size++;
    }

    // removes and returns the top element (min or max) from the heap
    function extractTop(
        Heap memory heap
    ) internal pure returns (Balance memory) {
        require(heap.size > 0, "Heap is empty");
        Balance memory top = heap.data[0];
        heap.size--;
        heap.data[0] = heap.data[heap.size];
        siftDown(heap, 0);
        return top;
    }

    // returns the current number of elements in the heap
    function currentSize(Heap memory heap) internal pure returns (uint256) {
        return heap.size;
    }

    // compares two balances according to heap type (min or max)
    function compare(
        Heap memory heap,
        Balance memory a,
        Balance memory b
    ) private pure returns (bool) {
        return heap.isMinHeap ? a.amount < b.amount : a.amount > b.amount;
    }

    // moves the element at index up to restore the heap property
    function siftUp(Heap memory heap, uint256 index) private pure {
        while (index > 0) {
            uint256 parent = (index - 1) / 2;
            // if the heap property is satisfied, stop
            if (!compare(heap, heap.data[index], heap.data[parent])) {
                break;
            }
            // swap with parent and continue
            (heap.data[index], heap.data[parent]) = (
                heap.data[parent],
                heap.data[index]
            );
            index = parent;
        }
    }

    // moves the element at index down to restore the heap property
    function siftDown(Heap memory heap, uint256 index) private pure {
        uint256 length = heap.size;
        uint best = bestBetweenIndexAndChildren(heap, length, index);
        while (best != index) {
            // swap with the best child and continue
            (heap.data[index], heap.data[best]) = (
                heap.data[best],
                heap.data[index]
            );
            index = best;
            best = bestBetweenIndexAndChildren(heap, length, index);
        }
    }

    // finds the best (min or max) among index and its children
    function bestBetweenIndexAndChildren(
        Heap memory heap,
        uint256 size,
        uint256 index
    ) private pure returns (uint256) {
        uint256 left = 2 * index + 1;
        uint256 right = 2 * index + 2;
        uint256 smallest = index;
        // compare with left child
        if (
            left < size && compare(heap, heap.data[left], heap.data[smallest])
        ) {
            smallest = left;
        }
        // compare with right child
        if (
            right < size && compare(heap, heap.data[right], heap.data[smallest])
        ) {
            smallest = right;
        }
        return smallest;
    }
}
