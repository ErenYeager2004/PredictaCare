import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { marked } from "marked";
import { assets } from "../assets/assets";

function MediHubBot() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    setTimeout(() => setShowChat(true), 300);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMsg = { text: userInput, role: "user" };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsTyping(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setMessages(prev => [...prev, { text: data.reply, role: "bot" }]);
    } catch {
      setError("Could not fetch data from AI server.");
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
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 max-w-[80%] rounded-lg text-sm shadow-md ${
                  msg.role === "user"
                    ? "bg-[#5f6FFF] text-white"
                    : "bg-[#DCE0FF] text-gray-800"
                }`}
                dangerouslySetInnerHTML={{ __html: marked(msg.text) }}
              />
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 text-sm">Bot is typing</span>
              {[0, 0.2, 0.4].map((d, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d }}
                  className="w-1.5 h-1.5 bg-gray-500 rounded-full"
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {error && <p className="text-red-500 text-sm text-center p-2">{error}</p>}

      {showChat && (
        <div className="flex items-center p-3 bg-white">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-3 text-sm rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5f6FFF]"
          />
          <button
            onClick={handleSendMessage}
            className="ml-3 p-3 bg-[#5f6FFF] text-white rounded-full hover:bg-[#4a54cc]"
          >
            Send
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default MediHubBot;
