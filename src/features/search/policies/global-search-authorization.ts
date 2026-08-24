import {
  getAssetReadScope,
  getTicketReadScope,
  type WorkspaceScopeContext,
} from "@/features/auth/policies/workspace-authorization";
import { canViewPeopleDirectory } from "@/features/people/policies/people-authorization";

export function getGlobalSearchAuthorization(
  context: WorkspaceScopeContext,
) {
  return {
    ticketScope:
      getTicketReadScope(context),
    assetScope:
      getAssetReadScope(context),
    canSearchPeople:
      canViewPeopleDirectory(
        context.role,
      ),
  };
}
