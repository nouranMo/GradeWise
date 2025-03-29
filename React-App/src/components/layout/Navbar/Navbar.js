import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../Logo";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "contexts/AuthContext";
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const userMenuItems = [
  {
    name: "Profile",
    href: "/dashboard/profile",
    description: "Your personal information",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    description: "Account settings and preferences",
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    description: "Manage your notifications",
  },
  {
    name: "Appearance",
    href: "/dashboard/appearance",
    description: "Customize your interface",
  },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const userEmail = user?.email;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    logout();
    navigate("/login");
  };

  const handleMenuItemClick = (href) => {
    setIsDropdownOpen(false);
    navigate(href);
  };

  return (
    <nav className="relative flex justify-between items-center py-4 px-6 md:px-20 border-b border-gray-100">
      <Logo isAuthenticated={isAuthenticated} />

      {/* Mobile Menu Button */}
      <button
        className="md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Desktop Menu */}
      <div className="hidden md:block">
        {isAuthenticated && user ? (
          <DropdownMenu.Root
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
          >
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 outline-none">
                {userEmail}
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[220px] bg-white rounded-md p-1 shadow-lg ring-1 ring-black ring-opacity-5 data-[state=open]:animate-dropIn data-[state=closed]:animate-dropOut"
                sideOffset={5}
                align="end"
              >
                {userMenuItems.map((item) => (
                  <DropdownMenu.Item
                    key={item.name}
                    className="group text-[13px] leading-none text-gray-700 rounded-md p-3 relative select-none outline-none data-[highlighted]:bg-[#ff6464]/5 data-[highlighted]:text-black cursor-pointer"
                    onSelect={() => handleMenuItemClick(item.href)}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  </DropdownMenu.Item>
                ))}

                <DropdownMenu.Separator className="h-[1px] bg-gray-200 m-1" />

                <DropdownMenu.Item
                  className="group text-[13px] leading-none text-gray-700 rounded-md p-3 relative select-none outline-none data-[highlighted]:bg-[#ff6464]/5 data-[highlighted]:text-black cursor-pointer"
                  onSelect={() => {
                    setIsDropdownOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <Link to="/login">
            <button className="flex items-center gap-2 rounded-md font-bold bg-[#ff6464] text-white py-3 px-5 text-sm hover:bg-[#ff4444] transition-colors duration-500">
              Log in
            </button>
          </Link>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg md:hidden">
          <div className="p-4">
            {isAuthenticated && user ? (
              <>
                <div className="px-4 py-2 text-sm text-gray-600">
                  {userEmail}
                </div>
                {userMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Log in
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
