import { CheckBadgeIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";

export default function FooterLogo() {
  return (
    <div className="flex flex-row items-center gap-2 leading-none">
      <Link to="/">
        <CheckBadgeIcon className="h-12 w-12 text-white" />
      </Link>
      <div className="flex flex-col gap-2">
        <Link to="/">
          <p className={"text-[24px] font-extrabold"}>
            Grade<span className="text-white">Wise</span>
          </p>
        </Link>
        <p className="text-[12px] text-black font-medium">
          Smart Document Analysis
        </p>
      </div>
    </div>
  );
}
