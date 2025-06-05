// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../struct/Balance.sol";

library BalanceHeap {
    struct Heap {
        Balance[] data;
        uint256 size;
        bool isMinHeap;
    }

    function initMinHeap(
        uint256 maxElements
    ) internal pure returns (Heap memory) {
        return
            Heap({data: new Balance[](maxElements), size: 0, isMinHeap: true});
    }

    function initMaxHeap(
        uint256 maxElements
    ) internal pure returns (Heap memory) {
        return Heap({data: new Balance[](maxElements), size: 0, isMinHeap: false});
    }

    function insert(Heap memory heap, Balance memory value) internal pure {
        require(heap.size < heap.data.length, "Heap full");
        heap.data[heap.size] = value;
        siftUp(heap, heap.size);
        heap.size++;
    }

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

    function currentSize(Heap memory heap) internal pure returns (uint256) {
        return heap.size;
    }

    function compare(
        Heap memory heap,
        Balance memory a,
        Balance memory b
    ) private pure returns (bool) {
        return heap.isMinHeap ? a.amount < b.amount : a.amount > b.amount;
    }

    function siftUp(Heap memory heap, uint256 index) private pure {
        while (index > 0) {
            uint256 parent = (index - 1) / 2;

            if (!compare(heap, heap.data[index], heap.data[parent])) {
                break;
            }

            (heap.data[index], heap.data[parent]) = (
                heap.data[parent],
                heap.data[index]
            );

            index = parent;
        }
    }

    function siftDown(Heap memory heap, uint256 index) private pure {
        uint256 length = heap.size;
        uint best = bestBetweenIndexAndChildren(heap, length, index);
        while (best != index) {
            (heap.data[index], heap.data[best]) = (
                heap.data[best],
                heap.data[index]
            );
            index = best;
            best = bestBetweenIndexAndChildren(heap, length, index);
        }
    }

    function bestBetweenIndexAndChildren(
        Heap memory heap,
        uint256 size,
        uint256 index
    ) private pure returns (uint256) {
        uint256 left = 2 * index + 1;
        uint256 right = 2 * index + 2;
        uint256 smallest = index;
        if (
            left < size && compare(heap, heap.data[left], heap.data[smallest])
        ) {
            smallest = left;
        }
        if (
            right < size && compare(heap, heap.data[right], heap.data[smallest])
        ) {
            smallest = right;
        }

        return smallest;
    }
}
