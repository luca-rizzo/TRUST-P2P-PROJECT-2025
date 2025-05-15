pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";

library GroupAccessControl {

    function requestToJoin(Group storage group) internal {
        (bool requested, ) = hasRequested(group, msg.sender);
        require(
            !isMemberOfGroup(group, msg.sender),
            "You already belong to this group"
        );
        require(!requested, "You already requested to enter in this group");
        group.requestsToJoin.push(msg.sender);
    }

    function approveRequest(
        Group storage group,
        address userToApprove
    ) internal {
        (bool requested, uint256 index) = hasRequested(group, userToApprove);
        require(
            isMemberOfGroup(group, msg.sender),
            "You can approve a request only if you belong to the group"
        );
        require(
            requested,
            "The address has not requested to join the group"
        );
        group.members.push(userToApprove);
        removeAtIndex(group.requestsToJoin, index);
    }

    function isMemberOfGroup(
        Group storage group,
        address member
    ) private view returns (bool) {
        for (uint256 i = 0; i < group.members.length; i++) {
            if (member == group.members[i]) {
                return true;
            }
        }
        return false;
    }

    function hasRequested(
        Group storage group,
        address user
    ) internal view returns (bool, uint256) {
        for (uint i = 0; i < group.requestsToJoin.length; i++) {
            if (group.requestsToJoin[i] == user) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    function removeAtIndex(address[] storage array, uint256 index) internal {
        require(index < array.length);
        array[index] = array[array.length - 1];
        array.pop();
    }

}
