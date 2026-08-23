export type UpdateMembershipField =
  | "membershipId"
  | "role"
  | "status"
  | "department";

export type UpdateMembershipFieldErrors =
  Partial<
    Record<UpdateMembershipField, string[]>
  >;

export type UpdateMembershipActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: UpdateMembershipFieldErrors;
};

export const initialUpdateMembershipActionState:
  UpdateMembershipActionState = {
    status: "idle",
    message: "",
    fieldErrors: {},
  };