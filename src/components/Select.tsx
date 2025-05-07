import React from "react";

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (
  props
) => (
  <select
    {...props}
    className="w-full rounded-md border px-2 py-1 text-sm outline-none
      focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-200"
  />
);