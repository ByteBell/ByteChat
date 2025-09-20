import React from "react";

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (
  props
) => (
  <select
    {...props}
    className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none bg-white
      focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
  />
);