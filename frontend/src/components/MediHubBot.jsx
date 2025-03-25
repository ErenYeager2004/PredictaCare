import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { marked } from "marked";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { assets } from "../assets/assets";

function MediHubBot() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chat, setChat] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setShowChat(true), 300);
  }, []);

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL;
  
  const genAI = new GoogleGenerativeAI(API_KEY);

  const generationConfig = {
    temperature: 0.8,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  useEffect(() => {
    const initChat = async () => {
      try {
        const newChat = await genAI
          .getGenerativeModel({ model: MODEL_NAME })
          .startChat({
            generationConfig,
            safetySettings,
            history: messages.map((msg) => ({
              text: msg.text,
              role: msg.role,
            })),
          });
        setChat(newChat);
      } catch (error) {
        setError("Failed to initialize chat. Please refresh and try again.");
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = {
      text: userInput,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setUserInput("");
    setIsTyping(true);

    try {
      const input_prompt = `
        User Query: "${userInput}"
        - If the message is an informal greeting like "hi" or "hello", greet back in a friendly way.
        - If the user asks "who are you" or something similar, respond strictly with: *"I am PredictaCare AI, your healthcare assistant."* You can follow up with "How can I assist you today?"
        - If symptoms are mentioned, identify possible diseases and suggest medications.
        - If it's a general medical question, answer concisely.
        - If the question is not related to healthcare, respond strictly with: *"I am PredictaCare AI, your healthcare assistant. Please ask me questions only related to healthcare."*
        - Do not answer questions unrelated to healthcare. Ignore anything else.
        - Avoid repeating instructions. Just respond to the user's input naturally.
        - Format responses clearly with proper new lines & *bold text* for important information.
      `;

      const result = await chat.sendMessage(input_prompt);
      const botMessage = {
        text: result.response.text(),
        role: "bot",
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      setError("Failed to fetch response. Try again later.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-26 right-21 z-50 h-[70vh] w-[22rem] shadow-2xl bg-white rounded-lg flex flex-col"
    >
      <motion.img
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-50 mx-auto mt-4 mb-4"
        src={assets.bot_logo}
        alt="Chatbot"
      />

      {showChat && (
        <div className="flex-1 h-[55vh] overflow-y-auto p-4 bg-white space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 max-w-[80%] rounded-lg text-sm shadow-md transition-all duration-300 ${
                  msg.role === "user"
                    ? "bg-[#5f6FFF] text-white"
                    : "bg-[#DCE0FF] text-gray-800"
                }`}
                dangerouslySetInnerHTML={{ __html: marked(msg.text) }}
              ></div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 text-sm">Bot is typing</span>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "easeInOut",
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "easeInOut",
                  delay: 0.4,
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm text-center p-2">{error}</div>
      )}

      {showChat && (
        <div className="flex items-center p-3 bg-white">
          <input
            type="text"
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 p-3 text-sm rounded-full border border-gray-300 text-black focus:outline-none focus:ring-2 focus:ring-[#5f6FFF] transition-all"
          />
          <button
            onClick={handleSendMessage}
            className="ml-3 p-3 text-sm bg-[#5f6FFF] text-white rounded-full shadow-md hover:bg-[#4a54cc] transition-all duration-300"
          >
            Send
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default MediHubBot;
