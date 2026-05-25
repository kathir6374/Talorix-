import { redirect } from "next/navigation";

export default function EmployerCandidatesRedirectPage() {
    redirect("/employer-dashboard?tab=talent");
}
