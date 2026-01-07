import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { marked } from "marked";
import { assets } from "../assets/assets";

function MediHubBot() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    setMessages(prev => [...prev, { text: userInput, role: "user" }]);
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

    } catch (err) {
      setError("Could not fetch data from AI server.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div className="fixed bottom-24 right-6 w-80 h-[70vh] bg-white rounded-lg shadow-xl flex flex-col">
      <img src={assets.bot_logo} className="w-28 mx-auto mt-3" />

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`p-2 text-sm rounded-lg max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
              dangerouslySetInnerHTML={{ __html: marked(msg.text) }}
            />
          </div>
        ))}
        {isTyping && <p className="text-xs text-gray-500">Bot is typing...</p>}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <div className="p-2 flex">
        <input
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded-full text-sm"
        />
        <button onClick={handleSendMessage} className="ml-2 px-4 bg-blue-500 text-white rounded-full">
          Send
        </button>
      </div>
    </motion.div>
  );
}

export default MediHubBot;
