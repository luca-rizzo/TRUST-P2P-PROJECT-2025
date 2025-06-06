pragma solidity ^0.8.28;

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

    // initializes a new group, adds all members and emits events
    function initializeGroup(
        Group storage newGroup,
        string calldata name,
        uint256 groupId,
        address[] calldata otherMembers
    ) internal {
        newGroup.name = name;
        newGroup.id = groupId;
        newGroup.creator = msg.sender;
        // add all provided members
        for (uint256 i = 0; i < otherMembers.length; i++) {
            newGroup.members.add(otherMembers[i]);
        }
        // add the creator as a member
        newGroup.members.add(msg.sender);
        address[] memory members = newGroup.members.values();
        // emit approval event for each member
        for (uint i = 0; i < members.length; i++) {
            emit UserApproved(groupId, members[i]);
        }
        newGroup.creationTimestamp = block.timestamp;
        // emit group creation event
        emit GroupCreated(groupId, name, msg.sender, members);
    }

    // handles a join request from msg.sender
    function requestToJoin(Group storage group) internal {
        require(
            !group.containsMember(msg.sender),
            "You already belong to this group"
        );
        require(
            !group.hasRequested(msg.sender),
            "You already requested to enter in this group"
        );
        // add sender to join requests
        group.requestsToJoin.add(msg.sender);
        emit RequestToJoin(group.id, msg.sender);
    }

    // approves a pending join request for a user
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
        // move user from requests to members
        group.members.add(userToApprove);
        group.requestsToJoin.remove(userToApprove);
        emit UserApproved(group.id, userToApprove);
    }

    // rejects a pending join request for a user
    function rejectRequest(Group storage group, address userToReject) internal {
        require(
            group.containsMember(msg.sender),
            "You can reject a request only if you belong to the group"
        );
        require(
            group.hasRequested(userToReject),
            "The address has not requested to join the group"
        );
        // remove user from requests
        group.requestsToJoin.remove(userToReject);
        emit UserRejected(group.id, userToReject);
    }
}
