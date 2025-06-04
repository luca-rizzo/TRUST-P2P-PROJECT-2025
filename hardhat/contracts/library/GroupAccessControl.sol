pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

using EnumerableSet for EnumerableSet.AddressSet;

library GroupAccessControl {

    function requestToJoin(Group storage group) internal {
        require(
            !isMemberOfGroup(group, msg.sender),
            "You already belong to this group"
        );
        require(!hasRequested(group, msg.sender), "You already requested to enter in this group");
        group.requestsToJoin.add(msg.sender);
    }

    function approveRequest(
        Group storage group,
        address userToApprove
    ) internal {
        require(
            isMemberOfGroup(group, msg.sender),
            "You can approve a request only if you belong to the group"
        );
        require(
            hasRequested(group, userToApprove),
            "The address has not requested to join the group"
        );
        group.members.add(userToApprove);
        group.requestsToJoin.remove(userToApprove);
    }

    function isMemberOfGroup(
        Group storage group,
        address member
    ) private view returns (bool) {
        return group.members.contains(member);
    }

    function hasRequested(
        Group storage group,
        address user
    ) internal view returns (bool) {
        return group.requestsToJoin.contains(user);
    }

    function removeAtIndex(address[] storage array, uint256 index) internal {
        require(index < array.length);
        array[index] = array[array.length - 1];
        array.pop();
    }

}
