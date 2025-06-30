import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const AISuggestions = () => {
  const location = useLocation();
  const { prompt } = location.state || {};

  // const [lines, setLines] = useState([]);
  const [markdownContent, setMarkdownContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  useEffect(() => {
    const fetchAIResponse = async () => {
      if (!prompt) {
        setError("⚠️ No prompt provided.");
        setLoading(false);
        return;
      }

      try {
        const model = genAI.getGenerativeModel({
          model: import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash",
        });

        const result = await model.generateContent(prompt);
        const response = await result.response.text();

        // const allLines = response.split("\n").filter((line) => line.trim() !== "");
        // for (let i = 0; i < allLines.length; i++) {
        //   setLines((prev) => [...prev, allLines[i]]);
        //   await delay(50); // simulate line-by-line effect
        // }
        setMarkdownContent(response);
      } catch (err) {
        console.error("Gemini API Error:", err);
        setError("❌ Failed to fetch AI suggestions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAIResponse();
  }, [prompt]);

  const renderFormattedLine = (line, idx) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return (
        <h3 key={idx} className="text-xl font-bold text-blue-700 mt-6">
          {line.replace(/\*\*/g, "")}
        </h3>
      );
    } else if (line.startsWith("* ")) {
      return (
        <li key={idx} className="ml-6 list-disc text-gray-800 leading-relaxed">
          {line.replace("* ", "")}
        </li>
      );
    } else if (line.startsWith("    * ")) {
      return (
        <li key={idx} className="ml-12 list-circle text-gray-600">
          {line.replace("    * ", "")}
        </li>
      );
    } else {
      return (
        <p key={idx} className="text-gray-700 leading-relaxed my-1">
          {line}
        </p>
      );
    }
  };

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
          // <div className="text-lg">
          //   {lines.map((line, idx) => renderFormattedLine(line, idx))}
          // </div>
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{markdownContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestions;
