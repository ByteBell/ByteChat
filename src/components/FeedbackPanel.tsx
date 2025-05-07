import React, { useState } from "react";

const FeedbackPanel: React.FC = () => {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, feedback });
    setFeedback("");
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="your@email.com"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Feedback</span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full rounded-md border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
            placeholder="Share your thoughts..."
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackPanel;