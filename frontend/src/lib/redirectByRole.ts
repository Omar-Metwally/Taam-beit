import type { UserRole } from "@/store/auth.store";
import type { NavigateFunction } from "react-router-dom";

export function redirectByRole(roles: UserRole[], navigate: NavigateFunction) {
  if (roles.includes("Supervisor")) return navigate("/supervisor");
  if (roles.includes("Chef")) return navigate("/chef");
  if (roles.includes("DeliveryMan")) return navigate("/delivery");
  navigate("/");
}
