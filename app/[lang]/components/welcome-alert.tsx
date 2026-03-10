import { auth } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFirstNameFromEmail } from "@/lib/utils/name-format";
import { Terminal } from "lucide-react";

type InfoProps = {
  title: string;
  description?: React.ReactNode;
};

export default async function WelcomeAlert({ title, description }: InfoProps) {
  const session = await auth();
  const email = session?.user?.email;
  return (
    <Alert className="text-justify sm:w-[500px]">
      <Terminal className="h-4 w-4" />
      <AlertTitle>
        {!session
          ? title + "!"
          : `${title} ${email ? getFirstNameFromEmail(email) : ""}!`}
      </AlertTitle>
      {description && (
        <AlertDescription className="text-justify">
          {description}
        </AlertDescription>
      )}
    </Alert>
  );
}
