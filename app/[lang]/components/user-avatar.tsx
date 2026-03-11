import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserAvatarProps = {
  userInitials: string;
};

export default function UserAvatar({ userInitials }: UserAvatarProps) {
  return (
    <Avatar>
      <AvatarFallback>{userInitials}</AvatarFallback>
    </Avatar>
  );
}
