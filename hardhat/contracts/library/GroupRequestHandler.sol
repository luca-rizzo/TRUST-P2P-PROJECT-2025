pragma solidity ^0.8.28;

import "../struct/Expense.sol";
import "../struct/Group.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./GroupUtility.sol";

library GroupRequestHandler {
    
    event GroupCreated(
        uint256 groupId,
        string name,
        address creator,
        address[] members
    );

    event UserApproved(uint256 indexed groupId, address indexed user);

    event UserRejected(uint256 indexed groupId, address indexed user);

    event RequestToJoin(uint256 indexed groupId, address indexed user);

    using EnumerableSet for EnumerableSet.AddressSet;
    using GroupUtility for Group;

    function initializeGroup(
        Group storage newGroup,
        string calldata name,
        uint256 groupId,
        address[] calldata otherMembers,
        mapping(address => uint256[]) storage groupsOfAddress
    ) internal {
        newGroup.name = name;
        newGroup.id = groupId;
        newGroup.creator = msg.sender;
        for (uint256 i = 0; i < otherMembers.length; i++) {
            newGroup.members.add(otherMembers[i]);
            groupsOfAddress[otherMembers[i]].push(groupId);
        }
        newGroup.members.add(msg.sender);
        groupsOfAddress[msg.sender].push(groupId);
        newGroup.creationTimestamp = block.timestamp;
        emit GroupCreated(groupId, name, msg.sender, newGroup.members.values());
    }

    function requestToJoin(Group storage group) internal {
        require(
            !group.containsMember(msg.sender),
            "You already belong to this group"
        );
        require(
            !group.hasRequested(msg.sender),
            "You already requested to enter in this group"
        );
        group.requestsToJoin.add(msg.sender);
        emit RequestToJoin(group.id, msg.sender);
    }

    function approveRequest(
        Group storage group,
        address userToApprove
    ) internal {
        require(
            group.containsMember(msg.sender),
            "You can approve a request only if you belong to the group"
        );
        require(
            group.hasRequested(userToApprove),
            "The address has not requested to join the group"
        );
        group.members.add(userToApprove);
        group.requestsToJoin.remove(userToApprove);
        emit UserApproved(group.id, userToApprove);
    }

    function rejectRequest(Group storage group, address userToReject) internal {
        require(
            group.containsMember(msg.sender),
            "You can reject a request only if you belong to the group"
        );
        require(
            group.hasRequested(userToReject),
            "The address has not requested to join the group"
        );
        group.requestsToJoin.remove(userToReject);
        emit UserRejected(group.id, userToReject);
    }
}
