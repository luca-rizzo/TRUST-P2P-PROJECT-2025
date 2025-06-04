import "../struct/Group.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library GroupUtility {
    using EnumerableSet for EnumerableSet.AddressSet;

    function containsMember(
        Group storage group,
        address fromMember
    ) internal view returns (bool) {
        return group.members.contains(fromMember);
    }

    function hasRequested(
        Group storage group,
        address user
    ) internal view returns (bool) {
        return group.requestsToJoin.contains(user);
    }
}
