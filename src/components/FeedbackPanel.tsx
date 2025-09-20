import React, { useState } from "react";

const FeedbackPanel: React.FC = () => {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("general");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log({ email, feedback, category, rating });
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setFeedback("");
      setRating(0);
      setIsSubmitted(false);
    }, 3000);
  };

  const categories = [
    { value: "general", label: "General Feedback", icon: "💬" },
    { value: "bug", label: "Bug Report", icon: "🐛" },
    { value: "feature", label: "Feature Request", icon: "✨" },
    { value: "improvement", label: "Improvement", icon: "🚀" },
  ];

  const stars = [1, 2, 3, 4, 5];

  if (isSubmitted) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <div className="card p-6 text-center space-y-4 max-w-sm animate-scale-in">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground">Thank You!</h3>
          <p className="text-muted-foreground">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <div className="w-full bg-emerald-100 rounded-full h-1">
            <div className="bg-emerald-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 space-y-4 flex-1 custom-scrollbar overflow-y-auto">
        {/* Header */}
        <div className="card p-4 bg-gradient-to-r from-gray-50 to-emerald-50 border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">We Value Your Feedback</h2>
              <p className="text-sm text-emerald-700">Help us improve FixGrammer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Section */}
          <div className="card p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <span>⭐</span>
              <span>Rate Your Experience</span>
            </label>
            <div className="flex items-center space-x-2">
              {stars.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`
                    w-8 h-8 rounded-full transition-all duration-200 transform hover:scale-110
                    ${rating >= star 
                      ? "text-yellow-400 hover:text-yellow-500" 
                      : "text-gray-300 hover:text-yellow-300"
                    }
                  `}
                >
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground animate-fade-in">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </span>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div className="card p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <span>📂</span>
              <span>Feedback Category</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200 text-left
                    ${category === cat.value
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card hover:bg-accent hover:text-accent-foreground border-border hover:border-primary/50"
                    }
                  `}
                >
                  <span>{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Input */}
          <div className="card p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <span>📧</span>
              <span>Email (Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              We'll only use this to follow up on your feedback
            </p>
          </div>

          {/* Feedback Text */}
          <div className="card p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <span>💭</span>
              <span>Your Feedback</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="textarea min-h-[120px] custom-scrollbar"
              placeholder="Tell us what you think... What works well? What could be improved? Any bugs or feature requests?"
              required
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Be specific to help us improve</span>
              <span>{feedback.length}/1000</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            className="w-full btn btn-primary btn-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 spinner border-white" />
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>🚀</span>
                <span>Submit Feedback</span>
              </div>
            )}
          </button>
        </form>

        {/* Additional Info */}
        <div className="card p-4 space-y-3 bg-muted/30">
          <h4 className="font-semibold text-foreground flex items-center space-x-2">
            <span>💡</span>
            <span>Other Ways to Reach Us</span>
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <span>📧</span>
              <span>support@fixgrammer.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🐦</span>
              <span>@fixgrammer on Twitter</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🌐</span>
              <span>Visit our website</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPanel;