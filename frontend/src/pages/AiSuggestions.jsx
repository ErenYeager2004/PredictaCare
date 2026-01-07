import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const AISuggestions = () => {
  const location = useLocation();
  const { prompt } = location.state || {};

  const [markdownContent, setMarkdownContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchAIResponse = async () => {
      if (!prompt) {
        setError("⚠️ No prompt provided.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `
You are PredictaCare AI.

Provide clear, structured, and practical health suggestions.
Use headings, bullet points, and simple language.

User request:
${prompt}
            `,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch AI response");
        }

        const data = await res.json();
        setMarkdownContent(data.reply);

      } catch (err) {
        console.error("AI Suggestion Error:", err);
        setError("❌ Failed to fetch AI suggestions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAIResponse();
  }, [prompt, BACKEND_URL]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-3xl font-bold text-purple-800 mb-6 text-center">
          🧠 AI Health Suggestions
        </h2>

        {loading ? (
          <div className="text-center text-gray-500 text-lg animate-pulse">
            ⏳ Generating personalized health advice...
          </div>
        ) : error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestions;
