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
    <div className="flex-1 flex flex-col bg-mint-light border-2 border-mint-dark rounded-md shadow p-4 font-inter m-0">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-3">
        <label className="block">
          <span className="block text-text text-sm mb-0.5 font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-mint px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-mint bg-white"
            placeholder="your@email.com"
          />
        </label>
        <label className="block flex-1 flex flex-col">
          <span className="block text-text text-sm mb-0.5 font-medium">Feedback</span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full flex-1 rounded-md border border-mint px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-mint bg-white"
            placeholder="Share your thoughts..."
          />
        </label>
      </form>
      <button
        type="submit"
        onClick={handleSubmit}
        className="w-full rounded-md bg-brand-light py-2 text-text font-semibold hover:bg-brand-dark"
      >
        Submit Feedback
      </button>
    </div>
  );
};

export default FeedbackPanel;
