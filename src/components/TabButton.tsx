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
    className={`px-3 py-1 rounded-t-md text-sm font-semibold
         ${active ? "bg-brand text-white" : "bg-mint-light text-text"}`}
    onClick={onClick}
  >
    {children}
  </button>
);