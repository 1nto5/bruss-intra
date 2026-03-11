import { correctiveActionStatusType } from "./types";

export const correctiveActionStatusOptions: {
  value: correctiveActionStatusType["value"];
  label: string;
}[] = [
  { value: "open", label: "Otwarta" },
  { value: "closed", label: "Zakończona" },
  { value: "overdue", label: "Zaległa" },
  { value: "in progress", label: "W trakcie" },
  { value: "rejected", label: "Odrzucona" },
];
