'use client';

import UserAvatar from './user-avatar';
import { LogOut } from 'lucide-react';

import type { Session } from '@/lib/auth';
import { signOut } from '@/lib/auth/client';
import { UserRole } from '@/lib/db/schema';

import { Badge, Dropdown } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type UserDropdownProps = {
  user: Session['user'];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const UserDropdown: React.FC<UserDropdownProps> = ({ user }) => {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="rounded-full border border-gray-7 transition-colors hover:border-gray-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-9">
        <UserAvatar className="border-0" image={user.image} name={user.name} size={32} />
      </Dropdown.Trigger>
      <Dropdown.Content
        className="w-48 [&_[dropdown-item-content]]:w-full [&_[dropdown-item-content]]:first:w-full"
        align="end"
      >
        <Dropdown.Group>
          <div className="flex flex-col items-start gap-0.5 overflow-hidden p-2">
            <div className="flex gap-1.5">
              <span className="line-clamp-1 overflow-hidden text-ellipsis text-left text-sm font-medium leading-5 text-gray-12">
                {user.name}
              </span>
              {user.role !== UserRole.USER ? (
                <Badge
                  className="min-w-fit capitalize"
                  size="sm"
                  variant="outline"
                  intent={user.role === UserRole.MODERATOR ? 'success' : 'orange'}
                >
                  {{ admin: 'Admin', moderator: 'Mod' }[user.role]}
                </Badge>
              ) : null}
            </div>
            <div className="line-clamp-1 overflow-hidden text-ellipsis text-left text-xs font-normal leading-4 text-gray-11">
              {user.email}
            </div>
          </div>
        </Dropdown.Group>
        <Dropdown.Separator />
        <Dropdown.Group>
          <Dropdown.Item
            icon={<LogOut />}
            onSelect={async () => {
              await signOut({ fetchOptions: { onSuccess: () => window.location.reload() } });
            }}
          >
            Log out
          </Dropdown.Item>
        </Dropdown.Group>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};

export default UserDropdown;
