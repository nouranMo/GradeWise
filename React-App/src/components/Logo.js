import { CheckBadgeIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

export default function Logo({ isAuthenticated = false }) {
  const homeLink = isAuthenticated ? "/dashboard" : "/";

  return (
    <Link
      to={homeLink}
      className="group flex items-center gap-3 transition-opacity duration-200 hover:opacity-90"
    >
      <CheckBadgeIcon className="h-10 w-10 text-[#ff6464] group-hover:scale-105 transition-transform duration-200" />
      <div className="flex flex-col">
        <p className="text-xl font-bold tracking-tight text-gray-900">
          Grade<span className="text-[#ff6464]">Wise</span>
        </p>
        <p className="text-xs text-gray-500 tracking-wide">
          Smart Document Analysis
        </p>
      </div>
    </Link>
  );
}
