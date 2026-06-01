import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChefApplication,
  DeliveryManApplication,
  supervisorApi,
  type ProfileStatus,
} from "@/api/supervisor";

type ApplicationType = "chef" | "delivery";
type Applicant = ChefApplication | DeliveryManApplication;

const QUERY_KEYS: Record<ApplicationType, string> = {
  chef: "chef-applications",
  delivery: "delivery-man-applications",
};

export function useApplicationReview(type: ApplicationType) {
  const queryClient = useQueryClient();
  const queryKey = [QUERY_KEYS[type]];

  // ── Filter state ───────────────────────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileStatus | "all">("all");

  // ── Query ──────────────────────────────────────────────────────────────────

  const {
    data: applicants = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ChefApplication[] | DeliveryManApplication[], Error>({
    queryKey,
    queryFn: () =>
      type === "chef"
        ? supervisorApi.getChefs()
        : supervisorApi.getDeliveryMen(),
    refetchInterval: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const approveMutation = useMutation({
    mutationFn: (userId: string) =>
      type === "chef"
        ? supervisorApi.approveChef(userId)
        : supervisorApi.approveDeliveryMan(userId),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      type === "chef"
        ? supervisorApi.rejectChef(userId, reason)
        : supervisorApi.rejectDeliveryMan(userId, reason),
    onSuccess: invalidate,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = applicants.filter((a) => {
    const matchTab = activeTab === "all" || a.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all: applicants.length,
    Pending: applicants.filter((a) => a.status === "Pending").length,
    Approved: applicants.filter((a) => a.status === "Approved").length,
    Rejected: applicants.filter((a) => a.status === "Rejected").length,
  };

  return {
    // query state
    isLoading,
    isError,
    refetch,
    // data
    applicants,
    filtered,
    counts,
    // filter state
    search,
    setSearch,
    activeTab,
    setActiveTab,
    // mutations
    approveMutation,
    rejectMutation,
  };
}
