import React from "react";

interface TabButtonProps {
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({
  id,
  active,
  onClick,
  children,
}) => (
  <button
    id={id}
    className={`px-3 py-1 rounded-t-md text-sm font-semibold border border-gray-200
         ${active ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 hover:bg-gray-50"}`}
    onClick={onClick}
  >
    {children}
  </button>
);