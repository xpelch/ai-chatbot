import { Suspense } from "react";
import UnlockForm from "@/components/UnlockForm";

export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockForm />
    </Suspense>
  );
}
